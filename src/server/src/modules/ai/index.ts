import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { getPrisma } from '../../common/prisma.js'
import { logger } from '../../common/logger.js'
import { config } from '../../config/index.js'
import { callLlm as callLlmViaProviders, invalidateLlmProviderCache } from '../ai-processing/llm.js'

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
  /** 直接传入文本内容（优先级最高，无需查库） */
  text: z.string().min(1).max(10000).optional(),
  // CEFR level. Accept the DB's full enum values (e.g. UPPER_INTERMEDIATE,
  // 17 chars) — the previous max(10) rejected them and 400'd every request
  // for contents at those difficulty levels.
  difficulty: z.string().max(30).optional(),
})

const testConnectionSchema = z.object({
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1).max(500).optional(),
  model: z.string().min(1).max(100).optional(),
})

/**
 * Extract custom AI config from request headers.
 * Headers: x-custom-api-key, x-custom-base-url, x-custom-model
 *
 * Returns ONLY the fields actually present in headers. Callers merge with
 * their own fallbacks; when every field is absent, callLlm() delegates to
 * the system providers (ai_providers rotation) instead of a direct fetch.
 */
function getCustomAiConfig(request: FastifyRequest): {
  apiKey?: string
  apiBaseUrl?: string
  model?: string
} {
  const customKey = request.headers['x-custom-api-key'] as string | undefined
  const customBaseUrl = request.headers['x-custom-base-url'] as string | undefined
  const customModel = request.headers['x-custom-model'] as string | undefined

  return {
    ...(customKey && customKey.trim().length > 0 ? { apiKey: customKey.trim() } : {}),
    ...(customBaseUrl && customBaseUrl.trim().length > 0 ? { apiBaseUrl: customBaseUrl.trim() } : {}),
    ...(customModel && customModel.trim().length > 0 ? { model: customModel.trim() } : {}),
  }
}

