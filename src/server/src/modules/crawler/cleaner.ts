import { logger } from '../../common/logger.js'

/**
 * A single aligned paragraph: English source + optional Chinese translation.
 * Stored as `segments` JSON on the Content row.
 *
 * `start` / `end` are timestamps in milliseconds from the source subtitle track.
 * They are used by the frontend to sync the transcript with video/audio playback.
 * For article content (non-timed), both fields are undefined.
 */
export interface CleanSegment {
  /** English (source) text of this paragraph/sentence. */
  en: string
  /** Chinese translation, filled by the translator when missing. */
  zh?: string
  /** Start timestamp in ms (for video/audio segments only). */
  start?: number
  /** End timestamp in ms (for video/audio segments only). */
  end?: number
}

/**
 * Strip HTML tags, decode common entities, normalize whitespace.
 */
export function stripHtml(html: string): string {
  if (!html) return ''
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
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
}

/**
 * Split raw text into clean paragraphs.
 * - Prefer blank-line separated blocks.
 * - Break over-long blocks on sentence boundaries (<= ~600 chars).
 */
export function splitParagraphs(raw: string): string[] {
  if (!raw) return []
  const normalized = stripHtml(raw)
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim()

  const blocks = normalized
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\n/g, ' ').trim())
    .filter((b) => b.length > 0)

  const paras: string[] = []
  for (const block of blocks) {
    if (block.length <= 600) {
      paras.push(block)
    } else {
      const parts = block.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [block]
      for (const p of parts) {
        const t = p.trim()
        if (t) paras.push(t)
      }
    }
  }
  return paras.filter((p) => p.length >= 2)
}

/**
 * Convert raw content (HTML or plain) into segments (English only, zh empty).
 */
export function cleanToSegments(raw: string | undefined): CleanSegment[] {
  const paras = splitParagraphs(raw ?? '')
  if (paras.length === 0) return []
  logger.info({ paragraphs: paras.length }, 'cleaner: content cleaned into segments')
  return paras.map((en) => ({ en }))
}

/** A subtitle cue: start/end timestamps (ms) plus its text. */
export interface SubtitleCue {
  start: number
  end: number
  text: string
}

/** Matches both SRT (00:00:05,504) and WebVTT (00:00:05.504 / 00:05.504) timings. */
const TIMING_RE =
  /^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})\s*-->\s*(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/

function toMs(h: string | undefined, m: string, s: string, ms: string): number {
  return (
    Number(h ?? 0) * 3600_000 +
    Number(m) * 60_000 +
    Number(s) * 1000 +
    Number(ms.padEnd(3, '0'))
  )
}

/**
 * Parse a subtitle file (SRT or WebVTT) into timed cues.
 *
 * Handles the real-world quirks observed on TED/YouTube exports:
 * - WebVTT has no numeric index line, SRT does — both are tolerated.
 * - Inline tags (`<c>`, `<00:00:01.000>`, `{\an8}`) are stripped.
 * - Consecutive duplicate cues (TED emits the same cue twice) are collapsed.
 */
export function parseSubtitles(raw: string): SubtitleCue[] {
  if (!raw) return []
  const blocks = raw
    .replace(/^\uFEFF/, '')
    .replace(/\r/g, '')
    .replace(/^WEBVTT[^\n]*\n/, '')
    .split(/\n\s*\n/)

  const cues: SubtitleCue[] = []
  for (const block of blocks) {
    const lines = block.split('\n')
    const timingIdx = lines.findIndex((l) => TIMING_RE.test(l.trim()))
    if (timingIdx === -1) continue

    const m = TIMING_RE.exec(lines[timingIdx].trim())
    if (!m) continue

    const text = lines
      .slice(timingIdx + 1)
      .join(' ')
      .replace(/<[^>]*>/g, '')
      .replace(/\{\\[^}]*\}/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!text) continue

    const cue: SubtitleCue = {
      start: toMs(m[1], m[2], m[3], m[4]),
      end: toMs(m[5], m[6], m[7], m[8]),
      text,
    }

    // TED exports repeat the same cue back-to-back — collapse it.
    const prev = cues[cues.length - 1]
    if (prev && prev.text === cue.text && prev.start === cue.start) continue
    cues.push(cue)
  }
  return cues
}

/**
 * Align an English subtitle track with a Chinese one into bilingual segments.
 *
 * Timestamps are NOT reliable for matching: TED's human translations drift by
 * tens of milliseconds against the English track (e.g. 07.398 vs 07.268).
 * When both tracks have the same cue count they are paired by index, which is
 * exact. Otherwise each English cue takes the Chinese cue with the greatest
 * time overlap, and unmatched cues simply keep `zh` empty.
 */
export function alignSubtitles(enRaw: string, zhRaw?: string): CleanSegment[] {
  const enCues = parseSubtitles(enRaw)
  if (enCues.length === 0) return []

  const zhCues = zhRaw ? parseSubtitles(zhRaw) : []
  if (zhCues.length === 0) {
    return enCues.map((c) => ({ en: c.text, start: c.start, end: c.end }))
  }

  if (enCues.length === zhCues.length) {
    logger.info({ cues: enCues.length }, 'cleaner: subtitles aligned by index')
    return enCues.map((c, i) => ({ en: c.text, zh: zhCues[i].text, start: c.start, end: c.end }))
  }

  logger.warn(
    { en: enCues.length, zh: zhCues.length },
    'cleaner: cue counts differ, aligning by time overlap',
  )
  return enCues.map((c) => {
    let best: SubtitleCue | undefined
    let bestOverlap = 0
    for (const z of zhCues) {
      const overlap = Math.min(c.end, z.end) - Math.max(c.start, z.start)
      if (overlap > bestOverlap) {
        bestOverlap = overlap
        best = z
      }
    }
    return best ? { en: c.text, zh: best.text, start: c.start, end: c.end } : { en: c.text, start: c.start, end: c.end }
  })
}

/**
 * Detect whether a string is mainly English (so it needs translation).
 */
export function isMostlyEnglish(text: string): boolean {
  if (!text) return false
  const latin = (text.match(/[A-Za-z]/g) || []).length
  const cjk = (text.match(/[一-鿿]/g) || []).length
  return latin > cjk
}
