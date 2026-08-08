import type { ApiResponse, Vocabulary, CEFRLevel } from '../types'
import { mockVocabulary } from '../mocks'

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms))

export const vocabularyApi = {
  async getList(params?: {
    page?: number
    pageSize?: number
    difficulty?: CEFRLevel
    tags?: string[]
    sortBy?: 'word' | 'addedAt' | 'masteryLevel' | 'nextReviewAt'
    sortOrder?: 'asc' | 'desc'
  }): Promise<ApiResponse<{ items: Vocabulary[]; total: number; page: number; pageSize: number }>> {
    await delay()
    const { page = 1, pageSize = 20, difficulty, tags, sortBy = 'addedAt', sortOrder = 'desc' } = params || {}
    
    let filtered = [...mockVocabulary]
    
    if (difficulty) {
      filtered = filtered.filter(v => v.tags.includes(difficulty))
    }
    if (tags && tags.length > 0) {
      filtered = filtered.filter(v => tags.some(t => v.tags.includes(t)))
    }
    
    // Sort
    filtered.sort((a, b) => {
      let compare = 0
      switch (sortBy) {
        case 'word':
          compare = a.word.localeCompare(b.word)
          break
        case 'addedAt':
          compare = new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()
          break
        case 'masteryLevel':
          compare = a.masteryLevel - b.masteryLevel
          break
        case 'nextReviewAt':
          compare = (a.nextReviewAt ? new Date(a.nextReviewAt).getTime() : 0) - (b.nextReviewAt ? new Date(b.nextReviewAt).getTime() : 0)
          break
      }
      return sortOrder === 'asc' ? compare : -compare
    })
    
    const start = (page - 1) * pageSize
    const end = start + pageSize
    
    return {
      success: true,
      data: {
        items: filtered.slice(start, end),
        total: filtered.length,
        page,
        pageSize
      }
    }
  },

  async getById(id: string): Promise<ApiResponse<Vocabulary | null>> {
    await delay()
    const vocab = mockVocabulary.find(v => v.id === id)
    return {
      success: !!vocab,
      data: vocab || null,
      error: vocab ? undefined : 'Vocabulary not found'
    }
  },

  async search(keyword: string): Promise<ApiResponse<Vocabulary[]>> {
    await delay()
    const lowerKeyword = keyword.toLowerCase()
    const results = mockVocabulary.filter(v => 
      v.word.toLowerCase().includes(lowerKeyword) ||
      v.definition.toLowerCase().includes(lowerKeyword) ||
      v.chineseDefinition.includes(keyword)
    )
    return {
      success: true,
      data: results
    }
  },

  async getReviewList(): Promise<ApiResponse<Vocabulary[]>> {
    await delay()
    const now = new Date()
    const reviewList = mockVocabulary.filter(v => {
      if (!v.nextReviewAt) return true
      return new Date(v.nextReviewAt) <= now
    })
    return {
      success: true,
      data: reviewList
    }
  }
}
