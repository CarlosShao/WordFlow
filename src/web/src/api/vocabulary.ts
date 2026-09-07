import client from './client'
import type { Vocabulary, CEFRLevel, PaginatedResponse } from '../types'

export interface VocabularyReviewResult {
  id: string
  masteryStatus: MasteryStatus
  nextReviewDate: string
  lastReviewDate?: string
  interval: number
  repetitions: number
  easeFactor: number
}

export type MasteryStatus = 'NOT_REVIEWED' | 'NEW' | 'LEARNING' | 'REVIEWING' | 'MASTERED'

/** Vocabulary 表完整字段（与后端 schema.prisma 一致） */
export interface VocabularyEntry {
  id: string
  word: string
  phonetic: string | null
  definition: string | null
  translation: string | null
  /** 后端 examples/tags 字段为 JSON，序列化后是 string[] 或 { en, cn }[] */
  examples: string[] | { en?: string; cn?: string }[] | null
  etymology: string | null
  tags: string[] | null
  note: string | null
  contentId: string | null
  // SM-2
  easeFactor: number
  interval: number
  repetitions: number
  nextReviewDate: string | null
  lastReviewDate: string | null
  masteredAt: string | null
  masteryStatus: MasteryStatus
  createdAt: string
  updatedAt: string
}

// ── 词典库 payload 结构（来自有道爬取） ─────────────────────────
export interface DictionaryPayload {
  word: string
  phonetic?: { uk?: string; us?: string; ukAudio?: string; usAudio?: string }
  translations?: { cn: string; pos: string }[]
  definitions?: { en: string; pos: string; synonyms?: string[]; cn?: string }[]
  examples?: { cn: string; en: string }[]
  synonyms?: string[]
  antonyms?: string[]
  /** 词组短语 */
  phrases?: { phrase: string; translations: { pos?: string; cn: string }[]; source?: string }[]
  /** 派生词/相关词形 */
  relatedWords?: { word: string; pos: string; translation?: string }[]
  exams?: string[]
  source?: 'youdao' | 'dictcn' | string
  /** 柯林斯/词源/百科/辨析等扩展 */
  extended?: {
    etymology?: string
    collins?: { star?: string; entries: { pos: string; posTips?: string; def: string; examples: { en: string; cn: string }[] }[] }
    collinsPrimary?: { phonetic?: string; audioUrl?: string; senses: { pos: string; def: string; examples: { en: string; cn: string }[] }[] }
    discrimination?: { tran?: string; usages: { word: string; usage: string }[] }[]
    encyclopedia?: { summary: string; sourceName: string; sourceUrl: string }
    unavailable?: string[]
  }
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
  /**
   * 后端返回 { success, data: items[], meta: { page, limit, total, totalPages } }
   * 客户端拦截器解包后只透出 data 数组，meta 丢失。
   * 这里手动从分页参数构建响应；如果后端后续把 meta 也平铺到 data 上层即可直接识别。
   */
  async getList(params?: {
    page?: number
    pageSize?: number
    keyword?: string
    mastery?: MasteryStatus
    sortBy?: 'createdAt' | 'nextReviewDate' | 'word'
    sortOrder?: 'asc' | 'desc'
  }): Promise<PaginatedResponse<VocabularyEntry>> {
    const page = params?.page ?? 1
    const limit = params?.pageSize ?? 50
    const data = await client.get('/api/v1/vocabulary', {
      params: {
        page,
        limit,
        keyword: params?.keyword,
        mastery: params?.mastery,
        sortBy: params?.sortBy ?? 'createdAt',
        sortOrder: params?.sortOrder ?? 'desc',
      } as Record<string, string | number | boolean>,
    })
    const items = Array.isArray(data) ? (data as unknown as VocabularyEntry[]) : []
    // 拦截器不返回 meta，按请求参数构建回退
    return {
      items,
      total: items.length,
      page,
      pageSize: limit,
      totalPages: Math.max(1, Math.ceil(items.length / limit)),
    }
  },

  async getById(id: string): Promise<VocabularyEntry> {
    const data = await client.get(`/api/v1/vocabulary/${id}`)
    return data as unknown as VocabularyEntry
  },

  async search(keyword: string): Promise<VocabularyEntry[]> {
    const data = await client.get('/api/v1/vocabulary', { params: { keyword, limit: 50 } })
    return Array.isArray(data) ? (data as unknown as VocabularyEntry[]) : []
  },

  async getReviewList(): Promise<VocabularyEntry[]> {
    const data = await client.get('/api/v1/vocabulary/due')
    return Array.isArray(data) ? (data as unknown as VocabularyEntry[]) : []
  },

  async addWord(
    word: string,
    options?: { contentId?: string; translation?: string; phonetic?: string; examples?: string[]; definition?: string; note?: string }
  ): Promise<VocabularyEntry> {
    const opts = typeof options === 'string' ? { contentId: options as unknown as string } : (options ?? {})
    const data = await client.post('/api/v1/vocabulary', {
      word,
      // translation 为后端必填字段；未提供时给占位避免 400（正常路径应传词典释义）
      translation: opts.translation || '（释义待补充）',
      phonetic: opts.phonetic,
      definition: opts.definition,
      examples: opts.examples,
      contentId: opts.contentId,
      note: opts.note,
    })
    return data as unknown as VocabularyEntry
  },

  /** 更新生词本条目（编辑 word/phonetic/translation/definition/examples/note/tags 等） */
  async updateWord(
    id: string,
    body: Partial<{
      word: string
      phonetic: string
      translation: string
      definition: string
      examples: string[]
      tags: string[]
      note: string
      contentId: string
    }>
  ): Promise<VocabularyEntry> {
    const data = await client.put(`/api/v1/vocabulary/${id}`, body)
    return data as unknown as VocabularyEntry
  },

  async review(id: string, quality: number): Promise<VocabularyReviewResult> {
    const data = await client.post(`/api/v1/vocabulary/${id}/review`, { quality })
    return data as unknown as VocabularyReviewResult
  },

  async delete(id: string): Promise<void> {
    await client.delete(`/api/v1/vocabulary/${id}`)
  },

  // 批量删除（前端循环单删，更可控的失败回滚）
  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) {
      await client.delete(`/api/v1/vocabulary/${id}`)
    }
  },
}

// 保留向后兼容的类型导出
export type { Vocabulary, CEFRLevel }