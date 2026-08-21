/**
 * 修复 Power TOEFL 题型
 * 根据题目 stem 和 answer 判断题型
 */
import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  
  const qs = await prisma.contentQuestion.findMany({
    where: { content: { source: 'power-toefl.com' } },
    select: { id: true, stem: true, answer: true, options: true, type: true, order: true },
    take: 20,
  })
  
  console.log('Power TOEFL 题目样例:')
  for (const q of qs) {
    console.log(`\n  [${q.order}] type=${q.type}`)
    console.log(`  stem: ${q.stem?.substring(0, 100)}`)
    console.log(`  answer: ${JSON.stringify(q.answer)}`)
    console.log(`  options count: ${Array.isArray(q.options) ? q.options.length : 'null'}`)
    if (q.options) {
      for (const o of q.options.slice(0, 4)) {
        console.log(`    - ${o.substring(0, 80)}`)
      }
    }
  }
  
  // 检查是否有填空题
  const allQs = await prisma.contentQuestion.findMany({
    where: { content: { source: 'power-toefl.com' } },
    select: { type: true, options: true, answer: true },
  })
  const typeMap: Record<string, number> = {}
  let noOptions = 0
  for (const q of allQs) {
    typeMap[q.type] = (typeMap[q.type] || 0) + 1
    if (!q.options || !Array.isArray(q.options) || q.options.length === 0) noOptions++
  }
  console.log(`\n题型: ${JSON.stringify(typeMap)}`)
  console.log(`无选项的题: ${noOptions}/${allQs.length}`)
  
  await disconnectPrisma()
}

main().catch(console.error)
