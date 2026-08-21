/**
 * 调试：查看数据库中烧词站题目的order字段
 */
import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  
  // 查看2000年英语一的题目
  const contents = await prisma.content.findMany({
    where: {
      source: '烧词真题站',
      sourceUrl: { contains: '/kaoyan/2000/' },
    },
    include: { contentQuestions: true },
  })
  
  for (const c of contents) {
    console.log(`\nContent: ${c.title}`)
    console.log(`  sourceUrl: ${c.sourceUrl}`)
    for (const q of c.contentQuestions) {
      console.log(`    Q${q.order}: id=${q.id}, stem="${q.stem.substring(0, 50)}", answer=${JSON.stringify(q.answer)}`)
    }
  }

  // 也看看2001年
  const contents2001 = await prisma.content.findMany({
    where: {
      source: '烧词真题站',
      sourceUrl: { contains: '/kaoyan/2001/' },
    },
    include: { contentQuestions: true },
  })
  
  for (const c of contents2001) {
    console.log(`\nContent: ${c.title}`)
    console.log(`  sourceUrl: ${c.sourceUrl}`)
    for (const q of c.contentQuestions) {
      console.log(`    Q${q.order}: id=${q.id}, stem="${q.stem.substring(0, 50)}", answer=${JSON.stringify(q.answer)}`)
    }
  }

  await disconnectPrisma()
}

main().catch(console.error)
