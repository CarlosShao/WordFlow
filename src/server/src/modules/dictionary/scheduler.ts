/**
 * Dictionary crawler scheduler — runs the batch crawler on a cron schedule.
 * On each tick it first tops up the word pool (content words + vocab + word
 * list), then crawls up to the daily limit. Guards against overlapping runs.
 */

import cron from 'node-cron'
import { config } from '../../config/index.js'
import { logger } from '../../common/logger.js'
import { getRedis } from '../../common/redis.js'
import { buildWordPool } from './wordPool.js'
import { crawlDictionaryBatch, getDictionaryProgress, defaultCrawlConfig } from './crawler.js'

let isRunning = false
let cronTask: cron.ScheduledTask | null = null

/**
 * Redis key marking that today's daily crawl cycle has already completed.
 * Used to (a) avoid re-running on every hot-reload / api restart, and
 * (b) let the startup catch-up logic skip a day that already ran.
 */
function todayDoneKey(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `dict:crawl:done:${yyyy}-${mm}-${dd}`
}

async function markTodayDone(): Promise<void> {
  try {
    const redis = getRedis()
    // Keep the marker for 48h so it survives across a day boundary safely.
    await redis.set(todayDoneKey(), '1', 'EX', 48 * 60 * 60)
  } catch (err) {
    logger.error({ err }, 'Failed to mark today crawl done in redis')
  }
}

/**
 * Whether today's daily crawl has already completed. Returns false on any
 * redis error so a catch-up run is never wrongly suppressed.
 */
async function hasRunToday(): Promise<boolean> {
  try {
    const redis = getRedis()
    const v = await redis.get(todayDoneKey())
    return v === '1'
  } catch (err) {
    logger.error({ err }, 'Failed to read today crawl marker from redis')
    return false
  }
}

/**
 * Run one crawl cycle: build/refresh the pool, then crawl up to the daily cap.
 * Marks today as done on success so restart / hot-reload won't re-trigger.
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
    if (result.processed > 0) await markTodayDone()
    return { added, result }
  } finally {
    isRunning = false
  }
}

/**
 * On api startup, if today's cycle hasn't run yet, run it immediately.
 * This makes the crawler resilient to the dev machine being off at the
 * scheduled cron time (e.g. 3am) — whenever the user boots the machine and
 * the api comes up, the missed daily crawl is caught up automatically.
 */
export async function runCatchUpIfNeeded(): Promise<void> {
  if (!config.dictionaryCrawl.enabled) return
  if (await hasRunToday()) {
    logger.info('Today dictionary crawl already ran, skipping startup catch-up')
    return
  }
  logger.info('Startup catch-up: today crawl not yet run, triggering now')
  try {
    await runDictionaryCrawlCycle()
  } catch (err) {
    logger.error({ err }, 'Startup dictionary crawl catch-up failed')
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
      if (await hasRunToday()) {
        logger.info('Today dictionary crawl already ran, skipping scheduled tick')
        return
      }
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