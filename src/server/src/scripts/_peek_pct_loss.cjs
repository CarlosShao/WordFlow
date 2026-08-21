const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
// 找"孤立%清洗"可能误杀的 legit 百分比：上下文是 数字 + 空格 + of/the/a + 名词，且数字前应是 X%
;(async () => {
  const rows = await p.content.findMany({ where: { sourceUrl: { contains: 'read:passage' } }, select: { sourceUrl: true, content: true } })
  const pat = /\b(\d{1,3})\s+(of|the|a|were|are|is|to|in|from|by)\b/g
  let hits = 0
  for (const r of rows) {
    const c = r.content || ''
    let m
    while ((m = pat.exec(c))) {
      // 数字后紧跟 of/the... 且这个数字在原文里很可能是 X% 被删%
      const before = c.slice(Math.max(0, m.index - 30), m.index)
      // 仅报那些看起来像百分比被吞的：数字较小且后面是 of
      if (m[2] === 'of' && parseInt(m[1]) <= 100) {
        hits++
        if (hits <= 30) console.log(r.sourceUrl, '=>', JSON.stringify(before + '[' + m[1] + '] ' + m[2] + ' ' + c.slice(m.index + m[0].length, m.index + m[0].length + 50)))
      }
    }
  }
  console.log('可疑(数字+of, <=100)总数:', hits)
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
