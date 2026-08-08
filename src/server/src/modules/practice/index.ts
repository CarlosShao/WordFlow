import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { getPrisma } from '../../common/prisma.js'
import { AppError } from '../../common/errors.js'
import { logger } from '../../common/logger.js'

const createPracticeSchema = z.object({
  title: z.string().max(200).optional(),
  vocabularyIds: z.array(z.string()).optional(),
  contentId: z.string().optional(),
  questionTypes: z.array(z.enum(['MULTIPLE_CHOICE', 'FILL_BLANK', 'TRANSLATION', 'LISTENING'])).optional(),
  questionCount: z.number().int().min(1).max(50).default(10),
})

const submitAnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string(),
})

export async function practiceRoutes(app: FastifyInstance) {
  const prisma = getPrisma()

  // 练习会话列表
  app.get('/api/v1/practice', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const page = Math.max(1, Number((request.query as { page?: string }).page) || 1)
    const limit = Math.min(50, Math.max(1, Number((request.query as { limit?: string }).limit) || 20))

    const [items, total] = await Promise.all([
      prisma.practiceSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { questions: true } } },
      }),
      prisma.practiceSession.count({ where: { userId } }),
    ])

    return reply.send({
      success: true,
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  })

  // 练习详情
  app.get('/api/v1/practice/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const { id } = request.params as { id: string }

    const session = await prisma.practiceSession.findFirst({
      where: { id, userId },
      include: { questions: { orderBy: { createdAt: 'asc' } } },
    })

    if (!session) {
      throw new AppError('NOT_FOUND', '练习不存在', 404)
    }

    return reply.send({ success: true, data: session })
  })

  // 创建练习
  app.post('/api/v1/practice', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const body = createPracticeSchema.parse(request.body)

    // 获取词汇列表
    let vocabIds = body.vocabularyIds
    if (!vocabIds || vocabIds.length === 0) {
      // 从待复习词汇抽取
      const dueVocabs = await prisma.vocabulary.findMany({
        where: { userId, nextReviewAt: { lte: new Date() } },
        select: { id: true },
        take: body.questionCount,
      })
      vocabIds = dueVocabs.map((v) => v.id)
    }

    if (vocabIds.length === 0) {
      throw new AppError('NO_DATA', '没有可生成练习的词汇，请先添加词汇或降低复习阈值', 400)
    }

    // 获取词汇数据
    const vocabs = await prisma.vocabulary.findMany({
      where: { id: { in: vocabIds } },
    })

    // 生成题目（简化版：翻译选择题 + 填空）
    const questions = generateQuestions(vocabs, body.questionTypes, body.questionCount)

    const session = await prisma.practiceSession.create({
      data: {
        userId,
        title: body.title || `练习 ${new Date().toLocaleDateString('zh-CN')}`,
        status: 'IN_PROGRESS',
        totalQuestions: questions.length,
        correctCount: 0,
        wrongCount: 0,
        questions: {
          create: questions.map((q) => ({
            type: q.type,
            stem: q.stem,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            vocabularyId: q.vocabularyId,
            contentId: body.contentId,
            isCorrect: null,
            userAnswer: null,
          })),
        },
      },
      include: { questions: true },
    })

    logger.info({ userId, sessionId: session.id, count: questions.length }, 'Practice session created')
    return reply.code(201).send({ success: true, data: session })
  })

  // 提交单题答案
  app.post('/api/v1/practice/:id/submit', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const { id } = request.params as { id: string }
    const { questionId, answer } = submitAnswerSchema.parse(request.body)

    const session = await prisma.practiceSession.findFirst({
      where: { id, userId },
      include: { questions: true },
    })

    if (!session) {
      throw new AppError('NOT_FOUND', '练习不存在', 404)
    }

    if (session.status === 'COMPLETED') {
      throw new AppError('INVALID_STATE', '练习已完成，无法修改答案', 400)
    }

    const question = session.questions.find((q) => q.id === questionId)
    if (!question) {
      throw new AppError('NOT_FOUND', '题目不存在', 404)
    }

    // 判分
    const isCorrect = gradeAnswer(question.type, answer, question.correctAnswer)

    const updated = await prisma.practiceQuestion.update({
      where: { id: questionId },
      data: { userAnswer: answer, isCorrect },
    })

    // 如果是错题，同步到 Mistake
    if (!isCorrect && question.vocabularyId) {
      await prisma.mistake.upsert({
        where: {
          userId_vocabularyId: { userId, vocabularyId: question.vocabularyId! },
        },
        update: { reviewCount: { increment: 1 }, lastWrongAt: new Date() },
        create: {
          userId,
          vocabularyId: question.vocabularyId!,
          contentId: question.contentId,
          wrongAnswer: answer,
          correctAnswer: question.correctAnswer,
          reviewCount: 1,
          lastWrongAt: new Date(),
        },
      })
    }

    return reply.send({ success: true, data: updated })
  })

  // 完成练习
  app.post('/api/v1/practice/:id/complete', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const { id } = request.params as { id: string }

    const session = await prisma.practiceSession.findFirst({
      where: { id, userId },
      include: { questions: true },
    })

    if (!session) {
      throw new AppError('NOT_FOUND', '练习不存在', 404)
    }

    const correctCount = session.questions.filter((q) => q.isCorrect === true).length
    const wrongCount = session.questions.filter((q) => q.isCorrect === false).length
    const unanswered = session.questions.filter((q) => q.isCorrect === null).length

    const updated = await prisma.practiceSession.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        correctCount,
        wrongCount,
        score: session.totalQuestions > 0
          ? Math.round((correctCount / session.totalQuestions) * 100)
          : 0,
      },
    })

    return reply.send({
      success: true,
      data: {
        ...updated,
        stats: { correctCount, wrongCount, unanswered, accuracy: updated.score },
      },
    })
  })

  // 删除练习
  app.delete('/api/v1/practice/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const { id } = request.params as { id: string }

    const session = await prisma.practiceSession.findFirst({ where: { id, userId } })
    if (!session) {
      throw new AppError('NOT_FOUND', '练习不存在', 404)
    }

    await prisma.practiceSession.delete({ where: { id } })
    return reply.code(204).send()
  })
}

