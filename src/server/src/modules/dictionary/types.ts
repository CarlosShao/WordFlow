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
  antonyms?: string[]
}

/** A derived/related word (派生词), e.g. happy → happily (adv), happiness (n) */
export interface RelatedWord {
  word: string
  pos: string
  /** Chinese gloss for this related form */
  translation?: string
}

/** A bilingual example sentence */
export interface Example {
  en: string
  cn: string
}

/** A word phrase / collocation (词组短语), e.g. "say hello" -> 打招呼 */
export interface Phrase {
  phrase: string
  /** Chinese translations grouped by part of speech */
  translations: { pos?: string; cn: string }[]
  /** Some phrases carry a source dictionary label, e.g. "21世纪" */
  source?: string
}

export interface Phonetic {
  us?: string
  uk?: string
  /** Pronunciation audio URLs */
  usAudio?: string
  ukAudio?: string
}

/** A Collins (柯林斯) dictionary entry */
export interface CollinsEntry {
  pos: string
  /** Part-of-speech gloss in Chinese, e.g. 不及物动词 */
  posTips?: string
  /** Bilingual definition with embedded <b> highlight tags (strip for plain text) */
  def: string
  examples: { en: string; cn: string }[]
}

/** A Collins Primary (柯林斯精选) sense */
export interface CollinsPrimarySense {
  pos: string
  def: string
  examples: { en: string; cn: string }[]
}

/** A word discrimination / usage comparison block (词语辨析) */
export interface Discrimination {
  /** Chinese gloss shared by the compared words, e.g. 到达 */
  tran?: string
  usages: { word: string; usage: string }[]
}

/** Encyclopedia digest (百科释义) */
export interface Encyclopedia {
  summary: string
  sourceName: string
  sourceUrl: string
}

/**
 * Third-party / extended dictionary data.
 *
 * NOTE: Youdao's `oxford`, `oxfordAdvance*` and `webster` blocks are returned
 * AES-encrypted (`encryptedData`) and the decryption key lives only in the
 * Youdao desktop client — it is NOT available on the public web endpoint, so
 * these sources cannot be captured here. They are intentionally absent.
 */
export interface ExtendedDictionaries {
  collins?: {
    star?: string
    entries: CollinsEntry[]
  }
  collinsPrimary?: {
    phonetic?: string
    audioUrl?: string
    senses: CollinsPrimarySense[]
  }
  etymology?: string
  discrimination?: Discrimination[]
  encyclopedia?: Encyclopedia
  /** Explicit marker: webster/oxford data unavailable (encrypted upstream) */
  unavailable?: string[]
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
  /** Common phrases / collocations (词组短语) */
  phrases: Phrase[]
  synonyms: string[]
  antonyms: string[]
  /** Derived/related word forms (派生词), e.g. happiness/happily for happy */
  relatedWords: RelatedWord[]
  /** Exam tags, e.g. ['CET4', 'CET6', 'IELTS'] */
  exams: string[]
  /** Which provider served this entry */
  source: 'youdao' | 'dictcn'
  /** Extended third-party dictionary data (Collins / etymology / discrimination / encyclopedia) */
  extended?: ExtendedDictionaries
}

/** Result of a lookup — null-ish when the word is not found by any provider */
export type LookupResult = DictionaryEntry | null