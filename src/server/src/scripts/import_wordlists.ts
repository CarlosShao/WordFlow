/**
 * One-off: run buildWordPool to fold IELTS/TOEFL word lists (and related-word
 * expansion) into dictionary_entries, then print pool status.
 *
 * Usage: docker exec wordflow-api npx tsx src/scripts/import_wordlists.ts
 */
import { buildWordPool } from '../modules/dictionary/wordPool.js'
import { getDictionaryProgress } from '../modules/dictionary/crawler.js'

async function main() {
  const { added, total } = await buildWordPool()
  const progress = await getDictionaryProgress()
  console.log(JSON.stringify({ added, total, progress }, null, 2))
  process.exit(0)
}

main().catch((err) => {
  console.error('import failed:', err)
  process.exit(1)
})
