const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const all = await p.content.findMany({
    where: { sourceUrl: { contains: 'read:passage' } },
    select: { sourceUrl: true, content: true },
  })
  const remains = all.filter((r) => /摘要还原|未收录该阅读全文|暂无原文收录/.test(r.content || ''))
  console.log('阅读 passage 总记录', all.length)
  console.log('仍含"摘要还原"标识', remains.length)
  remains.slice(0, 10).forEach((r) => console.log('  ', r.sourceUrl))
  await p.$disconnect()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
