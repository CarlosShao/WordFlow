/**
 * 导入 TOEFL 阅读真题（reading_54_75.json）到数据库
 * 运行: cd src/server && npx tsx src/scripts/import-reading.ts
 * Content type=ARTICLE（content=文章全文），题目 ContentQuestion。
 */
import { readFileSync } from 'node:fs'
import { getPrisma } from '../common/prisma.js'
import { config } from '../config/index.js'

const JSON_PATH = 'D:/work/java/AI-workspace/WordFlow/src/scripts/zhenti/reading_35_53.json'

interface RdQ {
  no: number
  stem: string
  options: string[]
  answer: string
}
interface RdPassage {
  title: string
  article: string
  questions: RdQ[]
}
interface RdItem {
  passages: RdPassage[]
}

async function main() {
  const prisma = getPrisma()
  const data = JSON.parse(readFileSync(JSON_PATH, 'utf-8')) as Record<string, RdItem>
  let nContents = 0, nQuestions = 0

  for (const [tpoStr, item] of Object.entries(data)) {
    const tpo = parseInt(tpoStr, 10)
    const book = await prisma.examBook.findFirst({ where: { category: 'TOEFL', title: `TOEFL TPO ${tpo}` } })
    for (let pi = 0; pi < item.passages.length; pi++) {
      const p = item.passages[pi]
      const sourceUrl = `toefl:reading:tpo:${tpo}:passage:${pi + 1}`
      const existing = await prisma.content.findUnique({
        where: { source_sourceUrl: { source: 'TOEFL_TPO_READING', sourceUrl } },
      })
      let content
      if (!existing) {
        content = await prisma.content.create({
          data: {
            type: 'ARTICLE',
            title: `TOEFL TPO ${tpo} - Reading ${pi + 1}: ${p.title}`,
            content: p.article || null,
            source: 'TOEFL_TPO_READING',
            sourceUrl,
            bookId: book?.id ?? null,
            bookOrder: pi + 1,
            summary: `TOEFL TPO ${tpo} 阅读第 ${pi + 1} 篇（${p.questions.length} 题）`,
          },
        })
        nContents++
      } else {
        content = existing
      }
      // 题目幂等
      await prisma.contentQuestion.deleteMany({ where: { contentId: content.id } })
      for (let qi = 0; qi < p.questions.length; qi++) {
        const q = p.questions[qi]
        if (!q.answer) continue
        const ans = q.answer.replace(/[()（）]/g, '').split('').filter((c) => /[A-F]/i.test(c))
        const qtype = ans.length > 1 ? 'MCQ_MULTI' : 'MCQ'
        await prisma.contentQuestion.create({
          data: {
            contentId: content.id,
            type: qtype as 'MCQ' | 'MCQ_MULTI',
            stem: q.stem,
            options: q.options,
            answer: ans,
            order: qi + 1,
          },
        })
        nQuestions++
      }
    }
  }
  console.log(`✅ 阅读导入完成: contents=${nContents} questions=${nQuestions}`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('导入失败:', e)
  process.exit(1)
})
