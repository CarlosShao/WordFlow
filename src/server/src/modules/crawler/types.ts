import type { CrawlerSource, ContentType, Difficulty } from '@prisma/client'

// Re-export Prisma types for convenience
export type { CrawlerSource, ContentType, Difficulty }

/**
 * Parsed crawl item from any strategy — ready for DB insertion
 */
export interface CrawlItem {
  title: string
  sourceUrl: string
  summary?: string
  author?: string
  publishedAt?: Date
  coverUrl?: string
  duration?: number
  translation?: string
  segments?: unknown
}

/**
 * Result of crawling a single source
 */
export interface CrawlResult {
  sourceId: string
  sourceName: string
  inserted: number
  total: number
  status: 'success' | 'error'
  error?: string
}

/**
 * Result of crawling all sources
 */
export interface CrawlAllResult {
  totalInserted: number
  results: CrawlResult[]
}

/**
 * Strategy interface — each source type implements this
 */
export interface CrawlStrategy {
  /**
   * Parse the source URL and return a list of items ready for insertion
   */
  crawl(source: CrawlerSource): Promise<CrawlItem[]>
}
