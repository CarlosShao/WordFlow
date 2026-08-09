import client from './client'
import type {
  ContentItem,
  ContentType,
  ContentSource,
  ContentCategory,
  CEFRLevel,
  PaginatedResponse,
} from '../types'

export const contentApi = {
  async getList(params?: {
    page?: number
    pageSize?: number
    type?: ContentType
    source?: ContentSource
    category?: ContentCategory
    difficulty?: CEFRLevel
    search?: string
  }): Promise<PaginatedResponse<ContentItem>> {
    const data = await client.get('/api/v1/content', { params: params as Record<string, string | number | boolean> })
    return data as unknown as PaginatedResponse<ContentItem>
  },

  async getById(id: string): Promise<ContentItem> {
    const data = await client.get(`/api/v1/content/${id}`)
    return data as unknown as ContentItem
  },

  async getRecommendations(limit: number = 3): Promise<ContentItem[]> {
    const data = await client.get('/api/v1/content/recommendations', { params: { limit: String(limit) } })
    return data as unknown as ContentItem[]
  },

  async favorite(id: string): Promise<void> {
    await client.post(`/api/v1/content/${id}/favorite`)
  },

  async unfavorite(id: string): Promise<void> {
    await client.delete(`/api/v1/content/${id}/favorite`)
  },
}
