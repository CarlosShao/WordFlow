/**
 * Backfill missing Chinese translations in content.segments.
 *
 * Root cause of the gaps: Bilibili EN/ZH subtitle tracks are paired by time
 * overlap (backfill_bilibili_segments.ts), so any EN cue with no overlapping
 * ZH cue keeps zh='' forever — typical for short interjections ("Yeah.",
 * "Okay.") that sit between ZH cue boundaries. AI translation batches that
 * returned fewer lines than requested also left holes. As of 2026-08-16 the
 * DB has ~1.7k such cues across 164 contents.
 *
 * This script reuses the crawler's translateSegments() (batched LLM
 * translation with retries) to fill only the empty-zh cues, then rebuilds
 * the `translation` column. Safe to re-run: it only touches empty zh.
 *
 * Usage (inside the api container):
 *   npx tsx backfill_missing_zh.ts --dry-run          # list affected rows
 *   npx tsx backfill_missing_zh.ts --limit=5          # first 5 contents
 *   npx tsx backfill_missing_zh.ts                    # everything
 */
import { getPrisma } from './src/common/prisma.js'
import { logger } from './src/common/logger.js'
import { translateSegments } from './src/modules/crawler/translator.js'
import type { CleanSegment } from './src/modules/crawler/cleaner.js'

function countEmptyZh(segments: unknown): number {
  const segs = Array.isArray(segments) ? (segments as Array<{ en?: string; zh?: string }>) : []
  return segs.filter((s) => (s?.en || '').trim() !== '' && !(s?.zh || '').trim()).length
}

async function main() {
  const prisma = getPrisma()
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || 0)
  const onlyId = args.find((a) => a.startsWith('--id='))?.split('=')[1]

  const rows = await prisma.content.findMany({
    where: {
      ...(onlyId ? { id: onlyId } : {}),
      segments: { not: null },
    },
    select: { id: true, title: true, segments: true },
    orderBy: { updatedAt: 'asc' },
  })

  const pending = rows.filter((r) => countEmptyZh(r.segments) > 0)
  const todo = limit > 0 ? pending.slice(0, limit) : pending
  const totalCues = todo.reduce((a, r) => a + countEmptyZh(r.segments), 0)

  logger.info(
    { contents: pending.length, willProcess: todo.length, cuesToTranslate: totalCues, dryRun },
    'backfill_missing_zh: plan',
  )
  if (dryRun) {
    for (const r of pending.slice(0, 30)) {
      logger.info({ id: r.id, title: r.title, emptyZh: countEmptyZh(r.segments) }, 'backfill_missing_zh: pending row')
    }
    await prisma.$disconnect()
    return
  }

  let ok = 0
  let fail = 0
  for (let i = 0; i < todo.length; i++) {
    const r = todo[i]
    try {
      const segments = r.segments as unknown as CleanSegment[]
      const before = countEmptyZh(segments)
      await translateSegments(segments)
      const after = countEmptyZh(segments)
      if (after >= before) {
        logger.warn({ id: r.id, title: r.title, before, after }, 'backfill_missing_zh: no progress, skipping write')
        fail++
        continue
      }
      // Rebuild the flat translation column from the now-complete cues.
      const translation = segments.map((s) => s.zh ?? '').filter((z) => z.trim() !== '').join('\n')
      await prisma.content.update({
        where: { id: r.id },
        data: { segments: segments as never, ...(translation ? { translation } : {}) },
      })
      ok++
      logger.info(
        { progress: `${i + 1}/${todo.length}`, id: r.id, title: r.title, filled: before - after, stillMissing: after },
        'backfill_missing_zh: updated',
      )
    } catch (e: unknown) {
      logger.error({ id: r.id, err: (e as Error)?.message }, 'backfill_missing_zh: failed')
      fail++
    }
  }

  logger.info({ ok, fail }, 'backfill_missing_zh: done')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
