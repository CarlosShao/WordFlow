/**
 * One-off fix: repair priority values after a botched migration.
 *
 * Correct scheme:
 *   PRIORITY_IELTS  = 5
 *   PRIORITY_TOEFL  = 6
 *   PRIORITY_VOCAB  = 20
 *   PRIORITY_CONTENT = 30
 *   PRIORITY_WORDLIST = 40
 *
 * Usage: docker exec wordflow-api npx tsx src/scripts/fix_priorities.ts
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { getPrisma } from '../common/prisma.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'modules', 'dictionary', 'data')

function loadWords(file: string): Set<string> {
  const set = new Set<string>()
  try {
    for (const line of readFileSync(join(DATA_DIR, file), 'utf8').split('\n')) {
      const w = line.trim().toLowerCase()
      if (w) set.add(w)
    }
  } catch (err) {
    console.error('failed to load', file, err)
  }
  return set
}

async function main() {
  const prisma = getPrisma()
  const ielts = loadWords('ielts-words.txt')
  const toefl = loadWords('toefl-words.txt')

  // Words currently at priority 5 (mixed content + ielts after bad migration)
  const rows = await prisma.dictionaryEntry.findMany({ where: { priority: 5 }, select: { id: true, word: true } })
  console.log('rows at priority 5:', rows.length)

  let ieltsCount = 0
  let toeflCount = 0
  let contentCount = 0
  const batchSize = 1000

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize)
    for (const row of chunk) {
      if (ielts.has(row.word)) {
        await prisma.dictionaryEntry.update({ where: { id: row.id }, data: { priority: 5 } })
        ieltsCount++
      } else if (toefl.has(row.word)) {
        await prisma.dictionaryEntry.update({ where: { id: row.id }, data: { priority: 6 } })
        toeflCount++
      } else {
        await prisma.dictionaryEntry.update({ where: { id: row.id }, data: { priority: 30 } })
        contentCount++
      }
    }
  }

  console.log(JSON.stringify({ ielts: ieltsCount, toefl: toeflCount, content: contentCount }, null, 2))
  process.exit(0)
}

main().catch((err) => {
  console.error('fix failed:', err)
  process.exit(1)
})
