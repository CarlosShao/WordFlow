const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const rows = await p.content.findMany({
    where: { sourceUrl: { contains: 'read:passage' } },
    select: { sourceUrl: true, content: true },
  })
  console.log('总阅读 passage 记录', rows.length)

  // 脏数据模式
  const patterns = {
    'r8%/类乱码': /r\d+%/,
    '孤立%符号': /%\s/,
    '控制字符': /[\x00-\x08\x0b\x0c\x0e-\x1f]/,
    'HTML实体残留': /&[a-z]+;/,
    '方括号残留[]': /\[[^\]\n]{0,40}\]/,
    '题目行 Questions': /Questions?\s*\d/,
    'You should spend': /You should spend about/,
    'READING PASSAGE标题残留': /READING\s*PASSAGE\s*\d/i,
    '连续空格>3': / {4,}/,
    '换行异常\\r': /\r/,
    '列表标记A-E选项': /\b[ABCDE]\.\s|\([A-E]\)/,
  }
  const report = {}
  const dirtySamples = []
  for (const r of rows) {
    const c = r.content || ''
    for (const [name, re] of Object.entries(patterns)) {
      if (re.test(c)) {
        report[name] = (report[name] || 0) + 1
        if (dirtySamples.length < 40 && (name === 'r8%/类乱码' || name === '控制字符' || name === 'READING PASSAGE标题残留' || name === '题目行 Questions')) {
          const m = c.match(re)
          dirtySamples.push({ url: r.sourceUrl, name, hit: m ? m[0] : '', ctx: c.slice(Math.max(0, (m ? m.index : 0) - 30), (m ? m.index : 0) + 40).replace(/\n/g, '⏎') })
        }
      }
    }
  }
  console.log('\n=== 各类脏数据命中条数 ===')
  for (const [k, v] of Object.entries(report)) console.log(`  ${k}: ${v}`)
  console.log('\n=== 抽样脏数据上下文 ===')
  for (const s of dirtySamples) console.log(`  [${s.name}] ${s.url}\n     …${s.ctx}…  (命中:${JSON.stringify(s.hit)})`)
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
