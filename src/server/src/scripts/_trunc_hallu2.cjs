const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
const DRY = process.argv.includes('--dry')

const HALLU = [
  /I cannot fulfill/i,
  /no article body text/i,
  /Speaking test format/i,
  /you (only )?(shared|provided) (the|an) (image|question page)/i,
  /please (paste|upload|provide)/i,
  /This image does not contain/i,
  /This is not a reading passage/i,
  /I(?:'|’)?m sorry, but I can(?:'|’)t assist/i,
  /I don(?:'|’)t see (any )?article text/i,
  /I don(?:'|’)t see the article body/i,
  /I only see the test questions/i,
  /only see the test questions/i,
  /there is no (passage|article) text/i,
  /no (passage|article) text to extract/i,
]
;(async () => {
  const rows = await p.content.findMany({
    where: { sourceUrl: { contains: 'read:passage' } },
    select: { id: true, sourceUrl: true, content: true },
  })
  let n = 0
  for (const r of rows) {
    const c = r.content || ''
    let cut = -1
    for (const re of HALLU) {
      const m = c.match(re)
      if (m && (cut === -1 || m.index < cut)) cut = m.index
    }
    if (cut > -1) {
      n++
      let body = c.slice(0, cut).replace(/\s+$/, '')
      const lb = body.lastIndexOf('\n\n')
      if (lb > body.length * 0.5) body = body.slice(0, lb)
      const short = body.length < 3500
      if (!DRY) await p.content.update({ where: { id: r.id }, data: { content: body } })
      console.log(`[${DRY ? 'DRY' : 'FIX'}] ${r.sourceUrl} ${c.length}->${body.length} ${short ? '<<短需重提' : ''}`)
    }
  }
  console.log(`\n${DRY ? '将' : '已'}截断 ${n} 条`)
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
