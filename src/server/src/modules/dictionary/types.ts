/**
 * Dictionary module — normalized entry shapes shared across providers.
 */

/** A single English definition with part of speech */
export interface Definition {
  pos: string
  /** English definition (from WordNet / bilingual dictionaries) */
  en: string
  /** Chinese translation for this definition */
  cn?: string
  synonyms?: string[]
}

/** A bilingual example sentence */
export interface Example {
  en: string
  cn: string
}

export interface Phonetic {
  us?: string
  uk?: string
  /** Pronunciation audio URLs */
  usAudio?: string
  ukAudio?: string
}

/**
 * Normalized dictionary entry returned by the API.
 * Providers (Youdao / dict.cn) map their raw payloads onto this shape.
 */
export interface DictionaryEntry {
  word: string
  phonetic: Phonetic
  /** Chinese translations grouped by part of speech, e.g. [{ pos: 'n.', cn: '毅力，不屈不挠的精神' }] */
  translations: { pos: string; cn: string }[]
  /** English definitions */
  definitions: Definition[]
  /** Bilingual example sentences */
  examples: Example[]
  synonyms: string[]
  antonyms: string[]
  /** Exam tags, e.g. ['CET4', 'CET6', 'IELTS'] */
  exams: string[]
  /** Which provider served this entry */
  source: 'youdao' | 'dictcn'
}

/** Result of a lookup — null-ish when the word is not found by any provider */
export type LookupResult = DictionaryEntry | null