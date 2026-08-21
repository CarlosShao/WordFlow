const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const rows = await p.content.findMany({
    where: { sourceUrl: { contains: 'read:passage' } },
    select: { sourceUrl: true, content: true },
  })
  let headGuide = 0, tailQuest = 0, ctrl = 0, isolPct = 0, youShould = 0, bracket = 0
  const tailSamples = []
  for (const r of rows) {
    const c = r.content || ''
    const paras = c.split('\n\n')
    const head = paras[0] || ''
    // 开头引导语
    if (/^\s*READING\s*PASSAGE\s*\d/i.test(head) || /^\s*Reading\s*Passage\s*\d+\s*(below|on the following)/i.test(head) || /^\s*You should spend about/i.test(head)) {
      headGuide++
    }
    // 结尾题目行：看最后 2 段是否以 Questions/READING PASSAGE 起首
    const tail = paras.slice(-2).join('\n')
    if (/Questions?\s*\d+\s*[-–]/i.test(tail) || /^\s*Questions?\s*\d/i.test(paras[paras.length - 1] || '') || /READING\s*PASSAGE\s*\d/i.test(tail)) {
      tailQuest++
      if (tailSamples.length < 15) tailSamples.push({ url: r.sourceUrl, tail: tail.slice(0, 120).replace(/\n/g, '⏎') })
    }
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(c)) ctrl++
    if (/(^|[^a-zA-Z0-9])%(\s|$)/.test(c)) isolPct++
    if (/You should spend about/i.test(c)) youShould++
    if (/\[[^\]\n]{0,40}\]/.test(c)) bracket++
  }
  console.log('开头引导语(READING PASSAGE/Reading Passage below/You should spend):', headGuide)
  console.log('结尾题目行(Questions N-/READING PASSAGE):', tailQuest)
  console.log('控制字符:', ctrl, ' 孤立%:', isolPct, ' You should spend(全局):', youShould, ' 方括号:', bracket)
  console.log('\n=== 结尾题目行抽样 ===')
  for (const s of tailSamples) console.log(`  ${s.url}\n     …${s.tail}`)
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
