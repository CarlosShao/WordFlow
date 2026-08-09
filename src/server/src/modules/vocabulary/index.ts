import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getPrisma } from '../../common/prisma.js'
import { AppError } from '../../common/errors.js'
import { logger } from '../../common/logger.js'

const vocabularyQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  keyword: z.string().optional(),
  mastery: z.enum(['NOT_REVIEWED', 'NEW', 'LEARNING', 'REVIEWING', 'MASTERED']).optional(),
  sortBy: z.enum(['createdAt', 'nextReviewDate', 'word']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const createVocabularySchema = z.object({
  word: z.string().min(1).max(100),
  phonetic: z.string().max(100).optional(),
  translation: z.string().max(500),
  definition: z.string().max(2000).optional(),
  examples: z.array(z.string().max(500)).default([]),
  tags: z.array(z.string().max(50)).default([]),
  contentId: z.string().optional(), // 来源内容
  note: z.string().max(1000).optional(),
})

const updateVocabularySchema = createVocabularySchema.partial()

const reviewSchema = z.object({
  quality: z.number().int().min(0).max(5), // SM-2 quality 0-5
})

/**
 * SM-2 简化算法
 */
export function calculateSm2(
  easeFactor: number,
  interval: number,
  repetitions: number,
  quality: number
): { easeFactor: number; interval: number; repetitions: number } {
  let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  newEaseFactor = Math.max(1.3, newEaseFactor)

  let newInterval: number
  let newRepetitions: number

  if (quality < 3) {
    // 复习失败，重置
    newInterval = 1
    newRepetitions = 0
  } else {
    newRepetitions = repetitions + 1
    if (newRepetitions === 1) {
      newInterval = 1
    } else if (newRepetitions === 2) {
      newInterval = 3
    } else {
      newInterval = Math.round(interval * newEaseFactor)
    }
  }

  return { easeFactor: newEaseFactor, interval: newInterval, repetitions: newRepetitions }
}

export async function vocabularyRoutes(app: FastifyInstance) {
  const prisma = getPrisma()

  // 获取当前用户词汇列表
  app.get('/api/v1/vocabulary', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const query = vocabularyQuerySchema.parse(request.query)
    const { page, limit, keyword, mastery, sortBy, sortOrder } = query

    const where: Record<string, unknown> = { userId }
    if (keyword) {
      where.OR = [
        { word: { contains: keyword, mode: 'insensitive' as const } },
        { translation: { contains: keyword, mode: 'insensitive' as const } },
      ]
    }
    if (mastery) {
      where.masteryStatus = mastery
    }

    const [items, total] = await Promise.all([
      prisma.vocabulary.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.vocabulary.count({ where }),
    ])

    return reply.send({
      success: true,
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  })

  // 获取待复习词汇（nextReviewAt <= now）
  app.get('/api/v1/vocabulary/due', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const limit = Math.min(Number((request.query as { limit?: string }).limit) || 20, 100)

    const items = await prisma.vocabulary.findMany({
      where: {
        userId,
        nextReviewDate: { lte: new Date() },
      },
      orderBy: { nextReviewDate: 'asc' },
      take: limit,
    })

    return reply.send({ success: true, data: items })
  })

  // 获取单条词汇
  app.get('/api/v1/vocabulary/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const { id } = request.params as { id: string }

    const vocab = await prisma.vocabulary.findFirst({
      where: { id, userId },
    })

    if (!vocab) {
      throw new AppError('NOT_FOUND', '词汇不存在', 404)
    }

    return reply.send({ success: true, data: vocab })
  })

  // 添加词汇
  app.post('/api/v1/vocabulary', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const body = createVocabularySchema.parse(request.body)

    // 检查是否已存在
    const existing = await prisma.vocabulary.findUnique({
      where: {
        userId_word: { userId, word: body.word },
      },
    })

    if (existing) {
      throw new AppError('DUPLICATE', '该词汇已在你的词表中', 409)
    }

    const vocab = await prisma.vocabulary.create({
      data: {
        ...body,
        userId,
        masteryStatus: 'NEW',
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReviewDate: new Date(), // 新词立即可复习
      },
    })

    logger.info({ userId, word: vocab.word }, 'Vocabulary created')
    return reply.code(201).send({ success: true, data: vocab })
  })

  // 更新词汇
  app.put('/api/v1/vocabulary/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const { id } = request.params as { id: string }
    const body = updateVocabularySchema.parse(request.body)

    const existing = await prisma.vocabulary.findFirst({ where: { id, userId } })
    if (!existing) {
      throw new AppError('NOT_FOUND', '词汇不存在', 404)
    }

    // 如果修改 word，检查唯一性
    if (body.word && body.word !== existing.word) {
      const duplicate = await prisma.vocabulary.findUnique({
        where: { userId_word: { userId, word: body.word } },
      })
      if (duplicate) {
        throw new AppError('DUPLICATE', '该词汇已在你的词表中', 409)
      }
    }

    const vocab = await prisma.vocabulary.update({
      where: { id },
      data: body,
    })

    return reply.send({ success: true, data: vocab })
  })

  // 删除词汇
  app.delete('/api/v1/vocabulary/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const { id } = request.params as { id: string }

    const existing = await prisma.vocabulary.findFirst({ where: { id, userId } })
    if (!existing) {
      throw new AppError('NOT_FOUND', '词汇不存在', 404)
    }

    await prisma.vocabulary.delete({ where: { id } })
    return reply.code(204).send()
  })

  // 提交复习结果
  app.post('/api/v1/vocabulary/:id/review', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const { id } = request.params as { id: string }
    const { quality } = reviewSchema.parse(request.body)

    const vocab = await prisma.vocabulary.findFirst({ where: { id, userId } })
    if (!vocab) {
      throw new AppError('NOT_FOUND', '词汇不存在', 404)
    }

    const sm2 = calculateSm2(vocab.easeFactor, vocab.interval, vocab.repetitions, quality)
    const nextReviewDate = new Date(Date.now() + sm2.interval * 24 * 60 * 60 * 1000)

    // 更新掌握度状态
    let masteryStatus = vocab.masteryStatus
    if (quality < 3) {
      masteryStatus = 'LEARNING'
    } else if (sm2.repetitions >= 4 && sm2.interval >= 14) {
      masteryStatus = 'MASTERED'
    } else if (sm2.repetitions >= 2) {
      masteryStatus = 'REVIEWING'
    }

    const updated = await prisma.vocabulary.update({
      where: { id },
      data: {
        easeFactor: sm2.easeFactor,
        interval: sm2.interval,
        repetitions: sm2.repetitions,
        nextReviewDate,
        masteryStatus,
        lastReviewDate: new Date(),
      },
    })

    logger.info({ userId, word: vocab.word, quality, interval: sm2.interval }, 'Vocabulary reviewed')
    return reply.send({ success: true, data: updated })
  })
}
