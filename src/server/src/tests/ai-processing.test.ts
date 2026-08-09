import { describe, it, expect, beforeEach, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'

// ============================================================
// Mock LLM module BEFORE importing service/routes
// ============================================================
vi.mock('../modules/ai-processing/llm.js', () => ({
  callLlm: vi.fn(async (messages: { role: string; content: string }[]) => {
    const lastMsg = messages[messages.length - 1]?.content || ''
    if (lastMsg.includes('提取') || lastMsg.includes('词汇')) {
      return '[{"word":"perseverance","phonetic":"/ˌpɜːsəˈvɪərəns/","translation":"毅力，坚持不懈","definition":"continued effort despite difficulties","examples":["Success requires perseverance."]}]'
    }
    if (lastMsg.includes('摘要') || lastMsg.includes('summary')) {
      return '这是一篇关于毅力与坚持的英语文章，讲述了通过持续努力克服困难的重要性。'
    }
    if (lastMsg.includes('难度') || lastMsg.includes('difficulty')) {
      return '{"difficulty":"INTERMEDIATE","reason":"词汇量适中，句型较为复杂，适合高中水平"}'
    }
    return ''
  }),
  extractVocabulary: vi.fn(async () => [
    {
      word: 'perseverance',
      phonetic: '/ˌpɜːsəˈvɪərəns/',
      translation: '毅力，坚持不懈',
      definition: 'continued effort despite difficulties',
      examples: ['Success requires perseverance.'],
    },
  ]),
  generateSummary: vi.fn(async () => '这是一篇关于毅力与坚持的英语文章，讲述了通过持续努力克服困难的重要性。'),
  rateDifficulty: vi.fn(async () => ({ difficulty: 'INTERMEDIATE' as const, reason: '词汇量适中，句型较为复杂，适合高中水平' })),
}))

// ============================================================
// Mock prisma
// ============================================================
const mockPrisma = {
  content: {
    findUnique: vi.fn(async (args: { where: { id: string } }) => {
      // Default: return a valid content for any ID (used by batch processing)
      return {
        id: args.where.id,
        type: 'ARTICLE',
        title: 'Test Content',
        source: 'test',
        sourceUrl: `https://test.com/${args.where.id}`,
        author: 'Test Author',
        difficulty: null,
        summary: 'Some English content about learning and perseverance for testing.',
        translation: null,
        segments: null,
        duration: null,
        processedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }),
    findMany: vi.fn(async () => []),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
      id: where.id,
      ...data,
      updatedAt: new Date(),
    })),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    })),
    count: vi.fn(async () => 0),
    delete: vi.fn(async () => ({})),
  },
  vocabulary: {
    findUnique: vi.fn(async () => null),
    findFirst: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    })),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
    count: vi.fn(async () => 0),
    upsert: vi.fn(async () => ({})),
  },
}

vi.mock('../common/prisma.js', () => ({
  getPrisma: () => mockPrisma,
  disconnectPrisma: vi.fn(),
}))

// Import after mocks
import { aiProcessingRoutes } from '../modules/ai-processing/routes.js'
import { processContent, batchProcessContent, getProcessedVocabulary } from '../modules/ai-processing/service.js'
import { errorHandler } from '../common/errors.js'

// ============================================================
// Helper: create a fresh Fastify app with auth
// ============================================================
async function createTestApp(): Promise<FastifyInstance> {
  const app = Fastify()

  // Reset mocks to defaults
  vi.clearAllMocks()
  mockPrisma.content.findUnique = vi.fn(async (args: { where: { id: string } }) => {
    return {
      id: args.where.id,
      type: 'ARTICLE',
      title: 'Test Content',
      source: 'test',
      sourceUrl: `https://test.com/${args.where.id}`,
      author: 'Test Author',
      difficulty: null,
      summary: 'Some English content about learning and perseverance for testing.',
      translation: null,
      segments: null,
      duration: null,
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  })
  mockPrisma.content.update = vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
    id: where.id,
    ...data,
    updatedAt: new Date(),
  }))
  mockPrisma.vocabulary.findUnique = vi.fn(async () => null)
  mockPrisma.vocabulary.create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  }))
  mockPrisma.vocabulary.findMany = vi.fn(async () => [])
  mockPrisma.vocabulary.count = vi.fn(async () => 0)
  mockPrisma.content.findMany = vi.fn(async () => [])

  // Auth middleware: inject fake user
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: 'test-user-id', email: 'test@test.com' }
  })

  app.setErrorHandler(errorHandler)
  await app.register(aiProcessingRoutes)
  await app.ready()

  return app
}

