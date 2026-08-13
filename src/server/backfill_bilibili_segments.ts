/**
 * Backfill real subtitle timestamps for Bilibili-sourced VIDEO contents.
 *
 * Root cause of the subtitle-seek bug: historical crawler data stored only
 * `en`/`zh` text in `segments` with NO `start`/`end`. The frontend then fakes
 * timestamps by evenly dividing video duration, which makes clicks seek to the
 * wrong position.
 *
 * This script reaches Bilibili's own subtitle API (which DOES carry real
 * `from`/`to` timestamps, unlike yt-dlp's CC track for re-upload accounts) and
 * writes correct `start`/`end` back into the DB.
 *
 * It only touches rows that are missing timestamps (unless --force), so it is
 * safe to re-run. Bilibili URLs are detected by hostname.
 */
import { getPrisma } from './src/common/prisma.js'
import { config } from './src/config/index.js'
import { logger } from './src/common/logger.js'

const COOKIE = config.bilibiliCookie || ''
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

interface BodyItem {
  from: number
  to: number
  content: string
}
interface Seg {
  start: number
  end: number
  en: string
  zh: string
}

function parseBvid(url: string | null | undefined): string | null {
  if (!url) return null
  const m = url.match(/BV[0-9A-Za-z]+/)
  return m ? m[0] : null
}

/** Extract the `?p=N` playlist index (1-based) from a Bilibili URL. */
function parsePage(url: string | null | undefined): number {
  if (!url) return 1
  const m = url.match(/[?&]p=(\d+)/)
  return m ? Math.max(1, parseInt(m[1], 10)) : 1
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function httpsGetJson(url: string, retries = 3): Promise<any> {
  const u = url.startsWith('//') ? 'https:' + url : url
  const headers: any = { 'User-Agent': UA, Referer: 'https://www.bilibili.com' }
  if (COOKIE) headers['Cookie'] = COOKIE
  let lastErr: any
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const r = await fetch(u, { headers })
      const j = await r.json()
      // Bilibili error codes: -412 (request blocked), -509 (rate limited)
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

async function getCid(bvid: string, page: number): Promise<number | null> {
  const j = await httpsGetJson(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`)
  const pages: any[] = j?.data?.pages || []
  const target = pages[page - 1] || pages[0]
  const cid = target?.cid
  return cid ? Number(cid) : null
}

async function getSubtitleUrls(
  bvid: string,
  cid: number,
): Promise<{ en?: string; zh?: string }> {
  const j = await httpsGetJson(
    `https://api.bilibili.com/x/player/wbi/v2?bvid=${bvid}&cid=${cid}`,
  )
  const list: any[] = j?.data?.subtitle?.subtitles || []
  const pick = (lan: string) => list.find((s) => s.lan === lan)?.subtitle_url
  const en = pick('en') || pick('en-US') || pick('english')
  const zh = pick('zh-CN') || pick('zh-Hans') || pick('zh')
  return { en, zh }
}

async function fetchSubtitleBody(url: string | undefined): Promise<BodyItem[]> {
  if (!url) return []
  const j = await httpsGetJson(url)
  return Array.isArray(j?.body) ? (j.body as BodyItem[]) : []
}

/**
 * Pair EN and ZH cues by maximum time overlap. If one side is missing, the
 * other side still gets its own time range with an empty counterpart.
 *
 * Bilibili's `from`/`to` are SECONDS; the rest of the schema (cleaner.ts)
 * stores timestamps as MILLISECONDS, so we convert here before writing.
 */
function alignSegments(enBody: BodyItem[], zhBody: BodyItem[]): Seg[] {
  const hasEn = enBody.length > 0
  const hasZh = zhBody.length > 0
  if (!hasEn && !hasZh) return []

  if (hasEn && !hasZh) {
    return enBody.map((e) => ({ start: e.from * 1000, end: e.to * 1000, en: e.content, zh: '' }))
  }
  if (!hasEn && hasZh) {
    return zhBody.map((z) => ({ start: z.from * 1000, end: z.to * 1000, en: '', zh: z.content }))
  }

  // Both present: for each EN cue, find the ZH cue with the largest overlap.
  const segs: Seg[] = []
  for (const e of enBody) {
    let best: BodyItem | null = null
    let bestOverlap = -1
    for (const z of zhBody) {
      const overlap = Math.min(e.to, z.to) - Math.max(e.from, z.from)
      if (overlap > bestOverlap) {
        bestOverlap = overlap
        best = z
      }
    }
    segs.push({
      start: e.from * 1000,
      end: e.to * 1000,
      en: e.content,
      zh: best ? best.content : '',
    })
  }
  return segs
}

function alreadyHasTimestamps(segments: any): boolean {
  const segs: any[] = Array.isArray(segments) ? segments : []
  if (segs.length === 0) return false
  return segs.some((s) => typeof s?.start === 'number' && typeof s?.end === 'number')
}

async function main() {
  const prisma = getPrisma()
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || 0)

  if (!COOKIE) {
    logger.error('BILIBILI_COOKIE is not set in env — cannot fetch subtitles')
    process.exit(1)
  }

  const rows = await prisma.content.findMany({
    where: { type: 'VIDEO', isPublished: true },
    select: {
      id: true, title: true, sourceUrl: true,
      segments: true, content: true, translation: true, duration: true,
    },
  })

  const bili = rows.filter((r) => {
    try {
      return new URL(r.sourceUrl || '').hostname.includes('bilibili')
    } catch {
      return false
    }
  })
  const pending = force ? bili : bili.filter((r) => !alreadyHasTimestamps(r.segments))
  const todo = limit > 0 ? pending.slice(0, limit) : pending

  logger.info(
    { totalVideo: rows.length, bilibili: bili.length, pending: pending.length, willProcess: todo.length },
    'backfill_bilibili_segments: plan',
  )

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
    // gentle rate limiting to avoid Bilibili anti-crawl (-412/-509)
    if (i > 0) await sleep(200)
    try {
      const page = parsePage(r.sourceUrl)
      const cid = await getCid(bvid, page)
      if (!cid) {
        logger.warn({ id: r.id }, 'no cid')
        fail++
        continue
      }
      const { en, zh } = await getSubtitleUrls(bvid, cid)
      const enBody = await fetchSubtitleBody(en)
      const zhBody = await fetchSubtitleBody(zh)
      const segs = alignSegments(enBody, zhBody)
      if (segs.length === 0) {
        logger.warn({ id: r.id, bvid }, 'no subtitle data from API')
        fail++
        continue
      }
      const content = segs.map((s) => s.en).filter(Boolean).join('\n\n')
      const translation = segs.map((s) => s.zh).filter(Boolean).join('\n\n')
      const duration = Math.ceil(segs[segs.length - 1].end)
      await prisma.content.update({
        where: { id: r.id },
        data: { segments: segs as any, content, translation, duration },
      })
      ok++
      if (i % 10 === 0) logger.info({ progress: `${i + 1}/${todo.length}`, id: r.id, segs: segs.length }, 'backfilled')
    } catch (e: any) {
      logger.error({ id: r.id, err: e?.message }, 'backfill failed')
      fail++
    }
  }

  logger.info({ ok, fail, skipped }, 'backfill_bilibili_segments: done')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
