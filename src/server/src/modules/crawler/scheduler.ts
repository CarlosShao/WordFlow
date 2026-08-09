import cron from 'node-cron'
import { getPrisma } from '../../common/prisma.js'
import { logger } from '../../common/logger.js'
import { crawlSingleSource } from './service.js'

let isRunning = false
let cronTask: cron.ScheduledTask | null = null

/**
 * Default cron expression: every day at 3:00 AM
 */
const DEFAULT_CRON = '0 3 * * *'

/**
 * Start the crawler scheduler.
 * Uses node-cron to schedule periodic crawling of all enabled sources.
 * Default schedule: daily at 3:00 AM.
 * Individual sources can have custom intervals via crawlInterval field.
 */
export function startCrawlerScheduler(): void {
  if (cronTask) {
    logger.warn('Crawler scheduler is already running')
    return
  }

  cronTask = cron.schedule(DEFAULT_CRON, async () => {
    if (isRunning) {
      logger.warn('Previous crawl job still running, skipping this cycle')
      return
    }

    isRunning = true
    const startTime = Date.now()

    try {
      logger.info('Scheduled crawl job started')
      const prisma = getPrisma()
      const sources = await prisma.crawlerSource.findMany({
        where: { enabled: true },
      })

      let totalInserted = 0
      for (const source of sources) {
        try {
          const result = await crawlSingleSource(source.id)
          totalInserted += result.inserted
        } catch (err) {
          logger.error({ err, sourceId: source.id }, 'Scheduled crawl failed for source')
        }
      }

      const duration = Date.now() - startTime
      logger.info({ totalInserted, sourceCount: sources.length, durationMs: duration }, 'Scheduled crawl job completed')
    } catch (err) {
      logger.error({ err }, 'Scheduled crawl job failed')
    } finally {
      isRunning = false
    }
  })

  logger.info({ schedule: DEFAULT_CRON }, 'Crawler scheduler started')
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
