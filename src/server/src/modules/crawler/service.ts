import type { PrismaClient, ContentType, Difficulty, CrawlerSourceType } from '@prisma/client'
import { getPrisma } from '../../common/prisma.js'
import { AppError, ErrorType } from '../../common/errors.js'
import { logger } from '../../common/logger.js'
import type { CrawlResult, CrawlAllResult, CrawlItem } from './types.js'
import { getStrategy } from './strategies/index.js'

// ------------------- Source CRUD -------------------

export interface CreateSourceInput {
  name: string
  url: string
  type: CrawlerSourceType
  contentType: ContentType
  difficulty: Difficulty
  crawlInterval?: number
  enabled?: boolean
}

export interface UpdateSourceInput {
  name?: string
  url?: string
  type?: CrawlerSourceType
  contentType?: ContentType
  difficulty?: Difficulty
  crawlInterval?: number
  enabled?: boolean
}

export async function createSource(input: CreateSourceInput) {
  const prisma = getPrisma()
  const source = await prisma.crawlerSource.create({
    data: {
      name: input.name,
      url: input.url,
      type: input.type,
      contentType: input.contentType,
      difficulty: input.difficulty,
      crawlInterval: input.crawlInterval ?? 1440,
      enabled: input.enabled ?? true,
    },
  })
  logger.info({ sourceId: source.id, name: source.name }, 'Crawler source created')
  return source
}

/**
 * Bulk-create CrawlerSource rows, skipping any URL that already exists.
 *
 * Useful for bulk imports (e.g. hundreds of historical TED talks discovered
 * from the listing page).  We skip duplicates by URL rather than failing the
 * whole batch.
 */
export async function createManySources(
  inputs: CreateSourceInput[],
): Promise<{ created: number; skipped: number }> {
  if (inputs.length === 0) return { created: 0, skipped: 0 }
  const prisma = getPrisma()

  const urls = inputs.map((i) => i.url)
  const existing = await prisma.crawlerSource.findMany({
    where: { url: { in: urls } },
    select: { url: true },
  })
  const existingUrls = new Set(existing.map((r) => r.url))

  const rows = inputs.filter((i) => !existingUrls.has(i.url))
  let created = 0
  if (rows.length > 0) {
    // SQLite doesn't support createMany with SQLite driver in older Prisma;
    // fall back to individual inserts via a transaction.
    try {
      await prisma.$transaction(
        rows.map((input) =>
          prisma.crawlerSource.create({
            data: {
              name: input.name,
              url: input.url,
              type: input.type,
              contentType: input.contentType,
              difficulty: input.difficulty,
              crawlInterval: input.crawlInterval ?? 1440,
              enabled: input.enabled ?? true,
            },
          }),
        ),
      )
      created = rows.length
    } catch (err) {
      logger.warn({ err }, 'createManySources: batch insert failed, trying sequentially')
      created = 0
      for (const input of rows) {
        try {
          await prisma.crawlerSource.create({
            data: {
              name: input.name,
              url: input.url,
              type: input.type,
              contentType: input.contentType,
              difficulty: input.difficulty,
              crawlInterval: input.crawlInterval ?? 1440,
              enabled: input.enabled ?? true,
            },
          })
          created++
        } catch (innerErr) {
          logger.debug({ url: input.url }, 'createManySources: skipping duplicate')
        }
      }
    }
  }

  const skipped = inputs.length - created
  logger.info({ created, skipped, requested: inputs.length }, 'Crawler sources bulk created')
  return { created, skipped }
}

export async function listSources() {
  const prisma = getPrisma()
  return prisma.crawlerSource.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export async function getSourceById(id: string) {
  const prisma = getPrisma()
  const source = await prisma.crawlerSource.findUnique({ where: { id } })
  if (!source) {
    throw new AppError(ErrorType.NOT_FOUND, '来源不存在', 404)
  }
  return source
}

export async function updateSource(id: string, input: UpdateSourceInput) {
  const prisma = getPrisma()
  const existing = await prisma.crawlerSource.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError(ErrorType.NOT_FOUND, '来源不存在', 404)
  }
  const source = await prisma.crawlerSource.update({
    where: { id },
    data: input,
  })
  logger.info({ sourceId: source.id }, 'Crawler source updated')
  return source
}

