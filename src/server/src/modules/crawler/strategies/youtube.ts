import type { CrawlerSource, CrawlItem, CrawlStrategy } from '../types.js'
import { logger } from '../../../common/logger.js'
import { config } from '../../../config/index.js'
import { buildItemFromMedia } from './mediaItem.js'

/**
 * Resolve a YouTube channel/playlist URL to a list of video URLs via Data API.
 */
async function resolveVideoUrls(source: CrawlerSource): Promise<string[]> {
  const apiKey = config.youtubeApiKey
  if (!apiKey) {
    logger.warn('YOUTUBE_API_KEY not configured; falling back to single URL')
    return [source.url]
  }

  const url = new URL(source.url)
  let channelId: string | undefined
  let playlistId: string | undefined

  if (url.pathname.startsWith('/channel/')) {
    channelId = url.pathname.split('/channel/')[1]?.split('/')[0]
  } else if (url.pathname.match(/^\/(@|c\/|user\/)/)) {
    const handle = url.pathname.split('/').filter(Boolean).join('/')
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&key=${apiKey}`,
    )
    if (!searchRes.ok) return [source.url]
    const searchData = (await searchRes.json()) as { items?: { id?: { channelId?: string } }[] }
    channelId = searchData.items?.[0]?.id?.channelId ?? undefined
  } else if (url.searchParams.has('list')) {
    playlistId = url.searchParams.get('list') ?? undefined
  }

  if (channelId && !playlistId) {
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`,
    )
    if (channelRes.ok) {
      const d = (await channelRes.json()) as {
        items?: { contentDetails?: { relatedPlaylists?: { uploads?: string } } }[]
      }
      playlistId = d.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
    }
  }
  if (!playlistId) return [source.url]

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=20&playlistId=${playlistId}&key=${apiKey}`,
  )
  if (!res.ok) return [source.url]
  const data = (await res.json()) as { items?: { contentDetails?: { videoId?: string } }[] }
  const ids = (data.items ?? []).map((i) => i.contentDetails?.videoId).filter(Boolean) as string[]
  return ids.map((id) => `https://www.youtube.com/watch?v=${id}`)
}

export const youtubeStrategy: CrawlStrategy = {
  async crawl(source: CrawlerSource): Promise<CrawlItem[]> {
    const videoUrls = await resolveVideoUrls(source)
    const items: CrawlItem[] = []
    for (const url of videoUrls.slice(0, 20)) {
      const item = await buildItemFromMedia(url, { audio: false })
      if (item) items.push(item)
    }
    logger.info({ source: source.name, count: items.length }, 'YouTube crawl (yt-dlp pipeline) done')
    return items
  },
}
