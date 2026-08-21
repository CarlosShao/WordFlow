/**
 * 修正 TPO 1-53：把 fix-exam-data 误改的后 3 段从 ARTICLE 改回 LISTENING + 恢复音频
 * 依据：toefl_final.json 的 6 段全部是听力（audio 指向 Listening 目录），无阅读数据
 * 运行: cd src/server && node src/scripts/_fix-toefl-53.cjs
 */
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const books = await p.examBook.findMany({
    where: { category: 'TOEFL' },
    include: { contents: true },
  })

  let fixed = 0
  let checked = 0
  for (const book of books) {
    const m = book.title.match(/TPO\s+(\d+)/i)
    if (!m) continue
    const tpo = parseInt(m[1], 10)
    if (tpo < 1 || tpo > 53) continue
    const cs = book.contents.sort((a, b) => (a.bookOrder || 0) - (b.bookOrder || 0))
    if (cs.length !== 6) continue
    checked++

    for (let i = 0; i < cs.length; i++) {
      const c = cs[i]
      // 前 3 段本来就是听力，无需改；后 3 段被误标为 ARTICLE，改回
      if (i < 3) continue
      const secNo = i + 1
      const audioUrl = `http://localhost:9000/wordflow-uploads/toefl/tpo${tpo}/sec${secNo}.mp3`
      const qCount = await p.contentQuestion.count({ where: { contentId: c.id } })
      const summary = `TOEFL TPO ${tpo} 听力 Passage ${secNo}（共 ${qCount} 题）`
      const patch = { type: 'LISTENING', audioUrl, summary }
      if (c.content) patch.content = null // 听力段不该有阅读原文
      await p.content.update({ where: { id: c.id }, data: patch })
      fixed++
      console.log(`  [TOEFL] ${book.title} sec${secNo}: ARTICLE -> LISTENING, audio 恢复`)
    }
  }
  console.log(`✅ 完成: 检查 ${checked} 本书, 修正 ${fixed} 段`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => p.$disconnect())
