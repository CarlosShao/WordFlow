const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const p = new PrismaClient()
const j = JSON.parse(fs.readFileSync('d:/work/java/AI-workspace/WordFlow/src/scripts/diag/retake16_t2r3.json', 'utf8'))
;(async () => {
  const r = await p.content.findFirst({ where: { sourceUrl: 'ielts:16:test:2:read:passage:3' }, select: { id: true, content: true } })
  if (!r) { console.log('未找到记录'); await p.$disconnect(); return }
  console.log('旧长度', (r.content || '').length, '-> 新长度', j.content.length)
  await p.content.update({ where: { id: r.id }, data: { content: j.content } })
  console.log('✅ 剑16 T2 R3 已写库')
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
