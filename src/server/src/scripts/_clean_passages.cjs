// 安全清洗：开头引导语、控制字符、孤立%、You should spend 引导、方括号脚注残留
// 注意：不动正文内 legit 词组（如引用里的 "Questions 1-7"）
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
const DRY = process.argv.includes('--dry')

function clean(text) {
  let t = text
  // 1. 去除控制字符
  t = t.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
  // 2. 开头引导语行（仅首段/前几段）：READING PASSAGE N / Reading Passage N below / You should spend about
  let paras = t.split('\n\n')
  while (paras.length && /^\s*READING\s*PASSAGE\s*\d/i.test(paras[0])) paras.shift()
  while (paras.length && /^\s*Reading\s*Passage\s*\d+\s*(below|on the following)/i.test(paras[0])) paras.shift()
  while (paras.length && /^\s*You should spend about/i.test(paras[0])) paras.shift()
  t = paras.join('\n\n')
  // 3. 孤立 %（前后非字母数字，且非正常百分比如 "50%" 但 "r8%" 是乱码）——删掉孤立 % 及其前导乱码片段
  t = t.replace(/[^\sa-zA-Z0-9]\s*%/g, (m) => m.replace(/%/, '')).replace(/%\s/g, ' ')
  // 4. 方括号残留：仅清形如 [14] [A] 的孤立标号（脚注/题号），不清正文内 legit 方括号（如 [sic] 少见，保守只清纯数字/单字母）
  t = t.replace(/\[(?:[0-9]+|[A-H])\]\s*/g, '')
  return t
}

;(async () => {
  const rows = await p.content.findMany({
    where: { sourceUrl: { contains: 'read:passage' } },
    select: { id: true, sourceUrl: true, content: true },
  })
  let changed = 0
  for (const r of rows) {
    const before = r.content || ''
    const after = clean(before)
    if (after !== before) {
      changed++
      if (!DRY) {
        await p.content.update({ where: { id: r.id }, data: { content: after } })
      }
      console.log(`[${DRY ? 'DRY' : 'FIX'}] ${r.sourceUrl} ${before.length}->${after.length}`)
    }
  }
  console.log(`\n${DRY ? '将' : '已'}清洗 ${changed} 条`)
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
