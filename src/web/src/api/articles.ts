import type { ApiResponse, Article, ArticleListResponse, CEFRLevel, ArticleSource } from '../types'
import { mockArticles } from '../mocks'

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms))

export const articlesApi = {
  async getList(params?: {
    page?: number
    pageSize?: number
    difficulty?: CEFRLevel
    source?: ArticleSource
    tags?: string[]
  }): Promise<ApiResponse<ArticleListResponse>> {
    await delay()
    const { page = 1, pageSize = 10, difficulty, source, tags } = params || {}
    
    let filtered = [...mockArticles]
    
    if (difficulty) {
      filtered = filtered.filter(a => a.difficulty === difficulty)
    }
    if (source) {
      filtered = filtered.filter(a => a.source === source)
    }
    if (tags && tags.length > 0) {
      filtered = filtered.filter(a => tags.some(t => a.tags.includes(t)))
    }
    
    const start = (page - 1) * pageSize
    const end = start + pageSize
    
    return {
      success: true,
      data: {
        articles: filtered.slice(start, end),
        total: filtered.length,
        page,
        pageSize
      }
    }
  },

  async getById(id: string): Promise<ApiResponse<Article | null>> {
    await delay()
    const article = mockArticles.find(a => a.id === id)
    return {
      success: !!article,
      data: article || null,
      error: article ? undefined : 'Article not found'
    }
  }
}
