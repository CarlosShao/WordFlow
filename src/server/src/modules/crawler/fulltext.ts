import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import { logger } from '../../common/logger.js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface FullTextResult {
  title: string
  content: string
  excerpt?: string
  byline?: string
  siteName?: string
  length: number
  usedReadability: boolean
}

/**
 * Strip HTML tags from a string (best-effort, for RSS fallback).
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Fetch raw HTML from a URL via curl (follow redirects, 20s timeout).
 */
async function fetchHtml(url: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('curl', ['-sL', '--max-time', '20', url], {
      maxBuffer: 10 * 1024 * 1024,
    })
    return stdout || null
  } catch (err) {
    logger.warn({ err, url }, 'fulltext: HTTP fetch failed')
    return null
  }
}

/**
 * Try Mozilla Readability first (Firefox Reader View algorithm).
 * Returns null when the parsed article is too short or missing.
 */
function tryReadability(html: string, url: string): FullTextResult | null {
  try {
    const dom = new JSDOM(html, { url })
    const reader = new Readability(dom.window.document)
    const parsed = reader.parse()
    if (!parsed) return null

    const text = parsed.textContent?.trim() || ''
    if (text.length < 400) return null

    return {
      title: parsed.title?.trim() || '',
      content: text,
      excerpt: parsed.excerpt?.trim() || undefined,
      byline: parsed.byline?.trim() || undefined,
      siteName: parsed.siteName?.trim() || undefined,
      length: text.length,
      usedReadability: true,
    }
  } catch (err) {
    logger.debug({ err, url }, 'fulltext: Readability pass failed')
    return null
  }
}

/**
 * Cheerio-based fallback: try common content wrappers, fall back to <body>.
 */
async function tryCheerio(html: string, url: string): Promise<FullTextResult | null> {
  try {
    const { load } = await import('cheerio')
    const $ = load(html)

    $('script, style, noscript, iframe, nav, footer, header, aside, .ad, .advertisement, .ads, .newsletter, .comments, .related, .sidebar, .recommend, .promo').remove()

    const title = $('title').text().trim()
    let text = ''

    const candidates = [
      'article',
      'main',
      '[role="main"]',
      '.post-content',
      '.entry-content',
      '.article-body',
      '.article-content',
      '.content-body',
      '.story-body',
      '#content',
      '.content',
      '#main',
      '.post',
      '.article',
      '.story',
    ]

    for (const sel of candidates) {
      const el = $(sel).first()
      if (el.length) {
        const t = el.text().replace(/\s+/g, ' ').trim()
        if (t.length > text.length) text = t
      }
    }

    if (text.length < 400) {
      text = $('body').text().replace(/\s+/g, ' ').trim()
    }

    if (text.length < 400) return null

    return {
      title,
      content: text,
      length: text.length,
      usedReadability: false,
    }
  } catch (err) {
    logger.warn({ err, url }, 'fulltext: cheerio fallback failed')
    return null
  }
}

/**
 * Fetch a URL and return a clean full-text article.
 *
 * Tries (in order):
 *   1. Mozilla Readability — best for news / blog / article pages
 *   2. Cheerio content-zone heuristics — for sites Readability doesn't like
 *
 * Returns `null` when both methods yield < 400 chars of clean text.
 */
export async function fetchFullText(url: string): Promise<FullTextResult | null> {
  const html = await fetchHtml(url)
  if (!html || html.length < 500) {
    logger.warn({ url, len: html?.length }, 'fulltext: HTTP response unusable')
    return null
  }

  const r = tryReadability(html, url)
  if (r) return r

  const c = await tryCheerio(html, url)
  if (c) return c

  logger.warn({ url }, 'fulltext: no strategy produced usable article')
  return null
}

/**
 * Conditionally refetch full text: only when the existing RSS-provided body
 * (stripped of HTML) is shorter than `minLength` characters.
 *
 * Many feeds DO ship the full article inside `content:encoded`, so we avoid
 * wasting HTTP round-trips when the fallback is already long enough.
 *
 * @param link       Article permalink to potentially refetch
 * @param fallback   Existing HTML/rich text from RSS `content:encoded` / description
 * @param minLength  Min clean-text chars before we consider the fallback "long enough" (default: 600)
 */
export async function fetchFullTextIfNeeded(
  link: string,
  fallback: string,
  minLength = 600,
): Promise<{ text: string; usedFullText: boolean }> {
  const fallbackPlain = stripHtml(fallback)
  if (fallbackPlain.length >= minLength) {
    return { text: fallbackPlain, usedFullText: false }
  }

  const ft = await fetchFullText(link)
  if (ft && ft.content.length > fallbackPlain.length) {
    return { text: ft.content, usedFullText: true }
  }
  return { text: fallbackPlain, usedFullText: false }
}

