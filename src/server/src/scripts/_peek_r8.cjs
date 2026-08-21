const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const rows = await p.content.findMany({
    where: { sourceUrl: { contains: 'read:passage' }, content: { contains: 'R8' } },
    select: { source: true, sourceUrl: true, content: true },
  })
  console.log('含 R8 的阅读记录数:', rows.length)
  for (const r of rows) {
    const c = r.content || ''
    const idx = c.indexOf('R8')
    const ctx = c.slice(Math.max(0, idx - 120), idx + 120).replace(/\n/g, '⏎')
    console.log('\n=== source:', r.source, '| url:', r.sourceUrl)
    console.log('上下文:', ctx)
  }
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
