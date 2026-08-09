/**
 * AI Processing Routes
 *
 * Endpoints for content processing pipeline:
 * - POST /api/v1/ai-processing/process/:contentId — process single content
 * - POST /api/v1/ai-processing/batch — batch process unprocessed content
 * - GET /api/v1/ai-processing/vocabularies — view extracted vocabulary
 */

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AppError, ErrorType } from '../../common/errors.js'
import { logger } from '../../common/logger.js'
import { processContent, batchProcessContent, getProcessedVocabulary } from './service.js'

// ------------------- Schemas -------------------

const batchSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
  type: z.enum(['ARTICLE', 'VIDEO', 'PODCAST']).optional(),
})

const vocabQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  keyword: z.string().optional(),
})

// ------------------- Routes -------------------

export async function aiProcessingRoutes(app: FastifyInstance) {

  // Process single content
  app.post('/api/v1/ai-processing/process/:contentId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { contentId } = request.params as { contentId: string }

    if (!contentId) {
      throw new AppError('VALIDATION', 'contentId 不能为空', 400)
    }

    logger.info({ contentId, userId: request.user?.id }, 'AI processing request received')
    const result = await processContent(contentId)

    return reply.send({ success: true, data: result })
  })

  // Batch process unprocessed content
  app.post('/api/v1/ai-processing/batch', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = batchSchema.safeParse(request.body)
    if (!parsed.success) {
      throw new AppError(ErrorType.VALIDATION, parsed.error.issues[0]?.message ?? '请求参数错误', 400, parsed.error.issues)
    }
    const body = parsed.data

    logger.info({ limit: body.limit, type: body.type }, 'Batch AI processing request received')
    const result = await batchProcessContent(body.limit, body.type)

    return reply.send({ success: true, data: result })
  })

  // Get extracted vocabulary (public bank)
  app.get('/api/v1/ai-processing/vocabularies', { preHandler: [app.authenticate] }, async (request, reply) => {
    const query = vocabQuerySchema.parse(request.query)
    const { page, limit, keyword } = query

    const { items, total } = await getProcessedVocabulary(page, limit, keyword)

    return reply.send({
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  })
}
