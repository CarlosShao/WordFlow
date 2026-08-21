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

/**
 * Distribute an ASR English transcript across an existing Chinese subtitle
 * timeline, producing timed bilingual segments.
 *
 * The cloud ASR (stepaudio-2.5-asr) returns plain text with NO timestamps,
 * but Bilibili's `ai-zh` subtitle track is a timed SRT. Strategy: split the
 * English text into sentence chunks, then walk the Chinese cues in order,
 * giving each cue enough whole sentences to cover its proportional share of
 * total characters. Sentences are kept whole (no mid-sentence cuts).
 *
 * When there is no Chinese track, fall back to sentence-splitting the English
 * text without timestamps (frontend can still show it as a scrollable
 * transcript, just not playback-synced).
 */
export function alignAsrToChineseTimeline(
  enText: string,
  zhSrt?: string,
): CleanSegment[] {
  if (!enText.trim()) return []

  if (zhSrt) {
    const zhCues = parseSubtitles(zhSrt)
    if (zhCues.length > 0) {
      const sentences = splitEnglishBySentence(enText)
      if (sentences.length === 0) return []

      const zhTotal = zhCues.reduce((a, c) => a + Math.max(1, c.text.length), 0)
      const enTotal = sentences.reduce((a, s) => a + s.en.length, 0)

      const segments: CleanSegment[] = []
      let si = 0 // next sentence to consume
      let enUsed = 0 // english chars consumed so far

      for (const cue of zhCues) {
        // This cue should cover this many English chars (proportional).
        const target = (Math.max(1, cue.text.length) / zhTotal) * enTotal
        const boundary = enUsed + target

        // Consume whole sentences until we cross the boundary.
        // Always take at least one sentence so no cue is empty.
        let enChunk = ''
        while (si < sentences.length && (enUsed < boundary || !enChunk)) {
          const s = sentences[si]
          enChunk = enChunk ? `${enChunk} ${s.en}` : s.en
          enUsed += s.en.length
          si += 1
          if (enUsed >= boundary) break
        }

        if (enChunk) {
          segments.push({
            en: enChunk,
            zh: cue.text,
            start: cue.start,
            end: cue.end,
          })
        }
      }
      if (segments.length > 0) return segments
    }
  }

  return splitEnglishBySentence(enText)
}

/**
 * Split English text into sentence-ish chunks without timestamps.
 *
 * ASR output often lacks punctuation entirely ("You're watching the Disney
 * Channel We now return to the 1992 Aladdin"). Besides standard `.!?`
 * boundaries we also split before common sentence starts (I/You/He/...,
 * Well/But/So/And/Now/Then) preceded by a space, which recovers most
 * sentence breaks in unpunctuated transcript text.
 */
export function splitEnglishBySentence(enText: string): CleanSegment[] {
  if (!enText.trim()) return []
  // Tokenize: keep punctuation-attached words together.
  const sentenceStart = /\b(I|You|He|She|We|They|It|My|Your|His|Her|Our|Their|This|That|These|Those|Well|But|So|And|Now|Then|Here|There|Look|Listen|Wait|Okay|OK|Yeah|No|Wow|Oh|What|Who|When|Where|Why|How|Do|Does|Did|Can|Could|Will|Would|Should|Is|Are|Was|Were|Have|Has|Had|Let|Don't|I'm|You're|He's|She's|We're|They're|It's)\b/g
  const parts: string[] = []
  let last = 0
  for (const m of enText.matchAll(sentenceStart)) {
    const idx = m.index ?? 0
    if (idx > 0 && enText[idx - 1] === ' ' && !/^[a-z]/.test(m[1])) {
      const chunk = enText.slice(last, idx).trim()
      if (chunk) parts.push(chunk)
      last = idx
    }
  }
  const tail = enText.slice(last).trim()
  if (tail) parts.push(tail)

  // If the regex found nothing (short text), fall back to plain `.!?` split.
  const sentences = parts.length > 1
    ? parts
    : (enText.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [enText])

  const segments: CleanSegment[] = []
  for (const p of sentences) {
    const t = p.trim()
    // Skip tiny fragments ("I am and", "Wow") — they carry no useful
    // highlight target and make the transcript noisy.
    if (t.length < 8 && !/^[A-Z][a-z]+[.!?]?$/.test(t)) continue
    if (t) segments.push({ en: t })
  }
  return segments.filter((s) => s.en.length >= 2)
}

