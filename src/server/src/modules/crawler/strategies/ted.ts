import type { CrawlerSource, CrawlItem, CrawlStrategy } from '../types.js'
import { logger } from '../../../common/logger.js'
import { buildItemFromMedia } from './mediaItem.js'

/** Official TED video podcast feed; every item links to a ted.com talk page. */
const TED_DEFAULT_FEED = 'https://feeds.feedburner.com/TEDTalks_video'

/** Cap per crawl run — each talk costs one yt-dlp invocation. */
const MAX_TALKS_PER_RUN = 20

/**
 * Extract `https://www.ted.com/talks/...` URLs from a TED RSS feed.
 * Tracking query strings are dropped so the same talk always yields one URL.
 */
function extractTalkUrls(xml: string): string[] {
  const urls = new Set<string>()
  const re = /https?:\/\/(?:www\.)?ted\.com\/talks\/[a-z0-9_]+/gi
  for (const match of xml.matchAll(re)) {
    urls.add(match[0].replace(/^http:/, 'https:'))
  }
  return [...urls]
}

/**
 * Pull talk URLs from the public `ted.com/talks` listing.
 *
 * The listing is server-rendered HTML with JSON-LD payloads plus the common
 * pattern `{ href: "/talks/<slug>", ... }`.  We parse N pages starting from
 * `page=1` and stop as soon as a page yields nothing new or we hit the cap.
 */
export async function discoverTedTalkUrls(opts: {
  pageStart?: number
  pageEnd?: number
  max?: number
  topics?: string[]
}): Promise<string[]> {
  const { pageStart = 1, pageEnd = 5, max = 100, topics = [] } = opts
  const out = new Set<string>()

  for (let page = pageStart; page <= pageEnd; page++) {
    if (out.size >= max) break
    const qs = new URLSearchParams()
    qs.set('page', String(page))
    if (topics.length) qs.set('topics', topics.join(','))

    const url = `https://www.ted.com/talks?${qs.toString()}`
    let html: string
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WordFlowBot/1.0)' } })
      if (!res.ok) {
        logger.warn({ status: res.status, url }, 'TED discover: page fetch failed')
        break
      }
      html = await res.text()
    } catch (err) {
      logger.warn({ err, url }, 'TED discover: fetch threw')
      break
    }

    const before = out.size
    // Case 1: absolute / protocol-less talk hrefs in the markup
    const hrefRe = /href=["'](?:https?:\/\/(?:www\.)?ted\.com)?\/talks\/([a-z0-9_]+)["']/gi
    for (const m of html.matchAll(hrefRe)) {
      out.add(`https://www.ted.com/talks/${m[1]}`)
      if (out.size >= max) break
    }
    // Case 2: JSON-LD / embedded data containing talk slugs
    const slugRe = /"slug"\s*:\s*"([a-z0-9_]+)"/gi
    for (const m of html.matchAll(slugRe)) {
      out.add(`https://www.ted.com/talks/${m[1]}`)
      if (out.size >= max) break
    }
    // Case 3: URLs mentioned as plain text (rare, but helps)
    const plainRe = /https?:\/\/(?:www\.)?ted\.com\/talks\/[a-z0-9_]+/gi
    for (const m of html.matchAll(plainRe)) {
      out.add(m[0])
      if (out.size >= max) break
    }

    logger.debug({ page, added: out.size - before, total: out.size }, 'TED discover page processed')
    // If the page yielded nothing new and page > 1, we probably reached the end.
    if (out.size === before && page > 1) break
  }

  const list = [...out].slice(0, max)
  logger.info({ count: list.length, requestedMax: max }, 'TED: discovered historical talks')
  return list
}

async function resolveTalkUrls(sourceUrl: string): Promise<string[]> {
  // A single talk page — crawl just that one.
  if (/ted\.com\/talks\/[a-z0-9_]+/i.test(sourceUrl)) {
    return [sourceUrl.split('?')[0]]
  }

  // ted.com/talks listing (optionally with page/query params) → discover URLs
  if (/ted\.com\/talks(?:\?|$)/i.test(sourceUrl)) {
    const u = new URL(sourceUrl)
    const pageEnd = Math.min(Number(u.searchParams.get('pageEnd') || 5), 20)
    const pageStart = Math.max(1, Number(u.searchParams.get('pageStart') || 1))
    const max = Math.min(Number(u.searchParams.get('max') || 100), 500)
    const topics = u.searchParams.get('topics')?.split(',').filter(Boolean) || []
    return discoverTedTalkUrls({ pageStart, pageEnd, max, topics })
  }

  const feedUrl = /^https?:\/\//i.test(sourceUrl) ? sourceUrl : TED_DEFAULT_FEED
  const res = await fetch(feedUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WordFlowBot/1.0)' },
  })
  if (!res.ok) {
    throw new Error(`TED feed fetch failed: ${res.status} ${res.statusText}`)
  }
  return extractTalkUrls(await res.text())
}

/**
 * TED crawler.
 *
 * Talks are always fetched from their `ted.com` page rather than YouTube.
 * This is deliberate and verified: ted.com publishes *human* subtitle tracks
 * (`en` plus volunteer translations such as `zh-cn`), while the same talk on
 * YouTube only exposes auto-generated captions whose Chinese track is machine
 * translated through a pivot language. Using ted.com therefore yields exact
 * bilingual transcripts with no AI involvement.
 *
 * `source.url` may be:
 *   - a TED RSS feed
 *   - a single talk page URL   (e.g. https://www.ted.com/talks/<slug>)
 *   - the listing page         (e.g. https://www.ted.com/talks?pageEnd=10&max=100)
 */
export const tedStrategy: CrawlStrategy = {
  async crawl(source: CrawlerSource): Promise<CrawlItem[]> {
    const talkUrls = await resolveTalkUrls(source.url)
    if (talkUrls.length === 0) {
      logger.warn({ source: source.name, url: source.url }, 'TED: no talk URLs resolved')
      return []
    }

    const items: CrawlItem[] = []
    let skipped = 0
    for (const url of talkUrls.slice(0, MAX_TALKS_PER_RUN)) {
      const item = await buildItemFromMedia(url, { audio: false })
      if (!item) {
        skipped += 1
        continue
      }
      item.title = item.title.replace(/\s*\|\s*TED\s*Talks?\s*$/i, '').trim()
      items.push(item)
    }

    logger.info(
      { source: source.name, resolved: talkUrls.length, crawled: items.length, skipped },
      'TED crawl done',
    )
    return items
  },
}

