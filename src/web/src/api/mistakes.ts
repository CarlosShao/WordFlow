import client from './client'
import type { MistakeRecord, PracticeType } from '../types'

export interface MistakeStats {
  total: number
  notReviewed: number
  reviewing: number
  mastered: number
}

export const mistakesApi = {
  async getList(params?: {
    masteryStatus?: 'not-reviewed' | 'reviewing' | 'mastered'
    type?: PracticeType
    page?: number
    pageSize?: number
  }): Promise<MistakeRecord[]> {
    const data = await client.get('/api/v1/mistakes', { params: params as Record<string, string | number | boolean> })
    return data as unknown as MistakeRecord[]
  },

  async getById(id: string): Promise<MistakeRecord> {
    const data = await client.get(`/api/v1/mistakes/${id}`)
    return data as unknown as MistakeRecord
  },

  // 复习错题（后端：POST /api/v1/mistakes/:id/review，根据 correct 自动更新掌握度）
  async updateMastery(id: string, status: 'not-reviewed' | 'reviewing' | 'mastered', correct?: boolean): Promise<MistakeRecord> {
    const isCorrect = correct ?? (status === 'mastered' || status === 'reviewing')
    const data = await client.post(`/api/v1/mistakes/${id}/review`, { correct: isCorrect })
    return data as unknown as MistakeRecord
  },

  async getStats(): Promise<MistakeStats> {
    const data = await client.get('/api/v1/mistakes/stats')
    return data as unknown as MistakeStats
  },

  async delete(id: string): Promise<void> {
    await client.delete(`/api/v1/mistakes/${id}`)
  },
}
