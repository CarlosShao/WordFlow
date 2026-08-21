const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const urls = [
    'ielts:19:test:3:read:passage:2',
    'ielts:19:test:4:read:passage:2',
    'ielts:20:test:2:read:passage:1',
    'ielts:20:test:3:read:passage:2',
    'ielts:20:test:4:read:passage:3',
  ]
  for (const u of urls) {
    const r = await p.content.findFirst({ where: { sourceUrl: u }, select: { sourceUrl: true, content: true } })
    const c = r.content
    const needles = ['87 of', '70 of', '15 of', '90 of', '20 of']
    let idx = -1
    for (const nd of needles) { const i = c.indexOf(nd); if (i >= 0) { idx = i; break } }
    console.log('=== ' + u + ' ===')
    console.log(c.slice(Math.max(0, idx - 70), idx + 70).replace(/\n/g, ' '))
  }
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
