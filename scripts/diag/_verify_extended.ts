import { lookupYoudao } from '/app/src/modules/dictionary/youdao.js'

async function main() {
  const word = process.argv[2] || 'hello'
  const entry = await lookupYoudao(word)
  if (!entry) {
    console.log('NOT_FOUND')
    return
  }
  console.log('WORD:', entry.word)
  console.log('PHRASES COUNT:', entry.phrases?.length)
  if (entry.phrases?.length) {
    console.log('PHRASES[0..2]:', JSON.stringify(entry.phrases.slice(0, 3), null, 2))
  }
  console.log('EXTENDED KEYS:', entry.extended ? Object.keys(entry.extended) : 'none')
  console.log('UNAVAILABLE:', entry.extended?.unavailable)
  if (entry.extended?.collins) {
    console.log('COLLINS star:', entry.extended.collins.star, 'entries:', entry.extended.collins.entries.length)
  }
  if (entry.extended?.encyclopedia) {
    console.log('ENCYCLOPEDIA:', entry.extended.encyclopedia.summary.slice(0, 120))
  }
  if (entry.extended?.etymology) {
    console.log('ETYMOLOGY:', entry.extended.etymology.slice(0, 120))
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
