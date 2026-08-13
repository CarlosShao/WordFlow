/**
 * Dictionary service — orchestrates providers with caching.
 *
 * Lookup flow:
 *   1. Check Redis cache (30 days). Dictionaries are stable, long TTL is fine.
 *   2. Try Youdao (primary, rich data).
 *   3. If Youdao misses/fails, fall back to dict.cn (海词).
 *   4. Cache the result (including "not found" for a short TTL to avoid
 *      hammering providers on miss-spam).
 */

import { logger } from '../../common/logger.js'
import { getRedis } from '../../common/redis.js'
import { getPrisma } from '../../common/prisma.js'
import { lookupYoudao } from './youdao.js'
import { lookupDictcn } from './dictcn.js'
import type { DictionaryEntry, LookupResult } from './types.js'

const CACHE_TTL_HIT = 60 * 60 * 24 * 30 // 30 days for found entries
const CACHE_TTL_MISS = 60 * 60 * 24 // 1 day for not-found (avoid re-hammering)
const CACHE_PREFIX = 'dict:'

function cacheKey(word: string): string {
  return `${CACHE_PREFIX}${word.toLowerCase()}`
}

/** Sanitize the query word: lowercase, strip non a-z/space/hyphen */
export function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z\s'-]/g, '').trim()
}

export async function getWordDefinition(rawWord: string): Promise<LookupResult> {
  const word = normalizeWord(rawWord)
  if (!word) return null

  const redis = getRedis()
  const key = cacheKey(word)

  // 1) Cache hit
  try {
    const cached = await redis.get(key)
    if (cached) {
      const parsed = JSON.parse(cached) as DictionaryEntry | null
      return parsed
    }
  } catch (err) {
    logger.warn({ err, word }, 'Dictionary cache read failed')
  }

  // 2) DB hit — prefer already-crawled dictionary_entries (avoid live provider calls)
  const dbEntry = await lookupDbEntry(word)
  if (dbEntry) return dbEntry

  // 3) Primary: Youdao
  let entry: DictionaryEntry | null = await lookupYoudao(word)

  // 4) Fallback: dict.cn
  if (!entry || (entry.translations.length === 0 && entry.definitions.length === 0)) {
    const fallback = await lookupDictcn(word)
    if (fallback) entry = fallback
  }

  // 5) Cache result
  try {
    const payload = JSON.stringify(entry)
    await redis.set(key, payload, 'EX', entry ? CACHE_TTL_HIT : CACHE_TTL_MISS)
  } catch (err) {
    logger.warn({ err, word }, 'Dictionary cache write failed')
  }

  return entry
}

/** Look up a word from the crawled dictionary_entries table (priority hit). */
async function lookupDbEntry(word: string): Promise<DictionaryEntry | null> {
  try {
    const prisma = getPrisma()
    const row = await prisma.dictionaryEntry.findUnique({
      where: { word },
      select: { status: true, payload: true },
    })
    if (row?.status === 'DONE' && row.payload) {
      return row.payload as unknown as DictionaryEntry
    }
    return null
  } catch (err) {
    logger.warn({ err, word }, 'Dictionary DB lookup failed')
    return null
  }
}