// ============================================================
// Test: Routes (HTTP integration)
// ============================================================
describe('AI Processing Routes', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await createTestApp()
  })

  it('POST /api/v1/ai-processing/process/:contentId → 200 处理成功', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai-processing/process/test-content-1',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.contentId).toBe('test-content-1')
    expect(body.data.vocabularyExtracted).toBe(1)
    expect(body.data.vocabulary[0].word).toBe('perseverance')
  })

  it('POST /api/v1/ai-processing/process/:contentId → 404 内容不存在', async () => {
    mockPrisma.content.findUnique = vi.fn(async () => null)

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai-processing/process/non-existent-id',
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.type).toBe('NOT_FOUND')
  })

  it('POST /api/v1/ai-processing/batch → 200 批量处理', async () => {
    mockPrisma.content.findMany = vi.fn(async () => [
      {
        id: 'content-1',
        type: 'ARTICLE',
        title: 'Article 1',
        source: 'test',
        sourceUrl: 'https://test.com/1',
        difficulty: null,
        summary: 'Some article content about learning.',
        processedAt: null,
      },
      {
        id: 'content-2',
        type: 'ARTICLE',
        title: 'Article 2',
        source: 'test',
        sourceUrl: 'https://test.com/2',
        difficulty: null,
        summary: 'Another article about English practice.',
        processedAt: null,
      },
    ])

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai-processing/batch',
      payload: { limit: 10 },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.processed).toBe(2)
    expect(body.data.results.length).toBe(2)
  })

  it('POST /api/v1/ai-processing/batch → 400 无效limit', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai-processing/batch',
      payload: { limit: 0 },
    })

    expect(response.statusCode).toBe(400)
  })

  it('GET /api/v1/ai-processing/vocabularies → 200 返回词汇列表', async () => {
    const fakeVocab = [
      { id: 'v1', word: 'perseverance', phonetic: '/ˌpɜːsəˈvɪərəns/', translation: '毅力', definition: 'continued effort', examples: ['Success requires perseverance.'] },
      { id: 'v2', word: 'resilience', phonetic: '/rɪˈzɪliəns/', translation: '韧性', definition: 'ability to recover', examples: ['She showed great resilience.'] },
    ]
    mockPrisma.vocabulary.findMany = vi.fn(async () => fakeVocab)
    mockPrisma.vocabulary.count = vi.fn(async () => 2)

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/ai-processing/vocabularies',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.length).toBe(2)
    expect(body.meta.total).toBe(2)
    expect(body.data[0].word).toBe('perseverance')
  })

  it('GET /api/v1/ai-processing/vocabularies → 支持keyword搜索', async () => {
    mockPrisma.vocabulary.findMany = vi.fn(async () => [])
    mockPrisma.vocabulary.count = vi.fn(async () => 0)

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/ai-processing/vocabularies?keyword=perseverance',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().success).toBe(true)
  })
})

