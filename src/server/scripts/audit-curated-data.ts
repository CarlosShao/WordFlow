import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()
  
  const books = await prisma.examBook.findMany({
    where: { dataSource: 'CURATED', category: { in: ['TOEFL', 'IELTS'] } },
    include: { _count: { select: { contents: true } } },
    orderBy: { category: 'asc' },
  })
  
  for (const b of books) {
    console.log('\n=== ' + b.title + ' (' + b.category + ') ===')
    console.log('  id: ' + b.id)
    console.log('  sections: ' + b._count.contents)
    
    // section types
    const types = await prisma.content.groupBy({
      by: ['type'],
      where: { bookId: b.id },
      _count: { _all: true },
    })
    console.log('  section types: ' + JSON.stringify(types.map(t => t.type + '(' + t._count._all + ')')))
    
    // 前5个section
    const sections = await prisma.content.findMany({
      where: { bookId: b.id },
      select: { id: true, type: true, title: true, audioUrl: true, content: true, bookOrder: true, _count: { select: { contentQuestions: true } } },
      orderBy: { bookOrder: 'asc' },
      take: 5,
    })
    console.log('  前5个 section:')
    for (const s of sections) {
      const title = (s.title || '').substring(0, 40)
      const audio = s.audioUrl ? 'Y' : 'N'
      const content = s.content ? 'Y' : 'N'
      console.log('    #' + s.bookOrder + ' type=' + s.type + ' title="' + title + '" audio=' + audio + ' content=' + content + ' questions=' + s._count.contentQuestions)
    }
    
    // question types
    const qTypes = await prisma.contentQuestion.findMany({
      where: { content: { bookId: b.id } },
      select: { type: true },
      distinct: ['type'],
    })
    console.log('  question types: ' + JSON.stringify(qTypes.map(q => q.type)))
    
    // 总数
    const totalQs = await prisma.contentQuestion.count({ where: { content: { bookId: b.id } } })
    const withAudio = await prisma.content.count({ where: { bookId: b.id, NOT: { audioUrl: null } } })
    const withContent = await prisma.content.count({ where: { bookId: b.id, NOT: { content: null } } })
    console.log('  总计: questions=' + totalQs + ' audio=' + withAudio + ' contentText=' + withContent)
    
    // 检查重复题目
    const allQs = await prisma.contentQuestion.findMany({
      where: { content: { bookId: b.id } },
      select: { stem: true, contentId: true },
    })
    const stemMap: Record<string, number> = {}
    for (const q of allQs) {
      const key = q.stem.substring(0, 80)
      stemMap[key] = (stemMap[key] || 0) + 1
    }
    const dupKeys = Object.entries(stemMap).filter(([, n]) => n > 1)
    if (dupKeys.length > 0) {
      console.log('  ⚠️ 重复题目: ' + dupKeys.length + ' 组')
      for (const [stem, n] of dupKeys.slice(0, 5)) {
        console.log('    "' + stem.substring(0, 50) + '..." 出现 ' + n + ' 次')
      }
    }
  }
  
  await disconnectPrisma()
}

main().catch(console.error)
