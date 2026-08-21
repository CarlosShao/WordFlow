const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const rows = await p.content.findMany({ where: { sourceUrl: { contains: 'read:passage' } }, select: { sourceUrl: true, content: true } })
  let n = 0
  for (const r of rows) {
    const c = r.content || ''
    if (/r8/i.test(c)) {
      n++
      const i = c.indexOf('r8')
      console.log(r.sourceUrl, '=>', JSON.stringify(c.slice(Math.max(0, i - 100), i + 100)))
    }
  }
  console.log('含 r8 总数:', n)
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
