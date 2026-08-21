const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const rows = await p.content.findMany({
    where: { sourceUrl: { contains: 'read:passage' } },
    select: { sourceUrl: true, content: true },
  })
  const hallu = [
    /I cannot fulfill/i,
    /no article body text/i,
    /Speaking test format/i,
    /you (only )?(shared|provided) (the|an) (image|question page)/i,
    /please (paste|upload|provide)/i,
  ]
  let n = 0
  for (const r of rows) {
    const c = r.content || ''
    for (const re of hallu) {
      const m = c.match(re)
      if (m) {
        n++
        const i = m.index
        console.log(`[幻觉] ${r.sourceUrl} : ${m[0]} @${i}\n    …${c.slice(Math.max(0,i-50), i+80).replace(/\n/g,'⏎')}…`)
        break
      }
    }
  }
  console.log('\n总幻觉命中', n)
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
