/**
 * 真题 API：真题书列表 / 书详情（分段）/ 题目
 *
 * 支持按 dataSource 过滤：
 *   - LEGACY     → 网盘扫描件 OCR 数据（旧数据）
 *   - CURATED    → 精选高质量数据源（按调研文档推荐源导入）
 *   - OFFICIAL   → 官方免费样题（ETS/BC/IELTS.org 等）
 *   - OPENSOURCE → 开源项目数据（HelloCET/m2kar/ERICXUCHI 等）
 *
 * 前端通过 ?dataSource= 参数切换分类。不传则返回全部。
 */
import type { FastifyInstance } from 'fastify'
import type { BookDataSource, ExamCategory } from '@prisma/client'
import { getPrisma } from '../../common/prisma.js'

export async function examRoutes(app: FastifyInstance) {
  const prisma = getPrisma()

  // 真题书列表（可带 category / dataSource 过滤）
  app.get('/api/v1/exam/books', async (request) => {
    const { category, dataSource } = request.query as {
      category?: string
      dataSource?: string
    }

    const where: Record<string, unknown> = {}
    if (category) {
      where.category = category as ExamCategory
    }
    if (dataSource) {
      where.dataSource = dataSource as BookDataSource
    }

    const books = await prisma.examBook.findMany({ where })

    // 排序：按书名卷号数字（TOEFL 按 TPO 编号；IELTS A 类在前、G 类在后，各自按卷号升序）
    const sorted = books.sort((a, b) => {
      const extract = (t: string): { isG: boolean; num: number } => {
        const m = t.match(/(\d+)/)
        return { isG: /G类/i.test(t), num: m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER }
      }
      const ea = extract(a.title)
      const eb = extract(b.title)
      if (ea.isG !== eb.isG) return ea.isG ? 1 : -1 // A 类在前
      return ea.num - eb.num
    })
    // 每本书：段数 + 题数
    const ids = books.map((b) => b.id)
    const agg = await prisma.content.groupBy({
      by: ['bookId'],
      where: { bookId: { in: ids } },
      _count: { _all: true },
    })
    const qAgg = await prisma.contentQuestion.groupBy({
      by: ['contentId'],
      where: { content: { bookId: { in: ids } } },
      _count: { _all: true },
    })
    const contents = await prisma.content.findMany({
      where: { bookId: { in: ids } },
      select: { id: true, bookId: true },
    })
    const secMap = new Map(agg.map((r) => [r.bookId, r._count._all]))
    // contentId -> bookId，统计每书题目数
    const cidToBook = new Map(contents.map((c) => [c.id, c.bookId]))
    const bookQ = new Map(books.map((b) => [b.id, 0]))
    for (const r of qAgg) {
      const bid = cidToBook.get(r.contentId)
      if (bid) bookQ.set(bid, (bookQ.get(bid) ?? 0) + r._count._all)
    }
    const data = books.map((b) => ({
      ...b,
      sectionCount: secMap.get(b.id) ?? 0,
      questionCount: bookQ.get(b.id) ?? 0,
    }))
    return { success: true, data }
  })

  // 可用数据来源列表（前端用于渲染分类切换标签）
  app.get('/api/v1/exam/data-sources', async () => {
    const rows = await prisma.examBook.groupBy({
      by: ['dataSource'],
      _count: { _all: true },
    })
    return {
      success: true,
      data: rows.map((r) => ({
        dataSource: r.dataSource,
        label: DATA_SOURCE_LABELS[r.dataSource] ?? r.dataSource,
        bookCount: r._count._all,
      })),
    }
  })

  // 书详情：分段列表（每段含题目数/音频/类型）
  app.get('/api/v1/exam/books/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const book = await prisma.examBook.findUnique({ where: { id } })
    if (!book) {
      return reply.code(404).send({ success: false, message: '真题书不存在' })
    }
    const contents = await prisma.content.findMany({
      where: { bookId: id },
      orderBy: [{ bookOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { contentQuestions: true } },
      },
    })
    return {
      success: true,
      data: {
        ...book,
        sections: contents.map((c) => ({
          id: c.id,
          type: c.type,
          title: c.title,
          bookOrder: c.bookOrder,
          audioUrl: c.audioUrl,
          content: c.content,
          questionCount: c._count.contentQuestions,
        })),
      },
    }
  })

  // 段题目列表（含答案，学习场景直接下发）
  app.get('/api/v1/exam/content/:id/questions', async (request, reply) => {
    const { id } = request.params as { id: string }
    const content = await prisma.content.findUnique({ where: { id } })
    if (!content) {
      return reply.code(404).send({ success: false, message: '内容不存在' })
    }
    const questions = await prisma.contentQuestion.findMany({
      where: { contentId: id },
      orderBy: { order: 'asc' },
    })
    return {
      success: true,
      data: {
        content: {
          id: content.id,
          type: content.type,
          title: content.title,
          audioUrl: content.audioUrl,
          content: content.content,
          bookOrder: content.bookOrder,
        },
        questions: questions.map((q) => ({
          id: q.id,
          type: q.type,
          stem: q.stem,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation,
          order: q.order,
        })),
      },
    }
  })
}

/** 数据来源中文标签 */
const DATA_SOURCE_LABELS: Record<string, string> = {
  LEGACY: '网盘筛选',
  CURATED: '精选题库',
}
