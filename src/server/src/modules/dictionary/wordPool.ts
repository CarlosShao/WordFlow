/**
 * Word pool builder — gathers candidate words for the dictionary crawler.
 *
 * Sources (priority order, lower number crawls first):
 *   1. Content words — English words extracted from crawled content text.
 *   2. Existing vocabulary — words already in the public word bank (vocabularies / userId=system).
 *   3. IELTS / TOEFL / google-10000 exam & frequency word lists.
 *
 * All words are normalized (lowercase, alpha only), deduplicated, and filtered
 * for obvious noise (names, brand terms, unpronounceable strings). Rows that
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
const DATA_DIR = join(__dirname, 'data')

const SYSTEM_USER_ID = 'system'

/**
 * Priorities: smaller = higher. Exam word lists (IELTS/TOEFL) are the most
 * valuable for learners, so they get crawled first, then vocab, then content
 * words, then the big frequency list.
 */
const PRIORITY_IELTS = 5
const PRIORITY_TOEFL = 6
const PRIORITY_COCA = 7
const PRIORITY_VOCAB = 20
const PRIORITY_CONTENT = 30
const PRIORITY_WORDLIST = 40

/**
 * Noise filter for candidate words. Returns false for obvious junk that should
 * never be crawled / stored as dictionary entries:
 *   - too short, too long, or containing digits
 *   - no vowel → unpronounceable (e.g. "cvau", "cvgx")
 *   - long vowel-only runs → gibberish
 *   - 6+ consecutive consonants → almost certainly a name/typo, NOT a real word
 *     (allows legitimate English consonant clusters like "strength"/"friendship")
 */
function isCleanWord(w: string): boolean {
  if (w.length < 2 || w.length > 30 || /\d/.test(w)) return false
  if (!/[aeiouy]/.test(w)) return false
  if (/([bcdfghjklmnpqrstvwxz]{6,})/.test(w)) return false
  if (/([aeiouy]{5,})/.test(w)) return false
  return true
}

/** Extract plausible English words from a text block (crude but cheap). */
function extractWords(text: string): Set<string> {
  const words = new Set<string>()
  const re = /[a-zA-Z]+(?:['-][a-zA-Z]+)*/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const w = m[0].toLowerCase()
    if (isCleanWord(w)) words.add(w)
  }
  return words
}

/** Load a per-line word list file, normalized + noise-filtered. */
function loadWordListFile(path: string): string[] {
  try {
    const raw = readFileSync(path, 'utf8')
    return raw
      .split('\n')
      .map((l) => l.trim().toLowerCase())
      .filter((w) => isCleanWord(w) && /^[a-z]+(?:['-][a-z]+)*$/.test(w))
  } catch (err) {
    logger.warn({ err, path }, 'wordpool: failed to load word list file')
    return []
  }
}

/** Load the open-source google-10000-english word list (already frequency-ordered). */
function loadWordList(): string[] {
  return loadWordListFile(join(DATA_DIR, 'google-10000-english.txt'))
}

/** Load the curated IELTS word list (新东方《雅思词汇词根+联想记忆法》). */
function loadIeltsWordList(): string[] {
  return loadWordListFile(join(DATA_DIR, 'ielts-words.txt'))
}

/** Load the curated TOEFL word list. */
function loadToeflWordList(): string[] {
  return loadWordListFile(join(DATA_DIR, 'toefl-words.txt'))
}

/** Load the COCA-20000 high-frequency word list (美国当代英语语料库). */
function loadCocaWordList(): string[] {
  return loadWordListFile(join(DATA_DIR, 'coca-words.txt'))
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

  // ---- Source 3: curated exam/frequency word lists (IELTS / TOEFL / COCA) ----
  const ieltsWords = new Set(loadIeltsWordList())
  const toeflWords = new Set(loadToeflWordList())
  const cocaWords = new Set(loadCocaWordList())
  const wordListWords = new Set(loadWordList())

  // ---- Merge by priority (lower first) ----
  // Curated exam lists are merged FIRST so overlapping words keep their high
  // priority instead of being demoted to content/vocab priority.
  const ordered: Array<{ word: string; priority: number }> = []
  const seen = new Set<string>()
  for (const w of ieltsWords) {
    const n = normalizeWord(w)
    if (n && !seen.has(n)) {
      seen.add(n)
      ordered.push({ word: n, priority: PRIORITY_IELTS })
    }
  }
  for (const w of toeflWords) {
    if (!seen.has(w)) {
      seen.add(w)
      ordered.push({ word: w, priority: PRIORITY_TOEFL })
    }
  }
  for (const w of cocaWords) {
    if (!seen.has(w)) {
      seen.add(w)
      ordered.push({ word: w, priority: PRIORITY_COCA })
    }
  }
  for (const w of vocabWords) {
    if (!seen.has(w)) {
      seen.add(w)
      ordered.push({ word: w, priority: PRIORITY_VOCAB })
    }
  }
  for (const w of contentWords) {
    const n = normalizeWord(w)
    if (n && !seen.has(n)) {
      seen.add(n)
      ordered.push({ word: n, priority: PRIORITY_CONTENT })
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
    {
      added,
      content: contentWords.size,
      vocab: vocabWords.size,
      ielts: ieltsWords.size,
      toefl: toeflWords.size,
      coca: cocaWords.size,
      wordlist: wordListWords.size,
    },
    'wordpool: build complete',
  )
  return { added, total: existingCount + added }
}