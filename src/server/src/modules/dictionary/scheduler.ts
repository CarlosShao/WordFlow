/**
 * Dictionary crawler scheduler — runs the batch crawler on a cron schedule.
 * On each tick it first tops up the word pool (content words + vocab + word
 * list), then crawls up to the daily limit. Guards against overlapping runs.
 */

import cron from 'node-cron'
import { config } from '../../config/index.js'
import { logger } from '../../common/logger.js'
import { buildWordPool } from './wordPool.js'
import { crawlDictionaryBatch, getDictionaryProgress, defaultCrawlConfig } from './crawler.js'

let isRunning = false
let cronTask: cron.ScheduledTask | null = null

/**
 * Run one crawl cycle: build/refresh the pool, then crawl up to the daily cap.
 */
export async function runDictionaryCrawlCycle(): Promise<{ added: number; result: Awaited<ReturnType<typeof crawlDictionaryBatch>> }> {
  if (isRunning) {
    logger.warn('Dictionary crawl already running, skipping this cycle')
    return { added: 0, result: { processed: 0, done: 0, notFound: 0, failed: 0, remaining: 0 } }
  }
  isRunning = true
  try {
    const { added } = await buildWordPool()
    const result = await crawlDictionaryBatch({
      ...defaultCrawlConfig,
      limit: config.dictionaryCrawl.dailyLimit,
      delayMs: config.dictionaryCrawl.delayMs,
      batchSize: config.dictionaryCrawl.batchSize,
      batchRestMs: config.dictionaryCrawl.batchRestMs,
    })
    const progress = await getDictionaryProgress()
    logger.info({ poolAdded: added, ...result, progress }, 'Dictionary crawl cycle completed')
    return { added, result }
  } finally {
    isRunning = false
  }
}

export function startDictionaryCrawlerScheduler(): void {
  if (cronTask) {
    logger.warn('Dictionary crawler scheduler already running')
    return
  }
  if (!config.dictionaryCrawl.enabled) {
    logger.info('Dictionary crawler scheduler disabled by config')
    return
  }

  cronTask = cron.schedule(config.dictionaryCrawl.cron, async () => {
    try {
      await runDictionaryCrawlCycle()
    } catch (err) {
      logger.error({ err }, 'Dictionary crawl cycle failed')
    }
  })

  logger.info({ cron: config.dictionaryCrawl.cron, dailyLimit: config.dictionaryCrawl.dailyLimit }, 'Dictionary crawler scheduler started')
}

export function stopDictionaryCrawlerScheduler(): void {
  if (cronTask) {
    cronTask.stop()
    cronTask = null
    logger.info('Dictionary crawler scheduler stopped')
  }
}