export async function deleteSource(id: string) {
  const prisma = getPrisma()
  const existing = await prisma.crawlerSource.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError(ErrorType.NOT_FOUND, '来源不存在', 404)
  }
  await prisma.crawlerSource.delete({ where: { id } })
  logger.info({ sourceId: id }, 'Crawler source deleted')
}

// ------------------- Crawl Orchestration -------------------

/**
 * Crawl a single source: parse items, deduplicate, insert into contents table
 */
export async function crawlSingleSource(sourceId: string): Promise<CrawlResult> {
  const prisma = getPrisma()
  const source = await prisma.crawlerSource.findUnique({ where: { id: sourceId } })

  if (!source) {
    throw new AppError(ErrorType.NOT_FOUND, '来源不存在', 404)
  }

  const result: CrawlResult = {
    sourceId: source.id,
    sourceName: source.name,
    inserted: 0,
    total: 0,
    status: 'success',
  }

  try {
    const strategy = getStrategy(source.type)
    const items = await strategy.crawl(source)
    result.total = items.length

    let inserted = 0
    for (const item of items) {
      try {
        inserted += await insertItem(prisma, source, item)
      } catch (err) {
        logger.warn({ err, item: item.sourceUrl }, 'Failed to insert crawled item')
      }
    }
    result.inserted = inserted

    // Update source crawl status
    await prisma.crawlerSource.update({
      where: { id: sourceId },
      data: { lastCrawledAt: new Date(), lastStatus: 'success', lastError: null },
    })

    logger.info({ source: source.name, inserted, total: items.length }, 'Crawl source completed')
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    result.status = 'error'
    result.error = errorMessage

    await prisma.crawlerSource.update({
      where: { id: sourceId },
      data: { lastCrawledAt: new Date(), lastStatus: 'error', lastError: errorMessage },
    })

    logger.error({ err, source: source.name }, 'Crawl source failed')
  }

  return result
}

/**
 * Crawl all enabled sources
 */
export async function crawlAllEnabledSources(): Promise<CrawlAllResult> {
  const prisma = getPrisma()
  const sources = await prisma.crawlerSource.findMany({
    where: { enabled: true },
  })

  const result: CrawlAllResult = {
    totalInserted: 0,
    results: [],
  }

  for (const source of sources) {
    const singleResult = await crawlSingleSource(source.id)
    result.totalInserted += singleResult.inserted
    result.results.push(singleResult)
  }

  logger.info({ totalInserted: result.totalInserted, sourceCount: sources.length }, 'Crawl all sources completed')
  return result
}

/**
 * Insert a single crawl item into the contents table with deduplication
 */
async function insertItem(
  prisma: PrismaClient,
  source: { id: string; name: string; contentType: ContentType; difficulty: Difficulty },
  item: CrawlItem,
): Promise<number> {
  // Deduplication: source + sourceUrl unique constraint
  const existing = await prisma.content.findUnique({
    where: {
      source_sourceUrl: {
        source: source.name,
        sourceUrl: item.sourceUrl,
      },
    },
  })

  if (existing) {
    return 0
  }

  // Per-item type override (e.g. RSS feed with video enclosure → VIDEO)
  const type = item.type ?? source.contentType

  await prisma.content.create({
    data: {
      title: item.title,
      type,
      source: source.name,
      sourceUrl: item.sourceUrl,
      author: item.author,
      difficulty: source.difficulty,
      coverUrl: item.coverUrl,
      summary: item.summary,
      content: item.content ?? '',
      videoUrl: item.videoUrl,
      audioUrl: item.audioUrl,
      translation: item.translation,
      segments: item.segments,
      duration: item.duration,
      publishedAt: item.publishedAt ?? new Date(),
    },
  })

  return 1
}
