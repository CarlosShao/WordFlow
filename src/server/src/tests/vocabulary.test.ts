import { describe, it, expect, beforeEach, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { vocabularyRoutes } from '../modules/vocabulary/index.js'
import { createMockPrisma } from './mocks/prisma.js'

vi.mock('../common/prisma.js', () => ({
  getPrisma: () => createMockPrisma(),
  disconnectPrisma: vi.fn(),
}))

describe('Vocabulary Routes', () => {
  let app: FastifyInstance
  let prisma: ReturnType<typeof createMockPrisma>

  beforeEach(async () => {
    app = Fastify()
    prisma = createMockPrisma()

    // 注入 authenticate 中间件
    app.decorate('authenticate', async (request: any) => {
      request.user = { id: 'test-user-id', email: 'test@test.com' }
    })

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
        definition: 'The occurrence of events by chance in a happy way',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.word).toBe('serendipity')
    expect(body.data.masteryStatus).toBe('NEW')
  })

  it('POST /api/v1/vocabulary → 409 重复词汇', async () => {
    // 第一次创建
    await app.inject({
      method: 'POST',
      url: '/api/v1/vocabulary',
      payload: { word: 'test', translation: '测试' },
    })

    // 第二次创建相同词汇
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/vocabulary',
      payload: { word: 'test', translation: '测试2' },
    })

    expect(response.statusCode).toBe(409)
  })

  it('GET /api/v1/vocabulary → 返回当前用户词汇列表', async () => {
    // 先创建两条
    await app.inject({
      method: 'POST',
      url: '/api/v1/vocabulary',
      payload: { word: 'apple', translation: '苹果' },
    })
    await app.inject({
      method: 'POST',
      url: '/api/v1/vocabulary',
      payload: { word: 'banana', translation: '香蕉' },
    })

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
    // 先创建
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/vocabulary',
      payload: { word: 'delete-me', translation: '删除我' },
    })
    const id = createRes.json().data.id

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/vocabulary/${id}`,
    })

    expect(response.statusCode).toBe(204)
  })
})
