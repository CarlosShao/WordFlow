import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  const books = await prisma.examBook.groupBy({
    by: ['category', 'dataSource'],
    _count: { _all: true },
    where: { dataSource: 'OPENSOURCE' },
  })
  for (const b of books) console.log(b.category, b.dataSource, b._count._all)
  const contents = await prisma.content.count({ where: { source: 'HelloCET' } })
  console.log('Content count:', contents)
  const questions = await prisma.contentQuestion.count({
    where: { content: { source: 'HelloCET' } },
  })
  console.log('Question count:', questions)
  await disconnectPrisma()
}
main().catch(console.error)
