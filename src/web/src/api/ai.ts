import client from './client'
import type { PracticeQuestion, CEFRLevel } from '../types'

export interface AIConfig {
  endpoint: string
  apiKey?: string
  timeout?: number
  debug?: boolean
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
    const data = await client.post('/api/v1/ai/questions/generate', { content, difficulty, count })
    return data as unknown as PracticeQuestion[]
  },

  async analyzeError(params: {
    question: string
    userAnswer: string
    correctAnswer: string
    errorHistory?: string
  }): Promise<ErrorAnalysisResult> {
    const data = await client.post('/api/v1/ai/errors/analyze', params)
    return data as unknown as ErrorAnalysisResult
  },

  async getContextualDefinition(params: {
    word: string
    sentence: string
    paragraph: string
  }): Promise<ContextualDefinition> {
    const data = await client.post('/api/v1/ai/words/contextual', params)
    return data as unknown as ContextualDefinition
  },

  async generateWeeklyPlan(params: {
    weakPoints: string
    recentActivity: string
    level?: CEFRLevel
  }): Promise<WeeklyPlanResult> {
    const data = await client.post('/api/v1/ai/study-plan/weekly', params)
    return data as unknown as WeeklyPlanResult
  },

  async generateVocabularyStory(words: string[], level: CEFRLevel = 'B2'): Promise<{ story: string; translation: string }> {
    const data = await client.post('/api/v1/ai/vocabulary/story', { words, level })
    return data as unknown as { story: string; translation: string }
  },

  async assessDifficulty(text: string): Promise<DifficultyAssessment> {
    const data = await client.post('/api/v1/ai/text/assess-difficulty', { text })
    return data as unknown as DifficultyAssessment
  },

  async chat(message: string, context?: string): Promise<{ reply: string }> {
    const data = await client.post('/api/v1/ai/chat', { message, context })
    return data as unknown as { reply: string }
  },
}

export function configureAI(config: Partial<AIConfig>) {
  // Stub: would configure AI client for external LLM if needed
  if (config.debug) {
    console.log('[AI] Configured:', config)
  }
}
