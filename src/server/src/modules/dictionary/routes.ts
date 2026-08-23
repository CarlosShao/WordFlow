import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AppError, ErrorType } from '../../common/errors.js'
import { logger } from '../../common/logger.js'
import { getPrisma } from '../../common/prisma.js'
import { getWordDefinition } from './service.js'
import { getDictionaryProgress, crawlDictionaryBatch, defaultCrawlConfig } from './crawler.js'
import { buildWordPool } from './wordPool.js'

const lookupSchema = z.object({
  word: z.string().min(1).max(100),
})

const dictionaryListSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50),
  keyword: z.string().optional(),
})

/**
 * Dictionary routes — public word definitions for the划词 (word selection) feature.
 */
export async function dictionaryRoutes(app: FastifyInstance) {
  const prisma = getPrisma()

  // 词典库列表（公开，分页+搜索）— 必须在 :word 之前注册
  app.get('/api/v1/dictionary', async (request, reply) => {
    const { page, limit, keyword } = dictionaryListSchema.parse(request.query)

    const where: Record<string, unknown> = { status: 'DONE', payload: { not: null } }
    if (keyword) {
      where.word = { contains: keyword, mode: 'insensitive' as const }
    }

    const [items, total] = await Promise.all([
      prisma.dictionaryEntry.findMany({
        where,
        orderBy: { word: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, word: true, payload: true, status: true },
      }),
      prisma.dictionaryEntry.count({ where }),
    ])

    return reply.send({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  })

  // 查询单词释义（公开）
  app.get('/api/v1/dictionary/:word', async (request, reply) => {
    const { word } = request.params as { word: string }
    const parsed = lookupSchema.safeParse({ word })
    if (!parsed.success) {
      throw new AppError(ErrorType.VALIDATION, '参数错误', 400, parsed.error.issues)
    }

    const entry = await getWordDefinition(parsed.data.word)
    if (!entry) {
      logger.info({ word }, 'Dictionary lookup: not found')
      throw new AppError(ErrorType.NOT_FOUND, `未找到单词 "${parsed.data.word}" 的释义`, 404)
    }

    return reply.send({ success: true, data: entry })
  })

  // 词典爬取进度（公开，便于手动查看）
  app.get('/api/v1/dictionary/crawl/progress', async (_request, reply) => {
    const progress = await getDictionaryProgress()
    return reply.send({ success: true, data: progress })
  })

  // 手动触发一次爬取（公开，便于手动补爬；limit 可选，默认走配置）
  app.post('/api/v1/dictionary/crawl/run', async (request, reply) => {
    const parsed = z.object({ limit: z.coerce.number().min(1).max(5000).optional() }).safeParse(request.body ?? {})
    const limit = parsed.success && parsed.data.limit ? parsed.data.limit : defaultCrawlConfig.limit
    logger.info({ limit }, 'Manual dictionary crawl triggered')
    const result = await crawlDictionaryBatch({ ...defaultCrawlConfig, limit })
    return reply.send({ success: true, data: result })
  })

  // 手动刷新单词池（公开）
  app.post('/api/v1/dictionary/crawl/pool/refresh', async (_request, reply) => {
    logger.info('Manual dictionary word pool refresh triggered')
    const result = await buildWordPool()
    return reply.send({ success: true, data: result })
  })
}