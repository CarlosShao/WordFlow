import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { CrawlerSource, CrawlItem, CrawlStrategy } from '../types.js'
import { logger } from '../../../common/logger.js'
import { cleanToSegments, type CleanSegment } from '../cleaner.js'
import { translateSegments } from '../translator.js'
import { fetchFullTextIfNeeded } from '../fulltext.js'

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
  content?: string
  pubDate?: string
  author?: string
  itunesDuration?: string
  enclosureUrl?: string
  videoUrl?: string | null
  mediaContentUrl?: string
}

/**
 * 判断一个 URL 是否是可用的图片封面资源。
 *
 * 部分 RSS 源（如 This American Life）的 <media:thumbnail> 给的是站点首页或
 * 非图片素材地址，浏览器加载时会触发 ORB 拦截（ERR_BLOCKED_BY_ORB），导致
 * 封面无法显示。这里做轻量校验：必须是 http(s) 且路径看起来指向图片文件。
 */
function isUsableCoverUrl(url: string): boolean {
  if (!url) return false
  if (!/^https?:\/\//i.test(url)) return false
  // 去掉 query 后判断路径是否带图片后缀
  const path = url.split(/[?#]/)[0]
  return /\.(jpe?g|png|webp|gif|svg|avif)$/i.test(path)
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
    // Atom: <link href="URL" />; RSS: <link>URL</link>
    let link: string | undefined
    const linkHrefMatch = block.match(/<link[^>]*\bhref="([^"]+)"/)
    const linkTextMatch = block.match(/<link[^>]*>([^<]+)<\/link>/)
    link = (linkHrefMatch?.[1] ?? linkTextMatch?.[1])?.trim()

    const descMatch = block.match(
      /<(?:description|summary)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary)>/,
    )
    const contentMatch = block.match(
      /<(?:content:encoded|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:content:encoded|content)>/,
    )
    const dateMatch = block.match(
      /<(?:pubDate|published|updated)[^>]*>([^<]+)<\/(?:pubDate|published|updated)>/,
    )
    const authorMatch = block.match(
      /<(?:author|dc:creator)[^>]*>([^<]+)<\/(?:author|dc:creator)>/,
    )
    const durationMatch = block.match(/<itunes:duration>([^<]+)<\/itunes:duration>/)
    // enclosure with audio or video URL
    const enclosureAudioMatch = block.match(/<enclosure[^>]*type="audio[^"]*"[^>]*url="([^"]+)"/)
    const enclosureVideoMatch = block.match(/<enclosure[^>]*type="video[^"]*"[^>]*url="([^"]+)"/)
    const enclosureAnyMatch = block.match(/<enclosure[^>]*url="([^"]+)"/)
    // media:content with audio/video type, or fallback to any media:content url
    const mediaContentAudioMatch = block.match(/<media:content[^>]*type="audio[^"]*"[^>]*url="([^"]+)"/)
    const mediaContentVideoMatch = block.match(/<media:content[^>]*type="video[^"]*"[^>]*url="([^"]+)"/)
    const mediaContentAnyMatch = block.match(/<media:content[^>]*url="([^"]+)"/)
    const mediaThumbnailMatch = block.match(/<media:thumbnail[^>]*url="([^"]+)"/)

    if (titleMatch?.[1] && link) {
      const audioUrl =
        enclosureAudioMatch?.[1] || mediaContentAudioMatch?.[1] || enclosureAnyMatch?.[1] || null
      const videoUrl =
        enclosureVideoMatch?.[1] || mediaContentVideoMatch?.[1] || mediaContentAnyMatch?.[1] || null
      const coverUrl = isUsableCoverUrl(mediaThumbnailMatch?.[1] ?? '')
        ? mediaThumbnailMatch?.[1]
        : undefined

      items.push({
        title: decodeHtmlEntities(titleMatch[1]),
        link,
        description: descMatch?.[1] ? decodeHtmlEntities(descMatch[1]) : undefined,
        content: contentMatch?.[1] ? decodeHtmlEntities(contentMatch[1]) : undefined,
        pubDate: dateMatch?.[1]?.trim(),
        author: authorMatch?.[1]?.trim(),
        itunesDuration: durationMatch?.[1]?.trim(),
        enclosureUrl: audioUrl ?? undefined,
        videoUrl: videoUrl ?? undefined,
        mediaContentUrl: coverUrl ?? undefined,
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

/**
 * How many entries we process in one batch for fulltext+translate pipeline.
 * Pure RSS items don't need any of that, so we keep a reasonable cap to
 * avoid hammering sites / burning LLM tokens.
 */
const ENTRIES_PER_RUN = 20

export const rssStrategy: CrawlStrategy = {
  async crawl(source: CrawlerSource): Promise<CrawlItem[]> {
    const { stdout } = await execFileAsync('curl', ['-sL', '--max-time', '30', source.url], {
      timeout: 35_000,
      maxBuffer: 10 * 1024 * 1024,
    })

    const entries = parseRssXml(stdout)
    logger.info({ source: source.name, count: entries.length }, 'RSS feed parsed')

    const out: CrawlItem[] = []
    let fullTextHits = 0
    let translatedSegments = 0

    // Articles / news feeds: try hard to get full text + translate.
    // Video (TED-like) and Podcast feeds also often ship only short descriptions.
    const needsFulltext =
      source.contentType === 'ARTICLE' ||
      source.contentType === 'VIDEO' ||
      source.contentType === 'PODCAST'
    const selected = entries.slice(0, ENTRIES_PER_RUN)

    for (const entry of selected) {
      // 1) Resolve the body text: RSS content:encoded > desc > original site fetch
      const rawBody = entry.content?.trim() || entry.description?.trim() || ''
      const { text: bodyText, usedFullText } = needsFulltext
        ? await fetchFullTextIfNeeded(entry.link, rawBody, 600)
        : { text: rawBody, usedFullText: false }

      if (usedFullText) fullTextHits++

      // 2) Clean into English segments, translate any segment missing zh
      let segments: CleanSegment[] = cleanToSegments(bodyText)
      if (segments.length > 0) {
        const needTranslation = segments.filter(
          (s) => !s.zh || s.zh.trim() === '',
        ).length
        if (needTranslation > 0) {
          await translateSegments(segments)
          translatedSegments += segments.filter((s) => s.zh).length
        }
      }

      // 3) Also count how many actually gained zh this round (for log line)
      const withZh = segments.filter((s) => s.zh).length

      const translationText = segments.map((s) => s.zh ?? '').filter(Boolean).join('\n')
      const contentText = segments.map((s) => s.en).join('\n') || bodyText

      // Detect actual content type from enclosures:
      //   video enclosure  → VIDEO (even if source defaults to ARTICLE)
      //   audio enclosure  → PODCAST
      //   otherwise        → fall back to source.contentType (ARTICLE)
      let detectedType: 'ARTICLE' | 'VIDEO' | 'PODCAST' | undefined
      if (entry.videoUrl) {
        detectedType = 'VIDEO'
      } else if (entry.enclosureUrl) {
        detectedType = 'PODCAST'
      }

      out.push({
        title: entry.title,
        sourceUrl: entry.link,
        summary: entry.description?.slice(0, 2000),
        content: contentText,
        author: entry.author,
        publishedAt: entry.pubDate ? new Date(entry.pubDate) : undefined,
        duration: entry.itunesDuration ? parseDuration(entry.itunesDuration) : undefined,
        audioUrl: entry.enclosureUrl ?? null,
        videoUrl: entry.videoUrl ?? null,
        coverUrl: entry.mediaContentUrl ?? undefined,
        translation: translationText || undefined,
        segments: segments as unknown as CrawlItem['segments'],
        type: detectedType,
      })
    }

    logger.info(
      {
        source: source.name,
        items: out.length,
        fullTextHits,
        bilingualSegments: out.reduce((n, i) => n + ((i as any).segments?.filter((s: any) => s.zh).length ?? 0), 0),
      },
      'RSS crawl (fulltext+translate) done',
    )

    return out
  },
}

