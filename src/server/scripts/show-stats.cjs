const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const books = await p.examBook.groupBy({ by: ['category', 'dataSource'], _count: { _all: true } })
  console.log('=== 当前数据库统计 ===')
  for (const b of books) console.log(`${b.category} [${b.dataSource}]: ${b._count._all} 套`)
  const total = await p.examBook.count()
  const contents = await p.content.count({ where: { bookId: { not: null } } })
  const questions = await p.contentQuestion.count()
  console.log(`\n总计: ${total} 套书, ${contents} 个内容, ${questions} 道题`)
  await p.$disconnect()
}
main()
