import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  
  // 先删题目
  const qDel = await prisma.contentQuestion.deleteMany({
    where: { content: { source: '烧词真题站' } },
  })
  console.log('Deleted questions:', qDel.count)
  
  // 再删内容
  const cDel = await prisma.content.deleteMany({
    where: { source: '烧词真题站' },
  })
  console.log('Deleted contents:', cDel.count)
  
  // 删书目
  const bDel = await prisma.examBook.deleteMany({
    where: { dataSource: 'CURATED' },
  })
  console.log('Deleted books:', bDel.count)
  
  await disconnectPrisma()
}
main().catch(console.error)
