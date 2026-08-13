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
  createManySources,
} from './service.js'
import { discoverTedTalkUrls } from './strategies/ted.js'

// ------------------- Validation Schemas -------------------

const createSourceSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  type: z.enum(['RSS', 'YOUTUBE', 'TWITTER', 'WEB', 'PUPPETEER', 'TED', 'VOA', 'PODCAST', 'IELTS', 'TOEFL']),
  contentType: z.enum(['ARTICLE', 'VIDEO', 'PODCAST']),
  difficulty: z.enum(['BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED', 'PROFICIENT']),
  crawlInterval: z.number().int().nonnegative().optional(),
  enabled: z.boolean().optional(),
})

const updateSourceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  type: z.enum(['RSS', 'YOUTUBE', 'TWITTER', 'WEB', 'PUPPETEER', 'TED', 'VOA', 'PODCAST', 'IELTS', 'TOEFL']).optional(),
  contentType: z.enum(['ARTICLE', 'VIDEO', 'PODCAST']).optional(),
  difficulty: z.enum(['BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED', 'PROFICIENT']).optional(),
  crawlInterval: z.number().int().nonnegative().optional(),
  enabled: z.boolean().optional(),
})

const discoverTedSchema = z.object({
  pageStart: z.number().int().min(1).max(50).optional().default(1),
  pageEnd: z.number().int().min(1).max(50).optional().default(5),
  max: z.number().int().min(1).max(500).optional().default(100),
  topics: z.array(z.string()).optional(),
  importAsSources: z.boolean().optional().default(false),
  difficulty: z
    .enum(['BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED', 'PROFICIENT'])
    .optional()
    .default('INTERMEDIATE'),
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

  // ---- Get crawl status for a single source ----
  // Returns last crawl result (backend is synchronous: no async job system).
  app.get('/api/v1/crawler/sources/:id/status', authHandler, async (request, reply) => {
    const { id } = request.params as { id: string }
    const source = await getSourceById(id)
    return reply.send({
      success: true,
      data: {
        sourceId: source.id,
        lastStatus: source.lastStatus ?? 'never',
        lastError: source.lastError ?? null,
        lastCrawledAt: source.lastCrawledAt ?? null,
        // Synchronous crawl: no in-progress job, so status is either idle or done
        state: 'idle',
        progress: source.lastStatus ? 100 : 0,
      },
    })
  })

  // ---- Trigger crawl for all enabled sources ----
  app.post('/api/v1/crawler/crawl-all', authHandler, async (_request, reply) => {
    const result = await crawlAllEnabledSources()
    logger.info(
      { totalInserted: result.totalInserted, sourceCount: result.results.length },
      'Crawl-all completed',
    )
    const failed = result.results.filter((r) => r.status === 'error')
    return reply.send({
      success: true,
      data: {
        totalInserted: result.totalInserted,
        sourceCount: result.results.length,
        failedCount: failed.length,
        results: result.results,
        message:
          failed.length > 0
            ? `爬取完成：新增 ${result.totalInserted} 条，${failed.length} 个来源失败`
            : `爬取完成：成功新增 ${result.totalInserted} 条内容`,
      },
    })
  })

  // ---- Discover TED historical talks (optional: bulk import as sources) ----
  //
  // Crawls ted.com/talks paginated listing and returns a list of talk URLs.
  // When `importAsSources=true`, each URL is saved as an individual
  // CrawlerSource (type=RSS-compatible TED strategy) so they can be crawled
  // via the standard pipeline.
  app.post('/api/v1/crawler/ted/discover', authHandler, async (request, reply) => {
    const parsed = discoverTedSchema.safeParse(request.body)
    if (!parsed.success) {
      throw new AppError(
        ErrorType.VALIDATION,
        parsed.error.issues[0]?.message ?? '参数错误',
        400,
        parsed.error.issues,
      )
    }

    const urls = await discoverTedTalkUrls({
      pageStart: parsed.data.pageStart,
      pageEnd: parsed.data.pageEnd,
      max: parsed.data.max,
      topics: parsed.data.topics,
    })

    let imported = 0
    let skipped = 0
    if (parsed.data.importAsSources && urls.length > 0) {
      const rows = urls.map((u) => {
        const slug = u.split('/').pop() || 'ted-talk'
        return {
          name: `TED: ${slug.replace(/_/g, ' ')}`,
          url: u,
          type: 'TED' as const,
          contentType: 'VIDEO' as const,
          difficulty: parsed.data.difficulty,
          crawlInterval: 0,            // Historical: never auto-refresh
          enabled: true,
        }
      })
      const result = await createManySources(rows)
      imported = result.created
      skipped = result.skipped
    }

    return reply.send({
      success: true,
      data: {
        urls,
        count: urls.length,
        imported,
        skipped,
      },
    })
  })
}

