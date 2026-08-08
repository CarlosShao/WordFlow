// ═══════════════════════════════════════════════════════════════
// AI API Client — English Learner
// Supports both mock mode (default) and real backend API
// ═══════════════════════════════════════════════════════════════

import type {
  PracticeQuestion,
  CEFRLevel,
  ApiResponse
} from '../types'

// ── Configuration ──────────────────────────────────────────────

export interface AIConfig {
  /** Backend API endpoint, e.g. 'https://api.example.com/v1' */
  endpoint: string
  /** API key for authentication */
  apiKey?: string
  /** Request timeout in ms */
  timeout?: number
  /** Enable debug logging */
  debug?: boolean
}

let _config: AIConfig = {
  endpoint: '/api/ai',
  timeout: 30000,
  debug: false
}

/**
 * Configure the AI client for real backend calls.
 * When not configured, falls back to mock responses.
 */
export function configureAI(config: Partial<AIConfig>) {
  _config = { ..._config, ...config }
  if (_config.debug) {
    console.log('[AI] Configured:', _config)
  }
}

function getConfig() {
  return _config
}

// ── HTTP Client ────────────────────────────────────────────────

async function aiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const config = getConfig()
  const url = `${config.endpoint}${path}`

  if (config.debug) {
    console.log(`[AI] ${options.method || 'GET'} ${url}`, options.body || '')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), config.timeout)

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    }

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      return {
        success: false,
        data: null as T,
        error: `HTTP ${response.status}: ${errorText}`
      }
    }

    const data = await response.json()
    return data as ApiResponse<T>
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        data: null as T,
        error: 'Request timeout'
      }
    }
    return {
      success: false,
      data: null as T,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// ── Mock Data ──────────────────────────────────────────────────

const mockQuestions: PracticeQuestion[] = [
  {
    id: 'ai-q-1',
    type: 'multiple-choice',
    difficulty: 'B2',
    question: 'What is the main idea of the passage?',
    options: [
      'AI is only used in technology companies',
      'AI is transforming multiple aspects of daily life',
      'AI will replace all human workers',
      'AI has no impact on healthcare'
    ],
    correctAnswer: 'AI is transforming multiple aspects of daily life',
    explanation: 'The passage discusses AI applications in homes, healthcare, and ethics — showing it affects many areas of daily life.',
    points: 10,
    tags: ['reading-comprehension', 'main-idea']
  },
  {
    id: 'ai-q-2',
    type: 'fill-blank',
    difficulty: 'B2',
    question: 'Machine learning algorithms can now detect certain cancers _____ than human doctors.',
    correctAnswer: 'earlier',
    explanation: 'The passage states AI can detect cancers "earlier than human doctors" — this is a comparative structure.',
    points: 10,
    tags: ['vocabulary', 'comparative']
  },
  {
    id: 'ai-q-3',
    type: 'true-false',
    difficulty: 'B1',
    question: 'According to the passage, AI diagnostic tools have 100% accuracy in cancer detection.',
    options: ['True', 'False'],
    correctAnswer: 'False',
    explanation: 'The passage says accuracy rates "exceed 95%" — not 100%. Be careful with absolute statements.',
    points: 5,
    tags: ['reading-comprehension', 'detail']
  }
]

const mockDelay = (ms: number = 800) => new Promise(resolve => setTimeout(resolve, ms))

// ── API Methods ────────────────────────────────────────────────

export const aiApi = {
  /**
   * Generate practice questions from content
   */
  async generateQuestions(
    content: string,
    difficulty: CEFRLevel = 'B2',
    count: number = 5
  ): Promise<ApiResponse<PracticeQuestion[]>> {
    const config = getConfig()

    // If using default endpoint (mock mode), return mock data
    if (config.endpoint === '/api/ai') {
      await mockDelay(1200)
      return {
        success: true,
        data: mockQuestions.slice(0, count)
      }
    }

    // Real API call
    return aiRequest<PracticeQuestion[]>('/questions/generate', {
      method: 'POST',
      body: JSON.stringify({ content, difficulty, count })
    })
  },

  /**
   * Analyze a student's error and provide targeted feedback
   */
  async analyzeError(
    question: string,
    userAnswer: string,
    correctAnswer: string,
    errorHistory: string = ''
  ): Promise<ApiResponse<{
    errorPattern: string
    explanation: string
    concept: string
    studyRecommendation: string
    similarQuestions: Array<{
      question: string
      options?: string[]
      answer: string
    }>
  }>> {
    const config = getConfig()

    if (config.endpoint === '/api/ai') {
      await mockDelay(1000)
      return {
        success: true,
        data: {
          errorPattern: 'Comparative/Superlative confusion',
          explanation: 'You tend to confuse comparative forms (-er, more) with superlative forms (-est, most). This is a common intermediate-level mistake.',
          concept: 'English comparatives use "-er" for short adjectives and "more" for longer ones. Superlatives use "-est" and "most".',
          studyRecommendation: 'Review comparative and superlative forms. Focus on irregular forms (good/better/best).',
          similarQuestions: [
            {
              question: 'This is the _____ movie I have ever seen.',
              options: ['good', 'better', 'best', 'most good'],
              answer: 'best'
            }
          ]
        }
      }
    }

    return aiRequest('/errors/analyze', {
      method: 'POST',
      body: JSON.stringify({ question, userAnswer, correctAnswer, errorHistory })
    })
  },

  /**
   * Get contextual word definition (meaning depends on context)
   */
  async getContextualDefinition(
    word: string,
    sentence: string,
    paragraph: string
  ): Promise<ApiResponse<{
    definition: string
    chineseDefinition: string
    partOfSpeech: string
    phonetic: string
    contextNote: string
  }>> {
    const config = getConfig()

    if (config.endpoint === '/api/ai') {
      await mockDelay(600)
      return {
        success: true,
        data: {
          definition: `The contextual meaning of "${word}" in this passage`,
          chineseDefinition: `"${word}" 在本文中的具体含义`,
          partOfSpeech: 'n./adj./v.',
          phonetic: '/wɜːrd/',
          contextNote: `In this context, "${word}" is used in a specialized sense related to the topic being discussed.`
        }
      }
    }

    return aiRequest('/words/contextual', {
      method: 'POST',
      body: JSON.stringify({ word, sentence, paragraph })
    })
  },

  /**
   * Generate a personalized weekly study plan
   */
  async generateWeeklyPlan(
    weakPoints: string,
    recentActivity: string,
    level: CEFRLevel = 'B2'
  ): Promise<ApiResponse<{
    days: Array<{
      day: string
      focus: string
      tasks: string[]
      time: number
    }>
    priorityRecommendations: string[]
  }>> {
    const config = getConfig()

    if (config.endpoint === '/api/ai') {
      await mockDelay(1500)
      return {
        success: true,
        data: {
          days: [
            { day: 'Monday', focus: 'Reading Comprehension', tasks: ['Read 1 BBC article', 'Highlight 5 new words', 'Answer comprehension questions'], time: 30 },
            { day: 'Tuesday', focus: 'Listening Practice', tasks: ['Listen to 1 TED talk', 'Dictation exercise (2 segments)', 'Shadow reading'], time: 35 },
            { day: 'Wednesday', focus: 'Vocabulary Building', tasks: ['Review spaced repetition cards', 'Learn 10 new words', 'Write 5 example sentences'], time: 25 },
            { day: 'Thursday', focus: 'Grammar Focus', tasks: ['Complete grammar exercises', 'Error correction practice', 'Review mistake patterns'], time: 30 },
            { day: 'Friday', focus: 'Writing Practice', tasks: ['Summarize a reading passage', 'AI writing feedback', 'Revise based on suggestions'], time: 35 },
            { day: 'Saturday', focus: 'Mixed Practice', tasks: ['Mini test (reading + listening)', 'Review week\'s vocabulary', 'Challenge exercise'], time: 40 },
            { day: 'Sunday', focus: 'Review & Rest', tasks: ['Weekly review', 'Light reading', 'Prepare next week\'s goals'], time: 20 }
          ],
          priorityRecommendations: [
            'Focus on comparative/superlative grammar this week',
            'Increase listening practice — your weakest area',
            'Review B2 vocabulary from the past 2 weeks'
          ]
        }
      }
    }

    return aiRequest('/study-plan/weekly', {
      method: 'POST',
      body: JSON.stringify({ weakPoints, recentActivity, level })
    })
  },

  /**
   * Generate a story using specific vocabulary words
   */
  async generateVocabularyStory(
    words: string[],
    level: CEFRLevel = 'B2'
  ): Promise<ApiResponse<{ story: string; translation: string }>> {
    const config = getConfig()

    if (config.endpoint === '/api/ai') {
      await mockDelay(1200)
      const story = `Once upon a time, there was a ${words[0]} who lived in a ${words[1] || 'village'}. Every day, they would ${words[2] || 'explore'} the world around them, discovering ${words[3] || 'new'} things that were truly ${words[4] || 'remarkable'}.`
      return {
        success: true,
        data: {
          story,
          translation: '从前，有一个住在村庄里的人。每天，他们都会探索周围的世界，发现真正非凡的新事物。'
        }
      }
    }

    return aiRequest('/vocabulary/story', {
      method: 'POST',
      body: JSON.stringify({ words, level })
    })
  },

  /**
   * Assess the difficulty level of a text
   */
  async assessDifficulty(text: string): Promise<ApiResponse<{
    level: CEFRLevel
    confidence: number
    reasoning: string
  }>> {
    const config = getConfig()

    if (config.endpoint === '/api/ai') {
      await mockDelay(800)
      const wordCount = text.split(/\s+/).length
      const avgWordLength = text.replace(/[^a-zA-Z]/g, '').length / wordCount
      let level: CEFRLevel = 'B1'
      if (avgWordLength > 6) level = 'C1'
      else if (avgWordLength > 5) level = 'B2'
      else if (avgWordLength > 4) level = 'B1'
      else level = 'A2'

      return {
        success: true,
        data: {
          level,
          confidence: 0.75,
          reasoning: `Based on vocabulary complexity (avg word length: ${avgWordLength.toFixed(1)}), sentence structure, and topic complexity.`
        }
      }
    }

    return aiRequest('/text/assess-difficulty', {
      method: 'POST',
      body: JSON.stringify({ text })
    })
  }
}
