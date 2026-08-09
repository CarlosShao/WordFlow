import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AppError, ErrorType } from '../../common/errors.js'
import { logger } from '../../common/logger.js'
import {
  createSource,
  listSources,
  getSourceById,
  updateSource,
  deleteSource,
  crawlSingleSource,
  crawlAllEnabledSources,
} from './service.js'

// ------------------- Validation Schemas -------------------

const createSourceSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  type: z.enum(['RSS', 'YOUTUBE', 'TWITTER', 'WEB', 'PUPPETEER']),
  contentType: z.enum(['ARTICLE', 'VIDEO', 'PODCAST']),
  difficulty: z.enum(['BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED', 'PROFICIENT']),
  crawlInterval: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
})

const updateSourceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  type: z.enum(['RSS', 'YOUTUBE', 'TWITTER', 'WEB', 'PUPPETEER']).optional(),
  contentType: z.enum(['ARTICLE', 'VIDEO', 'PODCAST']).optional(),
  difficulty: z.enum(['BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED', 'PROFICIENT']).optional(),
  crawlInterval: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
})

// ------------------- Routes -------------------

export async function crawlerRoutes(app: FastifyInstance) {
  // All crawler routes require authentication
  const authHandler = { preHandler: [app.authenticate] }

  // ---- Create source ----
  app.post('/api/v1/crawler/sources', authHandler, async (request, reply) => {
    const parsed = createSourceSchema.safeParse(request.body)
    if (!parsed.success) {
      throw new AppError(ErrorType.VALIDATION, parsed.error.issues[0]?.message ?? '请求参数错误', 400, parsed.error.issues)
    }
    const source = await createSource(parsed.data)
    logger.info({ sourceId: source.id }, 'Crawler source created via API')
    return reply.code(201).send({ success: true, data: source })
  })

  // ---- List sources ----
  app.get('/api/v1/crawler/sources', authHandler, async (_request, reply) => {
    const sources = await listSources()
    return reply.send({ success: true, data: sources })
  })

  // ---- Get source by ID ----
  app.get('/api/v1/crawler/sources/:id', authHandler, async (request, reply) => {
    const { id } = request.params as { id: string }
    const source = await getSourceById(id)
    return reply.send({ success: true, data: source })
  })

  // ---- Update source ----
  app.put('/api/v1/crawler/sources/:id', authHandler, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = updateSourceSchema.safeParse(request.body)
    if (!parsed.success) {
      throw new AppError(ErrorType.VALIDATION, parsed.error.issues[0]?.message ?? '请求参数错误', 400, parsed.error.issues)
    }
    const source = await updateSource(id, parsed.data)
    return reply.send({ success: true, data: source })
  })

  // ---- Delete source ----
  app.delete('/api/v1/crawler/sources/:id', authHandler, async (request, reply) => {
    const { id } = request.params as { id: string }
    await deleteSource(id)
    return reply.code(204).send()
  })

  // ---- Trigger crawl for a single source ----
  app.post('/api/v1/crawler/sources/:id/crawl', authHandler, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await crawlSingleSource(id)
    return reply.send({ success: true, data: result })
  })

  // ---- Trigger crawl for all enabled sources ----
  app.post('/api/v1/crawler/crawl-all', authHandler, async (_request, reply) => {
    // Run crawl in background to avoid HTTP timeout
    crawlAllEnabledSources()
      .then((result) => {
        logger.info({ totalInserted: result.totalInserted }, 'Background crawl-all completed')
      })
      .catch((err) => {
        logger.error({ err }, 'Background crawl-all failed')
      })

    return reply.send({
      success: true,
      data: { message: '全量抓取任务已启动，将在后台执行' },
    })
  })
}
