import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma, QuestionType, Difficulty } from '@prisma/client'
import { getPrisma } from '../../common/prisma.js'
import { AppError } from '../../common/errors.js'
import { logger } from '../../common/logger.js'

const mistakeQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  mastery: z.enum(['NOT_REVIEWED', 'REVIEWING', 'MASTERED']).optional(),
  sortBy: z.enum(['lastWrongAt', 'reviewCount', 'createdAt']).default('lastWrongAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const reviewMistakeSchema = z.object({
  correct: z.boolean(),
})

const createMistakeSchema = z.object({
  vocabularyId: z.string().optional(),
  contentId: z.string().optional(),
  questionId: z.string().optional(),
  questionType: z.nativeEnum(QuestionType),
  question: z.string().min(1),
  correctAnswer: z.string().min(1),
  userAnswer: z.string().optional(),
  wrongAnswer: z.string().optional(),
  explanation: z.string().optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
})

export async function mistakeRoutes(app: FastifyInstance) {
  const prisma = getPrisma()

  // 创建错题（手动添加）
  app.post('/api/v1/mistakes', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const body = createMistakeSchema.parse(request.body)

    const data: Prisma.MistakeCreateInput = {
      user: { connect: { id: userId } },
      questionType: body.questionType,
      question: body.question,
      correctAnswer: body.correctAnswer,
      userAnswer: body.userAnswer ?? null,
      wrongAnswer: body.wrongAnswer ?? null,
      explanation: body.explanation ?? null,
      difficulty: body.difficulty ?? null,
      reviewCount: 1,
      lastWrongAt: new Date(),
    }
    if (body.vocabularyId) data.vocabulary = { connect: { id: body.vocabularyId } }
    if (body.contentId) data.content = { connect: { id: body.contentId } }
    if (body.questionId) data.questionId = body.questionId

    const mistake = await prisma.mistake.create({ data })
    return reply.code(201).send({ success: true, data: mistake })
  })

  // 错题列表
  app.get('/api/v1/mistakes', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const query = mistakeQuerySchema.parse(request.query)
    const { page, limit, mastery, sortBy, sortOrder } = query

    const where: Record<string, unknown> = { userId }
    if (mastery) where.masteryStatus = mastery

    const [items, total] = await Promise.all([
      prisma.mistake.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          vocabulary: { select: { word: true, translation: true } },
          content: { select: { title: true } },
        },
      }),
      prisma.mistake.count({ where }),
    ])

    return reply.send({
      success: true,
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  })

  // 单条错题
  app.get('/api/v1/mistakes/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const { id } = request.params as { id: string }

    const mistake = await prisma.mistake.findFirst({
      where: { id, userId },
      include: {
        vocabulary: true,
        content: { select: { title: true, type: true } },
      },
    })

    if (!mistake) throw new AppError('NOT_FOUND', '错题不存在', 404)
    return reply.send({ success: true, data: mistake })
  })

  // 复习错题
  app.post('/api/v1/mistakes/:id/review', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const { id } = request.params as { id: string }
    const { correct } = reviewMistakeSchema.parse(request.body)

    const mistake = await prisma.mistake.findFirst({ where: { id, userId } })
    if (!mistake) throw new AppError('NOT_FOUND', '错题不存在', 404)

    let masteryStatus = mistake.masteryStatus
    if (correct) {
      if (mistake.reviewCount >= 2) masteryStatus = 'MASTERED'
      else masteryStatus = 'REVIEWING'
    } else {
      masteryStatus = 'NOT_REVIEWED'
    }

    const updated = await prisma.mistake.update({
      where: { id },
      data: {
        masteryStatus,
        reviewCount: { increment: 1 },
        lastReviewDate: new Date(),
      },
    })

    logger.info({ userId, mistakeId: id, correct, masteryStatus }, 'Mistake reviewed')
    return reply.send({ success: true, data: updated })
  })

  // 删除错题
  app.delete('/api/v1/mistakes/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const { id } = request.params as { id: string }

    const mistake = await prisma.mistake.findFirst({ where: { id, userId } })
    if (!mistake) throw new AppError('NOT_FOUND', '错题不存在', 404)

    await prisma.mistake.delete({ where: { id } })
    return reply.code(204).send()
  })

  // 错题统计
  app.get('/api/v1/mistakes/stats', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id

    const [total, notReviewed, reviewing, mastered] = await Promise.all([
      prisma.mistake.count({ where: { userId } }),
      prisma.mistake.count({ where: { userId, masteryStatus: 'NOT_REVIEWED' } }),
      prisma.mistake.count({ where: { userId, masteryStatus: 'REVIEWING' } }),
      prisma.mistake.count({ where: { userId, masteryStatus: 'MASTERED' } }),
    ])

    return reply.send({
      success: true,
      data: { total, notReviewed, reviewing, mastered },
    })
  })
}
