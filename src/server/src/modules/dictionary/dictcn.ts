/**
 * dict.cn (海词) dictionary provider (secondary / fallback).
 *
 * The legacy XML API (`api.dict.cn/ws.php`) is dead, but the web page
 * `https://dict.cn/{word}` is still served with a stable DOM. We fetch the
 * HTML and parse it with targeted regexes (no external HTML parser needed).
 *
 * Available data: phonetic (UK/US), Chinese translations (basic + detailed),
 * English definitions (英英释义), bilingual examples, synonyms/antonyms.
 */

import { logger } from '../../common/logger.js'
import type { DictionaryEntry, Example } from './types.js'

const DICTCN_URL = 'https://dict.cn'
const AUDIO_BASE = 'https://dict.cn/mp3.php'

interface DictcnRaw {
  word: string
  phonetic: { uk?: string; us?: string; ukAudio?: string; usAudio?: string }
  translations: { pos: string; cn: string }[]
  definitions: { pos: string; en: string }[]
  examples: Example[]
  synonyms: string[]
  antonyms: string[]
}

/**
 * Fetch + parse a word from dict.cn. Returns null when the word is not found
 * or the page cannot be parsed.
 */
export async function lookupDictcn(word: string): Promise<DictionaryEntry | null> {
  let html: string
  try {
    const res = await fetch(`${DICTCN_URL}/${encodeURIComponent(word)}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        Referer: DICTCN_URL,
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      logger.warn({ word, status: res.status }, 'dict.cn request not ok')
      return null
    }
    html = await res.text()
  } catch (err) {
    logger.warn({ err, word }, 'dict.cn request failed')
    return null
  }

  // Not found: dict.cn returns a search page without the word template
  if (!html.includes('class="word"') || !html.includes('class="keyword"')) {
    return null
  }

  const raw = parseDictcnHtml(html, word)
  if (!raw) return null

  return {
    word,
    phonetic: { us: raw.phonetic.us, uk: raw.phonetic.uk, usAudio: raw.phonetic.usAudio, ukAudio: raw.phonetic.ukAudio },
    translations: raw.translations,
    definitions: raw.definitions.map((d) => ({ pos: d.pos, en: d.en })),
    examples: raw.examples,
    synonyms: raw.synonyms,
    antonyms: raw.antonyms,
    exams: [],
    source: 'dictcn',
  }
}

function parseDictcnHtml(html: string, word: string): DictcnRaw | null {
  const out: DictcnRaw = {
    word,
    phonetic: {},
    translations: [],
    definitions: [],
    examples: [],
    synonyms: [],
    antonyms: [],
  }

  // ---- Phonetic ----
  const phonBlock = html.match(/<div class="phonetic">([\s\S]*?)<\/div>\s*<div class="basic/s)
  if (phonBlock) {
    const uk = phonBlock[1].match(/<span>英\s*<bdo[^>]*>\[?([^<\]]+)\]?<\/bdo>/)
    const us = phonBlock[1].match(/<span>美\s*<bdo[^>]*>\[?([^<\]]+)\]?<\/bdo>/)
    if (uk) out.phonetic.uk = uk[1].trim()
    if (us) out.phonetic.us = us[1].trim()
    // First fsound audio under each accent
    const ukAudio = phonBlock[1].match(/<span>英[\s\S]*?naudio="([^"]+\.mp3)"/)
    const usAudio = phonBlock[1].match(/<span>美[\s\S]*?naudio="([^"]+\.mp3)"/)
    if (ukAudio) out.phonetic.ukAudio = `${AUDIO_BASE}?q=${encodeURIComponent(ukAudio[1])}`
    if (usAudio) out.phonetic.usAudio = `${AUDIO_BASE}?q=${encodeURIComponent(usAudio[1])}`
  }

  // ---- Basic translations (quick definition) ----
  const basicBlock = html.match(/<ul class="dict-basic-ul">([\s\S]*?)<\/ul>/)
  if (basicBlock) {
    const rows = basicBlock[1].matchAll(/<li>\s*<span>([^<]*)<\/span>\s*<strong>([\s\S]*?)<\/strong>/g)
    for (const m of rows) {
      const pos = m[1].trim()
      const cn = m[2].replace(/<[^>]+>/g, '').trim()
      if (cn) out.translations.push({ pos, cn })
    }
  }

  // ---- Detailed translations (详尽释义) ----
  const detailBlock = html.match(/<h3>详尽释义<\/h3>\s*<div class="layout detail">([\s\S]*?)<\/div>/)
  if (detailBlock) {
    const groups = detailBlock[1].matchAll(/<span>\s*([a-zA-Z]+\.?)\s*(?:<bdo[^>]*>\([^)]*\)<\/bdo>)?\s*<\/span>\s*<ol[^>]*>([\s\S]*?)<\/ol>/g)
    for (const g of groups) {
      const pos = g[1].trim()
      const items = [...g[2].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim())
      if (items.length > 0) out.translations.push({ pos, cn: items.join('；') })
    }
  }

  // ---- English definitions (英英释义) ----
  const enBlock = html.match(/<h3>英英释义<\/h3>\s*<div class="layout en">([\s\S]*?)<\/div>/)
  if (enBlock) {
    const groups = enBlock[1].matchAll(/<span>([^<]+):<\/span>\s*<ol[^>]*>([\s\S]*?)<\/ol>/g)
    for (const g of groups) {
      const pos = g[1].trim()
      const items = [...g[2].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim())
      for (const en of items) if (en) out.definitions.push({ pos, en })
    }
  }

  // ---- Examples (例句) ----
  const sentBlock = html.match(/<h3>例句<\/h3>[\s\S]*?<ol[^>]*>([\s\S]*?)<\/ol>/)
  if (sentBlock) {
    const items = [...sentBlock[1].matchAll(/<li>([\s\S]*?)<\/li>/g)]
    for (const m of items) {
      const li = m[1]
      const en = li.match(/([\s\S]*?)<br\s*\/?>/)
      if (!en) continue
      const enText = en[1].replace(/<[^>]+>/g, '').trim()
      const cnText = li.replace(/<[^>]+>/g, '').replace(enText, '').trim()
      if (enText) out.examples.push({ en: enText, cn: cnText })
    }
  }

  // ---- Synonyms / Antonyms (近反义词) ----
  const relBlock = html.match(/<h3>近反义词<\/h3>\s*<div class="layout nfo">([\s\S]*?)<\/div>/)
  if (relBlock) {
    const synBlock = relBlock[1].match(/<div>【近义词】<\/div>\s*<ul[^>]*>([\s\S]*?)<\/ul>/)
    if (synBlock) {
      out.synonyms = [...synBlock[1].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/g)]
        .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
        .filter(Boolean)
    }
    const antBlock = relBlock[1].match(/<div>【反义词】<\/div>\s*<ul[^>]*>([\s\S]*?)<\/ul>/)
    if (antBlock) {
      out.antonyms = [...antBlock[1].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/g)]
        .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
        .filter(Boolean)
    }
  }

  // If we got nothing at all, treat as not found
  const hasAny =
    out.translations.length > 0 ||
    out.definitions.length > 0 ||
    out.phonetic.uk ||
    out.phonetic.us
  if (!hasAny) return null

  return out
}