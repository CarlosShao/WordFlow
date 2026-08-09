/**
 * AI Processing Scheduler
 *
 * Periodically checks for unprocessed content and triggers batch processing.
 * Runs every hour using node-cron.
 */

import cron from 'node-cron'
import { logger } from '../../common/logger.js'
import { batchProcessContent } from './service.js'

let isRunning = false
let cronTask: cron.ScheduledTask | null = null

/**
 * Default cron expression: every hour at minute 5
 * Staggered from crawler scheduler (which runs at 3:00 AM)
 */
const DEFAULT_CRON = '5 * * * *'

/**
 * Default batch size for scheduled processing
 */
const DEFAULT_BATCH_SIZE = 10

/**
 * Start the AI processing scheduler.
 * Checks for unprocessed content every hour.
 */
export function startAiProcessingScheduler(): void {
  if (cronTask) {
    logger.warn('AI processing scheduler is already running')
    return
  }

  cronTask = cron.schedule(DEFAULT_CRON, async () => {
    if (isRunning) {
      logger.warn('Previous AI processing job still running, skipping this cycle')
      return
    }

    isRunning = true
    const startTime = Date.now()

    try {
      logger.info('Scheduled AI processing job started')
      const result = await batchProcessContent(DEFAULT_BATCH_SIZE)

      const duration = Date.now() - startTime
      logger.info(
        { processed: result.processed, failed: result.failed, durationMs: duration },
        'Scheduled AI processing job completed',
      )
    } catch (err) {
      logger.error({ err }, 'Scheduled AI processing job failed')
    } finally {
      isRunning = false
    }
  })

  logger.info({ schedule: DEFAULT_CRON }, 'AI processing scheduler started')
}

/**
 * Stop the AI processing scheduler
 */
export function stopAiProcessingScheduler(): void {
  if (cronTask) {
    cronTask.stop()
    cronTask = null
    logger.info('AI processing scheduler stopped')
  }
}

/**
 * Check if the scheduler is currently running a job
 */
export function isAiProcessingRunning(): boolean {
  return isRunning
}
