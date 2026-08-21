/**
 * 修复雅思数据 - 步骤 4-6（接续运行）
 */
import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  const bookId = 'ielts-ieltscat-cambridge'
  
  // 4. 清理脏数据（空 stem 或 stem 为 "..." 的题目，stem 字段不可为 null）
  console.log('[4] 清理脏数据...')
  const dirty = await prisma.contentQuestion.deleteMany({
    where: { content: { bookId }, stem: { in: ['', '...', '.'] } },
  })
  console.log('  脏数据删除: ' + dirty.count)
  
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
  console.log('  重排序 ' + totalReordered + ' 题')
  
  // 6. 验证
  console.log('\n[6] 验证...')
  const sectionTypes = await prisma.content.groupBy({
    by: ['type'],
    where: { bookId },
    _count: { _all: true },
  })
  console.log('  Section types: ' + JSON.stringify(sectionTypes.map(t => t.type + '(' + t._count._all + ')')))
  
  const totalQs = await prisma.contentQuestion.count({
    where: { content: { bookId } },
  })
  console.log('  总题目: ' + totalQs)
  
  const qTypes = await prisma.contentQuestion.findMany({
    where: { content: { bookId } },
    select: { type: true },
    distinct: ['type'],
  })
  console.log('  Question types: ' + JSON.stringify(qTypes.map(q => q.type)))
  
  const withAudio = await prisma.content.count({
    where: { bookId, NOT: { audioUrl: null } },
  })
  console.log('  有音频: ' + withAudio)
  
  const withAnswer = await prisma.contentQuestion.count({
    where: { content: { bookId }, NOT: { answer: { equals: [] } } },
  })
  console.log('  有答案: ' + withAnswer)
  
  await disconnectPrisma()
  console.log('\n完成!')
}

main().catch(console.error)
