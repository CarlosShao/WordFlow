import type { FastifyInstance } from 'fastify'
import { crawlerRoutes } from './routes.js'
import { startCrawlerScheduler, stopCrawlerScheduler } from './scheduler.js'
import { logger } from '../../common/logger.js'

/**
 * Crawler module entry point.
 * Registers routes and starts the scheduler on app ready.
 */
export async function crawlerModule(app: FastifyInstance) {
  // Register all crawler routes
  await app.register(crawlerRoutes)

  // Start the scheduler when app is ready
  app.addHook('onReady', async () => {
    startCrawlerScheduler()
    logger.info('Crawler module initialized')
  })

  // Stop scheduler on close
  app.addHook('onClose', async () => {
    stopCrawlerScheduler()
  })
}

// Re-export for direct usage
export { crawlerRoutes } from './routes.js'
export { startCrawlerScheduler, stopCrawlerScheduler } from './scheduler.js'
export {
  createSource,
  listSources,
  getSourceById,
  updateSource,
  deleteSource,
  crawlSingleSource,
  crawlAllEnabledSources,
} from './service.js'
export type { CrawlItem, CrawlResult, CrawlAllResult, CrawlStrategy } from './types.js'
