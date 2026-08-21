// 修正 A 类剑4 T2 R2 残留 'r 8%' (r 后空格) -> '8%'
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const r = await p.content.findFirst({ where: { sourceUrl: 'ielts:4:test:2:read:passage:2' }, select: { id: true, content: true } })
  if (!r) { console.log('未找到'); await p.$disconnect(); return }
  if (!/r\s*8%\s*of patients/i.test(r.content)) { console.log('未匹配 r 8%:'); console.log(JSON.stringify(r.content.slice(0, 200))); await p.$disconnect(); return }
  const newc = r.content.replace(/r\s*8%\s*of patients/i, '8% of patients')
  await p.content.update({ where: { id: r.id }, data: { content: newc } })
  console.log('已修正 r 8% -> 8% (ielts:4:test:2:read:passage:2)')
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
