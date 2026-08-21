const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

const PCT_NOUN = ['the', 'their', 'this', 'these', 'our', 'world', 'planet', 'population',
  'children', 'pupils', 'patients', 'GDP', 'weight', 'reefs', 'gas', 'wetlands', 'vessels',
  'cotton', 'health', 'market', 'output', 'emissions', 'staff', 'students', 'food', 'area',
  'total', 'water', 'land', 'time', 'cost', 'sales', 'users', 'homes', 'families', 'jobs',
  'species', 'research', 'crop', 'crops', 'energy', 'resources', 'respondents', 'adults',
  'women', 'men', 'households', 'visitors', 'participants']

function fixOcr(t) {
  t = t.replace(/\br(\d+)%/g, '$1%')
  t = t.replace(/\br\s*(\d+)\s+of\b/gi, '$1% of')
  return t
}

function addPct(t) {
  const re = new RegExp('\\b(\\d+(?:\\.\\d+)?)\\s+of\\s+(' + PCT_NOUN.join('|') + ')\\b', 'gi')
  return t.replace(re, (m, num, noun) => num + '% of ' + noun)
}

function diffSnippets(before, after) {
  // 找变化附近的片段
  const out = []
  const re = /\d+(?:\.\d+)?%?\s+of\s+\w+/g
  let m
  const seen = new Set()
  while ((m = re.exec(after))) {
    const s = m[0]
    if (seen.has(s)) continue
    seen.add(s)
    const idx = after.indexOf(s)
    out.push(after.slice(Math.max(0, idx - 25), idx + s.length + 25).replace(/\n/g, ' '))
  }
  return out
}

;(async () => {
  const rows = await p.content.findMany({ where: { sourceUrl: { contains: 'read:passage' } }, select: { id: true, source: true, sourceUrl: true, content: true } })
  const changes = []
  for (const r of rows) {
    const before = r.content || ''
    let after = addPct(fixOcr(before))
    if (after !== before) changes.push({ id: r.id, url: r.sourceUrl, snips: diffSnippets(before, after) })
  }
  console.log('将修改', changes.length, '条\n')
  for (const c of changes.slice(0, 60)) {
    console.log('• ' + c.url)
    c.snips.forEach((s) => console.log('    ' + s))
  }
  if (process.env.DRY !== '1' && changes.length) {
    for (const c of changes) {
      const r = rows.find((x) => x.id === c.id)
      await p.content.update({ where: { id: c.id }, data: { content: addPct(fixOcr(r.content || '')) } })
    }
    console.log('\n已写入', changes.length, '条')
  }
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
