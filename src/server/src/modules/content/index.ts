import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getPrisma } from '../../common/prisma.js'
import { AppError } from '../../common/errors.ts'
import { logger } from '../../common/logger.js'

const contentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.enum(['ARTICLE', 'VIDEO', 'PODCAST']).optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  keyword: z.string().optional(),
})

const createContentSchema = z.object({
  title: z.string().min(1).max(500),
  type: z.enum(['ARTICLE', 'VIDEO', 'PODCAST']),
  source: z.string().min(1).max(200),
  sourceUrl: z.string().url(),
  coverUrl: z.string().url().optional(),
  author: z.string().max(200).optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  estimatedTime: z.number().int().positive().optional(),
  mediaUrl: z.string().url().optional(),
  mediaSize: z.number().int().positive().optional(),
  mediaDuration: z.number().int().positive().optional(),
  transcript: z.string().optional(),
  publishedAt: z.coerce.date().optional(),
  summary: z.string().max(5000).optional(),
})

const updateContentSchema = createContentSchema.partial()

export async function contentRoutes(app: FastifyInstance) {
  const prisma = getPrisma()

  // 获取内容列表（公开）
  app.get('/api/v1/content', async (request, reply) => {
    const query = contentQuerySchema.parse(request.query)
    const { page, limit, type, difficulty, keyword } = query

    const where: Record<string, unknown> = {
      ...(type && { type }),
      ...(difficulty && { difficulty }),
      ...(keyword && {
        OR: [
          { title: { contains: keyword, mode: 'insensitive' as const } },
          { summary: { contains: keyword, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [items, total] = await Promise.all([
      prisma.content.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.content.count({ where }),
    ])

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

  // 获取单条内容（公开）
  app.get('/api/v1/content/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        _count: {
          select: { interactions: true },
        },
      },
    })

    if (!content) {
      throw new AppError('NOT_FOUND', '内容不存在', 404)
    }

    return reply.send({ success: true, data: content })
  })

  // 创建内容（需认证）
  app.post('/api/v1/content', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const body = createContentSchema.parse(request.body)

    const existing = await prisma.content.findUnique({
      where: {
        source_sourceUrl: {
          source: body.source,
          sourceUrl: body.sourceUrl,
        },
      },
    })

    if (existing) {
      throw new AppError('DUPLICATE', '该来源内容已存在', 409)
    }

    const content = await prisma.content.create({
      data: {
        ...body,
        viewCount: 0,
        isPublished: true,
        createdBy: userId,
      },
    })

    logger.info({ contentId: content.id, title: content.title, createdBy: userId }, 'Content created')
    return reply.code(201).send({ success: true, data: content })
  })

  // 更新内容（仅创建者可修改）
  app.put('/api/v1/content/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const { id } = request.params as { id: string }
    const body = updateContentSchema.parse(request.body)

    const existing = await prisma.content.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError('NOT_FOUND', '内容不存在', 404)
    }

    // 所有权验证：仅创建者可修改
    if (existing.createdBy && existing.createdBy !== userId) {
      throw new AppError('FORBIDDEN', '无权修改此内容', 403)
    }

    const content = await prisma.content.update({
      where: { id },
      data: body,
    })

    logger.info({ contentId: content.id, updatedBy: userId }, 'Content updated')
    return reply.send({ success: true, data: content })
  })

  // 删除内容（仅创建者可删除）
  app.delete('/api/v1/content/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const { id } = request.params as { id: string }

    const existing = await prisma.content.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError('NOT_FOUND', '内容不存在', 404)
    }

    // 所有权验证：仅创建者可删除
    if (existing.createdBy && existing.createdBy !== userId) {
      throw new AppError('FORBIDDEN', '无权删除此内容', 403)
    }

    await prisma.content.delete({ where: { id } })
    logger.info({ contentId: id, deletedBy: userId }, 'Content deleted')
    return reply.code(204).send()
  })

  // 记录用户浏览
  app.post('/api/v1/content/:id/view', async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user?.id

    await prisma.content.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })

    if (userId) {
      await prisma.userContentInteraction.upsert({
        where: {
          userId_contentId: { userId, contentId: id },
        },
        update: { lastViewedAt: new Date() },
        create: { userId, contentId: id, lastViewedAt: new Date() },
      })
    }

    return reply.send({ success: true })
  })

  // 收藏/取消收藏
  const favoriteSchema = z.object({
    favorite: z.boolean(),
  })

  app.post('/api/v1/content/:id/favorite', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user!.id
    const { favorite } = favoriteSchema.parse(request.body)

    await prisma.userContentInteraction.upsert({
      where: {
        userId_contentId: { userId, contentId: id },
      },
      update: { isFavorited: favorite },
      create: { userId, contentId: id, isFavorited: favorite },
    })

    return reply.send({ success: true, data: { isFavorited: favorite } })
  })

  // 获取用户收藏列表
  app.get('/api/v1/content/favorites/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const query = contentQuerySchema.parse(request.query)
    const { page, limit } = query

    const interactions = await prisma.userContentInteraction.findMany({
      where: { userId, isFavorited: true },
      include: { content: true },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await prisma.userContentInteraction.count({
      where: { userId, isFavorited: true },
    })

    return reply.send({
      success: true,
      data: interactions.map((i) => i.content),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  })
}
