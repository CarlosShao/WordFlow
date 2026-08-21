import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

async function main() {
  const prisma = getPrisma()

  // 1. 口语题库：检查重复
  console.log('=== 口语题库重复检查 ===')
  const speakingContents = await prisma.content.findMany({
    where: { bookId: 'toefl-power-toefl-speaking' },
    select: { id: true, title: true, content: true, _count: { select: { contentQuestions: true } } },
    orderBy: { bookOrder: 'asc' },
  })
  console.log('口语 section 总数: ' + speakingContents.length)
  
  // 检查 title 重复
  const titleMap: Record<string, number> = {}
  for (const c of speakingContents) {
    const key = c.title
    titleMap[key] = (titleMap[key] || 0) + 1
  }
  const dupTitles = Object.entries(titleMap).filter(([, n]) => n > 1)
  console.log('重复标题: ' + dupTitles.length + ' 组')
  for (const [t, n] of dupTitles.slice(0, 5)) {
    console.log('  "' + t + '" 出现 ' + n + ' 次')
  }

  // 检查 content 重复
  const contentMap: Record<string, string[]> = {}
  for (const c of speakingContents) {
    const key = (c.content || '').substring(0, 100)
    if (!contentMap[key]) contentMap[key] = []
    contentMap[key].push(c.id)
  }
  const dupContents = Object.entries(contentMap).filter(([, ids]) => ids.length > 1)
  console.log('重复内容: ' + dupContents.length + ' 组')

  // 2. 口语题的 explanation
  console.log('\n=== 口语题 explanation ===')
  const speakingQs = await prisma.contentQuestion.findMany({
    where: { content: { bookId: 'toefl-power-toefl-speaking' } },
    select: { id: true, stem: true, explanation: true, answer: true, type: true },
    take: 5,
  })
  for (const q of speakingQs) {
    console.log('  type=' + q.type + ' stem="' + (q.stem || '').substring(0, 60) + '" explanation=' + (q.explanation ? 'Y(' + q.explanation.substring(0, 60) + ')' : 'N') + ' answer=' + (q.answer ? JSON.stringify(q.answer).substring(0, 60) : 'null'))
  }

  // 3. 阅读题库 0 题 section
  console.log('\n=== 阅读题库 0 题 section ===')
  const readingContents = await prisma.content.findMany({
    where: { bookId: 'toefl-power-toefl-reading' },
    select: { id: true, title: true, bookOrder: true, _count: { select: { contentQuestions: true } } },
    orderBy: { bookOrder: 'asc' },
  })
  const readingZero = readingContents.filter(c => c._count.contentQuestions === 0)
  console.log('阅读 0 题 section: ' + readingZero.length + ' / ' + readingContents.length)
  for (const c of readingZero.slice(0, 10)) {
    console.log('  #' + c.bookOrder + ' "' + c.title.substring(0, 50) + '"')
  }

  // 4. 听力题库 0 题 section
  console.log('\n=== 听力题库 0 题 section ===')
  const listeningContents = await prisma.content.findMany({
    where: { bookId: 'toefl-power-toefl-listening' },
    select: { id: true, title: true, bookOrder: true, _count: { select: { contentQuestions: true } } },
    orderBy: { bookOrder: 'asc' },
  })
  const listeningZero = listeningContents.filter(c => c._count.contentQuestions === 0)
  console.log('听力 0 题 section: ' + listeningZero.length + ' / ' + listeningContents.length)
  for (const c of listeningZero.slice(0, 10)) {
    console.log('  #' + c.bookOrder + ' "' + c.title.substring(0, 50) + '"')
  }

  // 5. 模考套题
  console.log('\n=== 模考套题 ===')
  const roundContents = await prisma.content.findMany({
    where: { bookId: 'toefl-power-toefl-rounds' },
    select: { id: true, title: true, content: true, _count: { select: { contentQuestions: true } } },
    orderBy: { bookOrder: 'asc' },
    take: 3,
  })
  for (const c of roundContents) {
    console.log('  "' + c.title + '" questions=' + c._count.contentQuestions)
    console.log('  content=' + (c.content || '').substring(0, 100))
  }

  // 6. 模考题目的类型
  console.log('\n=== 模考题目 ===')
  const roundQs = await prisma.contentQuestion.findMany({
    where: { content: { bookId: 'toefl-power-toefl-rounds' } },
    select: { id: true, stem: true, type: true, options: true, answer: true, explanation: true },
    take: 5,
  })
  for (const q of roundQs) {
    console.log('  type=' + q.type + ' stem="' + (q.stem || '').substring(0, 80) + '"')
    console.log('  options=' + (q.options ? JSON.stringify(q.options).substring(0, 80) : 'null'))
    console.log('  answer=' + JSON.stringify(q.answer))
  }

  await disconnectPrisma()
}

main().catch(console.error)
