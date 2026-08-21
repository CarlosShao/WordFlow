import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  
  // 把 Power TOEFL 和 ieltscat 从 OPENSOURCE 改为 CURATED
  const result1 = await prisma.examBook.updateMany({
    where: { id: { in: ['toefl-power-toefl-mock', 'toefl-power-toefl-reading', 'toefl-power-toefl-listening'] } },
    data: { dataSource: 'CURATED' },
  })
  console.log(`Power TOEFL books updated: ${result1.count}`)
  
  const result2 = await prisma.examBook.updateMany({
    where: { id: 'ielts-ieltscat-cambridge' },
    data: { dataSource: 'CURATED' },
  })
  console.log(`ieltscat book updated: ${result2.count}`)
  
  // 同时把对应的 content 也标记为 CURATED（虽然 content 没有 dataSource 字段，但 examBook 的 dataSource 变了就够了）
  
  // 验证
  const curated = await prisma.examBook.findMany({
    where: { dataSource: 'CURATED' },
    select: { id: true, title: true, category: true },
    orderBy: { category: 'asc' },
  })
  console.log(`\nCURATED books (${curated.length}):`)
  for (const b of curated) {
    console.log(`  [${b.category}] ${b.title}`)
  }
  
  await disconnectPrisma()
}

main().catch(console.error)
