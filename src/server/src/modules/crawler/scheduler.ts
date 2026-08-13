import cron from 'node-cron'
import { getPrisma } from '../../common/prisma.js'
import { logger } from '../../common/logger.js'
import { crawlSingleSource } from './service.js'

let isRunning = false
let cronTask: cron.ScheduledTask | null = null

/**
 * How often the scheduler wakes to check which sources are due (minutes).
 * crawl_interval is expressed in minutes per source; a source is due when
 * `last_crawled_at + crawl_interval` has passed. A source with crawl_interval
 * = 0 is treated as "never auto-refresh" (e.g. historical bulk imports).
 */
const TICK_CRON = '*/10 * * * *'

/** Decide whether a source is due for a crawl right now. */
function isDue(intervalMinutes: number, lastCrawledAt: Date | null, now: number): boolean {
  if (intervalMinutes <= 0) return false // 0 => never auto-refresh
  if (!lastCrawledAt) return true // never crawled => due immediately
  return now - lastCrawledAt.getTime() >= intervalMinutes * 60 * 1000
}

/**
 * Start the crawler scheduler.
 *
 * Uses a periodic tick to run each enabled source on its own `crawlInterval`
 * (minutes). Sources are crawled independently as they become due, so exam
 * sources (e.g. IELTS weekly / daily) refresh on their configured cadence
 * instead of being lumped into a single daily run.
 */
export function startCrawlerScheduler(): void {
  if (cronTask) {
    logger.warn('Crawler scheduler is already running')
    return
  }

  cronTask = cron.schedule(TICK_CRON, async () => {
    if (isRunning) {
      logger.warn('Previous crawl job still running, skipping this cycle')
      return
    }

    isRunning = true
    const now = Date.now()

    try {
      const prisma = getPrisma()
      const sources = await prisma.crawlerSource.findMany({
        where: { enabled: true },
      })

      const due = sources.filter((s) => isDue(s.crawlInterval, s.lastCrawledAt, now))
      if (due.length === 0) {
        logger.debug({ enabled: sources.length }, 'Crawler tick: no sources due')
        return
      }

      logger.info({ tickCron: TICK_CRON, enabled: sources.length, due: due.length }, 'Crawler tick started')
      const startTime = Date.now()

      let totalInserted = 0
      for (const source of due) {
        try {
          const result = await crawlSingleSource(source.id)
          totalInserted += result.inserted
        } catch (err) {
          logger.error({ err, sourceId: source.id }, 'Scheduled crawl failed for source')
        }
      }

      const duration = Date.now() - startTime
      logger.info({ totalInserted, sourceCount: due.length, durationMs: duration }, 'Crawler tick completed')
    } catch (err) {
      logger.error({ err }, 'Scheduled crawl job failed')
    } finally {
      isRunning = false
    }
  })

  logger.info({ tick: TICK_CRON }, 'Crawler scheduler started')
}

/**
 * Stop the crawler scheduler
 */
export function stopCrawlerScheduler(): void {
  if (cronTask) {
    cronTask.stop()
    cronTask = null
    logger.info('Crawler scheduler stopped')
  }
}

/**
 * Check if the scheduler is currently running a job
 */
export function isCrawlerRunning(): boolean {
  return isRunning
}