import { logger } from '../../common/logger.js'
import { callLlm } from '../ai-processing/llm.js'
import type { CleanSegment } from './cleaner.js'

// Batch size: how many English paragraphs we translate in one LLM call.
const BATCH_SIZE = 8
// Bounded concurrency to avoid hammering the LLM.
const MAX_CONCURRENT = 3
// Max retries per batch
const MAX_RETRIES = 2

/**
 * Translate a batch of English paragraphs into Chinese in a single LLM call.
 * Returns an array of Chinese strings aligned to the input order.
 */
async function translateBatch(enBatch: string[], retry = 0): Promise<string[]> {
  const numbered = enBatch.map((t, i) => `${i + 1}. ${t}`).join('\n')
  const systemPrompt =
    '你是专业英译中翻译，面向英语学习者。把下列英文逐句翻译成自然、准确的中文。' +
    '严格保持编号（如 "1. ..."），每行一句，不要额外解释或前后缀。' +
    '即使某些句子很短或是标点符号，也要为每个编号输出对应翻译。'
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
    
    // If we got the right number of translations, return them
    if (lines.length === enBatch.length) return lines
    
    // If we got some but not all, pad with what we have
    if (lines.length > 0 && lines.length < enBatch.length) {
      logger.warn({ expected: enBatch.length, got: lines.length }, 'translator: batch size mismatch, filling gaps')
      // For missing translations, retry with smaller batches
      const missingIdx: number[] = []
      for (let i = 0; i < enBatch.length; i++) {
        if (i >= lines.length) missingIdx.push(i)
      }
      // Retry missing items in a smaller batch
      if (missingIdx.length > 0 && retry < MAX_RETRIES) {
        const missingTexts = missingIdx.map((i) => enBatch[i])
        const retryResults = await translateBatch(missingTexts, retry + 1)
        const merged = [...lines]
        for (let i = 0; i < missingIdx.length; i++) {
          merged[missingIdx[i]] = retryResults[i] || ''
        }
        return merged
      }
      return enBatch.map((_, i) => lines[i] ?? '')
    }
    
    // If we got nothing, retry
    if (lines.length === 0 && retry < MAX_RETRIES) {
      logger.warn({ retry }, 'translator: empty response, retrying')
      return translateBatch(enBatch, retry + 1)
    }
    
    return enBatch.map(() => '')
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    const isCensorshipBlocked = errMsg.includes('451') || errMsg.includes('censorship_blocked')
    
    if (isCensorshipBlocked) {
      logger.warn({ err: errMsg, batchSize: enBatch.length }, 'translator: content blocked by censorship, skipping batch')
      return enBatch.map(() => '[翻译被系统审查阻止]')
    }
    
    logger.error({ err, batchSize: enBatch.length, retry }, 'translator: AI batch failed')
    if (retry < MAX_RETRIES) {
      return translateBatch(enBatch, retry + 1)
    }
    return enBatch.map(() => '')
  }
}

/**
 * Fill `zh` for every segment that needs translation (mostly English, no zh yet).
 * Uses bounded concurrency + batching. Already-bilingual segments are skipped.
 * Ensures ALL qualifying segments get translation, with retries.
 */
export async function translateSegments(segments: CleanSegment[]): Promise<CleanSegment[]> {
  // Find ALL segments that need translation (no zh field or empty zh)
  const needIdx = segments
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !s.zh || s.zh.trim() === '')
    .map(({ i }) => i)

  if (needIdx.length === 0) return segments

  logger.info({ count: needIdx.length }, 'translator: starting AI translation')

  // Process in batches
  const batches: number[][] = []
  for (let i = 0; i < needIdx.length; i += BATCH_SIZE) {
    batches.push(needIdx.slice(i, i + BATCH_SIZE))
  }

  const results: string[][] = new Array(batches.length)

  // Use a simple queue for concurrency control
  const queue: number[] = [...Array(batches.length).keys()]
  let active = 0

  const worker = async (): Promise<void> => {
    while (queue.length > 0) {
      const bi = queue.shift()!
      const idxBatch = batches[bi]
      const texts = idxBatch.map((idx) => segments[idx].en)
      results[bi] = await translateBatch(texts)
      
      // If batch failed completely, try once more
      if (results[bi].every((r) => !r)) {
        logger.warn({ batch: bi }, 'translator: batch returned all empty, retrying')
        results[bi] = await translateBatch(texts, 1)
      }
    }
  }

  // Start workers
  const workers = Array.from({ length: Math.min(MAX_CONCURRENT, batches.length) }, () => worker())
  await Promise.all(workers)

  // Write translations back into the original segments
  batches.forEach((idxBatch, bi) => {
    idxBatch.forEach((segIdx, j) => {
      const translated = results[bi]?.[j]?.trim()
      if (translated) {
        segments[segIdx].zh = translated
      } else {
        // Last resort: use a placeholder but log it
        logger.warn(
          { segIdx, en: segments[segIdx].en?.slice(0, 50) },
          'translator: segment translation failed after retries',
        )
        segments[segIdx].zh = ''
      }
    })
  })

  // Final verification: count how many segments still lack translation
  const missing = segments.filter((s) => !s.zh || s.zh.trim() === '').length
  if (missing > 0) {
    logger.warn({ missing, total: segments.length }, 'translator: some segments still missing translation')
  } else {
    logger.info({ total: segments.length }, 'translator: all segments translated successfully')
  }

  return segments
}
