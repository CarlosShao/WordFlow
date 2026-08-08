import { z } from 'zod'
import { getPrisma } from '../../common/prisma.js'
import { logger } from '../../common/logger.js'
import { fetchRssFeed, scrapeWebpage } from './crawler.js'

const crawlSourceSchema = z.object({
  url: z.string().url(),
  type: z.enum(['ARTICLE', 'VIDEO', 'PODCAST']),
  source: z.string(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  feedType: z.enum(['RSS', 'WEBPAGE']).default('RSS'),
})

export type CrawlSource = z.infer<typeof crawlSourceSchema>

/**
 * 爬取单个来源并写入数据库
 */
export async function crawlSource(source: CrawlSource): Promise<number> {
  const prisma = getPrisma()
  let items: { title: string; link: string; description?: string; pubDate?: string; author?: string }[] = []

  if (source.feedType === 'RSS') {
    items = await fetchRssFeed(source.url)
  } else {
    // 单页网页抓取，构造单条目
    const result = await scrapeWebpage(source.url)
    items = [{
      title: result.title,
      link: source.url,
      description: result.content.slice(0, 2000),
      pubDate: result.publishedAt?.toISOString(),
      author: result.author,
    }]
  }

  let inserted = 0
  for (const item of items) {
    try {
      // 去重：source + sourceUrl
      const existing = await prisma.content.findUnique({
        where: {
          source_sourceUrl: {
            source: source.source,
            sourceUrl: item.link,
          },
        },
      })

      if (existing) {
        continue
      }

      await prisma.content.create({
        data: {
          title: item.title,
          type: source.type,
          source: source.source,
          sourceUrl: item.link,
          difficulty: source.difficulty,
          summary: item.description,
          author: item.author,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          isPublished: true,
          viewCount: 0,
        },
      })
      inserted++
    } catch (err) {
      logger.warn({ err, item: item.link }, 'Failed to insert crawled item')
    }
  }

  logger.info({ source: source.source, inserted, total: items.length }, 'Crawl source completed')
  return inserted
}

/**
 * 爬取所有注册的来源
 */
export async function crawlAllSources(sources: CrawlSource[]): Promise<{
  totalInserted: number
  results: { source: string; inserted: number }[]
}> {
  let totalInserted = 0
  const results: { source: string; inserted: number }[] = []

  for (const source of sources) {
    try {
      const inserted = await crawlSource(source)
      totalInserted += inserted
      results.push({ source: source.source, inserted })
    } catch (err) {
      logger.error({ err, source: source.source }, 'Crawl source failed')
      results.push({ source: source.source, inserted: 0 })
    }
  }

  return { totalInserted, results }
}
