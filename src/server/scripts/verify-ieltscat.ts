import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  
  const c = await prisma.content.findFirst({
    where: { 
      source: 'ieltscat.xdf.cn',
      contentQuestions: { some: {} }
    },
    include: { contentQuestions: { take: 2, orderBy: { order: 'asc' } } }
  })
  
  if (!c) {
    console.log('未找到数据!')
    return
  }
  
  console.log('=== 验证 ieltscat 数据 ===')
  console.log('ID:', c.id)
  console.log('Title:', c.title)
  console.log('Source:', c.source)
  console.log('BookId:', c.bookId)
  console.log('Content length:', c.content?.length)
  console.log('Content (first 500):', c.content?.substring(0, 500))
  console.log('Questions:', c.contentQuestions?.length)
  
  for (const q of c.contentQuestions || []) {
    console.log('\n--- 题目 ---')
    console.log('Stem:', q.stem?.substring(0, 200))
    console.log('Options:', JSON.stringify(q.options)?.substring(0, 300))
  }
  
  const total = await prisma.content.count({ where: { source: 'ieltscat.xdf.cn' } })
  const qTotal = await prisma.contentQuestion.count({
    where: { content: { source: 'ieltscat.xdf.cn' } }
  })
  console.log(`\n总计: ${total} 篇文章, ${qTotal} 道题`)
  
  await disconnectPrisma()
}

main().catch(console.error)
