const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const rows = await p.content.findMany({
    where: { sourceUrl: { contains: 'ielts:20' } },
    select: { source: true, sourceUrl: true, content: true },
  })
  console.log('剑20 DB 记录数', rows.length)
  rows.slice(0, 4).forEach((r) =>
    console.log(JSON.stringify({ source: r.source, url: r.sourceUrl, clen: (r.content || '').length, preview: (r.content || '').slice(0, 40) }))
  )
  await p.$disconnect()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
