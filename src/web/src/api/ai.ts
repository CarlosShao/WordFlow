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
  async generateQuestions(
    content: string,
    difficulty: CEFRLevel = 'B2',
    count: number = 5
  ): Promise<PracticeQuestion[]> {
    const data = await client.post('/api/v1/ai/questions/generate', { content, difficulty, count }, { headers: buildAiHeaders() })
    return data as unknown as PracticeQuestion[]
  },

  async analyzeError(params: {
    question: string
    userAnswer: string
    correctAnswer: string
    errorHistory?: string
  }): Promise<ErrorAnalysisResult> {
    const data = await client.post('/api/v1/ai/errors/analyze', params, { headers: buildAiHeaders() })
    return data as unknown as ErrorAnalysisResult
  },

  async getContextualDefinition(params: {
    word: string
    sentence: string
    paragraph: string
  }): Promise<ContextualDefinition> {
    const data = await client.post('/api/v1/ai/words/contextual', params, { headers: buildAiHeaders() })
    return data as unknown as ContextualDefinition
  },

  async generateWeeklyPlan(params: {
    weakPoints: string
    recentActivity: string
    level?: CEFRLevel
  }): Promise<WeeklyPlanResult> {
    const data = await client.post('/api/v1/ai/study-plan/weekly', params, { headers: buildAiHeaders() })
    return data as unknown as WeeklyPlanResult
  },

  async generateVocabularyStory(words: string[], level: CEFRLevel = 'B2'): Promise<{ story: string; translation: string }> {
    const data = await client.post('/api/v1/ai/vocabulary/story', { words, level }, { headers: buildAiHeaders() })
    return data as unknown as { story: string; translation: string }
  },

  async assessDifficulty(text: string): Promise<DifficultyAssessment> {
    const data = await client.post('/api/v1/ai/text/assess-difficulty', { text }, { headers: buildAiHeaders() })
    return data as unknown as DifficultyAssessment
  },

  async chat(message: string, context?: string): Promise<{ reply: string }> {
    const data = await client.post('/api/v1/ai/chat', { message, context }, { headers: buildAiHeaders() })
    return data as unknown as { reply: string }
  },
}

export function configureAI(config: Partial<AIConfig>) {
  // Stub: would configure AI client for external LLM if needed
  if (config.debug) {
    console.log('[AI] Configured:', config)
  }
}
