import type { ApiResponse, ContentItem, ContentListResponse, ContentType, ContentSource, ContentCategory, CEFRLevel } from '../types'
import { mockContentItems } from '../mocks/content'

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms))

export const contentApi = {
  async getList(params?: {
    page?: number
    pageSize?: number
    type?: ContentType
    source?: ContentSource
    category?: ContentCategory
    difficulty?: CEFRLevel
    search?: string
  }): Promise<ApiResponse<ContentListResponse>> {
    await delay()
    const { page = 1, pageSize = 10, type, source, category, difficulty, search } = params || {}

    let filtered = [...mockContentItems]

    if (type) {
      filtered = filtered.filter(item => item.type === type)
    }
    if (source) {
      filtered = filtered.filter(item => item.source === source)
    }
    if (category) {
      filtered = filtered.filter(item => item.category === category)
    }
    if (difficulty) {
      filtered = filtered.filter(item => item.difficulty === difficulty)
    }
    if (search && search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.tags.some(tag => tag.toLowerCase().includes(q))
      )
    }

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

  async getById(id: string): Promise<ApiResponse<ContentItem | null>> {
    await delay()
    const item = mockContentItems.find(c => c.id === id)
    return {
      success: !!item,
      data: item || null,
      error: item ? undefined : 'Content not found'
    }
  },

  async getRecommendations(limit: number = 3): Promise<ApiResponse<ContentItem[]>> {
    await delay()

    const types: ContentType[] = ['article', 'video', 'podcast']
    const recommendations: ContentItem[] = []

    for (const t of types) {
      const candidates = mockContentItems.filter(item => item.type === t)
      if (candidates.length > 0) {
        recommendations.push(candidates[Math.floor(Math.random() * candidates.length)])
      }
    }

    // If we need more, fill from remaining items
    if (recommendations.length < limit) {
      const remaining = mockContentItems.filter(item => !recommendations.some(r => r.id === item.id))
      while (recommendations.length < limit && remaining.length > 0) {
        const idx = Math.floor(Math.random() * remaining.length)
        recommendations.push(remaining.splice(idx, 1)[0])
      }
    }

    return {
      success: true,
      data: recommendations.slice(0, limit)
    }
  }
}
