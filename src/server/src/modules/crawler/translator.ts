import { logger } from '../../common/logger.js'
import { callLlm } from '../ai-processing/llm.js'
import type { CleanSegment } from './cleaner.js'
import { isMostlyEnglish } from './cleaner.js'

// Batch size: how many English paragraphs we translate in one LLM call.
const BATCH_SIZE = 8
// Bounded concurrency to avoid hammering the LLM.
const MAX_CONCURRENT = 3

/**
 * Translate a batch of English paragraphs into Chinese in a single LLM call.
 * Returns an array of Chinese strings aligned to the input order.
 */
async function translateBatch(enBatch: string[]): Promise<string[]> {
  const numbered = enBatch.map((t, i) => `${i + 1}. ${t}`).join('\n')
  const systemPrompt =
    '你是专业英译中翻译，面向英语学习者。把下列英文逐句翻译成自然、准确的中文。' +
    '严格保持编号（如 "1. ..."），每行一句，不要额外解释或前后缀。'
  const userPrompt = `${numbered}\n\n请只输出带编号的中文翻译，每行一条：`

  try {
    const res = await callLlm([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])
    const text = (res ?? '').trim()
    const lines = text
      .split('\n')
      .map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim())
      .filter((l) => l.length > 0)
    if (lines.length === enBatch.length) return lines
    // Mismatch: best-effort, fill missing with empty
    return enBatch.map((_, i) => lines[i] ?? '')
  } catch (err) {
    logger.error({ err, batchSize: enBatch.length }, 'translator: AI batch failed')
    return enBatch.map(() => '')
  }
}

/**
 * Fill `zh` for every segment that needs translation (mostly English, no zh yet).
 * Uses bounded concurrency + batching. Already-bilingual segments are skipped.
 */
export async function translateSegments(segments: CleanSegment[]): Promise<CleanSegment[]> {
  const needIdx = segments
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !s.zh && isMostlyEnglish(s.en))
    .map(({ i }) => i)

  if (needIdx.length === 0) return segments

  logger.info({ count: needIdx.length }, 'translator: starting AI translation')

  const batches: number[][] = []
  for (let i = 0; i < needIdx.length; i += BATCH_SIZE) {
    batches.push(needIdx.slice(i, i + BATCH_SIZE))
  }

  const results: string[][] = new Array(batches.length)

  await new Promise<void>((resolve) => {
    const started = new Array(batches.length).fill(false)
    let done = 0
    const run = async (bi: number) => {
      results[bi] = await translateBatch(batches[bi].map((idx) => segments[idx].en))
      done++
      if (done === batches.length) {
        resolve()
        return
      }
      const next = batches.findIndex((_, i) => !started[i] && results[i] === undefined)
      if (next >= 0) {
        started[next] = true
        void run(next)
      }
    }
    for (let i = 0; i < Math.min(MAX_CONCURRENT, batches.length); i++) {
      started[i] = true
      void run(i)
    }
    if (batches.length === 0) resolve()
  })

  // Write translations back into the original segments
  batches.forEach((idxBatch, bi) => {
    idxBatch.forEach((segIdx, j) => {
      segments[segIdx].zh = results[bi]?.[j] || ''
    })
  })

  return segments
}
