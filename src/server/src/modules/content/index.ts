import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getPrisma } from '../../common/prisma.js'
import { AppError } from '../../common/errors.js'
import { logger } from '../../common/logger.js'

/**
 * In-memory TTL cache for the heavy read-only endpoints (detail + segments).
 *
 * Season-long videos (e.g. Key & Peele, 6000+ cues) store ~650KB of JSONB in
 * `segments` and ~220KB of text in `content`/`translation`. Every detail-page
 * visit forced Postgres to detoast all of it and Prisma to deserialize 6000+
 * objects. The data is effectively immutable after the crawler finishes, so a
 * short-lived process cache removes that cost for repeat visits.
 */
interface CacheEntry<T> {
  data: T
  expiresAt: number
}
const readCache = new Map<string, CacheEntry<unknown>>()
const READ_CACHE_TTL_MS = 10 * 60 * 1000

function cacheGet<T>(key: string): T | undefined {
  const hit = readCache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.data as T
  if (hit) readCache.delete(key)
  return undefined
}

function cacheSet<T>(key: string, data: T): void {
  readCache.set(key, { data, expiresAt: Date.now() + READ_CACHE_TTL_MS })
  // Bound the cache so long-running crawls can't grow it indefinitely.
  if (readCache.size > 500) {
    const oldest = readCache.keys().next().value
    if (oldest !== undefined) readCache.delete(oldest)
  }
}

function cacheInvalidate(id: string): void {
  readCache.delete(`detail:${id}`)
  readCache.delete(`segments:${id}`)
}

const contentQuerySchema = z
  .object({
    page: z.coerce.number().min(1).default(1),
    // Backend accepts BOTH `limit` and `pageSize` to accommodate callers
    // that follow REST conventions vs. those (like the content store) that
    // use the explicit `pageSize` name. Frontend ContentPage.vu uses
    // `pageSize: 2000` so make sure it isn't silently ignored.
    limit: z.coerce.number().min(1).max(2000).optional(),
    pageSize: z.coerce.number().min(1).max(2000).optional(),
    // ⚠ These MUST be declared in the first layer too, otherwise Zod strips
    // unknown keys before .transform() runs and the .pipe() stage receives
    // undefined for every field not listed here (causing WHERE 1=1).
    type: z.enum(['ARTICLE', 'VIDEO', 'PODCAST']).optional(),
    difficulty: z
      .enum(['BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED', 'PROFICIENT'])
      .optional(),
    keyword: z.string().optional(),
    mix: z.coerce.boolean().optional(),
  })
  .transform((q) => ({ ...q, limit: q.limit ?? q.pageSize ?? 20 }))
  .pipe(
    z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(2000).default(20),
      type: z.enum(['ARTICLE', 'VIDEO', 'PODCAST']).optional(),
      difficulty: z
        .enum(['BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED', 'PROFICIENT'])
        .optional(),
      keyword: z.string().optional(),
      mix: z.coerce.boolean().optional(),
    }),
  )

const createContentSchema = z.object({
  title: z.string().min(1).max(500),
  type: z.enum(['ARTICLE', 'VIDEO', 'PODCAST']),
  source: z.string().min(1).max(200),
  sourceUrl: z.string().url(),
  coverUrl: z.string().url().optional(),
  author: z.string().max(200).optional(),
  difficulty: z.enum(['BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED', 'PROFICIENT']),
  publishedAt: z.coerce.date().optional(),
  summary: z.string().max(5000).optional(),
})

const updateContentSchema = createContentSchema.partial()

