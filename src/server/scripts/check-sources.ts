import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  
  const sources = await prisma.examBook.groupBy({
    by: ['dataSource'],
    _count: { _all: true },
    orderBy: { dataSource: 'asc' },
  })
  
  for (const s of sources) {
    const books = await prisma.examBook.findMany({
      where: { dataSource: s.dataSource },
      select: { id: true, title: true, category: true },
      take: 5,
    })
    console.log(`\n${s.dataSource}: ${s._count._all} books`)
    for (const b of books) {
      console.log(`  [${b.category}] ${b.title}`)
    }
  }
  
  await disconnectPrisma()
}

main().catch(console.error)
