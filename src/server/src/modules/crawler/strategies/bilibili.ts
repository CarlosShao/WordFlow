import { spawn } from 'node:child_process'
import { mkdtemp, readdir, readFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { CrawlerSource, CrawlItem, CrawlStrategy } from '../types.js'
import { logger } from '../../../common/logger.js'
import { config } from '../../../config/index.js'
import { transcribeAudio, detectSpeechSegments } from '../asr.js'
import { alignAsrFillCues, alignAsrToChineseTimeline, alignBilingualToSpeechTimeline, type CleanSegment } from '../cleaner.js'
import { parseSubtitles } from '../cleaner.js'
import { translateSegments } from '../translator.js'
import { callLlm } from '../../ai-processing/llm.js'

/**
 * Bilibili crawler strategy.
 *
 * Bilibili videos typically carry NO English subtitle track. The `ai-zh`
 * AI-generated Chinese subtitle is available on many videos via the player
 * API (`x/player/v2`). Pipeline per video:
 *
 *   1. Player API: fetch CC subtitle tracks, download the best zh track
 *      (ai-zh > zh-CN/zh-Hans > any zh) as SRT text.
 *   2. yt-dlp downloads the audio (m4a) with the Bilibili cookie.
 *   3. StepFun cloud ASR (`stepaudio-2.5-asr`) transcribes English from audio.
 *   4. English text is distributed across the zh timeline (proportional
 *      split) to produce timed bilingual segments; untranslated segments
 *      are filled by the existing LLM pipeline.
 *   5. Assembled into a CrawlItem exactly like TED/YouTube items.
 *
 * `source.url` may be:
 *   - a single video page   (https://www.bilibili.com/video/BVxxxxx)
 *   - a video page with part (https://www.bilibili.com/video/BVxxxxx?p=2)
 *
 * One `CrawlerSource` of type BILIBILI = ONE BV video (possibly multi-part).
 */

interface BiliPage {
  page: number
  cid: number
  part: string
  duration: number
  /** First-frame thumbnail of this part (per-part cover). */
  firstFrame?: string
}

interface BiliVideoMeta {
  title: string
  duration: number
  cover: string
  owner: string
  desc: string
  pages: BiliPage[]
}

interface BiliSubtitleTrack {
  lan: string
  lan_doc: string
  subtitle_url: string
}

const bvidSym = Symbol('bvid')

function biliCookie(): string | undefined {
  if (config.bilibiliCookie) return config.bilibiliCookie
  if (process.env.BILIBILI_SESSDATA) return `SESSDATA=${process.env.BILIBILI_SESSDATA}`
  return undefined
}

function biliHeaders(cookie?: string): Record<string, string> {
  const h: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://www.bilibili.com',
    'Accept': 'application/json, text/plain, */*',
  }
  if (cookie) h['Cookie'] = cookie
  return h
}

function parseBvUrl(url: string): { bvid: string; page?: number } | null {
  const m = url.match(/bilibili\.com\/video\/(BV[0-9A-Za-z]+)/i)
  if (!m) return null
  const pageMatch = url.match(/[?&]p=(\d+)/i)
  return { bvid: m[1], page: pageMatch ? parseInt(pageMatch[1], 10) : undefined }
}

