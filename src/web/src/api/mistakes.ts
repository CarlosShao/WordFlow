import type { ApiResponse, MistakeRecord } from '../types'
import { mockMistakes } from '../mocks'

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms))

export const mistakesApi = {
  async getList(params?: {
    masteryStatus?: 'not-reviewed' | 'reviewing' | 'mastered'
    type?: string
  }): Promise<ApiResponse<MistakeRecord[]>> {
    await delay()
    const { masteryStatus, type } = params || {}
    
    let filtered = [...mockMistakes]
    
    if (masteryStatus) {
      filtered = filtered.filter(m => m.masteryStatus === masteryStatus)
    }
    if (type) {
      filtered = filtered.filter(m => m.question.type === type)
    }
    
    return {
      success: true,
      data: filtered
    }
  },

  async getById(id: string): Promise<ApiResponse<MistakeRecord | null>> {
    await delay()
    const mistake = mockMistakes.find(m => m.id === id)
    return {
      success: !!mistake,
      data: mistake || null,
      error: mistake ? undefined : 'Mistake not found'
    }
  },

  async updateMastery(id: string, status: 'not-reviewed' | 'reviewing' | 'mastered'): Promise<ApiResponse<MistakeRecord | null>> {
    await delay()
    const mistake = mockMistakes.find(m => m.id === id)
    
    if (!mistake) {
      return {
        success: false,
        data: null,
        error: 'Mistake not found'
      }
    }
    
    mistake.masteryStatus = status
    mistake.reviewCount += 1
    
    return {
      success: true,
      data: mistake
    }
  },

  async getStats(): Promise<ApiResponse<{
    total: number
    notReviewed: number
    reviewing: number
    mastered: number
  }>> {
    await delay()
    
    return {
      success: true,
      data: {
        total: mockMistakes.length,
        notReviewed: mockMistakes.filter(m => m.masteryStatus === 'not-reviewed').length,
        reviewing: mockMistakes.filter(m => m.masteryStatus === 'reviewing').length,
        mastered: mockMistakes.filter(m => m.masteryStatus === 'mastered').length
      }
    }
  }
}