async function callLlm(
  messages: { role: string; content: string }[],
  customConfig?: { apiKey?: string; apiBaseUrl?: string; model?: string }
): Promise<string> {
  // No per-user override → use the system providers (ai_providers table,
  // priority rotation + 60s cooldown on failure), same as the data pipeline.
  if (!customConfig || (!customConfig.apiKey && !customConfig.apiBaseUrl && !customConfig.model)) {
    return callLlmViaProviders(messages)
  }
  const apiKey = customConfig.apiKey || config.ai.apiKey
  const apiBaseUrl = customConfig.apiBaseUrl || config.ai.apiBaseUrl
  const model = customConfig.model || config.ai.model

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
    max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText)
    throw new Error(`LLM API error: ${response.status} - ${error}`)
  }

  const data = await response.json() as { choices: { message: { content: string } }[] }
  const content = data.choices?.[0]?.message?.content
  if (!content || content.trim().length === 0) {
    throw new Error('LLM 返回内容为空')
  }
  return content
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
    const { vocabularyIds, contentId, questionType, text: directText, difficulty } = generateQuestionSchema.parse(request.body)
    const customConfig = getCustomAiConfig(request)

    let sourceText = ''
    let sourceType: 'vocabulary' | 'content' | 'direct' = 'direct'

    // 优先级：直接文本 > contentId > vocabularyIds
    if (directText) {
      sourceText = directText
      sourceType = 'direct'
    } else if (contentId) {
      const contentItem = await prisma.content.findUnique({
        where: { id: contentId },
        select: { content: true, summary: true, title: true },
      })
      if (!contentItem) {
        return reply.code(404).send({ success: false, error: { message: '内容不存在' } })
      }
      sourceText = contentItem.content || contentItem.summary || ''
      sourceType = 'content'
      if (!sourceText.trim()) {
        return reply.send({ success: true, data: null, message: '该内容暂无可用文本，无法生成题目' })
      }
    }

    // 如果没有直接文本也没有内容，尝试用词汇
    if (!sourceText && !vocabularyIds?.length) {
      const due = await prisma.vocabulary.findMany({
        where: { userId, nextReviewDate: { lte: new Date() } },
        select: { word: true, translation: true },
        take: 5,
      })
      if (due.length === 0) {
        return reply.send({ success: true, data: null, message: '没有可用的词汇或内容来生成题目' })
      }
      sourceText = due.map(v => `${v.word} (${v.translation})`).join(', ')
      sourceType = 'vocabulary'
    } else if (!sourceText && vocabularyIds?.length) {
      const vocabs = await prisma.vocabulary.findMany({
        where: { id: { in: vocabularyIds }, userId },
        select: { word: true, translation: true },
      })
      sourceText = vocabs.map(v => `${v.word} (${v.translation})`).join(', ')
      sourceType = 'vocabulary'
    }

    const typeHint = questionType ? `题型：${questionType}` : '随机题型（选择题、填空题、判断题等）'
    const diffHint = difficulty ? `\n目标难度：${difficulty}` : ''

    let systemPrompt: string
    let userPrompt: string

    if (sourceType === 'content' || sourceType === 'direct') {
      systemPrompt = `你是英语出题老师。根据给定的英语文章/内容生成 3-5 道练习题。
要求：
1. 只返回 JSON 数组格式：[{"id":"q1","type":"multiple-choice","question":"题目","options":["A选项","B选项","C选项","D选项"],"correctAnswer":"正确选项","difficulty":"B1","explanation":"中文解析"}]
2. 题型可选：multiple-choice（选择题）、fill-blank（填空）、true-false（判断）、cloze（完形）
3. 题目要实用、贴近真实场景，考察阅读理解、词汇、语法等
4. 解析用中文
5. difficulty 字段使用 CEFR 等级：A1/A2/B1/B2/C1/C2`

      userPrompt = `${typeHint}${diffHint}
请根据以下内容出题：
---
${sourceText.slice(0, 4000)}
---`
    } else {
      // vocabulary mode
      systemPrompt = `你是英语出题老师。根据给定的词汇生成 1 道练习题。
要求：
- 只返回 JSON 格式：{"type":"题型","stem":"题目","options":["A","B","C","D"],"correctAnswer":"正确答案","explanation":"解析"}
- 题型可选：MULTIPLE_CHOICE（4 选项单选）、FILL_BLANK（填空）、TRANSLATION（翻译）
- 题目要实用、贴近真实场景
- 解析用中文`

      userPrompt = `${typeHint}
词汇列表：${sourceText}`
    }

    let result: string
    try {
      result = await callLlm([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], customConfig)
    } catch (err) {
      logger.error({ err, endpoint: 'generate-question', sourceType }, 'LLM call failed')
      return reply.code(502).send({ success: false, error: { type: 'UPSTREAM_ERROR', message: err instanceof Error ? err.message : 'LLM 调用失败' } })
    }

    let parsed: unknown
    try {
      // Try to extract JSON from LLM response (may be wrapped in markdown code fences)
      let jsonStr = result.trim()
      // Remove markdown code fences if present: ```json ... ``` or ``` ...
      const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/)
      if (fenceMatch) {
        jsonStr = fenceMatch[1].trim()
      }
      // Try array first, then object
      const arrMatch = jsonStr.match(/\[[\s\S]*\]/)
      const objMatch = jsonStr.match(/\{[\s\S]*\}/)
      const jsonMatch = arrMatch || objMatch
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      }
    } catch {
      parsed = null
    }

    return reply.send({ success: true, data: parsed, raw: parsed ? undefined : result })
  })

  // 生成周学习计划
  app.post('/api/v1/ai/generate-weekly-plan', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { weakPoints, recentActivity, level } = z.object({
      weakPoints: z.string().min(1).max(2000),
      recentActivity: z.string().max(2000).optional().default(''),
      level: z.string().max(20).optional().default('B2'),
    }).parse(request.body)
    const customConfig = getCustomAiConfig(request)

    const systemPrompt = `你是英语学习规划师。根据用户薄弱环节和近期活动，生成一份 7 天英语学习计划。
只返回 JSON 格式：{"days":[{"day":"周一","focus":"主题","tasks":["任务1","任务2"],"time":30}],"priorityRecommendations":["建议1"]}
任务要具体、可执行，每天 1-3 个任务，预计时间以分钟计。用中文。`

    const userPrompt = `用户水平：${level}
薄弱环节：${weakPoints}
近期活动：${recentActivity}`

    let result: string
    try {
      result = await callLlm([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], customConfig)
    } catch (err) {
      logger.error({ err, endpoint: 'generate-weekly-plan' }, 'LLM call failed')
      return reply.code(502).send({ success: false, error: { type: 'UPSTREAM_ERROR', message: err instanceof Error ? err.message : 'LLM 调用失败' } })
    }

    let plan: unknown
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      plan = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      plan = null
    }

    return reply.send({ success: true, data: plan, raw: plan ? undefined : result })
  })

  // 用给定词汇生成语境故事
  app.post('/api/v1/ai/generate-vocabulary-story', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { words, level } = z.object({
      words: z.array(z.string().min(1)).min(1).max(30),
      level: z.string().max(20).optional().default('B2'),
    }).parse(request.body)
    const customConfig = getCustomAiConfig(request)

    const wordList = words.join(', ')
    const systemPrompt = `你是英语故事创作者。请用下面提供的单词创作一个自然、连贯的英文短故事（150-300 词），并在故事后给出中文翻译。
只返回 JSON 格式：{"story":"英文故事","translation":"中文翻译"}。故事要生动、地道，让学习者能在语境中理解这些词。用 ${level} 难度。`

    const userPrompt = `请包含以下单词：${wordList}`

    let result: string
    try {
      result = await callLlm([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], customConfig)
    } catch (err) {
      logger.error({ err, endpoint: 'generate-vocabulary-story' }, 'LLM call failed')
      return reply.code(502).send({ success: false, error: { type: 'UPSTREAM_ERROR', message: err instanceof Error ? err.message : 'LLM 调用失败' } })
    }

    let story: unknown
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      story = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      story = null
    }

    return reply.send({ success: true, data: story, raw: story ? undefined : result })
  })

  // 评估文本难度（CEFR 等级）
  app.post('/api/v1/ai/assess-difficulty', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { text } = z.object({
      text: z.string().min(1).max(5000),
    }).parse(request.body)
    const customConfig = getCustomAiConfig(request)

    const systemPrompt = `你是英语语言学专家。评估给定文本的阅读难度，给出 CEFR 等级（A1/A2/B1/B2/C1/C2）。
只返回 JSON 格式：{"level":"B2","confidence":0.85,"reasoning":"简短说明依据"}。confidence 为 0-1 的小数。`

    const userPrompt = `请评估以下文本的难度：\n${text}`

    let result: string
    try {
      result = await callLlm([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], customConfig)
    } catch (err) {
      logger.error({ err, endpoint: 'assess-difficulty' }, 'LLM call failed')
      return reply.code(502).send({ success: false, error: { type: 'UPSTREAM_ERROR', message: err instanceof Error ? err.message : 'LLM 调用失败' } })
    }

    let assessment: unknown
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      assessment = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      assessment = null
    }

    return reply.send({ success: true, data: assessment, raw: assessment ? undefined : result })
  })

  // 测试 AI 连接
  app.post('/api/v1/ai/test-connection', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = testConnectionSchema.parse(request.body ?? {})
    const headerConfig = getCustomAiConfig(request)

    // Body params take priority over headers; headers take priority over env defaults
    const testConfig = {
      apiKey: body.apiKey || headerConfig.apiKey || config.ai.apiKey,
      apiBaseUrl: body.baseUrl || headerConfig.apiBaseUrl || config.ai.apiBaseUrl,
      model: body.model || headerConfig.model || config.ai.model,
    }

    // Validate key format
    if (testConfig.apiKey.trim().length === 0) {
      return reply.code(400).send({ success: false, error: { message: 'API Key 不能为空' } })
    }

    try {
      const response = await fetch(`${testConfig.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: testConfig.model,
          messages: [{ role: 'user', content: 'Reply with "ok" to confirm connectivity.' }],
          max_tokens: 8,
        }),
        signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText)
        return reply.code(502).send({ success: false, error: { message: `LLM API error: ${response.status} - ${errText}` } })
      }
      const data = await response.json() as { choices?: { message?: { content?: string } }[] }
      const replyText = data.choices?.[0]?.message?.content ?? ''

      return reply.send({ success: true, data: { message: '连接成功', model: testConfig.model, reply: replyText } })
    } catch (err) {
      const message = err instanceof Error ? err.message : '连接测试失败'
      logger.warn({ err, model: testConfig.model }, 'AI test connection failed')
      return reply.code(502).send({ success: false, error: { message } })
    }
  })

  // ── 系统级 LLM Provider 管理（前后台统一的事实源）──────────────────────
  // callLlm（数据管线翻译/摘要/难度 + AI 问答兜底）按 priority 升序使用这里
  // 的配置：429/超时/5xx 立即切下一个，失败者 60s 冷却。前端设置页读写同
  // 一组接口，改完 30s 内全后端生效（或被下方写入后的主动失效立即生效）。

  const providerSchema = z.object({
    name: z.string().min(1).max(100),
    baseUrl: z.string().url(),
    apiKey: z.string().min(1).max(500),
    model: z.string().min(1).max(100),
    priority: z.number().int().min(1).max(1000).default(100),
    enabled: z.boolean().default(true),
  })
  const providerUpdateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    baseUrl: z.string().url().optional(),
    // 空=不修改现有 key（前端默认只回传脱敏值）
    apiKey: z.string().max(500).optional(),
    model: z.string().min(1).max(100).optional(),
    priority: z.number().int().min(1).max(1000).optional(),
    enabled: z.boolean().optional(),
  })

  // API key 永不回传明文——只回尾 4 位
  const maskKey = (key: string) => (key.length > 4 ? `****${key.slice(-4)}` : '****')

  app.get('/api/v1/ai/providers', { preHandler: [app.authenticate] }, async () => {
    const rows = await prisma.aiProvider.findMany({ orderBy: { priority: 'asc' } })
    return {
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        baseUrl: r.baseUrl,
        apiKeyMasked: maskKey(r.apiKey),
        model: r.model,
        priority: r.priority,
        enabled: r.enabled,
        updatedAt: r.updatedAt,
      })),
    }
  })

  app.post('/api/v1/ai/providers', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = providerSchema.parse(request.body)
    const provider = await prisma.aiProvider.create({ data: body })
    invalidateLlmProviderCache()
    logger.info({ provider: provider.name }, 'AI provider created')
    return reply.code(201).send({ success: true, data: { id: provider.id } })
  })

  app.put('/api/v1/ai/providers/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = providerUpdateSchema.parse(request.body)
    const data = { ...body }
    // 空/缺省 apiKey 表示"保持原 key 不变"
    if (data.apiKey !== undefined && data.apiKey.trim() === '') {
      delete data.apiKey
    }
    const provider = await prisma.aiProvider.update({ where: { id }, data })
    invalidateLlmProviderCache()
    logger.info({ provider: provider.name }, 'AI provider updated')
    return reply.send({ success: true, data: { id: provider.id } })
  })

  app.delete('/api/v1/ai/providers/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.aiProvider.delete({ where: { id } })
    invalidateLlmProviderCache()
    logger.info({ providerId: id }, 'AI provider deleted')
    return reply.send({ success: true })
  })

  // 测试单个 provider（body 带 id 测库内配置；带完整 baseUrl/apiKey/model 测未保存的草稿）
  app.post('/api/v1/ai/providers/test', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = z
      .object({
        id: z.string().optional(),
        baseUrl: z.string().url().optional(),
        apiKey: z.string().optional(),
        model: z.string().optional(),
      })
      .parse(request.body ?? {})

    let cfg: { baseUrl: string; apiKey: string; model: string }
    if (body.id) {
      const row = await prisma.aiProvider.findUnique({ where: { id: body.id } })
      if (!row) return reply.code(404).send({ success: false, error: { message: 'provider 不存在' } })
      cfg = { baseUrl: row.baseUrl, apiKey: row.apiKey, model: row.model }
    } else if (body.baseUrl && body.apiKey && body.model) {
      cfg = { baseUrl: body.baseUrl, apiKey: body.apiKey, model: body.model }
    } else {
      return reply.code(400).send({ success: false, error: { message: '需要 id 或完整的 baseUrl/apiKey/model' } })
    }

    const started = Date.now()
    try {
      const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          messages: [{ role: 'user', content: 'Reply with "ok".' }],
          max_tokens: 8,
        }),
        signal: AbortSignal.timeout(30_000),
      })
      const ms = Date.now() - started
      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText)
        return reply.send({ success: false, data: { ok: false, status: response.status, latencyMs: ms, message: errText.slice(0, 200) } })
      }
      return reply.send({ success: true, data: { ok: true, status: 200, latencyMs: ms, model: cfg.model } })
    } catch (err) {
      const ms = Date.now() - started
      return reply.send({
        success: true,
        data: { ok: false, status: 0, latencyMs: ms, message: (err as Error).message?.slice(0, 200) ?? 'unknown' },
      })
    }
  })
}
