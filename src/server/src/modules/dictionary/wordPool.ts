/**
 * Word pool builder — gathers candidate words for the dictionary crawler.
 *
 * Sources (priority order, lower number crawls first):
 *   1. Content words — English words extracted from crawled content text.
 *   2. Existing vocabulary — words already in the public word bank (vocabularies / userId=system).
 *   3. Large word list — google-10000-english (real open-source data, order = frequency).
 *
 * All words are normalized (lowercase, alpha only) and deduplicated. Rows that
 * already exist in `dictionary_entries` are skipped so the pool is idempotent —
 * re-running only adds genuinely new words (断点续爬).
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { getPrisma } from '../../common/prisma.js'
import { logger } from '../../common/logger.js'
import { normalizeWord } from '../dictionary/service.js'
import type { Prisma } from '@prisma/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORDLIST_PATH = join(__dirname, 'data', 'google-10000-english.txt')

const SYSTEM_USER_ID = 'system'

/** Priorities: smaller = higher. Content words first, then vocab, then big list. */
const PRIORITY_CONTENT = 10
const PRIORITY_VOCAB = 20
const PRIORITY_WORDLIST = 30

/** Extract plausible English words from a text block (crude but cheap). */
function extractWords(text: string): Set<string> {
  const words = new Set<string>()
  const re = /[a-zA-Z]+(?:['-][a-zA-Z]+)*/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const w = m[0].toLowerCase()
    // Skip very short / all-caps acronyms noise, keep real words
    if (w.length < 2) continue
    if (/^[a-z]+$/.test(w)) words.add(w)
  }
  return words
}

/** Load the open-source google-10000-english word list (already frequency-ordered). */
function loadWordList(): string[] {
  try {
    const raw = readFileSync(WORDLIST_PATH, 'utf8')
    return raw
      .split('\n')
      .map((l) => l.trim().toLowerCase())
      .filter((w) => /^[a-z]{2,}$/.test(w))
  } catch (err) {
    logger.warn({ err }, 'wordpool: failed to load google word list')
    return []
  }
}

/**
 * Build the word pool: insert all candidate words into `dictionary_entries`
 * with status=PENDING (skipping existing rows). Returns how many new words
 * were added.
 */
export async function buildWordPool(): Promise<{ added: number; total: number }> {
  const prisma = getPrisma()

  // ---- Source 1: content words ----
  const contentWords = new Set<string>()
  const contents = await prisma.content.findMany({
    where: { isPublished: true },
    select: { content: true, summary: true, title: true },
  })
  for (const c of contents) {
    const text = [c.content, c.summary, c.title].filter(Boolean).join('\n')
    for (const w of extractWords(text)) contentWords.add(w)
  }

  // ---- Source 2: existing vocabulary ----
  const vocabWords = new Set<string>()
  const vocabRows = await prisma.vocabulary.findMany({
    where: { userId: SYSTEM_USER_ID },
    select: { word: true },
  })
  for (const v of vocabRows) {
    const w = normalizeWord(v.word)
    if (w) vocabWords.add(w)
  }

  // ---- Source 3: large word list ----
  const wordListWords = new Set(loadWordList())

  // ---- Merge by priority (lower first) ----
  const ordered: Array<{ word: string; priority: number }> = []
  const seen = new Set<string>()
  for (const w of contentWords) {
    const n = normalizeWord(w)
    if (n && !seen.has(n)) {
      seen.add(n)
      ordered.push({ word: n, priority: PRIORITY_CONTENT })
    }
  }
  for (const w of vocabWords) {
    if (!seen.has(w)) {
      seen.add(w)
      ordered.push({ word: w, priority: PRIORITY_VOCAB })
    }
  }
  for (const w of wordListWords) {
    if (!seen.has(w)) {
      seen.add(w)
      ordered.push({ word: w, priority: PRIORITY_WORDLIST })
    }
  }

  // ---- Existing entries (so we don't re-insert: 断点续爬) ----
  const existingRows = await prisma.dictionaryEntry.findMany({ select: { word: true } })
  const existing = new Set(existingRows.map((r) => r.word))
  const existingCount = existing.size

  // ---- Insert new words in batches ----
  let added = 0
  const batch: Prisma.DictionaryEntryCreateManyInput[] = []
  const BATCH_SIZE = 500
  for (const item of ordered) {
    if (existing.has(item.word)) continue
    batch.push({ word: item.word, status: 'PENDING', priority: item.priority })
    existing.add(item.word)
    if (batch.length >= BATCH_SIZE) {
      await prisma.dictionaryEntry.createMany({ data: batch, skipDuplicates: true })
      added += batch.length
      batch.length = 0
    }
  }
  if (batch.length > 0) {
    await prisma.dictionaryEntry.createMany({ data: batch, skipDuplicates: true })
    added += batch.length
  }

  logger.info(
    { added, content: contentWords.size, vocab: vocabWords.size, wordlist: wordListWords.size },
    'wordpool: build complete',
  )
  return { added, total: existingCount + added }
}