const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const rows = await p.content.findMany({ where: { sourceUrl: { contains: 'ielts:4:' } }, select: { sourceUrl: true, content: true } })
  for (const r of rows) {
    if (r.content && /8%|r8/i.test(r.content)) {
      const c = r.content
      let idx = c.indexOf('8%'); if (idx < 0) idx = c.indexOf('r8')
      console.log(r.sourceUrl, '::', JSON.stringify(c.slice(Math.max(0, idx - 50), idx + 50)))
    }
  }
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
