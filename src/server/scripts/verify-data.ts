import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  
  // 查一条 Power TOEFL 的数据
  const c = await prisma.content.findFirst({
    where: { source: 'power-toefl.com' },
    include: { contentQuestions: true }
  })
  
  if (!c) {
    console.log('未找到 Power TOEFL 数据!')
    return
  }
  
  console.log('=== 验证 Power TOEFL 数据 ===')
  console.log('ID:', c.id)
  console.log('Title:', c.title)
  console.log('Source:', c.source)
  console.log('Content length:', c.content?.length)
  console.log('Content (first 300):', c.content?.substring(0, 300))
  console.log('Questions:', c.contentQuestions?.length)
  
  if (c.contentQuestions?.[0]) {
    const q = c.contentQuestions[0]
    console.log('\n=== 第一道题 ===')
    console.log('Q stem:', q.stem?.substring(0, 200))
    console.log('Q options:', q.options)
    console.log('Q answer:', q.answer)
    console.log('Q explanation:', q.explanation?.substring(0, 300))
  }
  
  // 统计
  const total = await prisma.content.count({ where: { source: 'power-toefl.com' } })
  const qTotal = await prisma.contentQuestion.count({
    where: { content: { source: 'power-toefl.com' } }
  })
  console.log(`\n总计: ${total} 篇文章, ${qTotal} 道题`)
  
  await disconnectPrisma()
}

main().catch(console.error)
