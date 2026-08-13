/**
 * Shared helpers for the IELTS / TOEFL reading-passage crawlers.
 *
 * Both exam sources (mini-ielts.com for IELTS, eduqia.com for TOEFL) expose
 * free, officially-sourced reading passages. We reuse the VOA pipeline here:
 * store the English passage as `content`, split it into aligned segments and
 * translate them for bilingual display.
 */

import { logger } from '../../../common/logger.js'
import { getPrisma } from '../../../common/prisma.js'
import { cleanToSegments, type CleanSegment } from '../cleaner.js'
import { translateSegments } from '../translator.js'
import type { CrawlItem } from '../types.js'

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

/** Fetch a page with a timeout + browser UA; returns the raw HTML or null. */
export async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA, Referer: new URL(url).origin },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      logger.warn({ url, status: res.status }, 'exam: page fetch not ok')
      return null
    }
    return await res.text()
  } catch (err) {
    logger.warn({ err, url }, 'exam: page fetch failed')
    return null
  }
}

/** Strip a block of HTML to clean text (collapse whitespace). */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n+\s*/g, '\n')
    .trim()
}

/**
 * Query the set of source URLs already stored across ALL sources.
 *
 * Dedup is global by URL (not per source name): category / "all" sources are
 * overlapping subsets of the same passage list, so a passage must only be
 * ingested once regardless of which source name first captures it.
 */
export async function getExistingSourceUrls(_sourceName: string): Promise<Set<string>> {
  try {
    const prisma = getPrisma()
    const rows = await prisma.content.findMany({
      where: { sourceUrl: { not: null } },
      select: { sourceUrl: true },
    })
    return new Set(rows.map((r) => r.sourceUrl).filter(Boolean) as string[])
  } catch (err) {
    logger.warn({ err }, 'exam: failed to load existing source urls')
    return new Set()
  }
}

/**
 * Build a CrawlItem from an English reading passage. Splits into segments and
 * translates them inline (any failures are tolerated — missing segments fall
 * back to the plain English `content`).
 */
export async function buildExamItem(input: {
  title: string
  passage: string
  sourceUrl: string
  summary?: string
}): Promise<CrawlItem | null> {
  const passage = input.passage.replace(/\s+/g, ' ').trim()
  if (!passage || passage.length < 50) {
    logger.warn({ title: input.title, url: input.sourceUrl }, 'exam: passage too short, skipping')
    return null
  }

  let segments: CleanSegment[] = cleanToSegments(passage)
  if (segments.length > 0) {
    try {
      await translateSegments(segments)
    } catch (err) {
      logger.warn({ err, title: input.title }, 'exam: passage translation failed, storing English only')
    }
  }

  const translationText = segments.map((s) => s.zh ?? '').filter(Boolean).join('\n')

  return {
    title: input.title,
    sourceUrl: input.sourceUrl,
    summary: input.summary?.slice(0, 2000) || passage.slice(0, 2000),
    content: passage,
    translation: translationText || undefined,
    segments: (segments.length > 0 ? segments : undefined) as CrawlItem['segments'],
  }
}