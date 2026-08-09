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
    const result = data as unknown as PaginatedResponse<Article>
    return {
      articles: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    }
  },

  async getById(id: string): Promise<Article> {
    const data = await client.get(`/api/v1/content/${id}`)
    return data as unknown as Article
  },
}