/**
 * Assign real timestamps to ASR English sentences using detected speech
 * segments (from ffmpeg silencedetect). Sentences are walked in order and
 * packed into speech segments proportionally to segment duration.
 *
 * Returns timed segments; if speech segments are missing, falls back to
 * sentence-splitting without timestamps.
 */
export function alignAsrToSpeechTimeline(
  enText: string,
  speechSegments: Array<{ start: number; end: number }>,
): CleanSegment[] {
  const sentences = splitEnglishBySentence(enText)
  if (sentences.length === 0) return []
  if (!speechSegments || speechSegments.length === 0) return sentences

  const totalSpeech = speechSegments.reduce((a, s) => a + (s.end - s.start), 0)
  const enTotal = sentences.reduce((a, s) => a + s.en.length, 0)
  if (totalSpeech <= 0 || enTotal <= 0) return sentences

  const segments: CleanSegment[] = []
  let si = 0
  let enUsed = 0

  for (const seg of speechSegments) {
    const duration = seg.end - seg.start
    const target = (duration / totalSpeech) * enTotal
    const boundary = enUsed + target

    let enChunk = ''
    while (si < sentences.length && (enUsed < boundary || !enChunk)) {
      const s = sentences[si]
      enChunk = enChunk ? `${enChunk} ${s.en}` : s.en
      enUsed += s.en.length
      si += 1
      if (enUsed >= boundary) break
    }

    if (enChunk) {
      segments.push({
        en: enChunk,
        start: Math.round(seg.start * 1000),
        end: Math.round(seg.end * 1000),
      })
    }
  }
  return segments.length > 0 ? segments : sentences
}

/**
 * Distribute English sentences uniformly across a fixed video duration using
 * a constant speaking-rate estimate (MS_PER_CHAR milliseconds per character).
 *
 * Used as the final fallback when neither cue-level subtitles nor speech
 * detection give reliable timestamps (e.g. Bilibili re-uploads where the
 * official ai-zh cue times drift several seconds ahead of the actual audio).
 * The segments don't perfectly track fast/slow speech, but they line up with
 * the playhead in aggregate, which is what the user expects.
 */
const DEFAULT_MS_PER_CHAR = 40

export function alignAsrByUniformRate(
  enText: string,
  totalDurationSec: number,
  msPerChar: number = DEFAULT_MS_PER_CHAR,
): CleanSegment[] {
  const sentences = splitEnglishBySentence(enText)
  if (sentences.length === 0) return []
  if (!isFinite(totalDurationSec) || totalDurationSec <= 0) return sentences
  const totalEnChars = sentences.reduce((a, s) => a + s.en.length, 0)
  if (totalEnChars <= 0) return sentences

  // Fit the uniform rate to the video length so the last sentence ends at
  // totalDurationSec, not at totalEnChars * msPerChar (which may overshoot).
  const fittedRate = (totalDurationSec * 1000) / totalEnChars

  const segments: CleanSegment[] = []
  let cursor = 0
  for (const s of sentences) {
    const dur = s.en.length * fittedRate
    segments.push({ en: s.en, start: Math.round(cursor), end: Math.round(cursor + dur) })
    cursor += dur
  }
  // Snap the last segment's end to the actual video duration so the user
  // doesn't see the highlight race past the playhead at the end.
  if (segments.length > 0) {
    segments[segments.length - 1].end = Math.round(totalDurationSec * 1000)
  }
  return segments
}

/**
 * Place each English sentence into the ai-zh cue timeline WITHOUT cutting
 * sentences across cue boundaries.
 *
 * Algorithm:
 *   1. Parse English into full sentences (never split).
 *   2. For each sentence, find the FIRST cue whose end-time is past the
 *      sentence's expected position (by cumulative-char fraction over the
 *      total cue duration).
 *   3. Anchor the sentence to that cue: start = cue.start, end = cue.end.
 *      If a sentence is longer than any single cue, anchor it across the
 *      span it actually needs (start of first containing cue, end of last).
 *   4. Advance the cumulative cursor by the sentence's character count, even
 *      if it spans multiple cues — so the next sentence lands on a later cue.
 *
 * Net effect: each sentence is intact (no mid-sentence cuts like "Steve," /
 * "my grandmother is one of my closest friends." / "We go out together"), and
 * the timestamps still align with the real speech timeline because they're
 * taken straight from the cue boundaries.
 */
