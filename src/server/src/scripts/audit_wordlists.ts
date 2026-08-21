/**
 * One-off audit: check IELTS/TOEFL word coverage across all priorities.
 * Usage: docker exec wordflow-api npx tsx src/scripts/audit_wordlists.ts
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { getPrisma } from '../common/prisma.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'modules', 'dictionary', 'data')

function loadWords(file: string): Set<string> {
  const set = new Set<string>()
  for (const line of readFileSync(join(DATA_DIR, file), 'utf8').split('\n')) {
    const w = line.trim().toLowerCase()
    if (w) set.add(w)
  }
  return set
}

async function main() {
  const prisma = getPrisma()
  const ielts = loadWords('ielts-words.txt')
  const toefl = loadWords('toefl-words.txt')

  const allRows = await prisma.dictionaryEntry.findMany({ select: { word: true, priority: true, status: true } })
  const byWord = new Map<string, { priority: number; status: string }>()
  for (const r of allRows) byWord.set(r.word, { priority: r.priority, status: r.status })

  // Where are IELTS/TOEFL words sitting?
  const count = (set: Set<string>) => {
    const out: Record<string, number> = {}
    for (const w of set) {
      const row = byWord.get(w)
      const key = row ? `priority_${row.priority}` : 'MISSING'
      out[key] = (out[key] ?? 0) + 1
    }
    return out
  }

  console.log('IELTS words:', ielts.size, count(ielts))
  console.log('TOEFL words:', toefl.size, count(toefl))
  console.log('IELTS+TOEFL union:', new Set([...ielts, ...toefl]).size)
  process.exit(0)
}

main().catch((err) => {
  console.error('audit failed:', err)
  process.exit(1)
})
