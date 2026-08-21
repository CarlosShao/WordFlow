const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
// 1) 库里含 % 的阅读记录数（看%是否大量消失）
// 2) 找 "数字 紧邻 of/the" 且数字<=100 的可疑缺%处（legit百分比被删%）
// 3) 找 r8 这种 OCR 错字残留
;(async () => {
  const rows = await p.content.findMany({ where: { sourceUrl: { contains: 'read:passage' } }, select: { sourceUrl: true, content: true } })
  let withPct = 0
  const suspicious = []
  const ocrErr = []
  for (const r of rows) {
    const c = r.content || ''
    if (c.includes('%')) withPct++
    // 数字+空格+of/the (数字<=100)，且前面不是 % -> 可能%被删
    const re = /\b(\d{1,3})\s+(of|the|were|are|is|to|from|by|more|less)\b/g
    let m
    while ((m = re.exec(c))) {
      if (m[2] === 'of' && parseInt(m[1]) <= 100) {
        const pre = c.slice(Math.max(0, m.index - 2), m.index)
        if (!pre.includes('%')) suspicious.push(r.sourceUrl + ' :: ' + JSON.stringify(c.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40)))
      }
    }
    if (/r8/i.test(c)) ocrErr.push(r.sourceUrl + ' :: ' + JSON.stringify(c.slice(Math.max(0, c.indexOf('r8') - 40), c.indexOf('r8') + 50)))
  }
  console.log('阅读记录总数:', rows.length, '| 含%记录数:', withPct)
  console.log('\n=== 可疑缺%(数字+of,<=100) 共', suspicious.length, '条 ===')
  suspicious.slice(0, 40).forEach((s) => console.log(s))
  console.log('\n=== r8 OCR错字残留 共', ocrErr.length, '条 ===')
  ocrErr.forEach((s) => console.log(s))
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
