const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
const HALLU = [
  /I cannot fulfill/i, /no article body text/i, /Speaking test format/i,
  /you (only )?(shared|provided) (the|an) (image|question page)/i, /please (paste|upload|provide)/i,
  /This image does not contain/i, /This is not a reading passage/i,
  /I(?:'|’)?m sorry, but I can(?:'|’)t assist/i, /I don(?:'|’)t see (any )?article text/i,
  /I don(?:'|’)t see the article body/i, /I only see the test questions/i, /only see the test questions/i,
  /there is no (passage|article) text/i, /no (passage|article) text to extract/i,
]
;(async () => {
  const rows = await p.content.findMany({ where: { sourceUrl: { contains: 'read:passage' } }, select: { sourceUrl: true, content: true } })
  let hallu = 0, head = 0, ctrl = 0, isolpct = 0, garbracket = 0, writeguide = 0, tailq = 0
  const garbr = []
  for (const r of rows) {
    const c = r.content || ''
    if (HALLU.some((re) => re.test(c))) hallu++
    const paras = c.split('\n\n')
    if (/^\s*READING\s*PASSAGE\s*\d/i.test(paras[0]) || /^\s*Reading\s*Passage\s*\d+\s*(below|on the following)/i.test(paras[0]) || /^\s*You should spend about/i.test(paras[0])) head++
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(c)) ctrl++
    if (/(^|[^a-zA-Z0-9])%(\s|$)/.test(c)) isolpct++
    const gb = c.match(/\[[^\]\n]*(?:[@~)\!#$%^&*=+<>?|]|\d{2,})[^\]\n]*\]/g)
    if (gb) { garbracket += gb.length; garbr.push(r.sourceUrl + ':' + JSON.stringify(gb)) }
    if (/\*\*Test\d[-–]writ\w*-task\d\*\*/i.test(c) || /You should spend about \d+ minutes on this task/i.test(c)) writeguide++
    const tail = paras.slice(-2).join('\n')
    if (/Questions?\s*\d+\s*[-–]/i.test(tail) || /^\s*Questions?\s*\d/i.test(paras[paras.length - 1] || '')) tailq++
  }
  console.log('总阅读记录', rows.length)
  console.log('幻觉拒答残留:', hallu)
  console.log('开头引导语残留:', head)
  console.log('控制字符:', ctrl)
  console.log('孤立%乱码:', isolpct)
  console.log('方括号乱码:', garbracket, garbr.length ? garbr.slice(0, 5) : '')
  console.log('写作引导语残留:', writeguide)
  console.log('结尾题目行(疑似):', tailq, '(注: 可能含 legit 正文引用)')
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
