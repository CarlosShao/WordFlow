import type { CrawlerSourceType } from '@prisma/client'
import type { CrawlStrategy } from '../types.js'
import { rssStrategy } from './rss.js'
import { webStrategy } from './web.js'
import { puppeteerStrategy } from './puppeteer.js'
import { youtubeStrategy } from './youtube.js'
import { twitterStrategy } from './twitter.js'
import { tedStrategy } from './ted.js'
import { voaStrategy } from './voa.js'
import { podcastStrategy } from './podcast.js'
import { ieltsStrategy } from './ielts.js'
import { toeflStrategy } from './toefl.js'

/**
 * Strategy registry — maps source type to its crawl implementation
 */
const strategyMap: Record<CrawlerSourceType, CrawlStrategy> = {
  RSS: rssStrategy,
  WEB: webStrategy,
  PUPPETEER: puppeteerStrategy,
  YOUTUBE: youtubeStrategy,
  TWITTER: twitterStrategy,
  TED: tedStrategy,
  VOA: voaStrategy,
  PODCAST: podcastStrategy,
  IELTS: ieltsStrategy,
  TOEFL: toeflStrategy,
}

/**
 * Get the crawl strategy for a given source type
 */
export function getStrategy(type: CrawlerSourceType): CrawlStrategy {
  const strategy = strategyMap[type]
  if (!strategy) {
    throw new Error(`No crawl strategy registered for type: ${type}`)
  }
  return strategy
}
