import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  
  // 把所有 OFFICIAL 和 OPENSOURCE 的书全部改成 CURATED
  const r = await prisma.examBook.updateMany({
    where: { dataSource: { in: ['OFFICIAL', 'OPENSOURCE'] } },
    data: { dataSource: 'CURATED' },
  })
  console.log(`Updated ${r.count} books to CURATED`)
  
  // 验证
  const sources = await prisma.examBook.groupBy({
    by: ['dataSource'],
    _count: { _all: true },
  })
  for (const s of sources) {
    console.log(`  ${s.dataSource}: ${s._count._all} books`)
  }
  
  await disconnectPrisma()
}

main().catch(console.error)
