/**
 * A single aligned sentence pair: one English sentence plus the Chinese text
 * that translates exactly that sentence.
 *
 * The pair is built at merge time instead of re-splitting paragraph text by
 * punctuation at render time. The old approach compared en/zh sentence COUNTS
 * and fell back to highlighting the whole Chinese paragraph whenever a
 * translator (or the cue merger) merged or split sentences — with long
 * sentences that fallback fired constantly, so hovering one English sentence
 * lit up the entire Chinese paragraph. Carrying an explicit per-sentence zh
 * removes the count check entirely.
 */
export interface BilingualSentence {
  en: string
  zh: string
  /** Playback window in seconds, when the source cue carried timestamps. */
  start?: number
  end?: number
}

/** A bilingual reading paragraph: a group of aligned sentence pairs. */
export interface BilingualParagraph {
  sentences: BilingualSentence[]
  /** Display text: en sentences joined with spaces. */
  en: string
  /** Display text: zh parts joined without separators (Chinese needs none). */
  zh: string
  start?: number
  end?: number
}

/**
 * Split an English paragraph into sentences for sentence-level hover effects.
 * Keeps the trailing period and treats `. ! ?` (followed by whitespace) as
 * boundaries, so abbreviations like "Dr." stay intact.
 */
export function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?])\s+/)
  return parts.map((p) => p.trim()).filter((p) => p.length > 0)
}

/**
 * Split a Chinese paragraph into sentences by `。！？`.
 */
export function splitZhSentences(text: string): string[] {
  if (!text) return []
  const parts = text.split(/(?<=[。！？])\s*/)
  return parts.map((p) => p.trim()).filter((p) => p.length > 0)
}

/**
 * True when `nextEn` looks like a continuation of `prevEn` that was cut
 * mid-sentence: previous cue has no terminator, or the next cue starts with a
 * lowercase linking word. Two-part heuristic so that real mid-sentence
 * subtitle cuts get merged but full sentences that happen to start with
 * "and" / "but" do NOT get swallowed.
 */
