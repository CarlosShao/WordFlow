import type { FastifyInstance } from 'fastify'
import { getPrisma } from '../../common/prisma.js'
import { logger } from '../../common/logger.js'

export async function dashboardRoutes(app: FastifyInstance) {
  const prisma = getPrisma()

  // 今日概览
  app.get('/api/v1/dashboard/overview', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [
      totalVocab,
      masteredVocab,
      dueVocab,
      todayPractice,
      todayCorrect,
      mistakeCount,
    ] = await Promise.all([
      prisma.vocabulary.count({ where: { userId } }),
      prisma.vocabulary.count({ where: { userId, masteryStatus: 'MASTERED' } }),
      prisma.vocabulary.count({ where: { userId, nextReviewDate: { lte: new Date() } } }),
      prisma.practiceSession.count({
        where: {
          userId,
          createdAt: { gte: today, lt: tomorrow },
          status: 'COMPLETED',
        },
      }),
      prisma.practiceSession.aggregate({
        where: { userId, createdAt: { gte: today, lt: tomorrow } },
        _sum: { correctCount: true },
      }),
      prisma.mistake.count({ where: { userId } }),
    ])

    return reply.send({
      success: true,
      data: {
        vocabulary: { total: totalVocab, mastered: masteredVocab, due: dueVocab },
        today: {
          practiceSessions: todayPractice,
          correctAnswers: todayCorrect._sum.correctCount || 0,
        },
        mistakes: mistakeCount,
      },
    })
  })

  // 连续天数
  app.get('/api/v1/dashboard/streak', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id

    // 获取用户有练习记录的日期（去重 + 降序）
    const sessions = await prisma.practiceSession.findMany({
      where: { userId, status: 'COMPLETED' },
      select: { completedAt: true },
      orderBy: { completedAt: 'desc' },
      distinct: ['completedAt'],
    })

    const dates = sessions
      .map((s) => s.completedAt?.toISOString().slice(0, 10))
      .filter(Boolean)
      .sort()
      .reverse()

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i <= 365; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)
      const dateStr = checkDate.toISOString().slice(0, 10)
      if (dates.includes(dateStr)) {
        streak++
      } else if (i > 0) {
        break
      }
    }

    return reply.send({ success: true, data: { currentStreak: streak, longestStreak: streak } })
  })

  // 词汇增长趋势（近 30 天每日新增词汇数）
  app.get('/api/v1/dashboard/vocab-growth', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const vocabs = await prisma.vocabulary.findMany({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // 按天聚合
    const growthMap = new Map<string, number>()
    for (const v of vocabs) {
      const dateStr = v.createdAt.toISOString().slice(0, 10)
      growthMap.set(dateStr, (growthMap.get(dateStr) || 0) + 1)
    }

    // 补全日期
    const result: { date: string; count: number; total: number }[] = []
    let cumulative = 0
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().slice(0, 10)
      const count = growthMap.get(dateStr) || 0
      cumulative += count
      result.push({ date: dateStr, count, total: cumulative })
    }

    return reply.send({ success: true, data: result })
  })

  // 学习热力图（近 90 天）
  app.get('/api/v1/dashboard/heatmap', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const sessions = await prisma.practiceSession.findMany({
      where: { userId, status: 'COMPLETED', completedAt: { gte: ninetyDaysAgo } },
      select: { completedAt: true },
    })

    const heatmapMap = new Map<string, number>()
    for (const s of sessions) {
      if (s.completedAt) {
        const dateStr = s.completedAt.toISOString().slice(0, 10)
        heatmapMap.set(dateStr, (heatmapMap.get(dateStr) || 0) + 1)
      }
    }

    // 补全日期
    const result: { date: string; count: number }[] = []
    for (let i = 0; i < 90; i++) {
      const d = new Date(ninetyDaysAgo)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().slice(0, 10)
      result.push({ date: dateStr, count: heatmapMap.get(dateStr) || 0 })
    }

    return reply.send({ success: true, data: result })
  })
}
