import type { FastifyInstance } from 'fastify'
import { dictionaryRoutes } from './routes.js'
import { startDictionaryCrawlerScheduler, stopDictionaryCrawlerScheduler, runCatchUpIfNeeded } from './scheduler.js'
import { logger } from '../../common/logger.js'

/**
 * Dictionary module entry point — registers routes, starts the crawl scheduler.
 */
export async function dictionaryModule(app: FastifyInstance) {
  await app.register(dictionaryRoutes)

  app.addHook('onReady', async () => {
    startDictionaryCrawlerScheduler()
    // If the machine was off at the scheduled cron time, catch up today's
    // crawl as soon as the api boots (e.g. user powers on the dev machine).
    void runCatchUpIfNeeded()
    logger.info('Dictionary module initialized')
  })

  app.addHook('onClose', async () => {
    stopDictionaryCrawlerScheduler()
  })
}

export { dictionaryRoutes } from './routes.js'
export { getWordDefinition, normalizeWord } from './service.js'
export type { DictionaryEntry, LookupResult } from './types.js'