/**
 * Re-time Bilibili VIDEO contents onto Bilibili's official ai-zh cue timeline.
 *
 * Problem fixed: `stepaudio-2.5-asr` SSE returns plain text with no word-level
 * timestamps, so `transcribeAudio` chunks audio into 25s windows and sentences
 * inside each window get timestamps by character-proportion (not real speech
 * pace). Bilibili's official `ai-zh` subtitle track carries cue-level REAL
 * timestamps (2-5s per cue), which were downloaded & validated during crawl but
 * ignored for timing.
 *
 * This script reuses the ALREADY-TRANSCRIBED English text stored in
 * `content` (NO re-ASR, NO re-downloading audio) and re-aligns it onto the
 * official ai-zh cue timeline via `alignAsrToChineseTimeline`. Only the
 * `segments` / `translation` fields are rewritten; `content`, `duration` and
 * everything else stay untouched.
 *
 * Rate limiting: 1.2s between videos, view API cached per BV (Steve's 100
 * parts share one BV), so the full 119 rows take ~5-10 minutes.
 *
 * Usage: npx tsx backfill_bili_timeline.ts [--limit=N]
 */
import { getPrisma } from './src/common/prisma.js'
import { config } from './src/config/index.js'
import { logger } from './src/common/logger.js'
import { alignAsrFillCues, parseSubtitles } from './src/modules/crawler/cleaner.js'

const COOKIE =
  config.bilibiliCookie ||
  (process.env.BILIBILI_SESSDATA ? `SESSDATA=${process.env.BILIBILI_SESSDATA}` : '')
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

interface BodyItem {
  from: number
  to: number
  content: string
}

function parseBvid(url: string | null | undefined): string | null {
  if (!url) return null
  const m = url.match(/BV[0-9A-Za-z]+/)
  return m ? m[0] : null
}

function parsePage(url: string | null | undefined): number {
  if (!url) return 1
  const m = url.match(/[?&]p=(\d+)/)
  return m ? Math.max(1, parseInt(m[1], 10)) : 1
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function httpsGetJson(url: string, retries = 4): Promise<any> {
  const u = url.startsWith('//') ? 'https:' + url : url
  const headers: any = { 'User-Agent': UA, Referer: 'https://www.bilibili.com' }
  if (COOKIE) headers['Cookie'] = COOKIE
  let lastErr: any
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const r = await fetch(u, { headers })
      const j = await r.json()
      if (j && typeof j.code === 'number' && j.code < 0) {
        await sleep(800 * (attempt + 1))
        lastErr = new Error(`bili code ${j.code}`)
        continue
      }
      return j
    } catch (e) {
      lastErr = e
      await sleep(800 * (attempt + 1))
    }
  }
  throw lastErr
}

/** zh track preference: ai-zh > zh-CN/zh-Hans > any zh. Mirrors strategies/bilibili.ts. */
function zhScore(lan: string): number {
  if (lan === 'ai-zh') return 3
  if (['zh-CN', 'zh-Hans', 'zh-cn', 'zh-hans'].includes(lan)) return 2
  if (lan.startsWith('zh')) return 1
  return 0
}

