import client from './client'
import type { PracticeQuestion, CEFRLevel } from '../types'
import { useSettingsStore } from '../stores/settings'

export interface AIConfig {
  endpoint: string
  apiKey?: string
  timeout?: number
  debug?: boolean
}

/**
 * Build headers for AI requests that carry user-configured API credentials.
 * These headers tell the backend which LLM config to use (user's or default).
 */
function buildAiHeaders(): Record<string, string> {
  try {
    const settings = useSettingsStore()
    const headers: Record<string, string> = {}

    if (settings.hasCustomKey) {
      if (settings.apiKey.trim()) {
        headers['X-Custom-API-Key'] = settings.apiKey.trim()
      }
      if (settings.apiBaseUrl.trim()) {
        headers['X-Custom-Base-URL'] = settings.apiBaseUrl.trim()
      }
      if (settings.model.trim()) {
        headers['X-Custom-Model'] = settings.model.trim()
      }
    }

    return headers
  } catch {
    // Store not initialized (e.g., outside component context) — skip custom headers
    return {}
  }
}

export interface ErrorAnalysisResult {
  errorPattern: string
  explanation: string
  concept: string
  studyRecommendation: string
  similarQuestions: Array<{
    question: string
    options?: string[]
    answer: string
  }>
}

export interface ContextualDefinition {
  definition: string
  chineseDefinition: string
  partOfSpeech: string
  phonetic: string
  contextNote: string
}

export interface WeeklyPlanResult {
  days: Array<{
    day: string
    focus: string
    tasks: string[]
    time: number
  }>
  priorityRecommendations: string[]
}

export interface DifficultyAssessment {
  level: CEFRLevel
  confidence: number
  reasoning: string
}

export const aiApi = {
  // 生成练习题（后端：POST /api/v1/ai/generate-question）
  // 支持直接传文本内容给后端生成题目
  async generateQuestions(
    content: string,
    difficulty: CEFRLevel = 'B2',
    count: number = 5
  ): Promise<PracticeQuestion[]> {
    const data: any = await client.post(
      '/api/v1/ai/generate-question',
      { text: content, difficulty, questionCount: count },
      { headers: buildAiHeaders() },
    )

    if (!data) return []

    // 后端可能返回数组或单个对象
    const rawItems = Array.isArray(data) ? data : [data]

    return rawItems.map((raw: any, idx: number): PracticeQuestion => ({
      id: raw.id || `ai-${Date.now()}-${idx}`,
      type: (raw.type || 'multiple-choice') as PracticeQuestion['type'],
      difficulty: (raw.difficulty || difficulty) as CEFRLevel,
      question: raw.question || raw.stem || '',
      options: raw.options || undefined,
      correctAnswer: raw.correctAnswer ?? '',
      explanation: raw.explanation || '',
      points: raw.points || 1,
      tags: raw.tags || [],
    }))
  },

  // 错误分析（后端无专属接口，复用 /ai/explain 解释相关词）
  async analyzeError(params: {
    question: string
    userAnswer: string
    correctAnswer: string
    errorHistory?: string
  }): Promise<ErrorAnalysisResult> {
    const res = await client.post('/api/v1/ai/explain', {
      word: params.correctAnswer,
      context: params.question,
    }, { headers: buildAiHeaders() })
    const explanation = (res as unknown as { explanation?: string }).explanation ?? ''
    return {
      errorPattern: 'AI 分析',
      explanation,
      concept: params.correctAnswer,
      studyRecommendation: '结合解析复习相关词汇',
      similarQuestions: [],
    }
  },

  // 语境释义（后端：POST /api/v1/ai/explain）
  async getContextualDefinition(params: {
    word: string
    sentence: string
    paragraph: string
  }): Promise<ContextualDefinition> {
    const res = await client.post('/api/v1/ai/explain', {
      word: params.word,
      context: params.sentence || params.paragraph,
    }, { headers: buildAiHeaders() })
    const explanation = (res as unknown as { explanation?: string }).explanation ?? ''
    return {
      definition: explanation,
      chineseDefinition: explanation,
      partOfSpeech: '',
      phonetic: '',
      contextNote: params.sentence,
    }
  },

  // 周计划（后端：POST /api/v1/ai/generate-weekly-plan）
  async generateWeeklyPlan(params: {
    weakPoints: string
    recentActivity: string
    level?: CEFRLevel
  }): Promise<WeeklyPlanResult> {
    const data = await client.post('/api/v1/ai/generate-weekly-plan', {
      weakPoints: params.weakPoints,
      recentActivity: params.recentActivity ?? '',
      level: params.level ?? 'B2',
    }, { headers: buildAiHeaders() })
    const raw = (data as unknown as WeeklyPlanResult) ?? null
    if (!raw || !Array.isArray(raw.days)) {
      return { days: [], priorityRecommendations: [] }
    }
    return raw
  },

  // 词汇故事（后端：POST /api/v1/ai/generate-vocabulary-story）
  async generateVocabularyStory(words: string[], level: CEFRLevel = 'B2'): Promise<{ story: string; translation: string }> {
    const data = await client.post('/api/v1/ai/generate-vocabulary-story', {
      words,
      level,
    }, { headers: buildAiHeaders() })
    const raw = (data as unknown as { story?: string; translation?: string }) ?? null
    if (!raw || !raw.story) {
      return { story: '', translation: '' }
    }
    return { story: raw.story, translation: raw.translation ?? '' }
  },

  // 难度评估（后端：POST /api/v1/ai/assess-difficulty）
  async assessDifficulty(text: string): Promise<DifficultyAssessment> {
    const data = await client.post('/api/v1/ai/assess-difficulty', {
      text,
    }, { headers: buildAiHeaders() })
    const raw = (data as unknown as DifficultyAssessment) ?? null
    if (!raw || !raw.level) {
      return { level: 'B2', confidence: 0, reasoning: '无法评估' }
    }
    return raw
  },

  // AI 对话（后端：POST /api/v1/ai/chat）
  async chat(message: string, context?: string): Promise<{ reply: string }> {
    const data = await client.post('/api/v1/ai/chat', {
      messages: context
        ? [
            { role: 'user', content: context },
            { role: 'user', content: message },
          ]
        : [{ role: 'user', content: message }],
    }, { headers: buildAiHeaders() })
    return (data as unknown as { reply: string }) ?? { reply: '' }
  },
}

export function configureAI(config: Partial<AIConfig>) {
  // 将前端 AI 配置持久化到 settings store（localStorage），供 buildAiHeaders 注入后端请求
  try {
    const settings = useSettingsStore()
    settings.saveApiConfig({
      apiBaseUrl: config.endpoint ?? settings.apiBaseUrl,
      apiKey: config.apiKey ?? settings.apiKey,
    })
  } catch {
    // settings store 未初始化时静默忽略
  }
}
