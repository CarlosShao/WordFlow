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

  async search(keyword: string): Promise<Vocabulary[]> {
    const data = await client.get('/api/v1/vocabulary/search', { params: { q: keyword } })
    return data as unknown as Vocabulary[]
  },

  async getReviewList(): Promise<Vocabulary[]> {
    const data = await client.get('/api/v1/vocabulary/review')
    return data as unknown as Vocabulary[]
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
