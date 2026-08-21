// 精确补%：仅针对已人工核实的扫描件册(V<LM漏%)真百分比，按精确短语替换，杜绝假阳性
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

// [sourceUrl, 精确待替换短语, 替换后]
const FIXES = [
  ['ielts:19:test:3:read:passage:2', 'up to 87 of the world', 'up to 87% of the world'],
  ['ielts:19:test:4:read:passage:2', '70 of the planet', '70% of the planet'],
  ['ielts:20:test:2:read:passage:1', '15 of their weight', '15% of their weight'],
  ['ielts:20:test:3:read:passage:2', 'more than 90 of reefs', 'more than 90% of reefs'],
  ['ielts:20:test:4:read:passage:3', '20 of the world', '20% of the world'],
]

;(async () => {
  let updated = 0, skipped = 0
  for (const [url, from, to] of FIXES) {
    const r = await p.content.findFirst({ where: { sourceUrl: url }, select: { id: true, content: true } })
    if (!r) { console.log('未找到:', url); skipped++; continue }
    if (!r.content.includes(from)) {
      console.log('未匹配(可能已修或文本异动):', url, '::', JSON.stringify(from))
      skipped++; continue
    }
    const newc = r.content.replace(from, to)
    if (newc === r.content) { skipped++; continue }
    await p.content.update({ where: { id: r.id }, data: { content: newc } })
    updated++
    console.log('已补%:', url, '::', JSON.stringify(from), '->', JSON.stringify(to))
  }
  console.log('\n完成: 更新 ' + updated + ' 条, 跳过 ' + skipped + ' 条')
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