async function fetchVideoMeta(bvid: string): Promise<BiliVideoMeta & { [bvidSym]: string }> {
  const res = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
    headers: biliHeaders(biliCookie()),
  })
  if (!res.ok) throw new Error(`Bilibili API error: ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(`Bilibili API: ${data.message}`)
  const d = data.data
  const meta: BiliVideoMeta & { [bvidSym]: string } = {
    title: d.title,
    duration: d.duration,
    cover: d.pic,
    owner: d.owner?.name || '',
    desc: d.desc || '',
    pages: (d.pages || []).map((p: any) => ({
      page: p.page,
      cid: p.cid,
      part: p.part,
      duration: p.duration,
      firstFrame: p.first_frame,
    })),
    [bvidSym]: bvid,
  }
  return meta
}

/** Normalize a Bilibili image URL to HTTPS (Bilibili serves http://, which
 *  browsers block as mixed content on HTTPS pages). */
function normalizeCover(url?: string): string | undefined {
  if (!url) return undefined
  return url.replace(/^http:\/\//i, 'https://')
}

/** Query the player API for CC subtitle tracks of a cid. Uses the wbi-signed
 *  endpoint: the legacy x/player/v2 is downgraded by Bilibili (track list comes
 *  back but subtitle_url is empty), while wbi/v2 returns the real download URL. */
async function fetchSubtitleTracks(bvid: string, cid: number): Promise<BiliSubtitleTrack[]> {
  try {
    const res = await fetch(`https://api.bilibili.com/x/player/wbi/v2?bvid=${bvid}&cid=${cid}`, {
      headers: biliHeaders(biliCookie()),
    })
    if (!res.ok) return []
    const data = await res.json()
    if (data.code !== 0) return []
    return data.data?.subtitle?.subtitles || []
  } catch (err) {
    logger.warn({ err }, 'bilibili: subtitle tracks fetch failed')
    return []
  }
}

/** Download a Bilibili CC subtitle (JSON) and convert to SRT text. */
async function downloadSubtitleJson(track: BiliSubtitleTrack): Promise<string | null> {
  if (!track.subtitle_url) return null
  const url = track.subtitle_url.startsWith('http')
    ? track.subtitle_url
    : `https:${track.subtitle_url}`
  try {
    const res = await fetch(url, { headers: biliHeaders(biliCookie()) })
    if (!res.ok) return null
    const data = await res.json()
    const body: Array<{ from: number; to: number; content: string }> = data.body || []
    if (body.length === 0) return null
    const srt = body
      .map((cue, i) => {
        const fmt = (sec: number) => {
          const ms = Math.round(sec * 1000)
          const h = Math.floor(ms / 3600000)
          const m = Math.floor((ms % 3600000) / 60000)
          const s = Math.floor((ms % 60000) / 1000)
          const mm = ms % 1000
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(mm).padStart(3, '0')}`
        }
        return `${i + 1}\n${fmt(cue.from)} --> ${fmt(cue.to)}\n${cue.content.replace(/\n/g, ' ')}\n`
      })
      .join('\n')
    return srt
  } catch (err) {
    logger.warn({ err, url: url.slice(0, 100) }, 'bilibili: subtitle download failed')
    return null
  }
}

/** Pick the best zh subtitle track: ai-zh > zh-CN/zh-Hans > any zh. */
function zhScore(lan: string): number {
  if (lan === 'ai-zh') return 3
  if (['zh-CN', 'zh-Hans', 'zh-cn', 'zh-hans'].includes(lan)) return 2
  if (lan.startsWith('zh')) return 1
  return 0
}

/**
 * Get the best DASH audio stream URL for a video via the playurl API.
 * Returns { url, size } or null when unavailable.
 */
async function fetchDashAudioUrl(bvid: string, cid: number): Promise<{ url: string; size: number } | null> {
  try {
    const params = new URLSearchParams({ bvid, cid: String(cid), q: '64', fnval: '16' })
    const res = await fetch(`https://api.bilibili.com/x/player/wbi/playurl?${params}`, {
      headers: biliHeaders(biliCookie()),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.code !== 0) return null
    const audio = data.data?.dash?.audio?.[0]
    if (!audio?.baseUrl) return null
    return { url: audio.baseUrl, size: audio.size || 0 }
  } catch (err) {
    logger.warn({ err, bvid }, 'bilibili: DASH audio URL fetch failed')
    return null
  }
}

/**
 * Download audio for a video via the Bilibili DASH API (preferred — reliable
 * in Docker where the CDN's IPv6 records break yt-dlp), falling back to
 * yt-dlp with the cookie file. Returns the local audio file path.
 */
async function downloadAudio(bvid: string, cid: number, workDir: string): Promise<string> {
  const dash = await fetchDashAudioUrl(bvid, cid)
  if (dash?.url) {
    const audioPath = join(workDir, 'audio.m4s')
    try {
      const res = await fetch(dash.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://www.bilibili.com',
        },
      })
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer())
        await import('node:fs/promises').then((f) => f.writeFile(audioPath, buf))
        logger.info({ bvid, cid, bytes: buf.length }, 'bilibili: audio downloaded via DASH API')
        return audioPath
      }
      logger.warn({ status: res.status }, 'bilibili: DASH audio download failed, falling back to yt-dlp')
    } catch (err) {
      logger.warn({ err }, 'bilibili: DASH audio download threw, falling back to yt-dlp')
    }
  }

  // Fallback: yt-dlp with a writable copy of the cookie file.
  const args = [
    '--no-warnings',
    '--no-playlist',
    '--force-ipv4',
    '-f', 'bestaudio/best',
    '-x', '--audio-format', 'm4a',
    '--audio-quality', '0',
    '-P', workDir,
    '-o', 'audio.%(ext)s',
  ]
  const cookieFile = '/app/.bilibili_cookie.txt'
  try {
    const { access, copyFile } = await import('node:fs/promises')
    await access(cookieFile)
    const localCookie = join(workDir, 'cookies.txt')
    await copyFile(cookieFile, localCookie)
    args.push('--cookies', localCookie)
  } catch {
    const cookie = biliCookie()
    if (cookie) args.push('--add-header', `Cookie: ${cookie}`)
  }
  args.push(`https://www.bilibili.com/video/${bvid}`)

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('yt-dlp', args, { windowsHide: true })
    let stderr = ''
    proc.stderr.on('data', (d) => (stderr += d))
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`yt-dlp audio download failed (${code}): ${stderr.slice(-400)}`))
      else resolve()
    })
    proc.on('error', (err) => reject(new Error(`yt-dlp spawn failed: ${err.message}`)))
  })

  const files = await readdir(workDir)
  const audio = files.find((f) => /\.(m4a|mp3|webm|opus)$/i.test(f))
  if (!audio) throw new Error('yt-dlp produced no audio file')
  return join(workDir, audio)
}

