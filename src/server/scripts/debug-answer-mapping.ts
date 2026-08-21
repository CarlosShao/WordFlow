/**
 * 调试：对比 m2kar 提取的答案题号和数据库中题目的order字段
 */
import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  
  // 查看2001年的所有题目order
  for (const year of [2000, 2001, 2002, 2005, 2010, 2015, 2019]) {
    const contents = await prisma.content.findMany({
      where: {
        source: '烧词真题站',
        sourceUrl: { contains: `/kaoyan/${year}/` },
      },
      include: { contentQuestions: true },
    })
    
    const allQuestions = contents.flatMap(c => c.contentQuestions)
    const orders = allQuestions.map(q => q.order).sort((a, b) => a - b)
    const answered = allQuestions.filter(q => q.answer && q.answer.length > 0).length
    
    console.log(`${year}年: ${allQuestions.length}题, orders=[${orders.join(',')}], 已有答案=${answered}`)
  }
  
  await disconnectPrisma()
}

main().catch(console.error)