// View API cached per BV — Steve's 100 parts share one BV, cutting 100 → 1 call.
const cidCache = new Map<string, number[]>()
async function getCids(bvid: string): Promise<number[]> {
  const hit = cidCache.get(bvid)
  if (hit) return hit
  const j = await httpsGetJson(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`)
  const cids = ((j?.data?.pages as any[]) || []).map((p) => Number(p.cid)).filter(Boolean)
  cidCache.set(bvid, cids)
  return cids
}

async function getBestZhUrl(bvid: string, cid: number): Promise<string | null> {
  // Use the wbi-signed endpoint: the legacy x/player/v2 endpoint is downgraded
  // by Bilibili (returns the track list but with an EMPTY subtitle_url), while
  // x/player/wbi/v2 returns the real subtitle download URL.
  const j = await httpsGetJson(`https://api.bilibili.com/x/player/wbi/v2?bvid=${bvid}&cid=${cid}`)
  const list: any[] = j?.data?.subtitle?.subtitles || []
  const best = list
    .filter((t) => zhScore(String(t.lan)) > 0)
    .sort((a, b) => zhScore(String(b.lan)) - zhScore(String(a.lan)))[0]
  return best?.subtitle_url || null
}

async function fetchSubtitleBody(url: string | null | undefined): Promise<BodyItem[]> {
  if (!url) return []
  const u = url.startsWith('//') ? 'https:' + url : url
  const j = await httpsGetJson(u)
  return Array.isArray(j?.body) ? (j.body as BodyItem[]) : []
}

/** Convert Bilibili subtitle body ({from,to,content}) to SRT text that
 *  `parseSubtitles` understands (timestamps in seconds). */
function bodyToSrt(body: BodyItem[]): string {
  const fmt = (sec: number) => {
    const ms = Math.round(sec * 1000)
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    const mm = ms % 1000
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(mm).padStart(3, '0')}`
  }
  return body
    .map((cue, i) => `${i + 1}\n${fmt(cue.from)} --> ${fmt(cue.to)}\n${cue.content.replace(/\n/g, ' ')}\n`)
    .join('\n')
}

async function main() {
  const prisma = getPrisma()
  const limit = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || 0)

  if (!COOKIE) {
    logger.error('BILIBILI_COOKIE / BILIBILI_SESSDATA is not set in env — cannot fetch subtitles')
    process.exit(1)
  }

  const rows = await prisma.content.findMany({
    where: {
      type: 'VIDEO',
      isPublished: true,
      OR: [{ source: { contains: 'Steve' } }, { source: { contains: 'SNL' } }],
    },
    select: { id: true, title: true, sourceUrl: true, content: true, duration: true },
  })
  const todo = limit > 0 ? rows.slice(0, limit) : rows
  logger.info({ total: rows.length, willProcess: todo.length }, 'backfill_bili_timeline: plan')

  let ok = 0
  let fail = 0
  let skipped = 0

  for (let i = 0; i < todo.length; i++) {
    const r = todo[i]
    const bvid = parseBvid(r.sourceUrl)
    if (!bvid) {
      skipped++
      continue
    }
    if (i > 0) await sleep(1200)
    try {
      const page = parsePage(r.sourceUrl)
      const cids = await getCids(bvid)
      const cid = cids[page - 1] ?? cids[0]
      if (!cid) {
        logger.warn({ id: r.id, bvid }, 'no cid')
        fail++
        continue
      }
      const zhUrl = await getBestZhUrl(bvid, cid)
      if (!zhUrl) {
        logger.warn({ id: r.id, bvid, page }, 'no zh subtitle track')
        skipped++
        continue
      }
      const body = await fetchSubtitleBody(zhUrl)
      if (body.length === 0) {
        logger.warn({ id: r.id, bvid, page }, 'empty zh subtitle body')
        skipped++
        continue
      }
      const srt = bodyToSrt(body)
      const cues = parseSubtitles(srt)
      const cueCount = cues.length
      if (cueCount === 0) {
        logger.warn({ id: r.id, bvid, page }, 'no parseable cues')
        skipped++
        continue
      }
      // ai-zh cue timestamps are the authoritative speech timeline (Bilibili's
      // own ASR). Fill English text into each cue window by character share —
      // segments land on the real speech timeline (P1 verified against
      // playback: @3s closest friends, @5s she's 73 years old).
      const segments = alignAsrFillCues(r.content ?? '', cues)
      if (segments.length === 0) {
        logger.warn({ id: r.id, bvid, page }, 'no segments after alignment')
        fail++
        continue
      }
      const translation = segments.map((s) => s.zh ?? '').filter(Boolean).join('\n')
      await prisma.content.update({
        where: { id: r.id },
        data: { segments: segments as any, translation: translation || undefined },
      })
      ok++
      if (i % 10 === 0) {
        logger.info({ progress: `${i + 1}/${todo.length}`, id: r.id, segs: segments.length, cues: cueCount }, 're-timed')
      }
    } catch (e: any) {
      logger.error({ id: r.id, err: e?.message }, 're-time failed')
      fail++
    }
  }

  logger.info({ ok, fail, skipped }, 'backfill_bili_timeline: done')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
