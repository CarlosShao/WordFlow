import { spawn } from 'node:child_process'
import { readFile, unlink, mkdtemp, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { randomUUID } from 'node:crypto'
import { logger } from '../../common/logger.js'
import { getMinio, ensureBucket } from '../../common/minio.js'
import { config } from '../../config/index.js'

export interface CrawledMedia {
  title: string
  description?: string
  thumbnailUrl?: string
  durationSec?: number
  /** External playable URL (YouTube/TED embed), NOT a downloaded file. */
  externalUrl?: string
  /** Uploaded audio URL on MinIO (podcasts / extracted audio). */
  audioUrl?: string
  /** Raw English subtitle text (if available). */
  enSubtitle?: string
  /** Raw Chinese subtitle text (if available). */
  zhSubtitle?: string
  /** Which Chinese language code actually matched (e.g. `zh-cn`). */
  zhSubtitleLang?: string
  /** True when both an English and a Chinese track were published by the source. */
  hasHumanSubtitles?: boolean
  /** Local path of a downloaded audio file (if extracted), for caller to clean up. */
  _audioPath?: string
}

/**
 * Extract TED talk slug from various URL patterns.
 * Normalizes hyphens to underscores since TED uses underscores in page URLs.
 */
function extractTedSlug(url: string): string | null {
  // Pattern 1: Standard TED talk page URL
  if (url.includes('ted.com/talks/')) {
    const m = url.match(/ted\.com\/talks\/(?:embed\/)?([a-z0-9_]+)/i)
    if (m) return m[1]
  }

  // Pattern 2: py.tedcdn.com CDN download URL
  const cdnMatch = url.match(/\/downloads\/\d{4}-([a-z][a-z0-9_-]+?)-[0-9a-f-]{8,}-download/i)
  if (cdnMatch) {
    return cdnMatch[1].replace(/-/g, '_')
  }

  // Pattern 3: download.ted.com with talk slug
  const dlMatch = url.match(/download\.ted\.com\/[^/]+\/(?:[^/]+\/)?([a-z0-9_]+)/i)
  if (dlMatch) return dlMatch[1]

  return null
}

/**
 * Resolve a stable embed URL from a media URL + yt-dlp metadata.
 *
 * TED talks use temporary CDN download URLs that expire within hours.
 * We convert them to the permanent embed URL: `https://www.ted.com/talks/embed/{slug}`.
 * YouTube videos get the standard embed URL: `https://www.youtube.com/embed/{id}`.
 * Everything else falls back to `webpage_url` (the canonical page URL).
 */
function resolveEmbedUrl(url: string, meta: any): string {
  // TED CDN download URL → extract slug and convert to embed
  if (url.includes('download.ted.com') || url.includes('py.tedcdn.com')) {
    const pageUrl = meta.webpage_url || meta.original_url
    const slug = extractTedSlug(url) || extractTedSlug(pageUrl || '')
    if (slug) return `https://www.ted.com/talks/embed/${slug}`
  }

  // TED talk page → construct embed URL from the slug
  const slug = extractTedSlug(url)
  if (slug) {
    return `https://www.ted.com/talks/embed/${slug}`
  }

  // YouTube video → use embed URL
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const ytId =
      meta.id ??
      url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)?.[1] ??
      url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1]
    if (ytId) return `https://www.youtube.com/embed/${ytId}`
  }

  // Fallback to webpage_url from yt-dlp metadata, then the original URL
  return meta.webpage_url ?? url
}

/**
 * Chinese subtitle language codes in descending order of trustworthiness.
 *
 * Verified against real TED/YouTube output:
 * - `zh-cn` / `zh-Hans` on ted.com are human volunteer translations (best).
 * - `zh` on ted.com is CANTONESE ("當我仲係一個細路仔"), never use it as
 *   Simplified Chinese.
 * - `zh-Hans` on youtube.com is machine-translated through a pivot language
 *   ("Chinese (Simplified) from Albanian") and is low quality.
 */
const ZH_LANG_PREFERENCE = ['zh-cn', 'zh-Hans', 'zh-CN', 'zh-hans', 'zh-sg', 'zh-tw', 'zh-Hant', 'zh']

function ytDlpArgs(
  url: string,
  workDir: string,
  opts: { subtitles: boolean; audio: boolean; autoSubs: boolean; cookie?: string },
): string[] {
  // `--print-json` downloads AND prints metadata. `--dump-json` only prints
  // metadata and skips every download step, so no subtitle file is ever
  // written — that was the root cause of "no transcript found" on TED.
  const args = ['--no-warnings', '--print-json', '--no-playlist', '-P', workDir]
  // Inject raw cookie string via header (avoids Netscape cookiejar parsing bugs).
  if (opts.cookie && opts.cookie.trim()) {
    args.push('--add-header', `Cookie: ${opts.cookie.trim()}`)
  }
  if (opts.subtitles) {
    // Request human subtitles first. Auto-generated captions are only pulled
    // when explicitly allowed, since their Chinese track is machine pivoted.
    args.push('--write-subs', '--sub-lang', `en,en-US,en-GB,${ZH_LANG_PREFERENCE.join(',')}`)
    if (opts.autoSubs) args.push('--write-auto-subs')
    // TED only publishes vtt; converting normalizes everything to srt-like text.
    args.push('--sub-format', 'vtt/srt/best')
  }
  if (opts.audio) {
    args.push('-x', '--audio-format', 'mp3')
  } else {
    args.push('--skip-download')
  }
  args.push(url)
  return args
}

