import client from './client'
import type { Vocabulary, CEFRLevel, PaginatedResponse } from '../types'

export interface VocabularyReviewResult {
  id: string
  masteryLevel: number
  nextReviewAt: string
}

// ── 词典库 payload 结构（来自有道爬取） ─────────────────────────
export interface DictionaryPayload {
  word: string
  phonetic?: { uk?: string; us?: string; ukAudio?: string; usAudio?: string }
  translations?: { cn: string; pos: string }[]
  definitions?: { en: string; pos: string; synonyms?: string[] }[]
  examples?: { cn: string; en: string }[]
  synonyms?: string[]
  antonyms?: string[]
  exams?: string[]
  source?: string
}

export interface DictionaryEntry {
  id: string
  word: string
  status: string
  payload: DictionaryPayload | null
}

export const vocabularyApi = {
  // ── 词典库（公共，无需认证） ─────────────────────────────────
  async getDictionaryList(params?: {
    page?: number
    limit?: number
    keyword?: string
  }): Promise<PaginatedResponse<DictionaryEntry>> {
    const data = await client.get('/api/v1/dictionary', {
      params: params as Record<string, string | number | boolean>,
    })
    // 后端返回 { success, data: { items, total, page, pageSize, totalPages } }
    // client interceptor 返回 body.data = { items, total, page, pageSize, totalPages }
    const res = data as unknown as PaginatedResponse<DictionaryEntry>
    if (res && Array.isArray(res.items)) {
      return res
    }
    // fallback
    return { items: [], total: 0, page: 1, pageSize: 50, totalPages: 0 }
  },

  async getDictionaryWord(word: string): Promise<DictionaryEntry> {
    const data = await client.get(`/api/v1/dictionary/${encodeURIComponent(word)}`)
    return data as unknown as DictionaryEntry
  },

  // ── 个人生词本（需认证） ─────────────────────────────────────
  async getList(params?: {
    page?: number
    pageSize?: number
    difficulty?: CEFRLevel
    tags?: string[]
    sortBy?: 'word' | 'addedAt' | 'masteryLevel' | 'nextReviewAt'
    sortOrder?: 'asc' | 'desc'
  }): Promise<PaginatedResponse<Vocabulary>> {
    const data = await client.get('/api/v1/vocabulary', { params: params as Record<string, string | number | boolean> })
    // 后端返回 { success, data: items[], meta } → interceptor 返回 items 数组
    const items = Array.isArray(data) ? data as unknown as Vocabulary[] : []
    return { items, total: items.length, page: 1, pageSize: items.length, totalPages: 1 }
  },

  async getById(id: string): Promise<Vocabulary> {
    const data = await client.get(`/api/v1/vocabulary/${id}`)
    return data as unknown as Vocabulary
  },

  async search(keyword: string): Promise<Vocabulary[]> {
    const data = await client.get('/api/v1/vocabulary', { params: { keyword, limit: 50 } })
    return Array.isArray(data) ? data as unknown as Vocabulary[] : []
  },

  async getReviewList(): Promise<Vocabulary[]> {
    const data = await client.get('/api/v1/vocabulary/due')
    return Array.isArray(data) ? data as unknown as Vocabulary[] : []
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
