/**
 * AI Processing Module Entry Point
 *
 * Registers routes and starts the scheduler on app ready.
 * Provides content processing pipeline: vocabulary extraction,
 * summary generation, difficulty rating, and vocabulary bank writing.
 */

import type { FastifyInstance } from 'fastify'
import { aiProcessingRoutes } from './routes.js'
import { startAiProcessingScheduler, stopAiProcessingScheduler } from './scheduler.js'
import { logger } from '../../common/logger.js'

/**
 * AI Processing module entry point.
 * Registers routes and starts the scheduler when app is ready.
 */
export async function aiProcessingModule(app: FastifyInstance) {
  // Register all AI processing routes
  await app.register(aiProcessingRoutes)

  // Start the scheduler when app is ready
  app.addHook('onReady', async () => {
    startAiProcessingScheduler()
    logger.info('AI processing module initialized')
  })

  // Stop scheduler on close
  app.addHook('onClose', async () => {
    stopAiProcessingScheduler()
  })
}

// Re-export for direct usage
export { aiProcessingRoutes } from './routes.js'
export { startAiProcessingScheduler, stopAiProcessingScheduler } from './scheduler.js'
export { processContent, batchProcessContent, getProcessedVocabulary } from './service.js'
export type {
  ExtractedVocabulary,
  DifficultyRating,
  ProcessingResult,
  BatchProcessingResult,
  BatchRequest,
} from './types.js'
