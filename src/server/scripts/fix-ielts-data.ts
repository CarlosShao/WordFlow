/**
 * 修复雅思数据
 * 
 * 1. section type: 听力→LISTENING, 阅读→ARTICLE (已有部分)
 * 2. bookOrder 重新排序
 * 3. 去重复题目（相同 stem + contentId 的只保留一个）
 * 4. 清理脏数据（空 stem 的题目）
 */
import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  
  const bookId = 'ielts-ieltscat-cambridge'
  
  // 1. 修复 section type: 标题含"听力"的设为 LISTENING，含"阅读"的设为 ARTICLE
  console.log('[1] 修复 section type...')
  const listeningFix = await prisma.content.updateMany({
    where: { bookId, title: { contains: '听力' }, type: { not: 'LISTENING' } },
    data: { type: 'LISTENING' as any },
  })
  console.log(`  听力修正: ${listeningFix.count}`)
  
  const readingFix = await prisma.content.updateMany({
    where: { bookId, title: { contains: '阅读' }, type: { not: 'ARTICLE' } },
    data: { type: 'ARTICLE' as any },
  })
  console.log(`  阅读修正: ${readingFix.count}`)
  
  // 2. 重新排序 bookOrder
  console.log('\n[2] 重新排序 bookOrder...')
  const allContents = await prisma.content.findMany({
    where: { bookId },
    select: { id: true, title: true, type: true },
    orderBy: [{ title: 'asc' }],
  })
  
  let order = 0
  for (const c of allContents) {
    order++
    await prisma.content.update({
      where: { id: c.id },
      data: { bookOrder: order },
    })
  }
  console.log(`  已排序 ${order} 个 section`)
  
  // 3. 去重复题目（相同 contentId + 相同 stem 前 80 字符）
  console.log('\n[3] 去重复题目...')
  const allQuestions = await prisma.contentQuestion.findMany({
    where: { content: { bookId } },
    select: { id: true, contentId: true, stem: true, order: true },
  })
  console.log(`  总题目数: ${allQuestions.length}`)
  
  // 按 contentId + stem 分组
  const groups: Record<string, string[]> = {}
  for (const q of allQuestions) {
    const key = q.contentId + '::' + q.stem.substring(0, 80)
    if (!groups[key]) groups[key] = []
    groups[key].push(q.id)
  }
  
  const toDelete: string[] = []
  for (const [, ids] of Object.entries(groups)) {
    if (ids.length > 1) {
      // 保留第一个，删除其余
      toDelete.push(...ids.slice(1))
    }
  }
  console.log(`  重复题目待删: ${toDelete.length}`)
  
  if (toDelete.length > 0) {
    // 分批删除
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100)
      const r = await prisma.contentQuestion.deleteMany({
        where: { id: { in: batch } },
      })
      console.log(`  批次 ${i / 100 + 1}: 删除 ${r.count}`)
    }
  }
  
  // 4. 清理脏数据（空 stem 或 stem 为 "..." 的题目）
  console.log('\n[4] 清理脏数据...')
  const dirty1 = await prisma.contentQuestion.deleteMany({
    where: { content: { bookId }, stem: { in: ['', '...', '.'] } },
  })
  const dirty2 = await prisma.contentQuestion.deleteMany({
    where: { content: { bookId }, stem: null },
  })
  console.log(`  脏数据删除: ${dirty1.count + dirty2.count}`)
  
  // 5. 重新排序题目 order
  console.log('\n[5] 重新排序题目 order...')
  const contents = await prisma.content.findMany({
    where: { bookId },
    select: { id: true },
  })
  
  let totalReordered = 0
  for (const c of contents) {
    const qs = await prisma.contentQuestion.findMany({
      where: { contentId: c.id },
      select: { id: true },
      orderBy: { order: 'asc' },
    })
    let qOrder = 0
    for (const q of qs) {
      qOrder++
      await prisma.contentQuestion.update({
        where: { id: q.id },
        data: { order: qOrder },
      })
      totalReordered++
    }
  }
  console.log(`  重排序 ${totalReordered} 题`)
  
  // 6. 验证
  console.log('\n[6] 验证...')
  const sectionTypes = await prisma.content.groupBy({
    by: ['type'],
    where: { bookId },
    _count: { _all: true },
  })
  console.log(`  Section types: ${JSON.stringify(sectionTypes.map(t => t.type + '(' + t._count._all + ')'))}`)
  
  const totalQs = await prisma.contentQuestion.count({
    where: { content: { bookId } },
  })
  console.log(`  总题目: ${totalQs}`)
  
  const qTypes = await prisma.contentQuestion.findMany({
    where: { content: { bookId } },
    select: { type: true },
    distinct: ['type'],
  })
  console.log(`  Question types: ${JSON.stringify(qTypes.map(q => q.type))}`)
  
  const withAudio = await prisma.content.count({
    where: { bookId, NOT: { audioUrl: null } },
  })
  console.log(`  有音频: ${withAudio}`)
  
  const withAnswer = await prisma.contentQuestion.count({
    where: { content: { bookId }, NOT: { answer: { equals: [] } } },
  })
  console.log(`  有答案: ${withAnswer}`)
  
  await disconnectPrisma()
  console.log('\n完成!')
}

main().catch(console.error)
