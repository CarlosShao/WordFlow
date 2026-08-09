import client from './client'
import type { PracticeQuestion, PracticeType, CEFRLevel, PracticeSession } from '../types'

export interface AnswerResult {
  correct: boolean
  correctAnswer: string | string[]
  explanation: string
  points: number
}

export const practiceApi = {
  async createSession(params: {
    type: PracticeType
    difficulty?: CEFRLevel
    contentId?: string
    questionCount?: number
  }): Promise<PracticeSession> {
    const data = await client.post('/api/v1/practice/sessions', params)
    return data as unknown as PracticeSession
  },

  async getQuestions(params?: {
    type?: PracticeType
    difficulty?: CEFRLevel
    limit?: number
  }): Promise<PracticeQuestion[]> {
    const data = await client.get('/api/v1/practice/questions', { params: params as Record<string, string | number | boolean> })
    return data as unknown as PracticeQuestion[]
  },

  async getById(id: string): Promise<PracticeQuestion> {
    const data = await client.get(`/api/v1/practice/questions/${id}`)
    return data as unknown as PracticeQuestion
  },

  async submitAnswer(sessionId: string, questionId: string, answer: string | string[]): Promise<AnswerResult> {
    const data = await client.post(`/api/v1/practice/sessions/${sessionId}/answer`, {
      questionId,
      answer,
    })
    return data as unknown as AnswerResult
  },

  async submitAnswerDirect(questionId: string, answer: string | string[]): Promise<AnswerResult> {
    const data = await client.post('/api/v1/practice/answer', {
      questionId,
      answer,
    })
    return data as unknown as AnswerResult
  },

  async completeSession(sessionId: string): Promise<{ score: number; totalPoints: number; correctCount: number }> {
    const data = await client.post(`/api/v1/practice/sessions/${sessionId}/complete`)
    return data as unknown as { score: number; totalPoints: number; correctCount: number }
  },

  async getSession(sessionId: string): Promise<PracticeSession> {
    const data = await client.get(`/api/v1/practice/sessions/${sessionId}`)
    return data as unknown as PracticeSession
  },
}