function runYtDlp(
  args: string[],
  cookie?: string,
): Promise<{ meta: any; files: string[] }> {
  const fullArgs = cookie && cookie.trim() ? [...args, '--add-header', `Cookie: ${cookie.trim()}`] : args
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', fullArgs, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => (stdout += d))
    proc.stderr.on('data', (d) => (stderr += d))
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp exited ${code}: ${stderr.slice(-500)}`))
        return
      }
      try {
        const meta = JSON.parse(stdout.split('\n').filter((l) => l.trim().startsWith('{'))[0] || '{}')
        resolve({ meta, files: [] })
      } catch (e) {
        reject(new Error(`yt-dlp output parse failed: ${(e as Error).message}`))
      }
    })
  })
}

async function uploadFileToMinio(localPath: string, objectKey: string, contentType: string): Promise<string> {
  const client = getMinio()
  await ensureBucket(config.minio.bucket)
  const data = await readFile(localPath)
  await client.putObject(config.minio.bucket, objectKey, Readable.from(data), data.length, {
    'Content-Type': contentType,
  })
  const proto = config.minio.useSSL ? 'https' : 'http'
  return `${proto}://${config.minio.endpoint}:${config.minio.port}/${config.minio.bucket}/${objectKey}`
}

/**
 * Fetch a media item via yt-dlp: metadata + bilingual subtitles + optional audio.
 * Video file itself is NOT downloaded (per decision: store external embed URL only).
 */
export async function fetchMedia(
  url: string,
  opts: { audio?: boolean; autoSubs?: boolean; cookie?: string } = {},
): Promise<CrawledMedia> {
  const workDir = await mkdtemp(join(tmpdir(), 'wordflow-crawl-'))
  try {
    const args = ytDlpArgs(url, workDir, {
      subtitles: true,
      audio: !!opts.audio,
      autoSubs: !!opts.autoSubs,
      cookie: opts.cookie,
    })
    const { meta } = await runYtDlp(args, opts.cookie)

    const result: CrawledMedia = {
      title: meta.title ?? meta.fulltitle ?? 'Untitled',
      description: meta.description,
      thumbnailUrl: meta.thumbnail,
      durationSec: meta.duration,
      externalUrl: resolveEmbedUrl(url, meta),
    }

    // Locate subtitle files by scanning the work dir. Guessing the name from
    // `meta._filename` is unreliable because yt-dlp sanitizes titles and the
    // language suffix casing varies (.zh-cn.vtt vs .zh-Hans.vtt).
    const written = await readdir(workDir).catch(() => [] as string[])
    const subFiles = written.filter((f) => /\.(vtt|srt)$/i.test(f))

    const pickSub = async (langs: string[]): Promise<{ text: string; lang: string } | undefined> => {
      for (const lang of langs) {
        const hit = subFiles.find((f) =>
          new RegExp(`\\.${lang.replace(/-/g, '[-_]')}(\\.[^.]+)?\\.(vtt|srt)$`, 'i').test(f),
        )
        if (!hit) continue
        try {
          const text = await readFile(join(workDir, hit), 'utf8')
          if (text.trim()) return { text, lang }
        } catch {
          /* try next candidate */
        }
      }
      return undefined
    }

    const enSub = await pickSub(['en', 'en-US', 'en-GB'])
    const zhSub = await pickSub(ZH_LANG_PREFERENCE)
    result.enSubtitle = enSub?.text
    result.zhSubtitle = zhSub?.text
    result.zhSubtitleLang = zhSub?.lang
    result.hasHumanSubtitles = !!enSub && !!zhSub

    logger.info(
      { url, subFiles, enLang: enSub?.lang, zhLang: zhSub?.lang },
      'downloader: subtitle tracks resolved',
    )

    // Audio extraction -> upload to MinIO
    if (opts.audio) {
      const mp3 = written.find((f) => f.toLowerCase().endsWith('.mp3'))
      if (!mp3) {
        logger.warn({ url, written }, 'downloader: no mp3 produced by yt-dlp')
      } else {
        const audioPath = join(workDir, mp3)
        try {
          const key = `crawler/audio/${randomUUID()}.mp3`
          result.audioUrl = await uploadFileToMinio(audioPath, key, 'audio/mpeg')
          result._audioPath = audioPath
        } catch (err) {
          logger.warn({ err, url }, 'downloader: audio upload failed, skipping')
        }
      }
    }

    return result
  } finally {
    // best-effort cleanup of temp files
    try {
      const { readdir } = await import('node:fs/promises')
      const files = await readdir(workDir)
      await Promise.all(files.map((f) => unlink(join(workDir, f)).catch(() => {})))
    } catch {
      /* ignore */
    }
  }
}
