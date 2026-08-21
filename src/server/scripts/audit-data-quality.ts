import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  
  console.log('=== 1. 各数据源内容/题目统计 ===')
  const allContents = await prisma.content.findMany({
    select: { source: true },
    where: { NOT: { source: '' } },
  })
  const sourceMap: Record<string, number> = {}
  for (const c of allContents) {
    const src = c.source || '(unknown)'
    sourceMap[src] = (sourceMap[src] || 0) + 1
  }
  for (const [src, count] of Object.entries(sourceMap).sort()) {
    const qCount = await prisma.contentQuestion.count({
      where: { content: { source: src } }
    })
    console.log(`  ${src}: ${count} contents, ${qCount} questions`)
  }
  
  console.log('\n=== 2. Power TOEFL 数据质量 ===')
  const ptWithAnswer = await prisma.contentQuestion.count({
    where: { content: { source: 'power-toefl.com' }, NOT: { answer: { isEmpty: true } } }
  })
  const ptWithExplanation = await prisma.contentQuestion.count({
    where: { content: { source: 'power-toefl.com' }, NOT: { explanation: null } }
  })
  const ptTotal = await prisma.contentQuestion.count({
    where: { content: { source: 'power-toefl.com' } }
  })
  const ptContentWithAudio = await prisma.content.count({
    where: { source: 'power-toefl.com', content: { contains: '[Audio' } }
  })
  console.log(`  总题目: ${ptTotal}`)
  console.log(`  有答案: ${ptWithAnswer} (${ptTotal > 0 ? Math.round(ptWithAnswer/ptTotal*100) : 0}%)`)
  console.log(`  有解析: ${ptWithExplanation} (${ptTotal > 0 ? Math.round(ptWithExplanation/ptTotal*100) : 0}%)`)
  console.log(`  有音频的文章: ${ptContentWithAudio}`)
  
  console.log('\n=== 3. ieltscat 剑雅 数据质量 ===')
  const ilWithAnswer = await prisma.contentQuestion.count({
    where: { content: { source: 'ieltscat.xdf.cn' }, NOT: { answer: { isEmpty: true } } }
  })
  const ilWithExplanation = await prisma.contentQuestion.count({
    where: { content: { source: 'ieltscat.xdf.cn' }, NOT: { explanation: null } }
  })
  const ilTotal = await prisma.contentQuestion.count({
    where: { content: { source: 'ieltscat.xdf.cn' } }
  })
  const ilContentWithAudio = await prisma.content.count({
    where: { source: 'ieltscat.xdf.cn', content: { contains: '[Audio]' } }
  })
  console.log(`  总题目: ${ilTotal}`)
  console.log(`  有答案: ${ilWithAnswer} (${ilTotal > 0 ? Math.round(ilWithAnswer/ilTotal*100) : 0}%)`)
  console.log(`  有解析: ${ilWithExplanation} (${ilTotal > 0 ? Math.round(ilWithExplanation/ilTotal*100) : 0}%)`)
  console.log(`  有音频的文章: ${ilContentWithAudio}`)
  
  console.log('\n=== 4. 各 ExamBook 的内容分布 ===')
  const books = await prisma.examBook.findMany({
    include: { _count: { select: { contents: true } } },
    orderBy: { category: 'asc' },
  })
  for (const b of books) {
    if (b._count.contents > 0) {
      console.log(`  [${b.category}] ${b.title} (${b.dataSource}): ${b._count.contents} contents`)
    }
  }
  
  console.log('\n=== 5. ieltscat 题目样例 ===')
  const ilQs = await prisma.contentQuestion.findMany({
    where: { content: { source: 'ieltscat.xdf.cn' } },
    take: 3,
    include: { content: true },
  })
  for (const q of ilQs) {
    console.log(`\n  Content: ${q.content?.title}`)
    console.log(`  Stem: ${q.stem?.substring(0, 150)}`)
    console.log(`  Options: ${JSON.stringify(q.options)?.substring(0, 200)}`)
    console.log(`  Answer: ${JSON.stringify(q.answer)}`)
    console.log(`  Explanation: ${q.explanation?.substring(0, 100) || '(无)'}`)
  }
  
  console.log('\n=== 6. Power TOEFL 题目样例 ===')
  const ptQs = await prisma.contentQuestion.findMany({
    where: { content: { source: 'power-toefl.com' } },
    take: 2,
    include: { content: true },
  })
  for (const q of ptQs) {
    console.log(`\n  Content: ${q.content?.title}`)
    console.log(`  Stem: ${q.stem?.substring(0, 150)}`)
    console.log(`  Options: ${JSON.stringify(q.options)?.substring(0, 200)}`)
    console.log(`  Answer: ${JSON.stringify(q.answer)}`)
    console.log(`  Explanation: ${q.explanation?.substring(0, 100) || '(无)'}`)
  }
  
  await disconnectPrisma()
}

main().catch(console.error)
