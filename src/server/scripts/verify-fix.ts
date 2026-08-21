import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  
  // 检查 ieltscat 音频
  const withAudio = await prisma.content.count({
    where: { source: 'ieltscat.xdf.cn', NOT: { audioUrl: null } }
  })
  const total = await prisma.content.count({
    where: { source: 'ieltscat.xdf.cn' }
  })
  console.log(`ieltscat 音频: ${withAudio}/${total} 有 audioUrl`)
  
  // 看几个样例
  const samples = await prisma.content.findMany({
    where: { source: 'ieltscat.xdf.cn', NOT: { audioUrl: null } },
    take: 3,
    select: { title: true, audioUrl: true, type: true },
  })
  for (const s of samples) {
    console.log(`  ${s.title}: type=${s.type}, audio=${s.audioUrl?.substring(0, 80)}`)
  }
  
  // 检查题型分布
  const allQs = await prisma.contentQuestion.findMany({
    where: { content: { source: 'ieltscat.xdf.cn' } },
    select: { type: true, stem: true, answer: true, options: true },
    take: 500,
  })
  const typeMap: Record<string, number> = {}
  let withAns = 0, withOpts = 0
  for (const q of allQs) {
    typeMap[q.type] = (typeMap[q.type] || 0) + 1
    if (Array.isArray(q.answer) && q.answer.length > 0) withAns++
    if (Array.isArray(q.options) && q.options.length > 0) withOpts++
  }
  console.log(`\n题型分布:`)
  for (const [t, c] of Object.entries(typeMap)) {
    console.log(`  ${t}: ${c}`)
  }
  console.log(`有答案: ${withAns}/${allQs.length}`)
  console.log(`有选项: ${withOpts}/${allQs.length}`)
  
  // 看几个填空题样例
  const completions = allQs.filter(q => q.type === 'COMPLETION').slice(0, 3)
  console.log(`\n填空题样例:`)
  for (const q of completions) {
    console.log(`  stem: ${q.stem?.substring(0, 100)}`)
    console.log(`  answer: ${JSON.stringify(q.answer)}`)
  }
  
  // 看几个判断题样例
  const tfng = allQs.filter(q => q.type === 'TRUE_FALSE_NOT_GIVEN').slice(0, 3)
  console.log(`\n判断题样例:`)
  for (const q of tfng) {
    console.log(`  stem: ${q.stem?.substring(0, 100)}`)
    console.log(`  answer: ${JSON.stringify(q.answer)}`)
    console.log(`  options: ${JSON.stringify(q.options)}`)
  }
  
  // 看几个选择题样例
  const mcqs = allQs.filter(q => q.type === 'MCQ').slice(0, 3)
  console.log(`\n选择题样例:`)
  for (const q of mcqs) {
    console.log(`  stem: ${q.stem?.substring(0, 100)}`)
    console.log(`  answer: ${JSON.stringify(q.answer)}`)
    console.log(`  options: ${JSON.stringify(q.options)?.substring(0, 200)}`)
  }
  
  await disconnectPrisma()
}

main().catch(console.error)
