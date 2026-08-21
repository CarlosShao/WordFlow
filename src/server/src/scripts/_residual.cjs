const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const rows = await p.content.findMany({
    where: { sourceUrl: { contains: 'read:passage' } },
    select: { sourceUrl: true, content: true },
  })
  // You should spend
  console.log('=== You should spend 残留 ===')
  for (const r of rows) {
    const m = (r.content || '').match(/You should spend about/gi)
    if (m) {
      const i = r.content.indexOf('You should spend about')
      console.log(`  ${r.sourceUrl} @${i}: …${r.content.slice(Math.max(0,i-40), i+60).replace(/\n/g,'⏎')}…`)
    }
  }
  // 方括号
  console.log('\n=== 方括号残留(含上下文) ===')
  let n=0
  for (const r of rows) {
    const re=/\[[^\]\n]{0,40}\]/g; let m; const hits=[]
    while ((m=re.exec(r.content||'')) && hits.length<3) hits.push(m[0])
    if (hits.length){ n++; if(n<=15) console.log(`  ${r.sourceUrl}: ${JSON.stringify(hits)}`) }
  }
  console.log('  方括号篇数', n)
  // 结尾题目行
  console.log('\n=== 结尾题目行残留 ===')
  for (const r of rows) {
    const paras = (r.content||'').split('\n\n')
    const tail = paras.slice(-2).join('\n')
    if (/Questions?\s*\d+\s*[-–]/i.test(tail) || /^\s*Questions?\s*\d/i.test(paras[paras.length-1]||'') || /READING\s*PASSAGE\s*\d/i.test(tail)) {
      console.log(`  ${r.sourceUrl}\n     …${tail.slice(0,100).replace(/\n/g,'⏎')}`)
    }
  }
  await p.$disconnect()
})().catch((e)=>{console.error(e);process.exit(1)})
