import { getPrisma } from '../common/prisma.js'

const prisma = getPrisma()

async function main() {
  // 将所有现有真题书标记为 LEGACY 数据来源
  // (新字段默认值已经是 LEGACY，但 updateMany 确保已存在的行也被设置)
  const result = await prisma.examBook.updateMany({
    where: {},
    data: { dataSource: 'LEGACY' },
  })
  console.log(`Updated ${result.count} books to LEGACY`)

  const books = await prisma.examBook.groupBy({
    by: ['dataSource'],
    _count: { _all: true },
  })
  console.log('Data source stats:', JSON.stringify(books, null, 2))

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