// ============================================================
// Test: Service (unit tests)
// ============================================================
describe('AI Processing Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.content.findUnique = vi.fn(async (args: { where: { id: string } }) => {
      return {
        id: args.where.id,
        type: 'ARTICLE',
        title: 'Test Content',
        source: 'test',
        sourceUrl: `https://test.com/${args.where.id}`,
        difficulty: null,
        summary: 'Some English content about learning and perseverance for testing.',
        processedAt: null,
      }
    })
    mockPrisma.content.update = vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
      id: where.id,
      ...data,
      updatedAt: new Date(),
    }))
    mockPrisma.vocabulary.findUnique = vi.fn(async () => null)
    mockPrisma.vocabulary.create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    }))
    mockPrisma.vocabulary.findMany = vi.fn(async () => [])
    mockPrisma.vocabulary.count = vi.fn(async () => 0)
    mockPrisma.content.findMany = vi.fn(async () => [])
  })

  it('processContent → 处理成功并返回结果', async () => {
    const result = await processContent('test-content-1')

    expect(result.contentId).toBe('test-content-1')
    expect(result.vocabularyExtracted).toBe(1)
    expect(result.vocabulary.length).toBe(1)
    expect(result.vocabulary[0].word).toBe('perseverance')
    expect(result.vocabulary[0].translation).toBe('毅力，坚持不懈')
  })

  it('processContent → 内容不存在时抛出 NOT_FOUND', async () => {
    mockPrisma.content.findUnique = vi.fn(async () => null)

    await expect(processContent('non-existent')).rejects.toThrow('内容不存在')
  })

  it('processContent → 内容为空时抛出 VALIDATION', async () => {
    mockPrisma.content.findUnique = vi.fn(async () => ({
      id: 'empty-content',
      type: 'ARTICLE',
      title: '',
      source: 'test',
      summary: null,
      processedAt: null,
    }))

    await expect(processContent('empty-content')).rejects.toThrow()
  })

  it('processContent → 标记processedAt', async () => {
    await processContent('test-content-1')

    // Check that content was updated with processedAt
    const updateCalls = mockPrisma.content.update.mock.calls
    const processedAtCall = updateCalls.find(
      (call: unknown[]) => (call[0] as { data: Record<string, unknown> }).data.processedAt,
    )
    expect(processedAtCall).toBeDefined()
  })

  it('batchProcessContent → 批量处理多条内容', async () => {
    mockPrisma.content.findMany = vi.fn(async () => [
      {
        id: 'content-1',
        type: 'ARTICLE',
        title: 'Article 1',
        source: 'test',
        difficulty: null,
        summary: 'Some article content about learning English.',
        processedAt: null,
      },
      {
        id: 'content-2',
        type: 'ARTICLE',
        title: 'Article 2',
        source: 'test',
        difficulty: null,
        summary: 'Another article about practice.',
        processedAt: null,
      },
    ])

    const result = await batchProcessContent(10)

    expect(result.processed).toBe(2)
    expect(result.failed).toBe(0)
    expect(result.results.length).toBe(2)
  })

  it('batchProcessContent → 处理失败的内容计入 failed', async () => {
    let callCount = 0
    mockPrisma.content.findUnique = vi.fn(async (args: { where: { id: string } }) => {
      callCount++
      // First call succeeds, second call returns null (not found)
      if (callCount <= 1) {
        return {
          id: args.where.id,
          type: 'ARTICLE',
          title: 'Article 1',
          source: 'test',
          difficulty: null,
          summary: 'Some article content.',
          processedAt: null,
        }
      }
      return null
    })
    mockPrisma.content.findMany = vi.fn(async () => [
      {
        id: 'content-1',
        type: 'ARTICLE',
        title: 'Article 1',
        source: 'test',
        difficulty: null,
        summary: 'Some article content.',
        processedAt: null,
      },
      {
        id: 'content-empty',
        type: 'ARTICLE',
        title: 'Empty',
        source: 'test',
        difficulty: null,
        summary: null,
        processedAt: null,
      },
    ])

    const result = await batchProcessContent(10)

    expect(result.processed).toBe(1)
    expect(result.failed).toBe(1)
  })

  it('getProcessedVocabulary → 返回公共词库词汇', async () => {
    const fakeVocab = [
      { word: 'perseverance', phonetic: '/ˌpɜːsəˈvɪərəns/', translation: '毅力', definition: 'continued effort', examples: ['Success requires perseverance.'] },
    ]
    mockPrisma.vocabulary.findMany = vi.fn(async () => fakeVocab)
    mockPrisma.vocabulary.count = vi.fn(async () => 1)

    const result = await getProcessedVocabulary(1, 20)

    expect(result.items.length).toBe(1)
    expect(result.total).toBe(1)
    expect(result.items[0].word).toBe('perseverance')
  })

  it('processContent → 已有summary时不重复生成', async () => {
    mockPrisma.content.findUnique = vi.fn(async () => ({
      id: 'content-with-summary',
      type: 'ARTICLE',
      title: 'Article',
      source: 'test',
      difficulty: 'INTERMEDIATE',
      summary: 'Already has a summary.',
      processedAt: null,
    }))

    const result = await processContent('content-with-summary')

    // summaryGenerated should be false since summary exists
    expect(result.summaryGenerated).toBe(false)
    // difficultyRated should be false since difficulty exists
    expect(result.difficultyRated).toBe(false)
  })

  it('processContent → 跳过已存在的词汇', async () => {
    mockPrisma.vocabulary.findUnique = vi.fn(async () => ({
      id: 'existing-vocab',
      word: 'perseverance',
      userId: 'system',
    }))

    const result = await processContent('test-content-1')

    // Vocabulary extracted count should still be 1 (from LLM)
    expect(result.vocabularyExtracted).toBe(1)
    // But vocabulary.create should NOT be called since it already exists
    expect(mockPrisma.vocabulary.create).not.toHaveBeenCalled()
  })
})