export function alignAsrFillCues(
  enText: string,
  zhCues: SubtitleCue[],
): CleanSegment[] {
  if (!enText.trim() || zhCues.length === 0) return []
  const sentences = splitEnglishBySentence(enText)
  if (sentences.length === 0) return []
  const totalEnChars = sentences.reduce((a, s) => a + s.en.length, 0)
  if (totalEnChars <= 0) return []
  // Project each sentence onto the cue timeline by character share.
  // Cumulative cue duration is the authoritative "speaking time" denominator;
  // walking cues by that fraction gives the expected position for any char
  // index, then we resolve it to a real time by stepping through cues.
  const totalCueSpan = zhCues[zhCues.length - 1].end - zhCues[0].start
  function posToTime(charOffset: number): number {
    const frac = charOffset / totalEnChars
    return zhCues[0].start + frac * totalCueSpan
  }

  const segments: CleanSegment[] = []
  let cum = 0
  for (const s of sentences) {
    const charStart = cum
    cum += s.en.length
    const charEnd = cum
    const tStart = posToTime(charStart)
    const tEnd = posToTime(charEnd)
    // Find the cue containing tStart (start of this sentence)
    let startCueIdx = zhCues.findIndex((c) => tStart >= c.start && tStart < c.end)
    if (startCueIdx === -1) startCueIdx = 0
    // Find the cue containing tEnd - 1ms (last moment of this sentence)
    const tEndProbe = Math.max(tStart + 1, tEnd - 1)
    let endCueIdx = zhCues.findIndex((c) => tEndProbe >= c.start && tEndProbe < c.end)
    if (endCueIdx === -1) endCueIdx = zhCues.length - 1
    if (endCueIdx < startCueIdx) endCueIdx = startCueIdx
    // Anchor to the cue boundaries that bracket the sentence
    const segStart = zhCues[startCueIdx].start
    const segEnd = zhCues[endCueIdx].end
    // Pair zh text from all cues spanned
    const zhJoined = zhCues
      .slice(startCueIdx, endCueIdx + 1)
      .map((c) => c.text)
      .join(' ')
    segments.push({
      en: s.en,
      zh: zhJoined || undefined,
      start: segStart,
      end: segEnd,
    })
  }
  return segments
}

/**
 * Uniform-rate English timeline with Chinese paired by video-fraction.
 *
 * Fallback when no ai-zh cues are available. The zh text is used ONLY as a
 * translation source — timestamps are estimated by uniform speaking rate.
 */
export function alignAsrUniformWithZh(
  enText: string,
  zhCues: SubtitleCue[],
  totalDurationSec: number,
  msPerChar?: number,
): CleanSegment[] {
  const enSegs = alignAsrByUniformRate(enText, totalDurationSec, msPerChar)
  if (enSegs.length === 0) return enSegs
  const zhJoined = zhCues.map((c) => c.text).join('')
  const zhLen = zhJoined.length
  if (zhLen === 0) return enSegs

  let zhPos = 0
  return enSegs.map((s) => {
    // Use the segment END as the zh cutoff so the FIRST segment also gets a
    // translation (start-based pairing leaves the opening line with no zh).
    const frac = totalDurationSec > 0 ? (s.end ?? 0) / 1000 / totalDurationSec : 1
    const targetZhEnd = Math.round(zhLen * Math.min(1, Math.max(0, frac)))
    let zhForK = ''
    if (targetZhEnd > zhPos) {
      zhForK = zhJoined.slice(zhPos, targetZhEnd)
      zhPos = targetZhEnd
    }
    return zhForK ? { ...s, zh: zhForK } : { ...s }
  })
}

/**
 * Build timed bilingual segments when we have speech-segment timestamps but
 * the Chinese track has its own (misaligned) timeline.
 *
 * Both the English sentences and the Chinese cue texts are distributed
 * proportionally across the SAME speech segments, so en and zh stay in lockstep
 * on one authoritative timeline. When no Chinese text exists, the zh field is
 * left empty (caller translates later).
 */
