import type { CrawlerSource, CrawlItem, CrawlStrategy } from '../types.js'
import { logger } from '../../../common/logger.js'
import { config } from '../../../config/index.js'

/**
 * Twitter/X user timeline crawler using Twitter API v2.
 * Requires TWITTER_BEARER_TOKEN in environment.
 */
export const twitterStrategy: CrawlStrategy = {
  async crawl(source: CrawlerSource): Promise<CrawlItem[]> {
    const bearerToken = config.twitterBearerToken
    if (!bearerToken) {
      logger.warn('TWITTER_BEARER_TOKEN not configured, skipping Twitter crawl')
      return []
    }

    // Extract username from URL (twitter.com/username or x.com/username)
    const url = new URL(source.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const username = segments[0]

    if (!username) {
      logger.warn({ url: source.url }, 'Could not extract Twitter username from URL')
      return []
    }

    // First, look up user ID
    const userLookupUrl = `https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}`
    const userRes = await fetch(userLookupUrl, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    })

    if (!userRes.ok) {
      logger.warn({ status: userRes.status }, 'Twitter user lookup failed')
      return []
    }

    const userData = (await userRes.json()) as { data?: { id: string } }
    const userId = userData.data?.id
    if (!userId) {
      logger.warn({ username }, 'Twitter user not found')
      return []
    }

    // Fetch recent tweets (max 100)
    const tweetsUrl = `https://api.twitter.com/2/users/${userId}/tweets?max_results=100&tweet.fields=created_at,public_metrics,entities&expansions=attachments.media_keys&media.fields=url,preview_image_url,duration_ms`
    const tweetsRes = await fetch(tweetsUrl, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    })

    if (!tweetsRes.ok) {
      logger.warn({ status: tweetsRes.status }, 'Twitter tweets API failed')
      return []
    }

    const tweetsData = (await tweetsRes.json()) as {
      data?: {
        id: string
        text: string
        created_at?: string
        attachments?: { media_keys?: string[] }
      }[]
      includes?: {
        media?: {
          media_key: string
          type: string
          url?: string
          preview_image_url?: string
          duration_ms?: number
        }[]
      }
    }

    // Build media lookup map
    const mediaMap = new Map<string, { url?: string; preview_image_url?: string; duration_ms?: number }>()
    for (const media of tweetsData.includes?.media ?? []) {
      mediaMap.set(media.media_key, {
        url: media.url ?? media.preview_image_url,
        preview_image_url: media.preview_image_url,
        duration_ms: media.duration_ms,
      })
    }

    const items: CrawlItem[] = (tweetsData.data ?? []).map((tweet) => {
      // Find first image/video media
      const mediaKeys = tweet.attachments?.media_keys ?? []
      const firstMedia = mediaKeys.length ? mediaMap.get(mediaKeys[0]!) : undefined

      return {
        title: tweet.text.slice(0, 200),
        sourceUrl: `https://twitter.com/${username}/status/${tweet.id}`,
        summary: tweet.text,
        author: username,
        publishedAt: tweet.created_at ? new Date(tweet.created_at) : undefined,
        coverUrl: firstMedia?.url ?? firstMedia?.preview_image_url,
        duration: firstMedia?.duration_ms ? Math.round(firstMedia.duration_ms / 1000) : undefined,
      }
    })

    logger.info({ source: source.name, count: items.length }, 'Twitter tweets fetched')
    return items
  },
}
