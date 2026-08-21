/**
 * Dictionary crawler — batch-crawls the word pool into `dictionary_entries`.
 *
 * Key guarantees (断点续爬 / 去重 / 防封禁 / 重试):
 *   - Resumable: only rows with status=PENDING are picked; each word is marked
 *     DONE/NOT_FOUND/FAILED after crawling, so a restart continues from where
 *     it stopped.
 *   - Dedup: `word` is unique — building the pool skips existing words.
 *   - Rate limiting: per-word delay + batch rest + daily cap (Youdao throttles).
 *   - Retry: network errors mark FAILED (retryable, capped); "not found" stays
 *     NOT_FOUND (never re-crawled).
 *   - Failover: Youdao primary, dict.cn fallback.
 */

import { getPrisma } from '../../common/prisma.js'
import { logger } from '../../common/logger.js'
import { lookupYoudao } from './youdao.js'
import { lookupDictcn } from './dictcn.js'
import { normalizeWord } from './service.js'
import type { DictionaryEntry } from './types.js'
import type { Prisma } from '@prisma/client'

const MAX_RETRY = 3

export interface CrawlDictionaryConfig {
  /** Max words per run (daily cap against Youdao). */
  limit: number
  /** Delay between words, ms. */
  delayMs: number
  /** Rest after every `batchSize` words, ms. */
  batchSize: number
  batchRestMs: number
}

export const defaultCrawlConfig: CrawlDictionaryConfig = {
  limit: 1000,
  delayMs: 1200,
  batchSize: 50,
  batchRestMs: 30000,
}

export interface CrawlDictionaryResult {
  processed: number
  done: number
  notFound: number
  failed: number
  remaining: number
}

/** Fully crawl one word: Youdao primary, dict.cn fallback. Returns entry or null. */
async function crawlWord(word: string): Promise<DictionaryEntry | null> {
  let entry = await lookupYoudao(word)
  if (!entry || (entry.translations.length === 0 && entry.definitions.length === 0)) {
    const fallback = await lookupDictcn(word)
    if (fallback) entry = fallback
  }
  return entry && (entry.translations.length > 0 || entry.definitions.length > 0) ? entry : null
}

/**
 * Pick the next batch of pending words (lowest priority first).
 * Only PENDING rows — this is what makes crawling resumable.
 */
async function takePendingWords(limit: number): Promise<Array<{ id: string; word: string }>> {
  const prisma = getPrisma()
  return prisma.dictionaryEntry.findMany({
    where: { status: 'PENDING' },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    take: limit,
    select: { id: true, word: true },
  })
}

/** Count words still pending / failed-but-retryable (for status reporting). */
export async function getDictionaryProgress(): Promise<{
  pending: number
  done: number
  notFound: number
  failed: number
}> {
  const prisma = getPrisma()
  const [pending, done, notFound, failed] = await Promise.all([
    prisma.dictionaryEntry.count({ where: { status: 'PENDING' } }),
    prisma.dictionaryEntry.count({ where: { status: 'DONE' } }),
    prisma.dictionaryEntry.count({ where: { status: 'NOT_FOUND' } }),
    prisma.dictionaryEntry.count({ where: { status: 'FAILED' } }),
  ])
  return { pending, done, notFound, failed }
}

/**
 * Enqueue related words (派生词/近义词/反义词) from a crawled entry into the
 * word pool so they get crawled too. Idempotent — skips words already present.
 */
async function enqueueRelatedWords(prisma: ReturnType<typeof getPrisma>, entry: DictionaryEntry): Promise<void> {
  const candidates = new Set<string>()
  const push = (w: string | undefined) => {
    if (!w) return
    const n = normalizeWord(w)
    if (n && n !== entry.word) candidates.add(n)
  }
  for (const r of entry.relatedWords) push(r.word)
  for (const s of entry.synonyms) push(s)
  for (const a of entry.antonyms) push(a)

  if (candidates.size === 0) return

  const existingRows = await prisma.dictionaryEntry.findMany({
    where: { word: { in: [...candidates] } },
    select: { word: true },
  })
  const existing = new Set(existingRows.map((r) => r.word))
  const fresh: Prisma.DictionaryEntryCreateManyInput[] = []
  for (const w of candidates) {
    if (!existing.has(w)) fresh.push({ word: w, status: 'PENDING', priority: 20 }) // vocab-level priority
  }
  if (fresh.length > 0) {
    await prisma.dictionaryEntry.createMany({ data: fresh, skipDuplicates: true })
  }
}

/**
 * Crawl the next `limit` pending words. Safe to call repeatedly — each call
 * advances the pool by up to `limit` words and stops.
 */
export async function crawlDictionaryBatch(cfg: CrawlDictionaryConfig = defaultCrawlConfig): Promise<CrawlDictionaryResult> {
  const prisma = getPrisma()
  const pending = await takePendingWords(cfg.limit)
  if (pending.length === 0) {
    return { processed: 0, done: 0, notFound: 0, failed: 0, remaining: 0 }
  }

  let done = 0
  let notFound = 0
  let failed = 0

  for (let i = 0; i < pending.length; i++) {
    const { id, word } = pending[i]
    const normalized = normalizeWord(word)
    if (!normalized) {
      // Not a real word — mark NOT_FOUND so it never re-crawls.
      await prisma.dictionaryEntry.update({
        where: { id },
        data: { status: 'NOT_FOUND', crawledAt: new Date() },
      })
      notFound++
      continue
    }

    try {
      const entry = await crawlWord(normalized)
      if (entry) {
        await prisma.dictionaryEntry.update({
          where: { id },
          data: {
            status: 'DONE',
            provider: entry.source,
            payload: entry as unknown as object,
            crawledAt: new Date(),
          },
        })
        await enqueueRelatedWords(prisma, entry)
        done++
      } else {
        await prisma.dictionaryEntry.update({
          where: { id },
          data: { status: 'NOT_FOUND', crawledAt: new Date() },
        })
        notFound++
      }
    } catch (err) {
      // Network / provider error → retryable. Cap retries.
      const row = await prisma.dictionaryEntry.findUnique({ where: { id } })
      const retryCount = (row?.retryCount ?? 0) + 1
      if (retryCount >= MAX_RETRY) {
        await prisma.dictionaryEntry.update({
          where: { id },
          data: { status: 'FAILED', retryCount, crawledAt: new Date() },
        })
        failed++
      } else {
        await prisma.dictionaryEntry.update({
          where: { id },
          data: { retryCount, createdAt: new Date() }, // re-queue at the back by reordering
        })
      }
      logger.warn({ err, word }, 'dictionary crawler: word crawl error')
    }

    // Rate limiting: delay between words, rest after a batch.
    if (i < pending.length - 1) {
      await sleep(cfg.delayMs)
    }
    if (cfg.batchSize > 0 && (i + 1) % cfg.batchSize === 0 && i < pending.length - 1) {
      logger.info({ at: i + 1, restMs: cfg.batchRestMs }, 'dictionary crawler: batch rest')
      await sleep(cfg.batchRestMs)
    }
  }

  const remaining = await prisma.dictionaryEntry.count({ where: { status: 'PENDING' } })
  logger.info({ processed: pending.length, done, notFound, failed, remaining }, 'dictionary crawler: batch complete')
  return { processed: pending.length, done, notFound, failed, remaining }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}