export async function contentRoutes(app: FastifyInstance) {
  const prisma = getPrisma()

  // 获取内容列表（公开）
  app.get('/api/v1/content', async (request, reply) => {
    const query = contentQuerySchema.parse(request.query)
    const { page, limit, type, difficulty, keyword, mix } = query

    // 内容模块只展示通用学习材料。真题（IELTS/TOEFL/TPO）数据属于真题模块
    // （exam_books + book_id 挂链），前端入口尚未接入，不能混进内容列表：
    // ① 排除挂在真题书下的 section；② 排除爬虫来源带 IELTS/TOEFL/TPO 字样
    // 的条目（kmf/mini-ielts 等考试练习站抓取的文章）。
    const notExam: Record<string, unknown> = {
      bookId: null,
      NOT: {
        OR: [
          { source: { contains: 'ielts', mode: 'insensitive' as const } },
          { source: { contains: 'toefl', mode: 'insensitive' as const } },
          { source: { contains: 'tpo', mode: 'insensitive' as const } },
        ],
      },
    }

    const where: Record<string, unknown> = {
      ...notExam,
      ...(type && { type }),
      ...(difficulty && { difficulty }),
      ...(keyword && {
        OR: [
          { title: { contains: keyword, mode: 'insensitive' as const } },
          { summary: { contains: keyword, mode: 'insensitive' as const } },
          // Body full-text search. ILIKE '%kw%' can't use btree indexes; a
          // pg_trgm GIN index (see migration 20260816140000) keeps this fast.
          { content: { contains: keyword, mode: 'insensitive' as const } },
        ],
      }),
    }

    // List endpoints never return `content`/`translation` themselves (they can
    // be 100KB+ per row and would balloon a 2000-item mix response to tens of
    // MB). Instead we expose cheap surrogates — `hasContent` (badge) and
    // `contentLength` (reading-time estimate) — via one octet_length query.
    const slimRows = async <T extends { id: string }>(rows: T[]) => {
      if (rows.length === 0) return rows.map(() => ({ hasContent: false, contentLength: 0 }))
      const lens = await prisma.$queryRaw<Array<{ id: string; cl: number | null }>>`SELECT id, octet_length(content) AS cl FROM contents WHERE id = ANY(${rows.map((r) => r.id)}::text[])`
      const byId = new Map(lens.map((l) => [l.id, l.cl ?? 0]))
      return rows.map((r) => ({
        hasContent: (byId.get(r.id) ?? 0) > 0,
        contentLength: byId.get(r.id) ?? 0,
      }))
    }

    // Mixed mode: fetch the FULL catalog of every type (not a balanced cut) so
    // the frontend's client-side source grouping sees complete collections
    // (e.g. all 926 TED-ED videos, all 100 Steve parts). Each type is capped at
    // `limit` so the response stays bounded; the overall response may exceed
    // `limit` when several types are large — the frontend requests 2000.
    if (mix && !type) {
      const perType = Math.max(1, limit)
      // Trim to list-only fields (see non-mix branch for rationale).
      const listSelect = {
        id: true,
        type: true,
        title: true,
        source: true,
        sourceUrl: true,
        coverUrl: true,
        summary: true,
        difficulty: true,
        duration: true,
        author: true,
        publishedAt: true,
        createdAt: true,
      } as const
      const [articles, videos, podcasts] = await Promise.all([
        prisma.content.findMany({
          where: { ...where, type: 'ARTICLE' },
          orderBy: { publishedAt: 'desc' },
          take: perType,
          select: listSelect,
        }),
        prisma.content.findMany({
          where: { ...where, type: 'VIDEO' },
          orderBy: { publishedAt: 'desc' },
          take: perType,
          select: listSelect,
        }),
        prisma.content.findMany({
          where: { ...where, type: 'PODCAST' },
          orderBy: { publishedAt: 'desc' },
          take: perType,
          select: listSelect,
        }),
      ])

      // Interleave results: article, video, podcast, article, video, podcast...
      const mixed: typeof articles = []
      const maxLen = Math.max(articles.length, videos.length, podcasts.length)
      for (let i = 0; i < maxLen; i++) {
        if (articles[i]) mixed.push(articles[i])
        if (videos[i]) mixed.push(videos[i])
        if (podcasts[i]) mixed.push(podcasts[i])
      }

      const total = await prisma.content.count({ where })
      const surrogates = await slimRows(mixed)
      const data = mixed.map((row, i) => ({ ...row, ...surrogates[i] }))

      return reply.send({
        success: true,
        data,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    }

    const [items, total] = await Promise.all([
      // Trim response payload: list view doesn't need `content`/`translation`/
      // `segments` (the fields are huge and never rendered on the cards) —
      // only the hasContent badge + reading-time estimate, served as cheap
      // surrogates by slimRows().
      prisma.content.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          source: true,
          sourceUrl: true,
          coverUrl: true,
          summary: true,
          difficulty: true,
          duration: true,
          author: true,
          publishedAt: true,
          createdAt: true,
          // `isFavorited` does NOT exist on the Content model — it lives
          // on UserContentInteraction.  Omitting it here is safe; the
          // frontend can derive it from the interaction store if needed.
          // Skip `content`/`translation`/`segments`/`tags`/`audioUrl`/
          // `videoUrl` — not needed for list cards and they are large.
        },
      }),
      prisma.content.count({ where }),
    ])

    const surrogates = await slimRows(items)
    const data = items.map((row, i) => ({ ...row, ...surrogates[i] }))

    return reply.send({
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  })

  // 获取单条内容（公开）
  // NOTE: segments is intentionally excluded from the main payload — it can be
  // 500KB+ (Bilibili videos with thousands of cues) and would bloat the initial
  // load. The frontend fetches it on demand via GET /content/:id/segments.
  app.get('/api/v1/content/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const cacheKey = `detail:${id}`
    const cached = cacheGet<Record<string, unknown>>(cacheKey)
    if (cached) {
      return reply.send({ success: true, data: cached })
    }
    const content = await prisma.content.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        title: true,
        source: true,
        sourceUrl: true,
        coverUrl: true,
        videoUrl: true,
        audioUrl: true,
        difficulty: true,
        duration: true,
        author: true,
        publishedAt: true,
        createdAt: true,
        summary: true,
        content: true,
        translation: true,
        _count: {
          select: { userInteractions: true },
        },
      },
    })

    if (!content) {
      throw new AppError('NOT_FOUND', '内容不存在', 404)
    }

    cacheSet(cacheKey, content)
    return reply.send({ success: true, data: content })
  })

  // 单独获取字幕 segments（可能很大，按需加载避免阻塞首屏）
  app.get('/api/v1/content/:id/segments', async (request, reply) => {
    const { id } = request.params as { id: string }
    const cacheKey = `segments:${id}`
    const cached = cacheGet<{ id: string; segments: unknown; duration: number | null }>(cacheKey)
    if (cached) {
      return reply.send({ success: true, data: cached })
    }
    const content = await prisma.content.findUnique({
      where: { id },
      select: {
        id: true,
        segments: true,
        duration: true,
      },
    })

    if (!content) {
      throw new AppError('NOT_FOUND', '内容不存在', 404)
    }

    cacheSet(cacheKey, content)
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

    cacheInvalidate(id)
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
    cacheInvalidate(id)
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
