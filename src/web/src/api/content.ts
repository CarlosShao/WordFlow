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
    // Bilibili's image CDN blocks cross-origin Referer (403 in the browser).
    // Route hdslb.com covers through the backend proxy so they always load.
    // A cache-busting `t=` param defeats stale 404/broken-image caching from
    // the period before the proxy endpoint existed.
    const cover = item.coverUrl
    const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002').replace(/\/+$/, '')
    if (cover && /hdslb\.com|bilibili/.test(cover)) {
      ;(item as any).coverImage = `${apiBase}/api/v1/media/cover?url=${encodeURIComponent(cover)}&t=${Date.now()}`
    } else {
      ;(item as any).coverImage = cover
    }
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
    keyword?: string
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

  // Lazy-load transcripts (can be 500KB+ for Bilibili videos). The main
  // getById payload intentionally omits `segments` so the initial render is
  // fast; this fetches just the transcript data on demand.
  async getSegments(id: string): Promise<{ segments?: any[]; duration?: number }> {
    const data = await client.get(`/api/v1/content/${id}/segments`)
    const d = (data as any)?.data ?? data
    return { segments: d?.segments ?? [], duration: d?.duration }
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
