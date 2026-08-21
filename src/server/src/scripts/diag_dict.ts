/** diag: trace service.getWordDefinition('grandmother') */
import { getWordDefinition } from '../modules/dictionary/service.js'

async function main() {
  const t0 = Date.now()
  const r = await getWordDefinition('grandmother')
  console.log('elapsed:', Date.now() - t0, 'found:', !!r)
  if (r) console.log('word:', r.word, 'source:', r.source, 'synonyms:', r.synonyms.length)
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })