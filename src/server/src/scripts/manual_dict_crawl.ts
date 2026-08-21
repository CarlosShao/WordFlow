/**
 * Manual one-off dictionary crawl — temporarily raises the daily limit to crawl
 * a larger batch by hand. Not part of the scheduler.
 * Usage: docker exec wordflow-api npx tsx src/scripts/manual_dict_crawl.ts
 */
import { crawlDictionaryBatch } from '../modules/dictionary/crawler.js'
import { getDictionaryProgress } from '../modules/dictionary/crawler.js'

async function main() {
  const limit = Number(process.env.CRAWL_LIMIT ?? 5000)
  const delayMs = Number(process.env.CRAWL_DELAY_MS ?? 1200)
  const batchSize = Number(process.env.CRAWL_BATCH_SIZE ?? 50)
  const batchRestMs = Number(process.env.CRAWL_BATCH_REST_MS ?? 30000)

  console.log(`manual crawl start: limit=${limit} delayMs=${delayMs} batchSize=${batchSize}`)
  const before = await getDictionaryProgress()
  console.log('before:', JSON.stringify(before))

  const result = await crawlDictionaryBatch({ limit, delayMs, batchSize, batchRestMs })
  console.log('result:', JSON.stringify(result))

  const after = await getDictionaryProgress()
  console.log('after:', JSON.stringify(after))
  process.exit(0)
}

main().catch((err) => {
  console.error('manual crawl failed:', err)
  process.exit(1)
})
