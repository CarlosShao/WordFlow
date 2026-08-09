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
    const data = await client.patch(`/api/v1/crawler/sources/${id}`, params)
    return data as unknown as CrawlerSource
  },

  async deleteSource(id: string): Promise<void> {
    await client.delete(`/api/v1/crawler/sources/${id}`)
  },

  async triggerCrawl(sourceId: string): Promise<{ jobId: string; status: string }> {
    const data = await client.post(`/api/v1/crawler/sources/${sourceId}/crawl`)
    return data as unknown as { jobId: string; status: string }
  },

  async getCrawlStatus(jobId: string): Promise<{ status: string; progress: number }> {
    const data = await client.get(`/api/v1/crawler/jobs/${jobId}`)
    return data as unknown as { status: string; progress: number }
  },
}
