import client from './client'

export interface CrawlerSource {
  id: string
  name: string
  type: 'rss' | 'web' | 'twitter' | 'youtube' | 'puppeteer'
  url: string
  enabled: boolean
  lastRun?: string
  contentCount: number
}

export const crawlerApi = {
  async getSources(): Promise<CrawlerSource[]> {
    const data = await client.get('/api/v1/crawler/sources')
    return data as unknown as CrawlerSource[]
  },

  async createSource(params: {
    name: string
    type: string
    url: string
  }): Promise<CrawlerSource> {
    const data = await client.post('/api/v1/crawler/sources', params)
    return data as unknown as CrawlerSource
  },

  async updateSource(id: string, params: Partial<CrawlerSource>): Promise<CrawlerSource> {
    // 后端使用 PUT 更新源（PATCH 不支持）
    const data = await client.put(`/api/v1/crawler/sources/${id}`, params)
    return data as unknown as CrawlerSource
  },

  async deleteSource(id: string): Promise<void> {
    await client.delete(`/api/v1/crawler/sources/${id}`)
  },

  // 触发单源抓取：后端同步返回抓取结果，无异步 job 系统
  async triggerCrawl(sourceId: string): Promise<{ inserted: number; found: number; sourceId: string }> {
    const data = await client.post(`/api/v1/crawler/sources/${sourceId}/crawl`)
    const result = data as unknown as { inserted?: number; found?: number; sourceId?: string }
    return {
      inserted: result.inserted ?? 0,
      found: result.found ?? 0,
      sourceId: result.sourceId ?? sourceId,
    }
  },

  // 抓取状态查询（后端：GET /api/v1/crawler/sources/:id/status）
  async getCrawlStatus(sourceId: string): Promise<{ status: string; progress: number }> {
    const data = await client.get(`/api/v1/crawler/sources/${sourceId}/status`)
    const raw = (data as unknown as {
      lastStatus?: string
      lastError?: string | null
      lastCrawledAt?: string | null
      state?: string
      progress?: number
    }) ?? {}
    return {
      status: raw.lastStatus ?? raw.state ?? 'unknown',
      progress: typeof raw.progress === 'number' ? raw.progress : (raw.lastStatus ? 100 : 0),
    }
  },

  // 一键爬取所有来源
  async crawlAll(): Promise<void> {
    await client.post('/api/v1/crawler/crawl-all')
  },

  // 爬取单个来源（便捷方法，复用 triggerCrawl）
  async crawlSource(sourceId: string): Promise<void> {
    await this.triggerCrawl(sourceId)
  },
}

// 便捷导出（供组件直接 import）
export function getCrawlStatus(sourceId: string) { return crawlerApi.getCrawlStatus(sourceId) }
export function crawlSource(sourceId: string) { return crawlerApi.crawlSource(sourceId) }
export function crawlAllSources() { return crawlerApi.crawlAll() }
