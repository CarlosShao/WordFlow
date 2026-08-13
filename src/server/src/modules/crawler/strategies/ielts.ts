/**
 * IELTS reading crawler — mini-ielts.com.
 *
 * mini-ielts.com hosts free, officially-sourced IELTS Reading passages (the
 * same text quality as real exam questions). Each passage lives at
 * `https://mini-ielts.com/<id>/reading/<slug>` and the reading body sits in a
 * `div.readingPassage` block.
 *
 * `source.url` may be:
 *   - the plain listing page            e.g. https://mini-ielts.com/reading
 *   - a category listing page           e.g. https://mini-ielts.com/reading?c=recent-actual-tests
 *   - a paginated listing page          e.g. https://mini-ielts.com/reading?page=2
 *   - a single passage page             e.g. https://mini-ielts.com/1518/reading/<slug>
 *
 * Listing pages are paginated (`?page=N`). The crawler auto-discovers the page
 * range, walks every page, dedupes passage URLs, and skips passages that were
 * already ingested in earlier runs (so running daily accumulates the full set).
 */

import type { CrawlerSource, CrawlItem, CrawlStrategy } from '../types.js'
import { logger } from '../../../common/logger.js'
import { fetchPage, htmlToText, buildExamItem, getExistingSourceUrls } from './exam.js'

/** Cap passages fetched per crawl run (each costs page fetch + LLM translation). */
const MAX_PER_RUN = 30

/** Match a mini-ielts passage detail path, e.g. `/1518/reading/<slug>` (links are relative). */
const PASSAGE_RE = /\/(\d{2,5}\/reading\/[^"'\\\s>]+)/g

/** Match listing-page pagination links, e.g. `?page=2` or `?c=general-reading&page=3`. */
const PAGE_RE = /\/reading\?[^"']*page=(\d+)/g

/** Extract unique passage detail URLs from a listing page HTML block. */
function extractPassageUrls(html: string): string[] {
  const out: string[] = []
  for (const m of html.matchAll(PASSAGE_RE)) {
    const path = m[1].split(/[?#]/)[0]
    out.push(`https://mini-ielts.com/${path}`)
  }
  return [...new Set(out)]
}

/** Discover the max page number reachable from a listing page footer. */
function maxPage(html: string): number {
  let max = 0
  for (const m of html.matchAll(PAGE_RE)) {
    const n = Number(m[1])
    if (n > max) max = n
  }
  return max
}

/**
 * Collect all passage URLs reachable from a listing URL, walking pagination.
 * Returns a stable, ordered, deduped list.
 */
async function discoverPassageUrls(listingUrl: string): Promise<string[]> {
  const base = listingUrl.split('?')[0]
  const query = listingUrl.split('?')[1]?.split('&').filter((p) => !/^page=/.test(p)).join('&') ?? ''
  const qs = query ? `?${query}` : ''

  const seen = new Set<string>()
  const pages = new Set<number>([1])

  // First fetch: seed passages + discover page range.
  const first = await fetchPage(`${base}${qs}`)
  if (!first) return []
  for (const u of extractPassageUrls(first)) seen.add(u)
  const maxP = maxPage(first)
  for (let p = 2; p <= maxP; p++) pages.add(p)

  // Walk remaining pages.
  for (const p of pages) {
    if (p === 1) continue
    const html = await fetchPage(`${base}${qs}${qs ? '&' : '?'}page=${p}`)
    if (!html) continue
    for (const u of extractPassageUrls(html)) seen.add(u)
  }

  return [...seen]
}

/** Extract the passage title + body text from a detail page. */
function parsePassage(html: string): { title: string; passage: string } | null {
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)
  const title = titleMatch ? htmlToText(titleMatch[1]) : ''

  const bodyMatch = html.match(/<div class="reading-text panel readingPassage[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/)
  if (!bodyMatch) return null
  const passage = htmlToText(bodyMatch[1])
  if (!passage) return null
  return { title: title || 'IELTS Reading', passage }
}

export const ieltsStrategy: CrawlStrategy = {
  async crawl(source: CrawlerSource): Promise<CrawlItem[]> {
    // A single passage page → crawl just it.
    if (/mini-ielts\.com\/\d+\/reading\//i.test(source.url)) {
      const html = await fetchPage(source.url)
      if (!html) return []
      const parsed = parsePassage(html)
      if (!parsed) return []
      const item = await buildExamItem({
        title: parsed.title,
        passage: parsed.passage,
        sourceUrl: source.url,
      })
      return item ? [item] : []
    }

    // Listing → discover all passages across pagination.
    const listingUrl = /mini-ielts\.com/i.test(source.url)
      ? source.url
      : 'https://mini-ielts.com/reading'
    const allUrls = await discoverPassageUrls(listingUrl)
    if (allUrls.length === 0) {
      logger.warn({ source: source.name, url: source.url }, 'IELTS: no passages discovered')
      return []
    }

    // Skip passages already ingested in earlier runs.
    const existing = await getExistingSourceUrls(source.name)
    const freshUrls = allUrls.filter((u) => !existing.has(u))
    if (freshUrls.length === 0) {
      logger.info({ source: source.name, total: allUrls.length }, 'IELTS: all passages already ingested')
      return []
    }

    const items: CrawlItem[] = []
    let skipped = 0
    for (const url of freshUrls.slice(0, MAX_PER_RUN)) {
      const html = await fetchPage(url)
      if (!html) {
        skipped++
        continue
      }
      const parsed = parsePassage(html)
      if (!parsed) {
        skipped++
        continue
      }
      const item = await buildExamItem({
        title: parsed.title,
        passage: parsed.passage,
        sourceUrl: url,
      })
      if (!item) {
        skipped++
        continue
      }
      items.push(item)
    }

    logger.info(
      { source: source.name, discovered: allUrls.length, fresh: freshUrls.length, crawled: items.length, skipped },
      'IELTS crawl done',
    )
    return items
  },
}