// ═══════════════════════════════════════════════════════════════
// AI Service — English Learner
// High-level service that uses aiApi for data fetching.
// Configure with configureAI() to switch from mock to real backend.
// ═══════════════════════════════════════════════════════════════

import { aiApi, configureAI as _configureAI } from '../api/ai'
import type {
  PracticeQuestion,
  CEFRLevel,
  ApiResponse
} from '../types'

// Re-export configuration function
export { configureAI } from '../api/ai'
export type { AIConfig } from '../api/ai'

// ── Prompt Templates ───────────────────────────────────────────
// These can be sent to the backend as part of the request body
// or used for client-side prompt engineering when needed.

export const PROMPTS = {
  generateQuestions: (content: string, difficulty: CEFRLevel, count: number) => `
You are an English language teacher. Based on the following content, generate ${count} practice questions at ${difficulty} level.
Mix question types: multiple-choice, fill-blank, true-false.

Content:
${content}

Return as JSON array with fields: id, type, question, options?, correctAnswer, explanation, difficulty, points, tags
  `.trim(),

  analyzeError: (question: string, userAnswer: string, correctAnswer: string, history: string) => `
You are an English learning coach. A student made an error. Analyze their mistake pattern and provide targeted advice.

Question: ${question}
Student's answer: ${userAnswer}
Correct answer: ${correctAnswer}
Recent error history: ${history}

Provide:
1. Why the student might have made this error
2. The underlying grammar/vocabulary concept
3. A targeted study recommendation
4. 2 similar practice questions
  `.trim(),

  contextualDefinition: (word: string, sentence: string, paragraph: string) => `
You are a bilingual English-Chinese dictionary with contextual awareness.

Word: "${word}"
Current sentence: "${sentence}"
Surrounding context: "${paragraph}"

Provide:
1. The most appropriate definition for this context (not just the general meaning)
2. Chinese translation specific to this usage
3. Part of speech
4. Phonetic transcription
5. A note on how the word's meaning differs in this context vs its common usage
  `.trim(),

  weeklyPlan: (weakPoints: string, recentActivity: string, level: CEFRLevel) => `
You are a personalized English learning coach. Create a weekly study plan.

Student level: ${level}
Weak points: ${weakPoints}
Recent activity: ${recentActivity}

Create a 7-day plan with:
- Daily focus area
- Specific tasks (reading, listening, vocabulary, practice)
- Estimated time per day
- Priority recommendations
  `.trim()
}

// ── Service Methods ────────────────────────────────────────────

export const aiService = {
  /**
   * Generate practice questions from content
   */
  async generateQuestions(
    content: string,
    difficulty: CEFRLevel = 'B2',
    count: number = 5
  ): Promise<ApiResponse<PracticeQuestion[]>> {
    const response = await aiApi.generateQuestions(content, difficulty, count)
    return {
      success: response.success,
      data: response.data || [],
      error: response.error
    }
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
    const response = await aiApi.analyzeError(question, userAnswer, correctAnswer, errorHistory)
    return {
      success: response.success,
      data: response.data || {
        errorPattern: '',
        explanation: '',
        concept: '',
        studyRecommendation: '',
        similarQuestions: []
      },
      error: response.error
    }
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
    const response = await aiApi.getContextualDefinition(word, sentence, paragraph)
    return {
      success: response.success,
      data: response.data || {
        definition: '',
        chineseDefinition: '',
        partOfSpeech: '',
        phonetic: '',
        contextNote: ''
      },
      error: response.error
    }
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
    const response = await aiApi.generateWeeklyPlan(weakPoints, recentActivity, level)
    return {
      success: response.success,
      data: response.data || { days: [], priorityRecommendations: [] },
      error: response.error
    }
  },

  /**
   * Generate a story using specific vocabulary words
   */
  async generateVocabularyStory(
    words: string[],
    level: CEFRLevel = 'B2'
  ): Promise<ApiResponse<{ story: string; translation: string }>> {
    const response = await aiApi.generateVocabularyStory(words, level)
    return {
      success: response.success,
      data: response.data || { story: '', translation: '' },
      error: response.error
    }
  },

  /**
   * Assess the difficulty level of a text
   */
  async assessDifficulty(text: string): Promise<ApiResponse<{
    level: CEFRLevel
    confidence: number
    reasoning: string
  }>> {
    const response = await aiApi.assessDifficulty(text)
    return {
      success: response.success,
      data: response.data || { level: 'B1', confidence: 0, reasoning: '' },
      error: response.error
    }
  }
}
