import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { CrawlerSource, CrawlItem, CrawlStrategy } from '../types.js'
import { logger } from '../../../common/logger.js'
import { cleanToSegments, isMostlyEnglish, type CleanSegment } from '../cleaner.js'
import { translateSegments } from '../translator.js'

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

function parseVoaxml(xml: string): { title: string; link: string; content?: string; desc?: string; pubDate?: string }[] {
  const out: { title: string; link: string; content?: string; desc?: string; pubDate?: string }[] = []
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g
  let m: RegExpExecArray | null
  while ((m = itemRegex.exec(xml)) !== null) {
    const b = m[1]!
    const title = b.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]
    const link = b.match(/<link[^>]*>([^<]+)<\/link>/)?.[1]?.trim()
    const desc = b.match(/<(?:description|summary)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary)>/)?.[1]
    const content = b.match(/<(?:content:encoded|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:content:encoded|content)>/)?.[1]
    const pubDate = b.match(/<(?:pubDate|published)[^>]*>([^<]+)<\/(?:pubDate|published)>/)?.[1]?.trim()
    if (title && link) {
      out.push({
        title: decodeEntities(title),
        link,
        content: content ? decodeEntities(content) : undefined,
        desc: desc ? decodeEntities(desc!) : undefined,
        pubDate,
      })
    }
  }
  return out
}

export const voaStrategy: CrawlStrategy = {
  async crawl(source: CrawlerSource): Promise<CrawlItem[]> {
    const { stdout } = await execFileAsync('curl', ['-s', source.url], {
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
    })

    const entries = parseVoaxml(stdout)
    const items: CrawlItem[] = []

    for (const e of entries.slice(0, 20)) {
      const rawBody = e.content?.trim() || e.desc?.trim() || ''
      let segments: CleanSegment[] = cleanToSegments(rawBody)

      // VOA Learning English is English-only; translate if no Chinese present
      if (segments.length > 0 && segments.every((s) => isMostlyEnglish(s.en))) {
        await translateSegments(segments)
      }

      const translationText = segments.map((s) => s.zh ?? '').filter(Boolean).join('\n')
      items.push({
        title: e.title,
        sourceUrl: e.link,
        summary: e.desc?.slice(0, 2000),
        content: rawBody,
        publishedAt: e.pubDate ? new Date(e.pubDate) : undefined,
        translation: translationText || undefined,
        segments: segments as unknown as CrawlItem['segments'],
      })
    }

    logger.info({ source: source.name, count: items.length }, 'VOA crawl (clean+translate) done')
    return items
  },
}