export function isContinuationCue(prevEn: string, nextEn: string): boolean {
  if (!prevEn) return false
  if (!/[.!?]["')\]]?\s*$/.test(prevEn)) return true
  if (/^\s*(and|or|but|so|because|since|which|that|who|whom|whose|where|when|while|although|though)\b/i.test(nextEn)) {
    return true
  }
  return false
}

const EN_TRANSITION = /^\s*(however|furthermore|in addition|nevertheless|as a result|meanwhile|on the other hand|but|yet|so|when|as|to understand|on the contrary|in contrast)\b/i
const ZH_TRANSITION = /^\s*(然而|此外|但是|不过|但|因此|所以|尽管如此|与此同时|另一方面|相反|换言之|事实上|实际上)\s*/
const EN_TIME_ANCHOR = /\b(in \d{4}|when |after |before |once |by )\b/i
const ZH_TIME_ANCHOR = /\b(\d{4}年|当|之后|之前|在)\b/

/**
 * Hard caps that keep paragraphs reading like article paragraphs instead of
 * walls of text — especially in dialogue-heavy content (comedy sketches,
 * interviews) where semantic break signals are rare and nearly every cue
 * lacks a sentence terminator.
 */
const MAX_SENTENCE_CHARS = 400
const MAX_SENTENCES_PER_PARAGRAPH = 6
const MAX_CHARS_PER_PARAGRAPH = 600

export function isParagraphBreak(
  en: string,
  zh: string,
  sentencesInCurrent: number,
  currentEnLength = 0,
): boolean {
  // Hard caps — prevent wall-of-text regardless of semantics
  if (sentencesInCurrent >= MAX_SENTENCES_PER_PARAGRAPH) return true
  if (currentEnLength >= MAX_CHARS_PER_PARAGRAPH) return true
  // Semantic signals
  if (EN_TRANSITION.test(en) || ZH_TRANSITION.test(zh)) return true
  if (en.endsWith('?') || en.endsWith('？') || zh.includes('？')) return true
  if (sentencesInCurrent >= 4 && EN_TIME_ANCHOR.test(en)) return true
  if (sentencesInCurrent >= 4 && ZH_TIME_ANCHOR.test(zh)) return true
  return false
}

/**
 * Assign each Chinese sub-sentence to exactly one English sub-sentence.
 *
 * When the counts match, pair them 1:1. When they don't (translator merged
 * two sentences into one, or the AI translation split one), distribute the
 * zh sentences across the en ones proportionally by cumulative character
 * length: each en sentence receives a contiguous run of zh sentences whose
 * share of the total zh length roughly matches the en sentence's share of
 * the total en length. Every zh sentence lands somewhere, and the highlight
 * always covers a symmetric, contiguous span — never the whole paragraph.
 */
export function alignZhToEn(enSubs: string[], zhSubs: string[]): string[] {
  const n = enSubs.length
  const out = new Array<string>(n).fill('')
  if (n === 0 || zhSubs.length === 0) return out
  if (zhSubs.length === n) {
    for (let i = 0; i < n; i++) out[i] = zhSubs[i]
    return out
  }

  const totalEn = enSubs.reduce((a, s) => a + s.length, 0) || 1
  const totalZh = zhSubs.reduce((a, s) => a + s.length, 0) || 1
  const enCum: number[] = []
  const zhCum: number[] = []
  let acc = 0
  for (const s of enSubs) { acc += s.length; enCum.push(acc) }
  acc = 0
  for (const s of zhSubs) { acc += s.length; zhCum.push(acc) }

  let zi = 0
  for (let i = 0; i < n; i++) {
    const zhBoundary = (enCum[i]! / totalEn) * totalZh
    const parts: string[] = []
    while (zi < zhSubs.length) {
      if (i === n - 1) {
        // Last en sentence always takes the remainder.
        parts.push(zhSubs[zi]!)
        zi++
        continue
      }
      // A zh sentence belongs to en[i] when its midpoint falls inside en[i]'s
      // proportional share of the zh character space.
      const mid = zhCum[zi]! - zhSubs[zi]!.length / 2
      if (mid <= zhBoundary) {
        parts.push(zhSubs[zi]!)
        zi++
      } else {
        break
      }
    }
    out[i] = parts.join('')
  }
  return out
}

/** Interpolate a [start, end] window across sub-sentences by en char length. */
function distributeTime(
  start: number | undefined,
  end: number | undefined,
  enSubs: string[],
): Array<{ start?: number; end?: number }> {
  const n = enSubs.length
  if (typeof start !== 'number' || typeof end !== 'number' || end <= start || n === 0) {
    return Array.from({ length: n }, () => ({}))
  }
  const total = enSubs.reduce((a, s) => a + s.length, 0) || 1
  const out: Array<{ start?: number; end?: number }> = []
  let acc = 0
  for (const s of enSubs) {
    const from = acc / total
    acc += s.length
    const to = acc / total
    out.push({ start: start + (end - start) * from, end: start + (end - start) * to })
  }
  return out
}

function makeParagraph(sentences: BilingualSentence[]): BilingualParagraph {
  return {
    sentences,
    en: sentences.map((s) => s.en).join(' '),
    zh: sentences.map((s) => s.zh).filter(Boolean).join(''),
    start: sentences[0]?.start,
    end: sentences[sentences.length - 1]?.end,
  }
}

/**
 * Split one merged cue-group into sentence pairs (en sub-sentences ↔ their
 * proportional zh spans). A cue group usually contains a single sentence; the
 * sub-splitting only matters when one cue carried several sentences.
 */
function groupToSentences(
  enText: string,
  zhText: string,
  start: number | undefined,
  end: number | undefined,
): BilingualSentence[] {
  const enSubs = splitSentences(enText)
  if (enSubs.length <= 1) {
    return [{ en: enText, zh: zhText, start, end }]
  }
  const zhSubs = splitZhSentences(zhText)
  const aligned = alignZhToEn(enSubs, zhSubs)
  const times = distributeTime(start, end, enSubs)
  return enSubs.map((en, i) => ({ en, zh: aligned[i] ?? '', start: times[i]!.start, end: times[i]!.end }))
}

/** CJK ideograph (sufficient proxy for "this cue's en field is Chinese"). */
const CJK_CHAR = /[\u4e00-\u9fff]/

function cjkRatio(text: string): number {
  if (!text) return 0
  let cjk = 0
  for (const ch of text) {
    if (CJK_CHAR.test(ch)) cjk++
  }
  return cjk / text.length
}

/**
 * Some crawled videos (e.g. Key & Peele S5) have a tail of cues where the
 * crawler wrote the Chinese line into `en` and the English into `zh`. Detect
 * the obvious swaps and flip them back so the bilingual reading stays
 * English-on-top. English text scores ≈0 CJK; Chinese ≈0.8+, so a 0.5/0.3
 * threshold never misfires on legit content.
 */
function unswapCue(en: string, zh: string): { en: string; zh: string } {
  if (en && zh && cjkRatio(en) > 0.5 && cjkRatio(zh) < 0.3) {
    return { en: zh, zh: en }
  }
  return { en, zh }
}

/**
 * Merge subtitle segments into article-style bilingual paragraphs.
 *
 * Phase 1 — join adjacent cues that were split mid-sentence (incomplete
 * sentence or lowercase-linking-word start) into whole-sentence groups.
 * Phase 2 — split each group into aligned en/zh sentence pairs, so hover
 * highlighting never depends on en/zh sentence counts agreeing.
 * Phase 3 — group consecutive sentence pairs into paragraphs using semantic
 * break signals (transition words, question marks, time anchors) with hard
 * caps.
 *
 * When there are no segments, `content` + `translation` (newline-separated)
 * are paired line by line and sub-split the same way.
 */
export function buildBilingualParagraphs(
  segments: Array<{ en?: string; zh?: string; start?: number; end?: number }> | null | undefined,
  content: string | null | undefined,
  translation: string | null | undefined,
): BilingualParagraph[] {
  if (Array.isArray(segments) && segments.length > 0) {
    // ── Phase 1: merge continuation cues into whole sentences ──
    type Group = { enParts: string[]; zhParts: string[]; start?: number; end?: number }
    const groups: Group[] = []
    for (const s of segments) {
      let en = (s?.en || '').trim()
      if (!en) continue
      let zh = (s?.zh || '').trim()
      ;({ en, zh } = unswapCue(en, zh))
      const last = groups[groups.length - 1]
      // Hard cap on merged length: in dialogue-heavy content nearly every cue
      // lacks a sentence terminator, so isContinuationCue would otherwise glue
      // a huge run of cues into one giant "sentence" (which then becomes one
      // giant hover unit). Stop merging once the current sentence already
      // exceeds the character budget.
      const lastEn = last ? last.enParts.join(' ') : ''
      if (
        last &&
        lastEn.length < MAX_SENTENCE_CHARS &&
        isContinuationCue(lastEn, en)
      ) {
        last.enParts.push(en)
        if (zh) last.zhParts.push(zh)
        if (typeof s?.end === 'number') last.end = s.end
      } else {
        groups.push({
          enParts: [en],
          zhParts: zh ? [zh] : [],
          start: typeof s?.start === 'number' ? s.start : undefined,
          end: typeof s?.end === 'number' ? s.end : undefined,
        })
      }
    }

    // ── Phase 2: cue group → aligned sentence pairs ──
    const sentences: BilingualSentence[] = []
    for (const g of groups) {
      const enText = g.enParts.join(' ').replace(/\s+/g, ' ').trim()
      const zhText = g.zhParts.join(' ').replace(/\s+/g, ' ').trim()
      sentences.push(...groupToSentences(enText, zhText, g.start, g.end))
    }

    // ── Phase 3: sentence pairs → paragraphs ──
    const paragraphs = sentencesToParagraphs(sentences)
    if (paragraphs.length > 0) return paragraphs
  }

  if (!content) return []
  // Fallback: pair `content`/`translation` line by line (typical for crawled
  // articles, where each line is already a paragraph).
  //
  // Translation is OPTIONAL here: exam imports (e.g. TOEFL_TPO_READING) and
  // some news crawls carry the English passage with no Chinese at all.
  // Returning [] in that case used to blank the whole article page — instead
  // render English-only paragraphs with empty zh (shown as 暂无翻译).
  // Iterate over ALL en lines: the old Math.min(en, zh) loop silently
  // dropped English paragraphs whenever the translation had fewer lines.
  const enLines = content.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const zhLines = translation ? translation.split(/\n+/).map((l) => l.trim()).filter(Boolean) : []
  const sentencePairs = enLines.map((en, i) =>
    groupToSentences(en, zhLines[i] ?? '', undefined, undefined),
  )
  // Two line conventions exist in the data: news crawls store one PARAGRAPH
  // per line (keep as-is), while exam imports store one SENTENCE per line
  // (e.g. TOEFL_TPO_READING — 67 single-sentence "paragraphs" otherwise).
  // Short average lines ⇒ sentence-per-line ⇒ re-group into paragraphs.
  const avgLineLen =
    enLines.reduce((a, l) => a + l.length, 0) / Math.max(1, enLines.length)
  if (enLines.length > 6 && avgLineLen < 120) {
    return sentencesToParagraphs(sentencePairs.flat())
  }
  return sentencePairs.map(makeParagraph)
}

function sentencesToParagraphs(sentences: BilingualSentence[]): BilingualParagraph[] {
  const paragraphs: BilingualSentence[][] = []
  let current: BilingualSentence[] = []
  let count = 0
  let enLen = 0
  for (const sent of sentences) {
    // Hard cap: force a break when the paragraph already exceeds the sentence
    // or character budget (common in dialogue-heavy content where almost no
    // cue carries a terminator or a break signal).
    const atHardCap =
      count >= MAX_SENTENCES_PER_PARAGRAPH ||
      enLen + sent.en.length + 1 > MAX_CHARS_PER_PARAGRAPH
    const startsNew = isParagraphBreak(sent.en, sent.zh, count, enLen)
    if (current.length === 0 || atHardCap || (count > 0 && startsNew)) {
      if (current.length > 0) paragraphs.push(current)
      current = [sent]
      count = 1
      enLen = sent.en.length
    } else {
      current.push(sent)
      count++
      enLen += sent.en.length + 1
    }
  }
  if (current.length > 0) paragraphs.push(current)
  return paragraphs.map(makeParagraph)
}
