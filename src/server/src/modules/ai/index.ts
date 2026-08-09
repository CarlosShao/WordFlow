import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { getPrisma } from '../../common/prisma.js'
import { logger } from '../../common/logger.js'
import { config } from '../../config/index.js'

const translateSchema = z.object({
  text: z.string().min(1).max(5000),
  targetLang: z.enum(['zh', 'en']).default('zh'),
  sourceLang: z.string().optional(),
})

const explainSchema = z.object({
  word: z.string().min(1).max(100),
  context: z.string().max(2000).optional(),
})

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(10000),
  })).min(1).max(20),
})

const generateQuestionSchema = z.object({
  vocabularyIds: z.array(z.string()).optional(),
  contentId: z.string().optional(),
  questionType: z.enum(['MULTIPLE_CHOICE', 'FILL_BLANK', 'TRANSLATION', 'LISTENING']).optional(),
})

const testConnectionSchema = z.object({
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1).max(500).optional(),
  model: z.string().min(1).max(100).optional(),
})

/**
 * Extract custom AI config from request headers.
 * Headers: x-custom-api-key, x-custom-base-url, x-custom-model
 */
function getCustomAiConfig(request: FastifyRequest): {
  apiKey: string
  apiBaseUrl: string
  model: string
} {
  const customKey = request.headers['x-custom-api-key'] as string | undefined
  const customBaseUrl = request.headers['x-custom-base-url'] as string | undefined
  const customModel = request.headers['x-custom-model'] as string | undefined

  return {
    apiKey: customKey && customKey.trim().length > 0 ? customKey.trim() : config.ai.apiKey,
    apiBaseUrl: customBaseUrl && customBaseUrl.trim().length > 0 ? customBaseUrl.trim() : config.ai.apiBaseUrl,
    model: customModel && customModel.trim().length > 0 ? customModel.trim() : config.ai.model,
  }
}

async function callLlm(
  messages: { role: string; content: string }[],
  customConfig?: { apiKey: string; apiBaseUrl: string; model: string }
): Promise<string> {
  const apiKey = customConfig?.apiKey || config.ai.apiKey
  const apiBaseUrl = customConfig?.apiBaseUrl || config.ai.apiBaseUrl
  const model = customConfig?.model || config.ai.model

  const response = await fetch(`${apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText)
    throw new Error(`LLM API error: ${response.status} - ${error}`)
  }

  const data = await response.json() as { choices: { message: { content: string } }[] }
  return data.choices[0]?.message?.content || ''
}

export async function aiRoutes(app: FastifyInstance) {
  const prisma = getPrisma()

  // 翻译
  app.post('/api/v1/ai/translate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { text, targetLang, sourceLang } = translateSchema.parse(request.body)
    const customConfig = getCustomAiConfig(request)

    const systemPrompt = targetLang === 'zh'
      ? '你是专业英译中翻译。给出准确、自然的中文翻译。只返回翻译结果，不加任何解释。'
      : '你是专业中译英翻译。给出准确、自然的英文翻译。只返回翻译结果，不加任何解释。'

    const sourceHint = sourceLang ? `从 ${sourceLang} 翻译。` : ''
    const userPrompt = `${sourceHint}请翻译：\n${text}`

    const result = await callLlm([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], customConfig)

    return reply.send({ success: true, data: { translation: result } })
  })

  // 词汇解释
  app.post('/api/v1/ai/explain', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { word, context } = explainSchema.parse(request.body)
    const customConfig = getCustomAiConfig(request)

    const systemPrompt = `你是英语词汇教师。请用中文解释单词，包括：
1. 词性与音标
2. 核心含义（中英对照）
3. 常用搭配和例句
4. 记忆技巧（如有）

简洁、实用、不要废话。`

    const userPrompt = context
      ? `单词：${word}\n上下文：${context}`
      : `单词：${word}`

    const result = await callLlm([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], customConfig)

    return reply.send({ success: true, data: { explanation: result } })
  })

  // AI 对话
  app.post('/api/v1/ai/chat', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { messages } = chatSchema.parse(request.body)
    const customConfig = getCustomAiConfig(request)

    const systemMessage = {
      role: 'system' as const,
      content: '你是 WordFlow 英语学习助手。帮助用户学英语、解释词汇、纠正语法、回答英语学习相关的问题。简洁、实用、鼓励用户。',
    }

    const result = await callLlm([systemMessage, ...messages], customConfig)

    return reply.send({
      success: true,
      data: { reply: result },
    })
  })

  // 生成练习题
  app.post('/api/v1/ai/generate-question', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const { vocabularyIds, contentId, questionType } = generateQuestionSchema.parse(request.body)
    const customConfig = getCustomAiConfig(request)

    let vocabData: { word: string; translation: string }[] = []
    if (vocabularyIds?.length) {
      const vocabs = await prisma.vocabulary.findMany({
        where: { id: { in: vocabularyIds }, userId },
        select: { word: true, translation: true },
      })
      vocabData = vocabs
    } else {
      const due = await prisma.vocabulary.findMany({
        where: { userId, nextReviewDate: { lte: new Date() } },
        select: { word: true, translation: true },
        take: 5,
      })
      vocabData = due
    }

    if (vocabData.length === 0) {
      return reply.send({ success: true, data: null, message: '没有可用的词汇生成题目' })
    }

    const typeHint = questionType ? `题型：${questionType}` : '随机题型'
    const systemPrompt = `你是英语出题老师。根据给定的词汇生成 1 道练习题。
要求：
- 只返回 JSON 格式：{"type":"题型","stem":"题目","options":["A","B","C","D"],"correctAnswer":"正确答案","explanation":"解析"}
- 题型可选：MULTIPLE_CHOICE（4 选项单选）、FILL_BLANK（填空）、TRANSLATION（翻译）
- 题目要实用、贴近真实场景
- 解析用中文`

    const userPrompt = `${typeHint}
词汇列表：${vocabData.map((v) => `${v.word} (${v.translation})`).join(', ')}`

    const result = await callLlm([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], customConfig)

    let question: unknown
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        question = JSON.parse(jsonMatch[0])
      }
    } catch {
      question = null
    }

    return reply.send({ success: true, data: question, raw: question ? undefined : result })
  })

  // 测试 AI 连接
  app.post('/api/v1/ai/test-connection', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = testConnectionSchema.parse(request.body ?? {})
    const headerConfig = getCustomAiConfig(request)

    // Body params take priority over headers, headers take priority over env defaults
    const testConfig = {
      apiKey: body.apiKey || headerConfig.apiKey,
      apiBaseUrl: body.baseUrl || headerConfig.apiBaseUrl,
      model: body.model || headerConfig.model,
    }

    // Validate key format
    if (testConfig.apiKey.trim().length === 0) {
      return reply.code(400).send({ success: false, error: { message: 'API Key 不能为空' } })
    }

    try {
      const result = await callLlm([
        { role: 'user', content: 'Reply with "ok" to confirm connectivity.' },
      ], testConfig)

      return reply.send({ success: true, data: { message: '连接成功', model: testConfig.model, reply: result } })
    } catch (err) {
      const message = err instanceof Error ? err.message : '连接测试失败'
      logger.warn({ err, model: testConfig.model }, 'AI test connection failed')
      return reply.code(502).send({ success: false, error: { message } })
    }
  })
}
