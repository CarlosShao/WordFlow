import type { ApiResponse, PracticeQuestion, PracticeType, CEFRLevel } from '../types'
import { mockPracticeQuestions } from '../mocks'

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms))

export const practiceApi = {
  async getQuestions(params?: {
    type?: PracticeType
    difficulty?: CEFRLevel
    limit?: number
  }): Promise<ApiResponse<PracticeQuestion[]>> {
    await delay()
    const { type, difficulty, limit = 10 } = params || {}
    
    let filtered = [...mockPracticeQuestions]
    
    if (type) {
      filtered = filtered.filter(q => q.type === type)
    }
    if (difficulty) {
      filtered = filtered.filter(q => q.difficulty === difficulty)
    }
    
    // Shuffle and limit
    const shuffled = filtered.sort(() => Math.random() - 0.5)
    
    return {
      success: true,
      data: shuffled.slice(0, limit)
    }
  },

  async getById(id: string): Promise<ApiResponse<PracticeQuestion | null>> {
    await delay()
    const question = mockPracticeQuestions.find(q => q.id === id)
    return {
      success: !!question,
      data: question || null,
      error: question ? undefined : 'Question not found'
    }
  },

  async submitAnswer(questionId: string, answer: string | string[]): Promise<ApiResponse<{
    correct: boolean
    correctAnswer: string | string[]
    explanation: string
    points: number
  }>> {
    await delay(200)
    const question = mockPracticeQuestions.find(q => q.id === questionId)
    
    if (!question) {
      return {
        success: false,
        data: { correct: false, correctAnswer: '', explanation: '', points: 0 },
        error: 'Question not found'
      }
    }
    
    const isCorrect = Array.isArray(question.correctAnswer)
      ? Array.isArray(answer) && question.correctAnswer.every(a => answer.includes(a))
      : answer === question.correctAnswer
    
    return {
      success: true,
      data: {
        correct: isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        points: isCorrect ? question.points : 0
      }
    }
  }
}