/**
 * Verify that a Bilibili `ai-zh` subtitle track actually matches the video's
 * audio content. Bilibili's AI subtitle service occasionally serves the wrong
 * transcript (a known dirty-data issue: the cid is linked to another show's
 * subtitles). We ask the LLM to compare the ASR English text with a sample of
 * the Chinese track; a mismatch means we discard the track and translate.
 */
async function zhSubtitleMatchesAudio(enText: string, zhSrt: string): Promise<boolean> {
  const enSample = enText.slice(0, 600)
  const zhSample = zhSrt
    .split('\n')
    .filter((l) => l.trim() && !/^\d+$/.test(l.trim()) && !l.includes('-->'))
    .slice(0, 12)
    .join(' / ')
    .slice(0, 400)
  try {
    const res = await callLlm(
      [
        {
          role: 'system',
          content:
            '你是内容校对助手。判断给定的英文字幕与中文字幕是否在讲同一段内容（同一场景、同一人物、同一事件）。' +
            '只回答 YES 或 NO，不要其他文字。',
        },
        {
          role: 'user',
          content: `英文（语音转写）：\n${enSample}\n\n中文（视频字幕）：\n${zhSample}`,
        },
      ],
      { temperature: 0 },
    )
    const answer = (res ?? '').trim().toUpperCase()
    logger.info({ answer, enLen: enSample.length, zhLen: zhSample.length }, 'bilibili: zh/en consistency check')
    return answer.startsWith('YES')
  } catch (err) {
    // On LLM failure, trust the track (conservative: don't drop subtitles).
    logger.warn({ err }, 'bilibili: consistency check failed, trusting zh track')
    return true
  }
}

