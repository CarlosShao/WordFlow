import type { CrawlerSource, CrawlItem, CrawlStrategy } from '../types.js'
import { logger } from '../../../common/logger.js'
import { config } from '../../../config/index.js'

/**
 * YouTube channel / playlist crawler using YouTube Data API v3.
 * Requires YOUTUBE_API_KEY in environment.
 */
export const youtubeStrategy: CrawlStrategy = {
  async crawl(source: CrawlerSource): Promise<CrawlItem[]> {
    const apiKey = config.YOUTUBE_API_KEY
    if (!apiKey) {
      logger.warn('YOUTUBE_API_KEY not configured, skipping YouTube crawl')
      return []
    }

    // Extract channel ID or handle from URL
    const url = new URL(source.url)
    let channelId: string | undefined
    let playlistId: string | undefined

    // youtube.com/channel/UC...
    if (url.pathname.startsWith('/channel/')) {
      channelId = url.pathname.split('/channel/')[1]?.split('/')[0]
    }
    // youtube.com/@handle or youtube.com/c/name or youtube.com/user/name
    else if (url.pathname.match(/^\/(@|c\/|user\/)/)) {
      // Use search API to resolve handle to channel ID
      const handle = url.pathname.split('/').filter(Boolean).join('/')
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&key=${apiKey}`
      const searchRes = await fetch(searchUrl)
      if (!searchRes.ok) {
        logger.warn({ status: searchRes.status }, 'YouTube search API failed')
        return []
      }
      const searchData = (await searchRes.json()) as { items?: { id?: { channelId?: string } }[] }
      channelId = searchData.items?.[0]?.id?.channelId ?? undefined
    }
    // youtube.com/playlist?list=...
    else if (url.searchParams.has('list')) {
      playlistId = url.searchParams.get('list') ?? undefined
    }

    if (!channelId && !playlistId) {
      logger.warn({ url: source.url }, 'Could not extract YouTube channel or playlist ID')
      return []
    }

    // If we have a channel, get its uploads playlist
    let targetPlaylistId = playlistId
    if (channelId && !targetPlaylistId) {
      const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
      const channelRes = await fetch(channelUrl)
      if (!channelRes.ok) {
        logger.warn({ status: channelRes.status }, 'YouTube channels API failed')
        return []
      }
      const channelData = (await channelRes.json()) as {
        items?: { contentDetails?: { relatedPlaylists?: { uploads?: string } } }[]
      }
      targetPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? undefined
    }

    if (!targetPlaylistId) {
      logger.warn('No uploads playlist found for YouTube channel')
      return []
    }

    // Fetch playlist items (up to 50)
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${targetPlaylistId}&key=${apiKey}`
    const playlistRes = await fetch(playlistUrl)
    if (!playlistRes.ok) {
      logger.warn({ status: playlistRes.status }, 'YouTube playlistItems API failed')
      return []
    }

    const data = (await playlistRes.json()) as {
      items?: {
        snippet?: {
          title?: string
          description?: string
          publishedAt?: string
          channelTitle?: string
          thumbnails?: { high?: { url?: string } }
        }
        contentDetails?: { videoId?: string }
      }[]
    }

    const items: CrawlItem[] = (data.items ?? [])
      .filter((item) => item.snippet?.title && item.contentDetails?.videoId)
      .map((item) => {
        const snippet = item.snippet!
        const videoId = item.contentDetails!.videoId!
        return {
          title: snippet.title!,
          sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
          summary: snippet.description?.slice(0, 5000),
          author: snippet.channelTitle,
          publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : undefined,
          coverUrl: snippet.thumbnails?.high?.url,
        }
      })

    logger.info({ source: source.name, count: items.length }, 'YouTube videos fetched')
    return items
  },
}
