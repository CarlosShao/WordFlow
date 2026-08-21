/**
 * One-off: parse raw IELTS/TOEFL/COCA word lists into clean per-line word
 * files for the word pool.
 *   - data/ielts-words.txt  (雅思, from 新东方词根联想)
 *   - data/toefl-words.txt  (托福)
 *   - data/coca-words.txt   (COCA 20000 高频词)
 *
 * Usage: docker exec wordflow-api npx tsx src/scripts/build_wordlists.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'modules', 'dictionary', 'data')

/** Extract bare word tokens: lowercase, a-z, allow hyphen/apostrophe inside. */
function extractWordTokens(raw: string): Set<string> {
  const out = new Set<string>()
  const re = /[a-z]+(?:['-][a-z]+)*/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    const w = m[0].toLowerCase()
    if (w.length < 2 || w.length > 30) continue
    if (/^[a-z]+(?:['-][a-z]+)*$/.test(w)) out.add(w)
  }
  return out
}

/** Filter out obviously non-dictionary noise (names, brand terms, etc.). */
const NOISE_PATTERN =
  /^(?:[bcdfghjklmnpqrstvwxz]{6,}|[aeiouy]{5,}|[a-z]{1}|.*\d.*)$/

function isCleanWord(w: string): boolean {
  if (NOISE_PATTERN.test(w)) return false
  // Require at least one vowel (a real pronounceable word)
  if (!/[aeiouy]/.test(w)) return false
  return true
}

function parseIelts(raw: string): Set<string> {
  // Body starts after "Word List 01" (README blocks above). Each line:
  //   word* /phon/ pos. definition
  const out = new Set<string>()
  const start = raw.indexOf('Word List 01')
  if (start < 0) return out
  const body = raw.slice(start)
  for (const line of body.split('\n')) {
    const m = line.trim().match(/^([a-z]+(?:['-][a-z]+)*)\s*(?:\*)?\s*[\/\[{]/i)
    if (m) {
      const w = m[1].toLowerCase()
      if (isCleanWord(w)) out.add(w)
    }
  }
  return out
}

function parseToefl(raw: string): Set<string> {
  // Each line: word  [phon]  definition
  const out = new Set<string>()
  for (const line of raw.split('\n')) {
    const m = line.trim().match(/^([a-z]+(?:['-][a-z]+)*)\s+[\[(]/i)
    if (m) {
      const w = m[1].toLowerCase()
      if (isCleanWord(w)) out.add(w)
    }
  }
  return out
}

function parseCoca(raw: string): Set<string> {
  // Each line: "rank word" (may repeat, may include noise like "n''t")
  const out = new Set<string>()
  for (const line of raw.split('\n')) {
    const m = line.trim().match(/^\d+\s+([a-z]+(?:['-][a-z]+)*)$/i)
    if (m) {
      const w = m[1].toLowerCase()
      if (isCleanWord(w)) out.add(w)
    }
  }
  return out
}

function main() {
  const ieltsRaw = readFileSync(join(DATA_DIR, 'ielts-wordlist.txt'), 'utf8')
  const toeflRaw = readFileSync(join(DATA_DIR, 'toefl-wordlist.txt'), 'utf8')
  const cocaRaw = readFileSync(join(DATA_DIR, 'coca-20000.txt'), 'utf8')

  const ielts = parseIelts(ieltsRaw)
  const toefl = parseToefl(toeflRaw)
  const coca = parseCoca(cocaRaw)

  writeFileSync(join(DATA_DIR, 'ielts-words.txt'), [...ielts].sort().join('\n') + '\n', 'utf8')
  writeFileSync(join(DATA_DIR, 'toefl-words.txt'), [...toefl].sort().join('\n') + '\n', 'utf8')
  writeFileSync(join(DATA_DIR, 'coca-words.txt'), [...coca].sort().join('\n') + '\n', 'utf8')

  console.log(
    JSON.stringify(
      {
        ielts: ielts.size,
        toefl: toefl.size,
        coca: coca.size,
        ieltsToeflUnion: new Set([...ielts, ...toefl]).size,
        allUnion: new Set([...ielts, ...toefl, ...coca]).size,
      },
      null,
      2,
    ),
  )
}

main()
