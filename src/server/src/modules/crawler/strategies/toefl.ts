/**
 * TOEFL crawler — supports two crawlable sources:
 *   - toefl.kmf.com (KMF ETS-official reading real tests, primary)
 *   - eduqia.com     (free ETS-style practice test, fallback)
 *
 * KMF (`/read/ets/order/<n>` listing) exposes ETS-licensed real TOEFL reading
 * passages. Each detail page (`/detail/read/<id>.html`) embeds the full English
 * stem inside `div.i-stem-stem`; we extract its pure-English `<p>` paragraphs.
 *
 * eduqia hosts a free no-signup practice test whose HTML exposes a small number
 * of reading passages and listening transcripts.
 */

import type { CrawlerSource, CrawlItem, CrawlStrategy } from '../types.js'
import { logger } from '../../../common/logger.js'
import { fetchPage, htmlToText, buildExamItem, getExistingSourceUrls } from './exam.js'

/** Cap passages fetched per crawl run (each costs page fetch + LLM translation). */
const MAX_PER_RUN = 15

/** Match a KMF relative passage-detail path. */
const KMF_DETAIL_LINK_RE = /href="(\/detail\/read\/[^"]+)"/g

/** Discover KMF passage-detail URLs from a listing page. */
function extractKmfLinks(html: string): string[] {
  const out = new Set<string>()
  for (const m of html.matchAll(KMF_DETAIL_LINK_RE)) {
    const path = m[1].split(/[?#]/)[0]
    out.add(`https://toefl.kmf.com${path}`)
  }
  return [...out]
}

/** Extract the passage title + full English stem from a KMF detail page. */
function parseKmfPassage(html: string): { title: string; passage: string } {
  // Title looks like: 【...】托福Official 05 Passage 1阅读真题_Minerals and Plants原文...
  const title =
    (html.match(/阅读真题_(.+?)原文/) || [])[1]?.trim() ||
    (html.match(/<title>([^<]*)<\/title>/) || [])[1]?.replace(/【[^】]*】/, '').split('_')[0]?.trim() ||
    'TOEFL Reading'

  const paras: string[] = []
  const startIdx = html.indexOf('i-stem-stem')
  if (startIdx >= 0) {
    const fromStem = html.slice(startIdx)
    for (const m of fromStem.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
      const t = htmlToText(m[1]).trim()
      // Keep only pure-English stem paragraphs (drop 解析/题目 which contain CJK).
      if ((t.match(/[A-Za-z]{4,}/g) || []).length > 10 && !/[\u4e00-\u9fff]/.test(t)) {
        paras.push(t)
      }
    }
  }

  return { title, passage: paras.join('\n').trim() }
}

/** Crawl KMF ETS-official TOEFL reading real tests. */
async function crawlKmf(source: CrawlerSource): Promise<CrawlItem[]> {
  const html = await fetchPage(source.url)
  if (!html) {
    logger.warn({ source: source.name, url: source.url }, 'TOEFL kmf: listing fetch failed')
    return []
  }

  const links = extractKmfLinks(html)
  if (links.length === 0) {
    logger.warn({ source: source.name, url: source.url }, 'TOEFL kmf: no passage links discovered')
    return []
  }

  // Skip passages already ingested in earlier runs.
  const existing = await getExistingSourceUrls(source.name)
  const freshLinks = links.filter((u) => !existing.has(u))
  if (freshLinks.length === 0) {
    logger.info({ source: source.name, total: links.length }, 'TOEFL kmf: all passages already ingested')
    return []
  }

  const items: CrawlItem[] = []
  let skipped = 0
  for (const url of freshLinks.slice(0, MAX_PER_RUN)) {
    const detail = await fetchPage(url)
    if (!detail) {
      skipped++
      continue
    }
    const parsed = parseKmfPassage(detail)
    if (parsed.passage.length < 50) {
      skipped++
      continue
    }
    const item = await buildExamItem({
      title: parsed.title,
      passage: parsed.passage,
      sourceUrl: url,
    })
    if (!item) {
      skipped++
      continue
    }
    items.push(item)
  }

  logger.info(
    { source: source.name, discovered: links.length, fresh: freshLinks.length, crawled: items.length, skipped },
    'TOEFL kmf crawl done',
  )
  return items
}

/** Strip the redundant "Play Audio – Qxx" toggles and option clutter from a transcript. */
function cleanTranscript(raw: string): string {
  return raw
    .replace(/^\s*Play Audio\s*[–-]?\s*/i, '')
    .trim()
}

/** Split the listening section into per-conversation blocks keyed by "Q<number>". */
function extractListeningConversations(listeningHtml: string): { title: string; text: string }[] {
  const parts = listeningHtml.split(/Q(\d{1,3})\b/)
  const out: { title: string; text: string }[] = []
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const num = parts[i]
    const body = parts[i + 1] ?? ''
    const text = cleanTranscript(htmlToText(body))
    if (text.length < 40) continue
    out.push({ title: `TOEFL Listening Q${num}`, text })
  }
  return out
}

/** Crawl eduqia free practice test (fallback). */
async function crawlEduqia(source: CrawlerSource): Promise<CrawlItem[]> {
  const html = await fetchPage(source.url)
  if (!html) {
    logger.warn({ source: source.name, url: source.url }, 'TOEFL eduqia: page fetch failed')
    return []
  }

  const items: CrawlItem[] = []
  let skipped = 0

  // ---- Reading passages ----
  const readingSection =
    html.match(/id="reading-section"[\s\S]*?(?=<h2[^>]*id="listening-section")/)?.[0] ?? html
  const passageBlocks = [
    ...readingSection.matchAll(/<div class="t-passage"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g),
  ]
  const pending: Promise<CrawlItem | null>[] = []

  passageBlocks.forEach((m, i) => {
    const passage = htmlToText(m[1])
    if (!passage || passage.length < 50) {
      skipped++
      return
    }
    const titleMatch = passage.match(/^Passage:\s*(.+)$/m)
    const title = titleMatch ? titleMatch[1].trim() : `TOEFL Reading Passage ${i + 1}`
    pending.push(
      buildExamItem({
        title,
        passage: passage.replace(/^Passage:\s*.+$/m, '').trim(),
        sourceUrl: `${String(source.url).split(/[?#]/)[0]}#reading-${i + 1}`,
      }),
    )
  })

  // ---- Listening conversations ----
  const listeningSection =
    html.match(/id="listening-section"[\s\S]*?(?=<h2[^>]*id="speaking-section")/)?.[0] ?? ''
  for (const conv of extractListeningConversations(listeningSection)) {
    pending.push(
      buildExamItem({
        title: conv.title,
        passage: conv.text,
        sourceUrl: `${String(source.url).split(/[?#]/)[0]}#listening`,
      }),
    )
  }

  const resolved = await Promise.all(pending)
  const valid = resolved.filter(Boolean) as CrawlItem[]
  items.push(...valid)
  logger.info(
    { source: source.name, requested: pending.length, crawled: valid.length, skipped },
    'TOEFL eduqia crawl done',
  )
  return items
}

export const toeflStrategy: CrawlStrategy = {
  async crawl(source: CrawlerSource): Promise<CrawlItem[]> {
    if (/kmf\.com/i.test(source.url)) {
      return crawlKmf(source)
    }
    return crawlEduqia(source)
  },
}