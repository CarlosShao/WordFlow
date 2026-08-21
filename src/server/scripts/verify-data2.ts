import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  
  // 查一条有题目的 Power TOEFL 阅读
  const c = await prisma.content.findFirst({
    where: { 
      source: 'power-toefl.com',
      contentQuestions: { some: {} }
    },
    include: { contentQuestions: { take: 2, orderBy: { order: 'asc' } } }
  })
  
  if (!c) {
    console.log('未找到带题目的文章!')
    return
  }
  
  console.log('=== 验证：带题目的 Power TOEFL 阅读 ===')
  console.log('ID:', c.id)
  console.log('Title:', c.title)
  console.log('Source:', c.source)
  console.log('BookId:', c.bookId)
  console.log('Content length:', c.content?.length)
  console.log('Content (first 500):', c.content?.substring(0, 500))
  console.log('Questions count:', c.contentQuestions?.length)
  
  for (const q of c.contentQuestions || []) {
    console.log('\n--- 题目 ---')
    console.log('Q stem:', q.stem?.substring(0, 300))
    console.log('Q options:', JSON.stringify(q.options)?.substring(0, 300))
    console.log('Q answer:', q.answer)
    console.log('Q explanation (first 300):', q.explanation?.substring(0, 300))
  }
  
  await disconnectPrisma()
}

main().catch(console.error)
