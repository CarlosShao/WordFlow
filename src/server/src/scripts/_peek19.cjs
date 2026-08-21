const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const rows = await p.content.findMany({
    where: { sourceUrl: { contains: 'ielts:19' } },
    select: { sourceUrl: true, content: true },
  })
  for (const r of rows) {
    const c = r.content || ''
    const dirty = /Please (paste|upload)|only shared the image|Questions 1|Reading Passage \d+ (below|on the following)/i.test(c)
    if (dirty) {
      console.log('\n==== ', r.sourceUrl, ' len', c.length, ' ====')
      console.log(c.slice(0, 500).replace(/\n/g, '⏎'))
    }
  }
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