/**
 * 本地规则生成题目
 */
function generateQuestions(
  vocabs: { id: string; word: string; translation: string; examples: string[] }[],
  types: string[] | undefined,
  count: number
): {
  type: 'MULTIPLE_CHOICE' | 'FILL_BLANK' | 'TRANSLATION' | 'LISTENING'
  stem: string
  options: string[]
  correctAnswer: string
  explanation: string
  vocabularyId: string
}[] {
  const questionTypes = types?.length ? types : ['MULTIPLE_CHOICE', 'FILL_BLANK']
  const questions: {
    type: 'MULTIPLE_CHOICE' | 'FILL_BLANK' | 'TRANSLATION' | 'LISTENING'
    stem: string
    options: string[]
    correctAnswer: string
    explanation: string
    vocabularyId: string
  }[] = []

  const shuffled = [...vocabs].sort(() => Math.random() - 0.5).slice(0, count)

  for (const vocab of shuffled) {
    const qType = questionTypes[Math.floor(Math.random() * questionTypes.length)] as typeof questions[number]['type']

    switch (qType) {
      case 'MULTIPLE_CHOICE': {
        // 选择题：中文词义 → 英文
        const wrongOptions = vocabs
          .filter((v) => v.id !== vocab.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((v) => v.word)
        const options = [...wrongOptions, vocab.word].sort(() => Math.random() - 0.5)
        questions.push({
          type: 'MULTIPLE_CHOICE',
          stem: `"${vocab.translation}" 对应的英文单词是？`,
          options,
          correctAnswer: vocab.word,
          explanation: `${vocab.word} = ${vocab.translation}`,
          vocabularyId: vocab.id,
        })
        break
      }
      case 'FILL_BLANK': {
        const example = vocab.examples?.[0] || ''
        const blanked = example.replace(new RegExp(vocab.word, 'gi'), '______')
        questions.push({
          type: 'FILL_BLANK',
          stem: `请填写空白处的单词：\n${blanked}`,
          options: [],
          correctAnswer: vocab.word,
          explanation: `${vocab.word} = ${vocab.translation}`,
          vocabularyId: vocab.id,
        })
        break
      }
      case 'TRANSLATION': {
        questions.push({
          type: 'TRANSLATION',
          stem: `请翻译为英文：${vocab.translation}`,
          options: [],
          correctAnswer: vocab.word,
          explanation: `${vocab.word} = ${vocab.translation}`,
          vocabularyId: vocab.id,
        })
        break
      }
      case 'LISTENING': {
        questions.push({
          type: 'LISTENING',
          stem: `请听写单词：${vocab.translation}`,
          options: [],
          correctAnswer: vocab.word,
          explanation: `${vocab.word} = ${vocab.translation}`,
          vocabularyId: vocab.id,
        })
        break
      }
    }
  }

  return questions
}

/**
 * 判分
 */
function gradeAnswer(
  type: string,
  userAnswer: string,
  correctAnswer: string
): boolean {
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

  switch (type) {
    case 'MULTIPLE_CHOICE':
      return normalize(userAnswer) === normalize(correctAnswer)
    case 'FILL_BLANK':
      return normalize(userAnswer) === normalize(correctAnswer)
    case 'TRANSLATION':
    case 'LISTENING':
      // 主观题：需要 AI 评分，这里先简单匹配（后续接入 LLM）
      return normalize(userAnswer) === normalize(correctAnswer)
    default:
      return false
  }
}
