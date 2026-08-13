import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { CrawlerSource, CrawlItem, CrawlStrategy } from '../types.js'
import { logger } from '../../../common/logger.js'
import { cleanToSegments, type CleanSegment } from '../cleaner.js'
import { translateSegments } from '../translator.js'
import { fetchFullTextIfNeeded } from '../fulltext.js'

const execFileAsync = promisify(execFile)

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim()
}

function parseVoaxml(xml: string): { title: string; link: string; content?: string; desc?: string; pubDate?: string; coverUrl?: string }[] {
  const out: { title: string; link: string; content?: string; desc?: string; pubDate?: string; coverUrl?: string }[] = []
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g
  let m: RegExpExecArray | null
  while ((m = itemRegex.exec(xml)) !== null) {
    const b = m[1]!
    const title = b.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]
    const link = b.match(/<link[^>]*>([^<]+)<\/link>/)?.[1]?.trim()
    const desc = b.match(/<(?:description|summary)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary)>/)?.[1]
    const content = b.match(/<(?:content:encoded|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:content:encoded|content)>/)?.[1]
    const pubDate = b.match(/<(?:pubDate|published)[^>]*>([^<]+)<\/(?:pubDate|published)>/)?.[1]?.trim()
    // Extract cover art from media:thumbnail or itunes:image
    const mediaThumbnailMatch = b.match(/<media:thumbnail[^>]*\burl="([^"]+)"/)?.[1]
    const itunesImageMatch = b.match(/<itunes:image[^>]*\bhref="([^"]+)"/)?.[1]
    const coverUrl = mediaThumbnailMatch || itunesImageMatch
    if (title && link) {
      out.push({
        title: decodeEntities(title),
        link,
        content: content ? decodeEntities(content) : undefined,
        desc: desc ? decodeEntities(desc!) : undefined,
        pubDate,
        coverUrl,
      })
    }
  }
  return out
}

export const voaStrategy: CrawlStrategy = {
  async crawl(source: CrawlerSource): Promise<CrawlItem[]> {
    const { stdout } = await execFileAsync('curl', ['-sL', '--max-time', '30', source.url], {
      timeout: 35_000,
      maxBuffer: 10 * 1024 * 1024,
    })

    const entries = parseVoaxml(stdout)
    const items: CrawlItem[] = []
    let fullTextHits = 0

    for (const e of entries.slice(0, 20)) {
      const rawBody = e.content?.trim() || e.desc?.trim() || ''

      // VOA RSS feed descriptions are usually 1–2 short paragraphs, but the
      // article page includes the full transcript. Upgrade to full-text when
      // the RSS payload is shorter than ~600 clean chars.
      const { text: bodyText, usedFullText } = await fetchFullTextIfNeeded(e.link, rawBody, 600)
      if (usedFullText) fullTextHits++

      let segments: CleanSegment[] = cleanToSegments(bodyText)
      
      // Always translate any segment missing Chinese translation
      if (segments.length > 0) {
        const needTranslation = segments.filter(
          (s) => !s.zh || s.zh.trim() === '',
        ).length
        if (needTranslation > 0) {
          await translateSegments(segments)
        }
      }

      const translationText = segments.map((s) => s.zh ?? '').filter(Boolean).join('\n')
      const contentText = segments.map((s) => s.en).join('\n') || bodyText
      items.push({
        title: e.title,
        sourceUrl: e.link,
        summary: e.desc?.slice(0, 2000),
        content: contentText,
        publishedAt: e.pubDate ? new Date(e.pubDate) : undefined,
        coverUrl: e.coverUrl,
        translation: translationText || undefined,
        segments: segments as unknown as CrawlItem['segments'],
      })
    }

    logger.info(
      { source: source.name, count: items.length, fullTextHits },
      'VOA crawl (fulltext+translate) done',
    )
    return items
  },
}
