const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  // A 类含%数
  const a = await p.content.findMany({ where: { source: 'IELTS' }, select: { sourceUrl: true, content: true } })
  const aPct = a.filter((r) => r.content && r.content.includes('%')).length
  // 抽查剑4 R8 原文（A类文本层已被污染修复）
  const r8 = await p.content.findFirst({ where: { sourceUrl: 'ielts:4:test:2:read:passage:3' }, select: { content: true } })
  const hasR8 = r8 ? r8.content.includes('8%') : false
  const hasBadR8 = r8 ? /r8%/i.test(r8.content) : false
  // G 类含%数
  const g = await p.content.findMany({ where: { source: 'IELTS_G' }, select: { content: true } })
  const gPct = g.filter((r) => r.content && r.content.includes('%')).length
  console.log('A类总数:', a.length, '| 含%:', aPct)
  console.log('G类总数:', g.length, '| 含%:', gPct)
  console.log('剑4 R8(文本层): 含 8%=', hasR8, '| 残留 r8%=', hasBadR8)
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
