import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { getMinio, ensureBucket } from '../../../common/minio.js'
import { config } from '../../../config/index.js'
import { Readable } from 'node:stream'
import { logger } from '../../../common/logger.js'
import type { CrawlerSource, CrawlItem, CrawlStrategy } from '../types.js'
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

interface PodcastEntry {
  title: string
  link: string
  desc?: string
  content?: string
  pubDate?: string
  audioUrl?: string
  duration?: number
}

function parsePodcastXml(xml: string): PodcastEntry[] {
  const out: PodcastEntry[] = []
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g
  let m: RegExpExecArray | null
  while ((m = itemRegex.exec(xml)) !== null) {
    const b = m[1]!
    const title = b.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]
    const link = b.match(/<link[^>]*>([^<]+)<\/link>/)?.[1]?.trim()
    const desc = b.match(/<(?:description|summary|itunes:subtitle)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary|itunes:subtitle)>/)?.[1]
    const content = b.match(/<(?:content:encoded|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:content:encoded|content)>/)?.[1]
    const pubDate = b.match(/<(?:pubDate|published)[^>]*>([^<]+)<\/(?:pubDate|published)>/)?.[1]?.trim()
    const enclosure = b.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="audio[^"]*"/)?.[1] || b.match(/<enclosure[^>]*url="([^"]+)"/)?.[1]
    const durMatch = b.match(/<itunes:duration>([^<]+)<\/itunes:duration>/)?.[1]?.trim()
    if (title && link) {
      out.push({
        title: decodeEntities(title),
        link,
        desc: desc ? decodeEntities(desc!) : undefined,
        content: content ? decodeEntities(content!) : undefined,
        pubDate,
        audioUrl: enclosure,
        duration: durMatch ? parseDuration(durMatch) : undefined,
      })
    }
  }
  return out
}

function parseDuration(raw: string): number | undefined {
  const parts = raw.split(':').map(Number)
  if (parts.some(Number.isNaN)) return undefined
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!
  return parts[0]
}

/**
 * Download an audio file and upload it to MinIO, returning the object URL.
 */
async function uploadAudioToMinio(audioUrl: string): Promise<string | null> {
  try {
    const res = await fetch(audioUrl)
    if (!res.ok || !res.body) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const key = `crawler/podcast/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.mp3`
    const client = getMinio()
    await ensureBucket(config.minio.bucket)
    await client.putObject(config.minio.bucket, key, Readable.from(buf), buf.length, {
      'Content-Type': 'audio/mpeg',
    })
    const proto = config.minio.useSSL ? 'https' : 'http'
    return `${proto}://${config.minio.endpoint}:${config.minio.port}/${config.minio.bucket}/${key}`
  } catch (err) {
    logger.warn({ err, audioUrl }, 'podcast: audio upload to MinIO failed')
    return null
  }
}

export const podcastStrategy: CrawlStrategy = {
  async crawl(source: CrawlerSource): Promise<CrawlItem[]> {
    const { stdout } = await execFileAsync('curl', ['-s', source.url], {
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
    })
    const entries = parsePodcastXml(stdout)
    const items: CrawlItem[] = []

    for (const e of entries.slice(0, 20)) {
      // Upload audio to MinIO (if present)
      let minioAudioUrl: string | null = null
      if (e.audioUrl) {
        minioAudioUrl = await uploadAudioToMinio(e.audioUrl)
      }

      const rawBody = e.content?.trim() || e.desc?.trim() || ''
      let segments: CleanSegment[] = cleanToSegments(rawBody)
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
        duration: e.duration,
        audioUrl: minioAudioUrl || e.audioUrl || null,
        translation: translationText || undefined,
        segments: segments as unknown as CrawlItem['segments'],
      })
    }

    logger.info({ source: source.name, count: items.length }, 'Podcast crawl (audio+clean+translate) done')
    return items
  },
}
