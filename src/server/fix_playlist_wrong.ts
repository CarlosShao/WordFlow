/**
 * Targeted fix for the 37 residual Bilibili playlist rows that were
 * mis-backfilled with the p=1 episode's subtitles (the original bug where
 * getCid ignored ?p=N). This script ONLY touches rows whose first segment
 * matches the p=1 episode of the same BV (i.e. still wrong), and re-fetches
 * the correct subtitle for their own ?p=N. Low request rate to avoid Bilibili
 * rate-limiting. Re-runnable.
 */
import { getPrisma } from './src/common/prisma.js'
import { config } from './src/config/index.js'
import { logger } from './src/common/logger.js'

const COOKIE = config.bilibiliCookie || ''
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

interface BodyItem { from: number; to: number; content: string }
interface Seg { start: number; end: number; en: string; zh: string }

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
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

async function httpsGetJson(url: string, retries = 5): Promise<any> {
  const u = url.startsWith('//') ? 'https:' + url : url
  const headers: any = { 'User-Agent': UA, Referer: 'https://www.bilibili.com' }
  if (COOKIE) headers['Cookie'] = COOKIE
  let lastErr: any
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const r = await fetch(u, { headers })
      const j = await r.json()
      if (j && typeof j.code === 'number' && j.code < 0) {
        await sleep(1500 * (attempt + 1))
        lastErr = new Error(`bili code ${j.code}`)
        continue
      }
      return j
    } catch (e) {
      lastErr = e
      await sleep(1500 * (attempt + 1))
    }
  }
  throw lastErr
}

const cidCache = new Map<string, { pages: any[] }>()
async function getPages(bvid: string): Promise<any[]> {
  if (cidCache.has(bvid)) return cidCache.get(bvid)!.pages
  const j = await httpsGetJson(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`)
  const pages = j?.data?.pages || []
  cidCache.set(bvid, { pages })
  return pages
}

async function getSubtitleUrls(bvid: string, cid: number): Promise<{ en?: string; zh?: string }> {
  const j = await httpsGetJson(`https://api.bilibili.com/x/player/wbi/v2?bvid=${bvid}&cid=${cid}`)
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
function alignSegments(enBody: BodyItem[], zhBody: BodyItem[]): Seg[] {
  const hasEn = enBody.length > 0, hasZh = zhBody.length > 0
  if (!hasEn && !hasZh) return []
  if (hasEn && !hasZh) return enBody.map((e) => ({ start: e.from, end: e.to, en: e.content, zh: '' }))
  if (!hasEn && hasZh) return zhBody.map((z) => ({ start: z.from, end: z.to, en: '', zh: z.content }))
  return enBody.map((e) => {
    let best: BodyItem | null = null, bestOverlap = -1
    for (const z of zhBody) {
      const overlap = Math.min(e.to, z.to) - Math.max(e.from, z.from)
      if (overlap > bestOverlap) { bestOverlap = overlap; best = z }
    }
    return { start: e.from, end: e.to, en: e.content, zh: best ? best.content : '' }
  })
}

async function main() {
  const prisma = getPrisma()
  if (!COOKIE) { logger.error('BILIBILI_COOKIE not set'); process.exit(1) }

  const rows = await prisma.content.findMany({
    where: { type: 'VIDEO', isPublished: true, sourceUrl: { contains: 'bilibili' } },
    select: { id: true, sourceUrl: true, segments: true, content: true, translation: true, duration: true },
  })

  // baseline: first-seg signature of each BV's p=1 episode
  const p1sig = new Map<string, string>()
  for (const r of rows) {
    if (parsePage(r.sourceUrl) !== 1) continue
    const s = (r.segments as any[])?.[0]
    if (s) p1sig.set(parseBvid(r.sourceUrl)!, JSON.stringify({ start: s.start, end: s.end, en: s.en, zh: s.zh }))
  }

  const todo: any[] = []
  for (const r of rows) {
    const bvid = parseBvid(r.sourceUrl)
    if (!bvid) continue
    if (parsePage(r.sourceUrl) === 1) continue
    const s = (r.segments as any[])?.[0]
    const sig = s ? JSON.stringify({ start: s.start, end: s.end, en: s.en, zh: s.zh }) : ''
    if (sig && p1sig.get(bvid) === sig) todo.push(r) // still wrong
  }

  logger.info({ total: rows.length, wrong: todo.length }, 'fix_playlist_wrong: plan')

  let ok = 0, fail = 0
  for (let i = 0; i < todo.length; i++) {
    const r = todo[i]
    const bvid = parseBvid(r.sourceUrl)!
    const page = parsePage(r.sourceUrl)
    try {
      const pages = await getPages(bvid)
      const target = pages[page - 1] || pages[0]
      const cid = target?.cid
      if (!cid) { fail++; continue }
      await sleep(1500) // slow down between distinct episodes
      const { en, zh } = await getSubtitleUrls(bvid, Number(cid))
      const enBody = await fetchSubtitleBody(en)
      const zhBody = await fetchSubtitleBody(zh)
      const segs = alignSegments(enBody, zhBody)
      if (segs.length === 0) { logger.warn({ id: r.id }, 'no subtitle'); fail++; continue }
      const content = segs.map((s) => s.en).filter(Boolean).join('\n\n')
      const translation = segs.map((s) => s.zh).filter(Boolean).join('\n\n')
      const duration = Math.ceil(segs[segs.length - 1].end)
      await prisma.content.update({
        where: { id: r.id },
        data: { segments: segs as any, content, translation, duration },
      })
      ok++
      logger.info({ progress: `${i + 1}/${todo.length}`, id: r.id, p: page, segs: segs.length }, 'fixed')
    } catch (e: any) {
      logger.error({ id: r.id, err: e?.message }, 'fix failed')
      fail++
    }
  }
  logger.info({ ok, fail }, 'fix_playlist_wrong: done')
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