export function alignBilingualToSpeechTimeline(
  enText: string,
  zhText: string | undefined,
  speechSegments: Array<{ start: number; end: number }>,
): CleanSegment[] {
  if (!speechSegments || speechSegments.length === 0) {
    // No speech timeline: fall back to untimed sentence split. (The caller
    // already tried alignAsrToChineseTimeline with the SRT when relevant.)
    return splitEnglishBySentence(enText)
  }

  const enSentences = splitEnglishBySentence(enText)
  if (enSentences.length === 0) return []

  // Split Chinese into sentence-ish chunks too.
  const zhSentences = zhText
    ? zhText
        .split(/(?<=[。！？!?；;])|(?<=[，,])/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : []

  const totalSpeech = speechSegments.reduce((a, s) => a + (s.end - s.start), 0)
  const enTotal = enSentences.reduce((a, s) => a + s.en.length, 0)
  const zhTotal = zhSentences.reduce((a, s) => a + s.length, 0)
  if (totalSpeech <= 0 || enTotal <= 0) return enSentences

  const segments: CleanSegment[] = []
  let ei = 0
  let zi = 0
  let enUsed = 0
  let zhUsed = 0

  // Distribute sentences by COUNT proportion (not character proportion) so
  // each window gets a fair share even when sentence lengths vary wildly.
  // enTotalChar is only used to spread timestamps inside a window.
  const totalEnChars = enSentences.reduce((a, s) => a + s.en.length, 0)

  for (let bi = 0; bi < speechSegments.length; bi++) {
    const seg = speechSegments[bi]
    const duration = seg.end - seg.start
    const windowsLeft = speechSegments.length - bi
    const sentencesLeft = enSentences.length - ei

    // Proportional share of remaining sentences for this window's share of
    // remaining time, clamped so every remaining window gets >= 1 sentence.
    const remainingTime = speechSegments[bi].end - speechSegments[bi].start +
      (bi < speechSegments.length - 1
        ? speechSegments[speechSegments.length - 1].end - speechSegments[bi + 1].start
        : 0)
    const timeShare = remainingTime > 0 ? duration / remainingTime : 1
    let take = Math.max(1, Math.round(sentencesLeft * timeShare))
    take = Math.min(take, sentencesLeft)
    if (bi === speechSegments.length - 1) take = sentencesLeft

    const enChunks: string[] = []
    for (let k = 0; k < take && ei < enSentences.length; k++) {
      enChunks.push(enSentences[ei].en)
      enUsed += enSentences[ei].en.length
      ei += 1
    }

    // Chinese: same proportional-by-count approach.
    const zhSentencesLeft = zhSentences.length - zi
    let zhTake = zhTotal > 0 ? Math.max(1, Math.round(zhSentencesLeft * timeShare)) : 0
    zhTake = Math.min(zhTake, zhSentencesLeft)
    if (bi === speechSegments.length - 1) zhTake = zhSentencesLeft
    const zhChunks: string[] = []
    for (let k = 0; k < zhTake && zi < zhSentences.length; k++) {
      zhChunks.push(zhSentences[zi])
      zhUsed += zhSentences[zi].length
      zi += 1
    }

    if (enChunks.length === 0) continue

    // Sub-divide the window's time across its sentences proportional to
    // character count (longer sentences get more time), so subtitle timing
    // tracks speech pace instead of splitting the window evenly.
    const windowStartMs = Math.round(seg.start * 1000)
    const windowEndMs = Math.round(seg.end * 1000)
    const enChars = enChunks.reduce((a, c) => a + c.length, 0)
    const windowMs = windowEndMs - windowStartMs

    // Walk the window's zh chunks in order, giving each en sentence its
    // proportional slice. This avoids re-emitting the same zh text for
    // multiple sentences (the bug that made one hover highlight a whole
    // paragraph of Chinese).
    let zhPos = 0 // index into this window's zhChunks
    let cursor = windowStartMs
    for (let k = 0; k < enChunks.length; k++) {
      // Character-proportional end time for this sentence within the window.
      const charsBefore = enChars > 0
        ? enChunks.slice(0, k + 1).reduce((a, c) => a + c.length, 0) / enChars
        : (k + 1) / enChunks.length
      let endMs = k === enChunks.length - 1
        ? windowEndMs
        : windowStartMs + Math.round(windowMs * charsBefore)
      // Guard: never go backwards.
      if (endMs <= cursor) endMs = cursor + 1
      const zhEndPos = k === enChunks.length - 1
        ? zhChunks.length
        : Math.round((zhChunks.length * (k + 1)) / enChunks.length)
      let zhForK = ''
      if (zhEndPos > zhPos) {
        zhForK = zhChunks.slice(zhPos, zhEndPos).join('')
        zhPos = zhEndPos
      }
      segments.push({
        en: enChunks[k],
        ...(zhForK ? { zh: zhForK } : {}),
        start: cursor,
        end: endMs,
      })
      cursor = endMs
    }
  }
  return segments.length > 0 ? segments : enSentences
}
