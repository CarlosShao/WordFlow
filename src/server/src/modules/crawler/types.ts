import type { CrawlerSource, ContentType, Difficulty } from '@prisma/client'
import type { InputJsonValue } from '@prisma/client/runtime/library'

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
  segments?: InputJsonValue
  /** Real body text / video description / podcast notes (stored as content) */
  content?: string
  /** Playable video URL (for VIDEO type) */
  videoUrl?: string | null
  /** Playable audio URL (for PODCAST type) */
  audioUrl?: string | null
  /** Override source.contentType on a per-item basis (e.g. video enclosure in RSS) */
  type?: ContentType
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
