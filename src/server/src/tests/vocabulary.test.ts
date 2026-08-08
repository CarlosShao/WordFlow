import { describe, it, expect, beforeEach, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'

// Mock prisma before importing routes
const mockPrisma = {
  vocabulary: {
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    findFirst: vi.fn(async () => null),
    create: vi.fn(async ({ data }: any) => ({ id: crypto.randomUUID(), createdAt: new Date(), ...data })),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
    count: vi.fn(async () => 0),
    upsert: vi.fn(async () => ({})),
    aggregate: vi.fn(async () => ({ _sum: { correctCount: 0 } })),
  },
}

vi.mock('../common/prisma.js', () => ({
  getPrisma: () => mockPrisma,
  disconnectPrisma: vi.fn(),
}))

import { vocabularyRoutes } from '../modules/vocabulary/index.js'
import { errorHandler } from '../common/errors.js'

describe('Vocabulary Routes', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = Fastify()

    // Reset all mocks
    vi.clearAllMocks()
    mockPrisma.vocabulary.findUnique = vi.fn(async () => null)
    mockPrisma.vocabulary.findFirst = vi.fn(async () => null)
    mockPrisma.vocabulary.create = vi.fn(async ({ data }: any) => ({
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    }))
    mockPrisma.vocabulary.findMany = vi.fn(async () => [])
    mockPrisma.vocabulary.count = vi.fn(async () => 0)

    // Auth middleware: inject fake user
    app.decorate('authenticate', async (request: any) => {
      request.user = { id: 'test-user-id', email: 'test@test.com' }
    })

    app.setErrorHandler(errorHandler)
    await app.register(vocabularyRoutes)
    await app.ready()
  })

  it('POST /api/v1/vocabulary → 201 创建词汇', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/vocabulary',
      payload: {
        word: 'serendipity',
        translation: '意外发现美好事物的能力',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.word).toBe('serendipity')
    expect(body.data.masteryStatus).toBe('NEW')
  })

  it('POST /api/v1/vocabulary → 409 重复词汇', async () => {
    mockPrisma.vocabulary.findUnique = vi.fn(async () => ({ id: 'existing', word: 'test' }))

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/vocabulary',
      payload: { word: 'test', translation: '测试' },
    })

    expect(response.statusCode).toBe(409)
    const body = response.json()
    expect(body.error.type).toBe('DUPLICATE')
  })

  it('GET /api/v1/vocabulary → 返回当前用户词汇列表', async () => {
    const fakeData = [
      { id: '1', word: 'apple', translation: '苹果' },
      { id: '2', word: 'banana', translation: '香蕉' },
    ]
    mockPrisma.vocabulary.findMany = vi.fn(async () => fakeData)
    mockPrisma.vocabulary.count = vi.fn(async () => 2)

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/vocabulary',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.length).toBe(2)
    expect(body.meta.total).toBe(2)
  })

  it('GET /api/v1/vocabulary/due → 返回到期词汇', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/vocabulary/due',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().success).toBe(true)
  })

  it('DELETE /api/v1/vocabulary/:id → 204 删除成功', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/vocabulary',
      payload: { word: 'delete-me', translation: '删除我' },
    })
    const id = created.json().data.id

    mockPrisma.vocabulary.findFirst = vi.fn(async () => ({ id, userId: 'test-user-id' }))

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/vocabulary/${id}`,
    })

    expect(response.statusCode).toBe(204)
  })
})
