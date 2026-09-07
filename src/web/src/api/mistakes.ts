import client from './client'
import type { MistakeRecord, MistakeMasteryStatus } from '../types'

export interface MistakeStats {
  total: number
  notReviewed: number
  reviewing: number
  mastered: number
}

export const mistakesApi = {
  // 后端 mistakeQuerySchema：mastery（大写枚举）/limit/sortBy/sortOrder
  // 响应 meta（total/totalPages）被 client 拦截器丢弃，这里取后端上限 100 条
  async getList(params?: {
    mastery?: MistakeMasteryStatus
    page?: number
    limit?: number
  }): Promise<MistakeRecord[]> {
    const data = await client.get('/api/v1/mistakes', {
      params: { limit: 100, ...params } as Record<string, string | number | boolean>,
    })
    return (data ?? []) as unknown as MistakeRecord[]
  },

  async getById(id: string): Promise<MistakeRecord> {
    const data = await client.get(`/api/v1/mistakes/${id}`)
    return data as unknown as MistakeRecord
  },

  // 显式设置掌握状态（后端：POST /api/v1/mistakes/:id/review body { status }）
  async updateMastery(id: string, status: MistakeMasteryStatus): Promise<MistakeRecord> {
    const data = await client.post(`/api/v1/mistakes/${id}/review`, { status })
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
