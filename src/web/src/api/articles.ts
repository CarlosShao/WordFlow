import client from './client'
import type { Article, ArticleListResponse, CEFRLevel, PaginatedResponse } from '../types'

export const articlesApi = {
  async getList(params?: {
    page?: number
    pageSize?: number
    difficulty?: CEFRLevel
    source?: string
    tags?: string[]
  }): Promise<ArticleListResponse> {
    const data = await client.get('/api/v1/content', { params: { ...params, type: 'article' } as unknown as Record<string, string | number | boolean> })
    const arr = Array.isArray(data) ? data : (data?.items ?? [])
    const meta = Array.isArray(data) ? {} : (data?.meta ?? {})
    return {
      articles: arr,
      total: meta.total ?? arr.length,
      page: meta.page ?? 1,
      pageSize: meta.limit ?? arr.length,
    }
  },

  async getById(id: string): Promise<Article> {
    const data = await client.get(`/api/v1/content/${id}`)
    return data as unknown as Article
  },
}