/**
 * Build a CrawlItem for one video:
 *   audio -> ASR English -> align to zh timeline -> translate missing zh.
 */
async function buildBiliItem(
  meta: BiliVideoMeta & { [bvidSym]: string },
  part: BiliPage,
): Promise<CrawlItem | null> {
  const workDir = await mkdtemp(join(tmpdir(), 'wordflow-bili-'))
  try {
    const bvid = meta[bvidSym]

    // 1. Best zh subtitle track (ai-zh first)
    const tracks = await fetchSubtitleTracks(bvid, part.cid)
    const zhTracks = tracks
      .filter((t) => zhScore(t.lan) > 0)
      .sort((a, b) => zhScore(b.lan) - zhScore(a.lan))
    let zhSrt: string | null = null
    let zhLang = ''
    for (const track of zhTracks) {
      const srt = await downloadSubtitleJson(track)
      if (srt) {
        zhSrt = srt
        zhLang = track.lan
        // Log a preview to verify the subtitle actually matches this video.
        const firstLine = srt.split('\n').find((l) => l.trim() && !/^\d+$/.test(l.trim()) && !l.includes('-->')) ?? ''
        logger.info(
          { bvid, cid: part.cid, lan: track.lan, firstLine: firstLine.slice(0, 60) },
          'bilibili: zh subtitle track selected',
        )
        break
      }
    }

    // 2. Audio + ASR
    const audioPath = await downloadAudio(bvid, part.cid, workDir)
    const asr = await transcribeAudio(audioPath)
    if (!asr.text) {
      logger.warn({ bvid, part: part.page }, 'bilibili: ASR returned empty text, skipping')
      return null
    }

    // 3. Validate the zh track actually matches this video's audio.
    //    Bilibili's ai-zh occasionally links to another show's subtitles.
    if (zhSrt && !(await zhSubtitleMatchesAudio(asr.text, zhSrt))) {
      logger.warn({ bvid, part: part.page, lan: zhLang }, 'bilibili: zh track mismatch, discarding (will LLM-translate)')
      zhSrt = null
      zhLang = ''
    }

    // 4. Align English onto a timeline, in priority order:
    //    a) uniform speaking-rate over the whole video (most reliable — Bilibili
    //       re-upload ai-zh cue times drift several seconds from the actual
    //       audio, so cue timestamps are used only as a translation source);
    //    b) ASR chunk timestamps (each 25s chunk is a real time range);
    //    c) silencedetect speech segments;
    //    d) untimed sentence split.
    let segments: CleanSegment[] = []
    if (zhSrt) {
      // ai-zh cue timestamps are the authoritative speech timeline (Bilibili's
      // own ASR from the real audio). Fill English text into each cue window by
      // character share so segments land on real speech time (verified on P1).
      const zhCues = parseSubtitles(zhSrt)
      if (zhCues.length > 0) {
        segments = alignAsrFillCues(asr.text, zhCues)
      }
      if (segments.length > 0) {
        logger.info(
          { bvid, part: part.page, segs: segments.length },
          'bilibili: timed by ai-zh cue timeline (fill)',
        )
      }
    }
    if (segments.length === 0 && asr.chunks && asr.chunks.length >= 3) {
      // The transcript is already chunked with real time bounds; split each
      // chunk's text into sentences and sub-divide the chunk time across them.
      const zhPlain = zhSrt
        ? parseSubtitles(zhSrt).map((c) => c.text).join('')
        : undefined
      const speechLike = asr.chunks.map((c) => ({ start: c.start, end: c.end }))
      segments = alignBilingualToSpeechTimeline(asr.text, zhPlain, speechLike)
      logger.info(
        { bvid, part: part.page, chunks: asr.chunks.length, segs: segments.length },
        'bilibili: timed by ASR chunks',
      )
    }
    if (segments.length === 0) {
      let speech: Array<{ start: number; end: number }> = await detectSpeechSegments(audioPath).catch(() => [])
      // Dense dialogue produces few silence gaps; fall back to uniform
      // windows of ~10s so we still get a monotonic timeline.
      if (speech.length < 3) {
        const dur = asr.durationSec || 0
        if (dur > 0) {
          const win = 10
          speech = []
          for (let t = 0; t < dur; t += win) {
            speech.push({ start: t, end: Math.min(t + win, dur) })
          }
          logger.info({ dur, windows: speech.length }, 'bilibili: using uniform time windows')
        }
      }
      if (speech.length >= 3) {
        const zhPlain = zhSrt
          ? parseSubtitles(zhSrt).map((c) => c.text).join('')
          : undefined
        segments = alignBilingualToSpeechTimeline(asr.text, zhPlain, speech)
        logger.info(
          { bvid, part: part.page, speechSegs: speech.length, segs: segments.length },
          'bilibili: timed by speech segments',
        )
      } else {
        segments = alignAsrToChineseTimeline(asr.text, zhSrt ?? undefined)
      }
    }
    if (segments.length === 0) {
      logger.warn({ bvid, part: part.page }, 'bilibili: zero segments after alignment')
      return null
    }

    // 5. Translate missing Chinese
    const needZh = segments.filter((s) => !s.zh || s.zh.trim() === '')
    if (needZh.length > 0) {
      logger.info(
        { bvid, part: part.page, needZh: needZh.length, total: segments.length, zhLang },
        'bilibili: translating missing segments',
      )
      await translateSegments(segments)
    }

    const contentText = segments.map((s) => s.en).join('\n')
    const translationText = segments.map((s) => s.zh ?? '').filter(Boolean).join('\n')

    // Use the part's own name as the title (multi-part collections have one
    // giant collection title that repeats for every part, making items
    // indistinguishable in lists). Single-part videos keep the video title.
    const partTitle = meta.pages.length > 1
      ? part.part
      : meta.title
    const pageUrl = `https://www.bilibili.com/video/${bvid}${part.page > 1 ? `?p=${part.page}` : ''}`

    return {
      title: partTitle,
      sourceUrl: pageUrl,
      summary: meta.desc?.slice(0, 500) || undefined,
      coverUrl: normalizeCover(part.firstFrame || meta.cover),
      duration: part.duration || meta.duration,
      content: contentText,
      translation: translationText || undefined,
      segments: segments as unknown as CrawlItem['segments'],
      videoUrl: pageUrl,
      type: 'VIDEO',
      author: meta.owner || undefined,
    }
  } catch (err) {
    logger.warn({ err, bvid: meta[bvidSym], part: part.page }, 'bilibili: failed to build item')
    return null
  } finally {
    try {
      const files = await readdir(workDir)
      await Promise.all(files.map((f) => unlink(join(workDir, f)).catch(() => {})))
    } catch {
      /* ignore */
    }
  }
}

export const bilibiliStrategy: CrawlStrategy = {
  async crawl(source: CrawlerSource): Promise<CrawlItem[]> {
    const parsed = parseBvUrl(source.url)
    if (!parsed) {
      logger.warn({ url: source.url }, 'bilibili: unsupported URL, expected bilibili.com/video/BV...')
      return []
    }
    const { bvid, page } = parsed

    const meta = await fetchVideoMeta(bvid)
    const pages = page ? meta.pages.filter((p) => p.page === page) : meta.pages
    if (pages.length === 0) {
      logger.warn({ bvid, page }, 'bilibili: requested part not found')
      return []
    }

    const items: CrawlItem[] = []
    for (const part of pages) {
      const item = await buildBiliItem(meta, part)
      if (item) items.push(item)
      // Be polite to Bilibili + ASR quota between parts.
      await new Promise((r) => setTimeout(r, 1500))
    }

    logger.info(
      { bvid, parts: pages.length, items: items.length, source: source.name },
      'bilibili: crawl done',
    )
    return items
  },
}
