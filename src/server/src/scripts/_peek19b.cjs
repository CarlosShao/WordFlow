const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  for (const url of ['ielts:19:test:2:read:passage:1', 'ielts:19:test:2:read:passage:3']) {
    const r = await p.content.findFirst({ where: { sourceUrl: url }, select: { content: true } })
    const c = r.content || ''
    console.log('\n====', url, 'len', c.length, '====')
    console.log('全文:\n', c)
  }
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
