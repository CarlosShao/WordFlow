/**
 * 详查：剑桥雅思17 阅读内容 + 找出有真实原文（无占位）的雅思阅读
 * 运行: cd src/server && node src/scripts/_count-ielts-missing.cjs
 */
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  // 1) 剑17 阅读段落明细
  const jian17 = await p.content.findMany({
    where: {
      type: 'ARTICLE',
      book: { title: { contains: '17' } },
    },
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      content: true,
      book: { select: { title: true } },
      _count: { select: { contentQuestions: true } },
    },
    orderBy: { bookOrder: 'asc' },
  })
  console.log('=== 剑桥雅思17 阅读段落 ===')
  for (const s of jian17) {
    const c = s.content || ''
    const hasPh = c.includes('当前源数据未收录')
    console.log(`\n[${s.book?.title}] ${s.title} (${s._count.contentQuestions}题) | 缺损=${hasPh ? '是' : '否'} | 长度=${c.length}`)
    console.log(`  开头120字: ${c.slice(0, 120).replace(/\n+/g, ' ')}`)
  }

  // 2) 全量：找出无占位的（有真实原文）
  const all = await p.content.findMany({
    where: {
      type: 'ARTICLE',
      book: { category: 'IELTS' },
    },
    select: {
      id: true,
      title: true,
      content: true,
      book: { select: { title: true } },
    },
  })
  console.log('\n\n=== 雅思阅读总数 ===', all.length)
  const hasReal = all.filter((s) => !(s.content || '').includes('当前源数据未收录'))
  console.log('=== 有真实原文（无占位）的段落 ===', hasReal.length)
  for (const s of hasReal) {
    const c = s.content || ''
    console.log(`\n[${s.book?.title}] ${s.title} | 长度=${c.length}`)
    console.log(`  开头200字: ${c.slice(0, 200).replace(/\n+/g, ' ')}`)
  }

  // 3) 占位（无原文摘要）与真正全空
  const ph = all.filter((s) => (s.content || '').includes('当前源数据未收录'))
  const empty = all.filter((s) => !s.content || s.content.length < 20)
  console.log('\n=== 含"当前源数据未收录"占位 ===', ph.length)
  console.log('=== 内容几乎为空(<20字) ===', empty.length)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
