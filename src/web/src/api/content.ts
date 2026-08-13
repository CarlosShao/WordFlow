import client from './client'
import type {
  ContentItem,
  ContentType,
  ContentSource,
  ContentCategory,
  CEFRLevel,
  PaginatedResponse,
} from '../types'

// Backend returns uppercase ContentType enum (VIDEO/PODCAST/ARTICLE);
// frontend uses lowercase. Normalize at the API boundary so all pages compare consistently.
function normalizeContent<T extends { type?: string; coverUrl?: string }>(item: T): T {
  if (item && typeof item.type === 'string') {
    item.type = item.type.toLowerCase() as T['type']
  }
  // Map backend coverUrl to frontend coverImage
  if (item && 'coverUrl' in item) {
    (item as any).coverImage = item.coverUrl
    delete item.coverUrl
  }
  return item
}

export const contentApi = {
  async getList(params?: {
    page?: number
    pageSize?: number
    type?: ContentType
    source?: ContentSource
    category?: ContentCategory
    difficulty?: CEFRLevel
    search?: string
    mix?: boolean
  }): Promise<PaginatedResponse<ContentItem>> {
    const data = await client.get('/api/v1/content', {
      params: {
        ...params,
        // Backend expects uppercase ContentType enum (VIDEO/PODCAST/ARTICLE)
        type: params?.type ? params.type.toUpperCase() : undefined,
        mix: params?.mix,
      } as Record<string, string | number | boolean>,
    })
    // 后端返回 { data: ContentItem[], meta: { page, limit, total, totalPages } }
    const arr = Array.isArray(data) ? data : (data?.items ?? [])
    const meta = Array.isArray(data) ? {} : (data?.meta ?? {})
    return {
      items: arr.map((it: ContentItem) => normalizeContent(it)),
      total: meta.total ?? arr.length,
      page: meta.page ?? 1,
      pageSize: meta.limit ?? arr.length,
    } as PaginatedResponse<ContentItem>
  },

  async getById(id: string): Promise<ContentItem> {
    const data = await client.get(`/api/v1/content/${id}`)
    return normalizeContent(data as unknown as ContentItem)
  },

  async getRecommendations(limit: number = 6): Promise<ContentItem[]> {
    // 后端无独立推荐接口，复用列表接口取混合类型内容作为推荐位
    const data = await this.getList({ page: 1, pageSize: limit, mix: true })
    return data.items ?? []
  },

  async favorite(id: string): Promise<void> {
    await client.post(`/api/v1/content/${id}/favorite`, { favorite: true })
  },

  async unfavorite(id: string): Promise<void> {
    // 后端用同一接口 + favorite:false 控制取消收藏
    await client.post(`/api/v1/content/${id}/favorite`, { favorite: false })
  },
}
