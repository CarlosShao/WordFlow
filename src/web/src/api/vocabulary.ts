import client from './client'
import type { Vocabulary, CEFRLevel, PaginatedResponse } from '../types'

export interface VocabularyReviewResult {
  id: string
  masteryLevel: number
  nextReviewAt: string
}

export const vocabularyApi = {
  async getList(params?: {
    page?: number
    pageSize?: number
    difficulty?: CEFRLevel
    tags?: string[]
    sortBy?: 'word' | 'addedAt' | 'masteryLevel' | 'nextReviewAt'
    sortOrder?: 'asc' | 'desc'
  }): Promise<PaginatedResponse<Vocabulary>> {
    const data = await client.get('/api/v1/vocabulary', { params: params as Record<string, string | number | boolean> })
    return data as unknown as PaginatedResponse<Vocabulary>
  },

  async getById(id: string): Promise<Vocabulary> {
    const data = await client.get(`/api/v1/vocabulary/${id}`)
    return data as unknown as Vocabulary
  },

  // 搜索词汇（后端：GET /api/v1/vocabulary?keyword=...，支持 word/translation 模糊匹配）
  async search(keyword: string): Promise<Vocabulary[]> {
    const data = await client.get('/api/v1/vocabulary', { params: { keyword, limit: 50 } })
    const resp = data as unknown as PaginatedResponse<Vocabulary>
    return resp.items ?? []
  },

  // 待复习词汇（后端：GET /api/v1/vocabulary/due）
  async getReviewList(): Promise<Vocabulary[]> {
    const data = await client.get('/api/v1/vocabulary/due')
    return (data as unknown as Vocabulary[]) ?? []
  },

  async addWord(word: string, contentId?: string): Promise<Vocabulary> {
    const data = await client.post('/api/v1/vocabulary', { word, contentId })
    return data as unknown as Vocabulary
  },

  async review(id: string, quality: number): Promise<VocabularyReviewResult> {
    const data = await client.post(`/api/v1/vocabulary/${id}/review`, { quality })
    return data as unknown as VocabularyReviewResult
  },

  async delete(id: string): Promise<void> {
    await client.delete(`/api/v1/vocabulary/${id}`)
  },
}
