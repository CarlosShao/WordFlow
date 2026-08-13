/**
 * Youdao dictionary provider (primary).
 *
 * Uses the public `/jsonapi` endpoint which returns a rich payload:
 *   - phonetic (US/UK) + pronunciation audio
 *   - Chinese translations (ec.word[].trs[]) grouped by part of speech
 *   - English definitions + synonyms (WordNet, ee.word.trs[])
 *   - bilingual example sentences (blng_sents_part)
 *   - exam tags (ec.exam_type)
 */

import { logger } from '../../common/logger.js'
import type { DictionaryEntry, Definition, Example, Phonetic } from './types.js'

const YUDAO_API = 'https://dict.youdao.com/jsonapi'
const AUDIO_BASE = 'https://dict.youdao.com/dictvoice'

/** Build a Youdao pronunciation audio URL from its `&type=` speech token */
function audioUrl(token: string | undefined): string | undefined {
  if (!token) return undefined
  return `${AUDIO_BASE}?audio=${encodeURIComponent(token.replace(/&/g, '%26'))}`
}

/** Strip HTML tags from a string */
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim()
}

/** Split a "n. 毅力，不屈不挠的精神" style string into { pos, cn } */
function splitPosCn(raw: string): { pos: string; cn: string } {
  const m = raw.match(/^([a-zA-Z.]+(?:\s+[a-zA-Z.]+)?)\s+(.+)$/)
  if (m && /^(n|v|vt|vi|adj|adv|prep|conj|pron|int|num|aux|art|abbr|phr)\.?$/i.test(m[1].trim())) {
    return { pos: m[1].trim(), cn: m[2].trim() }
  }
  return { pos: '', cn: raw.trim() }
}

interface YoudaoPayload {
  simple?: { word?: Array<{ usphone?: string; ukphone?: string; usspeech?: string; ukspeech?: string }> }
  ec?: {
    exam_type?: string[]
    word?: Array<{
      usphone?: string
      ukphone?: string
      trs?: Array<{ tr?: Array<{ l?: { i?: string } }> }>
    }>
  }
  ee?: {
    word?: {
      trs?: Array<{
        pos?: string
        tr?: Array<{
          l?: { i?: string }
          'similar-words'?: Array<{ similar?: string }>
        }>
      }>
    }
  }
  syno?: { synos?: Array<{ syno?: { ws?: Array<{ w?: string }> } }> }
  blng_sents_part?: { 'sentence-pair'?: Array<{ 'sentence-eng'?: string; 'sentence-translation'?: string }> }
}

/**
 * Fetch + parse a word from Youdao. Returns null when the word is not found
 * or the request fails (caller falls back to dict.cn).
 */
export async function lookupYoudao(word: string): Promise<DictionaryEntry | null> {
  const url = `${YUDAO_API}?q=${encodeURIComponent(word)}&le=en`
  let text: string
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        Referer: 'https://dict.youdao.com/',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      logger.warn({ word, status: res.status }, 'Youdao dictionary request not ok')
      return null
    }
    text = await res.text()
  } catch (err) {
    logger.warn({ err, word }, 'Youdao dictionary request failed')
    return null
  }

  let payload: YoudaoPayload
  try {
    payload = JSON.parse(text) as YoudaoPayload
  } catch {
    logger.warn({ word }, 'Youdao dictionary returned invalid JSON')
    return null
  }

  const simpleWord = payload.simple?.word?.[0]
  const ecWord = payload.ec?.word?.[0]

  // Not found: Youdao returns an empty-ish payload with no word node
  if (!ecWord && !payload.ee?.word) return null

  const phonetic: Phonetic = {
    us: ecWord?.usphone || simpleWord?.usphone,
    uk: ecWord?.ukphone || simpleWord?.ukphone,
    usAudio: audioUrl(simpleWord?.usspeech),
    ukAudio: audioUrl(simpleWord?.ukspeech),
  }

  // Chinese translations from ec.word[].trs[] (l.i may be a string or array)
  const translations: { pos: string; cn: string }[] = []
  for (const trs of ecWord?.trs ?? []) {
    for (const tr of trs.tr ?? []) {
      const raw = tr.l?.i
      if (!raw) continue
      const rawStr = Array.isArray(raw) ? raw.join('；') : raw
      const parts = splitPosCn(rawStr)
      // Merge consecutive entries with the same pos
      const last = translations[translations.length - 1]
      if (last && last.pos === parts.pos) {
        last.cn = `${last.cn}；${parts.cn}`
      } else {
        translations.push(parts)
      }
    }
  }

  // English definitions + synonyms from WordNet (ee)
  const definitions: Definition[] = []
  const synonyms: string[] = []
  for (const trs of payload.ee?.word?.trs ?? []) {
    for (const tr of trs.tr ?? []) {
      const en = tr.l?.i
      if (!en) continue
      const def: Definition = { pos: trs.pos ?? '', en }
      const sims = (tr['similar-words'] ?? []).map((s) => s.similar).filter(Boolean) as string[]
      if (sims.length > 0) {
        def.synonyms = sims
        for (const s of sims) if (!synonyms.includes(s)) synonyms.push(s)
      }
      definitions.push(def)
    }
  }

  // Additional synonyms from syno block
  for (const entry of payload.syno?.synos ?? []) {
    for (const w of entry.syno?.ws ?? []) {
      if (w.w && !synonyms.includes(w.w)) synonyms.push(w.w)
    }
  }

  const examples: Example[] = []
  for (const pair of payload.blng_sents_part?.['sentence-pair'] ?? []) {
    const en = stripHtml(pair['sentence-eng'] ?? '')
    const cn = (pair['sentence-translation'] ?? '').trim()
    if (en) examples.push({ en, cn })
  }

  return {
    word,
    phonetic,
    translations,
    definitions,
    examples,
    synonyms,
    antonyms: [],
    exams: payload.ec?.exam_type ?? [],
    source: 'youdao',
  }
}