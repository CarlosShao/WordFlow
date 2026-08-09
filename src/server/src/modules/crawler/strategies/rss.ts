import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { CrawlerSource, CrawlItem, CrawlStrategy } from '../types.js'
import { logger } from '../../../common/logger.js'

const execFileAsync = promisify(execFile)

/**
 * Decode common HTML entities and strip CDATA wrappers
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim()
}

interface RssEntry {
  title: string
  link: string
  description?: string
  pubDate?: string
  author?: string
  itunesDuration?: string
}

/**
 * Parse RSS/Atom XML into structured entries
 */
function parseRssXml(xml: string): RssEntry[] {
  const items: RssEntry[] = []
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]!
    const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)
    const linkMatch = block.match(/<link[^>]*>([^<]+)<\/link>/)
    const descMatch = block.match(
      /<(?:description|summary)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary)>/,
    )
    const dateMatch = block.match(
      /<(?:pubDate|published|updated)[^>]*>([^<]+)<\/(?:pubDate|published|updated)>/,
    )
    const authorMatch = block.match(
      /<(?:author|dc:creator)[^>]*>([^<]+)<\/(?:author|dc:creator)>/,
    )
    const durationMatch = block.match(/<itunes:duration>([^<]+)<\/itunes:duration>/)

    if (titleMatch?.[1] && linkMatch?.[1]) {
      items.push({
        title: decodeHtmlEntities(titleMatch[1]),
        link: linkMatch[1].trim(),
        description: descMatch?.[1] ? decodeHtmlEntities(descMatch[1]) : undefined,
        pubDate: dateMatch?.[1]?.trim(),
        author: authorMatch?.[1]?.trim(),
        itunesDuration: durationMatch?.[1]?.trim(),
      })
    }
  }

  return items
}

/**
 * Convert itunes:duration (HH:MM:SS or MM:SS or seconds) to seconds
 */
function parseDuration(raw: string): number | undefined {
  const parts = raw.split(':').map(Number)
  if (parts.some(Number.isNaN)) return undefined
  if (parts.length === 3) {
    return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!
  }
  if (parts.length === 2) {
    return parts[0]! * 60 + parts[1]!
  }
  if (parts.length === 1) {
    return parts[0]!
  }
  return undefined
}

export const rssStrategy: CrawlStrategy = {
  async crawl(source: CrawlerSource): Promise<CrawlItem[]> {
    const { stdout } = await execFileAsync('curl', ['-s', source.url], {
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
    })

    const entries = parseRssXml(stdout)
    logger.info({ source: source.name, count: entries.length }, 'RSS feed parsed')

    return entries.map((entry) => ({
      title: entry.title,
      sourceUrl: entry.link,
      summary: entry.description?.slice(0, 5000),
      author: entry.author,
      publishedAt: entry.pubDate ? new Date(entry.pubDate) : undefined,
      duration: entry.itunesDuration ? parseDuration(entry.itunesDuration) : undefined,
    }))
  },
}
