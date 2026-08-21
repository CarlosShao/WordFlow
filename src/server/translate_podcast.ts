/**
 * High-quality Chinese translation for PODCAST contents.
 *
 * After whisper_podcast_backfill.py writes the English segments (with real
 * timestamps) + content, this script fills the `zh` of every segment and the
 * `translation` column using the same high-precision LLM translator the crawler
 * uses (config.ai.* OpenAI-compatible endpoint).
 *
 * Reuses the exact prompt from modules/crawler/translator.ts so quality is
 * consistent with the rest of the pipeline.
 *
 * Usage (run with tsx from src/server):
 *   npx tsx translate_podcast.ts --limit=1
 *   npx tsx translate_podcast.ts --ids=<uuid>,<uuid>
 *   npx tsx translate_podcast.ts --force   (re-translate even if zh already set)
 */
import { PrismaClient } from '@prisma/client'
import { config } from './src/config/index.js'
import { callLlm } from './src/modules/ai-processing/llm.js'

const p = new PrismaClient()

const BATCH_SIZE = 8
const MAX_CONCURRENT = 3

interface Seg {
  en: string
  zh: string
  start?: number
  end?: number
}

async function translateBatch(enBatch: string[], retry = 0): Promise<string[]> {
  const numbered = enBatch.map((t, i) => `${i + 1}. ${t}`).join('\n')
  const systemPrompt =
    '你是专业英译中翻译，面向英语学习者。把下列英文逐句翻译成自然、准确的中文。' +
    '严格保持编号（如 "1. ..."），每行一句，不要额外解释或前后缀。' +
    '即使某些句子很短或是标点符号，也要为每个编号输出对应翻译。'
  const userPrompt = `${numbered}\n\n请只输出带编号的中文翻译，每行一条：`
  try {
    const res = await callLlm(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { signal: AbortSignal.timeout(120_000) },
    )
    const text = (res ?? '').trim()
    const lines = text
      .split('\n')
      .map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim())
      .filter((l) => l.length > 0)
    if (lines.length >= enBatch.length) {
      return lines.slice(0, enBatch.length)
    }
    // Fallback: pad with empty if LLM dropped some lines
    return lines.concat(enBatch.slice(lines.length).map(() => ''))
  } catch (e) {
    if (retry < 2) {
      await new Promise((r) => setTimeout(r, 1500))
      return translateBatch(enBatch, retry + 1)
    }
    throw e
  }
}

async function run(limit: number, ids: string, force: boolean) {
  let rows
  if (ids) {
    const idList = ids.split(',').map((s) => s.trim()).filter(Boolean)
    rows = await p.content.findMany({
      where: { id: { in: idList }, type: 'PODCAST' },
      select: { id: true, title: true, segments: true },
    })
  } else {
    const where: any = { type: 'PODCAST', segments: { not: undefined as any } }
    rows = await p.content.findMany({
      where,
      select: { id: true, title: true, segments: true },
      take: limit && limit > 0 ? limit : undefined,
    })
  }
  console.log(`podcasts to translate: ${rows.length}`)

  let ok = 0
  let fail = 0
  for (const row of rows) {
    const segs: Seg[] = Array.isArray(row.segments) ? (row.segments as Seg[]) : []
    if (!segs.length) {
      console.log(`  SKIP ${row.title} (no segments)`)
      continue
    }
    const needTranslate = force ? segs : segs.filter((s) => !s.zh || !s.zh.trim())
    if (!needTranslate.length) {
      console.log(`  SKIP ${row.title} (already translated)`)
      continue
    }
    console.log(`[translate] ${row.title} (${needTranslate.length} segs)`)
    try {
      // Translate in batches with bounded concurrency
      const batches: Seg[][] = []
      for (let i = 0; i < needTranslate.length; i += BATCH_SIZE) {
        batches.push(needTranslate.slice(i, i + BATCH_SIZE))
      }
      let b = 0
      const results: string[][] = new Array(batches.length)
      const workers = Array.from({ length: Math.min(MAX_CONCURRENT, batches.length) }, async () => {
        while (true) {
          const idx = b++
          if (idx >= batches.length) break
          const enBatch = batches[idx].map((s) => s.en)
          results[idx] = await translateBatch(enBatch)
        }
      })
      await Promise.all(workers)

      // Map translations back into the original segs array. `results` is ordered
      // exactly like `batches`, so flatten in the same order to get a flat list
      // aligned with `needTranslate`.
      const flat: string[] = []
      for (const r of results) if (r) flat.push(...r)
      let cursor = 0
      for (const s of segs) {
        if (force || !s.zh || !s.zh.trim()) {
          s.zh = flat[cursor] ?? ''
          cursor++
        }
      }
      const translation = segs.map((s) => s.zh || '').join('\n')
      await p.content.update({
        where: { id: row.id },
        data: { segments: segs as any, translation },
      })
      ok++
      console.log(`    OK translated ${segs.length} segs, ${translation.length} zh chars`)
    } catch (e: any) {
      fail++
      console.error(`    FAIL ${row.title}: ${e?.message ?? e}`)
    }
  }
  console.log(`\n=== DONE ok=${ok} fail=${fail} ===`)
}

const args = process.argv.slice(2)
const getArg = (name: string) => {
  const a = args.find((x) => x.startsWith(`--${name}=`))
  return a ? a.split('=')[1] : undefined
}
const limit = getArg('limit') ? parseInt(getArg('limit')!, 10) : 0
const ids = getArg('ids') ?? ''
const force = args.includes('--force')

run(limit, ids, force)
  .catch((e) => console.error('ERR', e))
  .finally(() => p.$disconnect())
