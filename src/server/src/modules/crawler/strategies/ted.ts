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

async function resolveTalkUrls(sourceUrl: string): Promise<string[]> {
  // A single talk page — crawl just that one.
  if (/ted\.com\/talks\/[a-z0-9_]+/i.test(sourceUrl)) {
    return [sourceUrl.split('?')[0]]
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
 * `source.url` may be either a TED RSS feed or a single talk page URL.
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
