const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
const DRY = process.argv.includes('--dry')

function clean(text, url) {
  let t = text
  // B. 方括号乱码：仅删含明显乱码符号（@ ~ ) ! # $ % ^ & * = + < > ? | 或连续数字）的方括号
  // 保留 legit 词汇标注：[sprinter] [in mathematics] [Palm oil production] [robo-umpires] [Silbo Gomero] [the gifted] [P] [and] [or] […]
  t = t.replace(/\[[^\]\n]*(?:[@~)\!#$%^&*=+<>?|]|\d{2,})[^\]\n]*\]/g, '')
  // C. 剑20 T2 R3 写作引导语（阅读正文里混入的写作任务提示，可能 task1/task2 都有）
  if (/ielts:20:test:2:read:passage:3/.test(url)) {
    t = t.replace(/\*\*Test2[-–]writting-task\d\*\*\s*/gi, '')
    t = t.replace(/\*\*Test2[-–]writing-task\d\*\*\s*/gi, '')
    t = t.replace(/You should spend about \d+ minutes on this task\.\s*(Write about[^\n]*\n{0,2})?/gi, '')
  }
  return t
}

;(async () => {
  const rows = await p.content.findMany({
    where: { sourceUrl: { contains: 'read:passage' } },
    select: { id: true, sourceUrl: true, content: true },
  })
  let n = 0
  for (const r of rows) {
    const before = r.content || ''
    const after = clean(before, r.sourceUrl)
    if (after !== before) {
      n++
      if (!DRY) await p.content.update({ where: { id: r.id }, data: { content: after } })
      console.log(`[${DRY ? 'DRY' : 'FIX'}] ${r.sourceUrl} ${before.length}->${after.length}`)
    }
  }
  console.log(`\n${DRY ? '将' : '已'}清洗 ${n} 条`)
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
