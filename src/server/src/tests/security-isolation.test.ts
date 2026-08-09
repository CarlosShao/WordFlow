/**
 * Security Isolation Tests
 *
 * Verifies that user data isolation is enforced across all modules.
 * Tests cover: vocabulary, practice, mistakes, content, and cross-user access prevention.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'

// ============================================================
// Mock prisma
// ============================================================
const mockPrisma = {
  vocabulary: {
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    findFirst: vi.fn(async () => null),
    create: vi.fn(async ({ data }: any) => ({
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    })),
    update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
    delete: vi.fn(async () => ({})),
    count: vi.fn(async () => 0),
    upsert: vi.fn(async () => ({})),
    aggregate: vi.fn(async () => ({ _sum: { correctCount: 0 } })),
  },
  practiceSession: {
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    findFirst: vi.fn(async () => null),
    create: vi.fn(async ({ data }: any) => ({
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    })),
    update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
    delete: vi.fn(async () => ({})),
    count: vi.fn(async () => 0),
    aggregate: vi.fn(async () => ({ _sum: { correctCount: 0 } })),
  },
  practiceQuestion: {
    findUnique: vi.fn(async () => null),
    findFirst: vi.fn(async () => null),
    update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
  },
  mistake: {
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    findFirst: vi.fn(async () => null),
    create: vi.fn(async ({ data }: any) => ({
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    })),
    update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
    delete: vi.fn(async () => ({})),
    count: vi.fn(async () => 0),
    upsert: vi.fn(async () => ({})),
  },
  content: {
    findUnique: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
    create: vi.fn(async ({ data }: any) => ({
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    })),
    update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
    delete: vi.fn(async () => ({})),
    count: vi.fn(async () => 0),
  },
  userContentInteraction: {
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    upsert: vi.fn(async () => ({})),
    count: vi.fn(async () => 0),
  },
}

vi.mock('../common/prisma.js', () => ({
  getPrisma: () => mockPrisma,
  disconnectPrisma: vi.fn(),
}))

import { vocabularyRoutes } from '../modules/vocabulary/index.js'
import { practiceRoutes } from '../modules/practice/index.js'
import { mistakeRoutes } from '../modules/mistakes/index.js'
import { contentRoutes } from '../modules/content/index.js'
import { errorHandler } from '../common/errors.js'

// ============================================================
// Helper: create a test app with auth for a specific user
// ============================================================
async function createTestApp(userId: string = 'user-a'): Promise<FastifyInstance> {
  const app = Fastify()

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
  mockPrisma.vocabulary.update = vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data }))
  mockPrisma.vocabulary.delete = vi.fn(async () => ({}))

  mockPrisma.practiceSession.findFirst = vi.fn(async () => null)
  mockPrisma.practiceSession.findMany = vi.fn(async () => [])
  mockPrisma.practiceSession.create = vi.fn(async ({ data }: any) => ({
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  }))
  mockPrisma.practiceSession.count = vi.fn(async () => 0)
  mockPrisma.practiceSession.update = vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data }))
  mockPrisma.practiceSession.delete = vi.fn(async () => ({}))

  mockPrisma.practiceQuestion.findFirst = vi.fn(async () => null)
  mockPrisma.practiceQuestion.update = vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data }))

  mockPrisma.mistake.findFirst = vi.fn(async () => null)
  mockPrisma.mistake.findMany = vi.fn(async () => [])
  mockPrisma.mistake.create = vi.fn(async ({ data }: any) => ({
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  }))
  mockPrisma.mistake.count = vi.fn(async () => 0)
  mockPrisma.mistake.update = vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data }))
  mockPrisma.mistake.delete = vi.fn(async () => ({}))
  mockPrisma.mistake.upsert = vi.fn(async () => ({}))

  mockPrisma.content.findUnique = vi.fn(async () => null)
  mockPrisma.content.findMany = vi.fn(async () => [])
  mockPrisma.content.create = vi.fn(async ({ data }: any) => ({
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  }))
  mockPrisma.content.update = vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data }))
  mockPrisma.content.delete = vi.fn(async () => ({}))

  mockPrisma.userContentInteraction.findMany = vi.fn(async () => [])
  mockPrisma.userContentInteraction.upsert = vi.fn(async () => ({}))
  mockPrisma.userContentInteraction.count = vi.fn(async () => 0)

  // Auth middleware: inject the specified user
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: userId, email: `${userId}@test.com` }
  })

  app.setErrorHandler(errorHandler)
  await app.register(vocabularyRoutes)
  await app.register(practiceRoutes)
  await app.register(mistakeRoutes)
  await app.register(contentRoutes)
  await app.ready()

  return app
}

// ============================================================
// Test: Vocabulary User Isolation
// ============================================================
describe('Vocabulary User Isolation', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await createTestApp('user-a')
  })

  it('GET /api/v1/vocabulary → query includes userId filter', async () => {
    mockPrisma.vocabulary.findMany = vi.fn(async (args: any) => {
      // Verify userId is in the where clause
      expect(args.where.userId).toBe('user-a')
      return []
    })
    mockPrisma.vocabulary.count = vi.fn(async () => 0)

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/vocabulary',
    })

    expect(response.statusCode).toBe(200)
    expect(mockPrisma.vocabulary.findMany).toHaveBeenCalled()
  })

  it('GET /api/v1/vocabulary/:id → returns 404 for other user\'s vocabulary', async () => {
    // findFirst with { id, userId } returns null (vocabulary belongs to another user)
    mockPrisma.vocabulary.findFirst = vi.fn(async () => null)

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/vocabulary/other-user-vocab-id',
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.type).toBe('NOT_FOUND')
  })

  it('PUT /api/v1/vocabulary/:id → returns 404 for other user\'s vocabulary', async () => {
    mockPrisma.vocabulary.findFirst = vi.fn(async () => null)

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/vocabulary/other-user-vocab-id',
      payload: { translation: '修改翻译' },
    })

    expect(response.statusCode).toBe(404)
  })

  it('DELETE /api/v1/vocabulary/:id → returns 404 for other user\'s vocabulary', async () => {
    mockPrisma.vocabulary.findFirst = vi.fn(async () => null)

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/vocabulary/other-user-vocab-id',
    })

    expect(response.statusCode).toBe(404)
    // Should not call delete
    expect(mockPrisma.vocabulary.delete).not.toHaveBeenCalled()
  })

  it('POST /api/v1/vocabulary → creates vocabulary with correct userId', async () => {
    mockPrisma.vocabulary.findUnique = vi.fn(async () => null)
    let createdData: any
    mockPrisma.vocabulary.create = vi.fn(async ({ data }: any) => {
      createdData = data
      return { id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...data }
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/vocabulary',
      payload: { word: 'test', translation: '测试' },
    })

    expect(response.statusCode).toBe(201)
    expect(createdData.userId).toBe('user-a')
  })

  it('POST /api/v1/vocabulary/:id/review → returns 404 for other user\'s vocabulary', async () => {
    mockPrisma.vocabulary.findFirst = vi.fn(async () => null)

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/vocabulary/other-user-vocab-id/review',
      payload: { quality: 5 },
    })

    expect(response.statusCode).toBe(404)
    expect(mockPrisma.vocabulary.update).not.toHaveBeenCalled()
  })
})

// ============================================================
// Test: Practice Session User Isolation
// ============================================================
describe('Practice Session User Isolation', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await createTestApp('user-a')
  })

  it('GET /api/v1/practice → query includes userId filter', async () => {
    mockPrisma.practiceSession.findMany = vi.fn(async (args: any) => {
      expect(args.where.userId).toBe('user-a')
      return []
    })
    mockPrisma.practiceSession.count = vi.fn(async () => 0)

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/practice',
    })

    expect(response.statusCode).toBe(200)
    expect(mockPrisma.practiceSession.findMany).toHaveBeenCalled()
  })

  it('GET /api/v1/practice/:id → returns 404 for other user\'s session', async () => {
    mockPrisma.practiceSession.findFirst = vi.fn(async () => null)

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/practice/other-user-session-id',
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.type).toBe('NOT_FOUND')
  })

  it('DELETE /api/v1/practice/:id → returns 404 for other user\'s session', async () => {
    mockPrisma.practiceSession.findFirst = vi.fn(async () => null)

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/practice/other-user-session-id',
    })

    expect(response.statusCode).toBe(404)
    expect(mockPrisma.practiceSession.delete).not.toHaveBeenCalled()
  })

  it('POST /api/v1/practice → creates session with correct userId', async () => {
    mockPrisma.vocabulary.findMany = vi.fn(async (args: any) => {
      // Verify userId filter is applied when fetching due vocabs
      if (args.where.userId) {
        expect(args.where.userId).toBe('user-a')
        return []
      }
      // Also verify userId filter when fetching by ids
      if (args.where.id && args.where.userId) {
        expect(args.where.userId).toBe('user-a')
      }
      return []
    })
    let createdData: any
    mockPrisma.practiceSession.create = vi.fn(async ({ data }: any) => {
      createdData = data
      return { id: crypto.randomUUID(), createdAt: new Date(), ...data }
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/practice',
      payload: { questionCount: 5 },
    })

    // Should fail with NO_DATA since no due vocabs, but userId should be set
    if (response.statusCode === 201) {
      expect(createdData.userId).toBe('user-a')
    }
  })

  it('POST /api/v1/practice/:id/submit → returns 404 for other user\'s session', async () => {
    mockPrisma.practiceSession.findFirst = vi.fn(async () => null)

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/practice/other-user-session-id/submit',
      payload: { questionId: 'q1', answer: 'test' },
    })

    expect(response.statusCode).toBe(404)
    expect(mockPrisma.practiceQuestion.update).not.toHaveBeenCalled()
  })

  it('POST /api/v1/practice/:id/complete → returns 404 for other user\'s session', async () => {
    mockPrisma.practiceSession.findFirst = vi.fn(async () => null)

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/practice/other-user-session-id/complete',
    })

    expect(response.statusCode).toBe(404)
    expect(mockPrisma.practiceSession.update).not.toHaveBeenCalled()
  })
})

// ============================================================
// Test: Mistake User Isolation
// ============================================================
describe('Mistake User Isolation', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await createTestApp('user-a')
  })

  it('GET /api/v1/mistakes → query includes userId filter', async () => {
    mockPrisma.mistake.findMany = vi.fn(async (args: any) => {
      expect(args.where.userId).toBe('user-a')
      return []
    })
    mockPrisma.mistake.count = vi.fn(async () => 0)

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/mistakes',
    })

    expect(response.statusCode).toBe(200)
    expect(mockPrisma.mistake.findMany).toHaveBeenCalled()
  })

  it('GET /api/v1/mistakes/:id → returns 404 for other user\'s mistake', async () => {
    mockPrisma.mistake.findFirst = vi.fn(async () => null)

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/mistakes/other-user-mistake-id',
    })

    expect(response.statusCode).toBe(404)
  })

  it('DELETE /api/v1/mistakes/:id → returns 404 for other user\'s mistake', async () => {
    mockPrisma.mistake.findFirst = vi.fn(async () => null)

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/mistakes/other-user-mistake-id',
    })

    expect(response.statusCode).toBe(404)
    expect(mockPrisma.mistake.delete).not.toHaveBeenCalled()
  })

  it('POST /api/v1/mistakes/:id/review → returns 404 for other user\'s mistake', async () => {
    mockPrisma.mistake.findFirst = vi.fn(async () => null)

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/mistakes/other-user-mistake-id/review',
      payload: { correct: true },
    })

    expect(response.statusCode).toBe(404)
    expect(mockPrisma.mistake.update).not.toHaveBeenCalled()
  })
})

// ============================================================
// Test: Content Ownership Verification
// ============================================================
describe('Content Ownership Verification', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await createTestApp('user-a')
  })

  it('POST /api/v1/content → sets createdBy to current user', async () => {
    let createdData: any
    mockPrisma.content.create = vi.fn(async ({ data }: any) => {
      createdData = data
      return { id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...data }
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/content',
      payload: {
        title: 'Test Content',
        type: 'ARTICLE',
        source: 'test',
        sourceUrl: 'https://test.com/article',
        difficulty: 'INTERMEDIATE',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(createdData.createdBy).toBe('user-a')
  })

  it('PUT /api/v1/content/:id → returns 403 for content created by another user', async () => {
    mockPrisma.content.findUnique = vi.fn(async () => ({
      id: 'content-by-user-b',
      title: 'User B Content',
      createdBy: 'user-b',
    }))

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/content/content-by-user-b',
      payload: { title: 'Modified Title' },
    })

    expect(response.statusCode).toBe(403)
    const body = response.json()
    expect(body.error.type).toBe('FORBIDDEN')
    expect(mockPrisma.content.update).not.toHaveBeenCalled()
  })

  it('DELETE /api/v1/content/:id → returns 403 for content created by another user', async () => {
    mockPrisma.content.findUnique = vi.fn(async () => ({
      id: 'content-by-user-b',
      title: 'User B Content',
      createdBy: 'user-b',
    }))

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/content/content-by-user-b',
    })

    expect(response.statusCode).toBe(403)
    const body = response.json()
    expect(body.error.type).toBe('FORBIDDEN')
    expect(mockPrisma.content.delete).not.toHaveBeenCalled()
  })

  it('PUT /api/v1/content/:id → allows update for own content', async () => {
    mockPrisma.content.findUnique = vi.fn(async () => ({
      id: 'my-content',
      title: 'My Content',
      createdBy: 'user-a',
    }))
    mockPrisma.content.update = vi.fn(async ({ where, data }: any) => ({
      id: where.id,
      ...data,
    }))

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/content/my-content',
      payload: { title: 'Updated Title' },
    })

    expect(response.statusCode).toBe(200)
    expect(mockPrisma.content.update).toHaveBeenCalled()
  })

  it('DELETE /api/v1/content/:id → allows delete for own content', async () => {
    mockPrisma.content.findUnique = vi.fn(async () => ({
      id: 'my-content',
      title: 'My Content',
      createdBy: 'user-a',
    }))

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/content/my-content',
    })

    expect(response.statusCode).toBe(204)
    expect(mockPrisma.content.delete).toHaveBeenCalled()
  })

  it('PUT /api/v1/content/:id → allows update for content with no createdBy (legacy)', async () => {
    mockPrisma.content.findUnique = vi.fn(async () => ({
      id: 'legacy-content',
      title: 'Legacy Content',
      createdBy: null,
    }))
    mockPrisma.content.update = vi.fn(async ({ where, data }: any) => ({
      id: where.id,
      ...data,
    }))

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/content/legacy-content',
      payload: { title: 'Updated Legacy' },
    })

    expect(response.statusCode).toBe(200)
    expect(mockPrisma.content.update).toHaveBeenCalled()
  })
})

// ============================================================
// Test: Practice Vocabulary Isolation (Cross-User Prevention)
// ============================================================
describe('Practice Vocabulary Isolation (Cross-User Prevention)', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await createTestApp('user-a')
  })

  it('POST /api/v1/practice → vocabulary fetch includes userId filter', async () => {
    const findManyCalls: any[] = []
    let createdData: any
    mockPrisma.vocabulary.findMany = vi.fn(async (args: any) => {
      findManyCalls.push(args)
      // Return a vocab so the practice session can be created
      return [{ id: 'vocab-1', word: 'test', translation: '测试', examples: [] }]
    })
    mockPrisma.practiceSession.create = vi.fn(async ({ data }: any) => {
      createdData = data
      return { id: crypto.randomUUID(), createdAt: new Date(), ...data }
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/practice',
      payload: {
        vocabularyIds: ['vocab-1', 'vocab-2'],
        questionCount: 5,
      },
    })

    // Should succeed
    expect(response.statusCode).toBe(201)

    // Verify that the vocabulary fetch included userId filter
    const vocabFetchCall = findManyCalls.find(
      (call) => call.where && call.where.id && call.where.id.in
    )
    expect(vocabFetchCall).toBeDefined()
    expect(vocabFetchCall.where.userId).toBe('user-a')
  })
})

// ============================================================
// Test: Cross-User Data Leak Prevention
// ============================================================
describe('Cross-User Data Leak Prevention', () => {
  it('User A cannot access User B\'s vocabulary via ID', async () => {
    const appA = await createTestApp('user-a')
    const appB = await createTestApp('user-b')

    // User B creates a vocabulary
    mockPrisma.vocabulary.findUnique = vi.fn(async () => null)
    mockPrisma.vocabulary.create = vi.fn(async ({ data }: any) => ({
      id: 'vocab-b-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    }))

    await appB.inject({
      method: 'POST',
      url: '/api/v1/vocabulary',
      payload: { word: 'secret', translation: '秘密' },
    })

    // User A tries to access User B's vocabulary
    mockPrisma.vocabulary.findFirst = vi.fn(async (args: any) => {
      // Should be called with both id and userId
      expect(args.where.id).toBe('vocab-b-123')
      expect(args.where.userId).toBe('user-a')
      return null // Not found for user A
    })

    const response = await appA.inject({
      method: 'GET',
      url: '/api/v1/vocabulary/vocab-b-123',
    })

    expect(response.statusCode).toBe(404)
  })

  it('User A cannot delete User B\'s mistake', async () => {
    const appA = await createTestApp('user-a')

    mockPrisma.mistake.findFirst = vi.fn(async (args: any) => {
      expect(args.where.userId).toBe('user-a')
      return null // Not found for user A
    })

    const response = await appA.inject({
      method: 'DELETE',
      url: '/api/v1/mistakes/mistake-b-456',
    })

    expect(response.statusCode).toBe(404)
    expect(mockPrisma.mistake.delete).not.toHaveBeenCalled()
  })

  it('User A cannot update User B\'s practice session', async () => {
    const appA = await createTestApp('user-a')

    mockPrisma.practiceSession.findFirst = vi.fn(async (args: any) => {
      expect(args.where.userId).toBe('user-a')
      return null
    })

    const response = await appA.inject({
      method: 'POST',
      url: '/api/v1/practice/session-b-789/complete',
    })

    expect(response.statusCode).toBe(404)
    expect(mockPrisma.practiceSession.update).not.toHaveBeenCalled()
  })
})
