import { PrismaClient } from '../src/server/node_modules/.prisma/client'

const p = new PrismaClient()
async function main() {
  // 1. 真题书统计
  const books = await p.examBook.findMany({
    select: { id: true, category: true, title: true },
    orderBy: { title: 'asc' },
  })
  const bookByCat: Record<string, number> = {}
  for (const b of books) bookByCat[b.category] = (bookByCat[b.category] ?? 0) + 1
  console.log('=== 真题书统计 ===')
  console.log('总书数:', books.length)
  Object.entries(bookByCat).forEach(([k, v]) => console.log(`  ${k}: ${v}`))

  // 2. 段落（Content）统计
  const contents = await p.content.findMany({
    where: { bookId: { not: null } },
    select: { bookId: true, type: true, source: true },
  })
  const contentByType: Record<string, number> = {}
  const contentByCat: Record<string, Record<string, number>> = {}
  const bookCat = new Map(books.map(b => [b.id, b.category]))
  for (const c of contents) {
    contentByType[c.type] = (contentByType[c.type] ?? 0) + 1
    const cat = bookCat.get(c.bookId!) ?? 'UNKNOWN'
    contentByCat[cat] = contentByCat[cat] ?? {}
    contentByCat[cat][c.type] = (contentByCat[cat][c.type] ?? 0) + 1
  }
  console.log('\n=== 真题段落(Content)统计 ===')
  console.log('总段落:', contents.length)
  console.log('按类型:')
  Object.entries(contentByType).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`))
  console.log('按考试分类:')
  Object.entries(contentByCat).forEach(([cat, types]) => {
    console.log(`  ${cat}:`)
    Object.entries(types).sort((a, b) => b[1] - a[1]).forEach(([t, n]) => console.log(`    ${t}: ${n}`))
  })

  // 3. 题目统计
  const contentCatMap = new Map(contents.map(c => [c.id, bookCat.get(c.bookId!) ?? 'UNKNOWN']))
  const qs = await p.contentQuestion.findMany({
    select: { contentId: true, type: true },
  })
  const qByType: Record<string, number> = {}
  const qByCat: Record<string, Record<string, number>> = {}
  for (const q of qs) {
    qByType[q.type] = (qByType[q.type] ?? 0) + 1
    const cat = contentCatMap.get(q.contentId) ?? 'UNKNOWN'
    qByCat[cat] = qByCat[cat] ?? {}
    qByCat[cat][q.type] = (qByCat[cat][q.type] ?? 0) + 1
  }
  console.log('\n=== 题目(Question)统计 ===')
  console.log('总题目:', qs.length)
  console.log('按题型:')
  Object.entries(qByType).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`))
  console.log('按考试分类:')
  Object.entries(qByCat).forEach(([cat, types]) => {
    console.log(`  ${cat}:`)
    Object.entries(types).sort((a, b) => b[1] - a[1]).forEach(([t, n]) => console.log(`    ${t}: ${n}`))
  })

  await p.$disconnect()
}
main()
