import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  
  console.log('=== 2. Power TOEFL 数据质量 ===')
  const ptQs = await prisma.contentQuestion.findMany({
    where: { content: { source: 'power-toefl.com' } },
    take: 100,
    select: { answer: true, explanation: true, stem: true, options: true },
  })
  let ptWithAnswer = 0, ptWithExpl = 0, ptWithOpts = 0
  for (const q of ptQs) {
    if (Array.isArray(q.answer) && q.answer.length > 0) ptWithAnswer++
    if (q.explanation && q.explanation.length > 0) ptWithExpl++
    if (Array.isArray(q.options) && q.options.length > 0) ptWithOpts++
  }
  const ptTotal = await prisma.contentQuestion.count({ where: { content: { source: 'power-toefl.com' } } })
  const ptAudio = await prisma.content.count({ where: { source: 'power-toefl.com', content: { contains: '[Audio' } } })
  console.log(`  总题目: ${ptTotal} (抽样${ptQs.length})`)
  console.log(`  有答案: ${ptWithAnswer}/${ptQs.length}`)
  console.log(`  有解析: ${ptWithExpl}/${ptQs.length}`)
  console.log(`  有选项: ${ptWithOpts}/${ptQs.length}`)
  console.log(`  有音频的文章: ${ptAudio}`)
  
  console.log('\n=== 3. ieltscat 剑雅 数据质量 ===')
  const ilQs = await prisma.contentQuestion.findMany({
    where: { content: { source: 'ieltscat.xdf.cn' } },
    take: 100,
    select: { answer: true, explanation: true, stem: true, options: true },
  })
  let ilWithAnswer = 0, ilWithExpl = 0, ilWithOpts = 0
  for (const q of ilQs) {
    if (Array.isArray(q.answer) && q.answer.length > 0) ilWithAnswer++
    if (q.explanation && q.explanation.length > 0) ilWithExpl++
    if (Array.isArray(q.options) && q.options.length > 0) ilWithOpts++
  }
  const ilTotal = await prisma.contentQuestion.count({ where: { content: { source: 'ieltscat.xdf.cn' } } })
  const ilAudio = await prisma.content.count({ where: { source: 'ieltscat.xdf.cn', content: { contains: '[Audio]' } } })
  console.log(`  总题目: ${ilTotal} (抽样${ilQs.length})`)
  console.log(`  有答案: ${ilWithAnswer}/${ilQs.length}`)
  console.log(`  有解析: ${ilWithExpl}/${ilQs.length}`)
  console.log(`  有选项: ${ilWithOpts}/${ilQs.length}`)
  console.log(`  有音频的文章: ${ilAudio}`)
  
  console.log('\n=== 4. 各 ExamBook ===')
  const books = await prisma.examBook.findMany({
    include: { _count: { select: { contents: true } } },
    orderBy: { category: 'asc' },
  })
  for (const b of books) {
    if (b._count.contents > 0) {
      console.log(`  [${b.category}/${b.dataSource}] ${b.title}: ${b._count.contents} contents`)
    }
  }
  
  console.log('\n=== 5. ieltscat 题目样例 ===')
  const ilSamples = await prisma.contentQuestion.findMany({
    where: { content: { source: 'ieltscat.xdf.cn' } },
    take: 3,
    include: { content: true },
  })
  for (const q of ilSamples) {
    console.log(`\n  [${q.content?.title}]`)
    console.log(`  Stem: ${q.stem?.substring(0, 150)}`)
    console.log(`  Options: ${JSON.stringify(q.options)?.substring(0, 200)}`)
    console.log(`  Answer: ${JSON.stringify(q.answer)}`)
    console.log(`  Explanation: ${q.explanation || '(无)'}`)
  }
  
  console.log('\n=== 6. Power TOEFL 题目样例 ===')
  const ptSamples = await prisma.contentQuestion.findMany({
    where: { content: { source: 'power-toefl.com' } },
    take: 2,
    include: { content: true },
  })
  for (const q of ptSamples) {
    console.log(`\n  [${q.content?.title}]`)
    console.log(`  Stem: ${q.stem?.substring(0, 150)}`)
    console.log(`  Options: ${JSON.stringify(q.options)?.substring(0, 200)}`)
    console.log(`  Answer: ${JSON.stringify(q.answer)}`)
    console.log(`  Explanation: ${q.explanation?.substring(0, 150) || '(无)'}`)
  }
  
  await disconnectPrisma()
}

main().catch(console.error)
