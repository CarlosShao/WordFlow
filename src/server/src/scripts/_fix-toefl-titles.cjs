/**
 * 修正 TOEFL TPO 54-75 的 section 标题（幂等版，直接读源数据，不依赖旧 title）
 * 运行: cd src/server && node src/scripts/_fix-toefl-titles.cjs
 *
 * LISTENING: 按 bookOrder 排序后，用 toefl_new_54_75.json 的 sec 标签解析
 *            （Conversation/Lecture 独立计数；"Section" 等未知标签用 Listening N 兜底）
 * ARTICLE:   用 reading_54_75.json 的 passages[i].title（残缺的用 Reading Passage N 兜底）
 */
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const p = new PrismaClient()
const ZHENTI = 'D:/work/java/AI-workspace/WordFlow/src/scripts/zhenti'

/** 残缺标题判定：过短 / 小写开头（片段）/ 结尾是标点 / 纯符号 */
function isBadTitle(t) {
  const s = (t || '').trim()
  if (!s || s.length < 15) return true
  if (/[.?!，。；、：——…]$/.test(s)) return true
  if (/^[a-z0-9]/.test(s)) return true
  if (/^[^\p{L}]+$/u.test(s)) return true
  return false
}

/** 解析 sec 标签生成听力标题（Conversation/Lecture 独立计数） */
function buildListenTitles(tpo, secLabels) {
  const out = []
  let c = 0
  let l = 0
  for (let i = 0; i < secLabels.length; i++) {
    const label = (secLabels[i] || '').trim()
    const lm = label.match(/^[Ll]\s*(\d+)/)
    const cm = label.match(/^[Cc](?:onversa[^\d]*)?\s*(\d+)/i)
    const hasConv = /conversa/i.test(label)
    const hasLect = /lecture/i.test(label)
    let t
    if (hasConv) {
      c++
      t = `TOEFL TPO ${tpo} - Conversation ${c}`
    } else if (hasLect) {
      l++
      t = `TOEFL TPO ${tpo} - Lecture ${l}`
    } else if (lm) {
      l = Math.max(l, parseInt(lm[1], 10))
      t = `TOEFL TPO ${tpo} - Lecture ${lm[1]}`
    } else if (cm) {
      c = Math.max(c, parseInt(cm[1], 10))
      t = `TOEFL TPO ${tpo} - Conversation ${cm[1]}`
    } else {
      t = `TOEFL TPO ${tpo} - Listening ${i + 1}`
    }
    out.push(t)
  }
  return out
}

async function main() {
  const readingData = JSON.parse(fs.readFileSync(ZHENTI + '/reading_54_75.json', 'utf-8'))
  const toeflNew = JSON.parse(fs.readFileSync(ZHENTI + '/toefl_new_54_75.json', 'utf-8'))

  const books = await p.examBook.findMany({
    where: { category: 'TOEFL', title: { contains: 'TPO' } },
    include: { contents: true },
  })

  let fixed = 0
  for (const book of books) {
    const m = book.title.match(/TPO\s+(\d+)/i)
    if (!m) continue
    const tpo = parseInt(m[1], 10)
    if (tpo < 54) continue

    const passages = readingData[tpo.toString()]?.passages ?? []
    const secLabels = (toeflNew[tpo.toString()]?.sections ?? []).map((s) => s.sec || '')

    const listens = book.contents.filter((c) => c.type === 'LISTENING').sort((a, b) => (a.bookOrder || 0) - (b.bookOrder || 0))
    const articles = book.contents.filter((c) => c.type === 'ARTICLE').sort((a, b) => (a.bookOrder || 0) - (b.bookOrder || 0))
    const listenTitles = buildListenTitles(tpo, secLabels)

    for (let i = 0; i < listens.length; i++) {
      const title = listenTitles[i] || `TOEFL TPO ${tpo} - Listening ${i + 1}`
      if (listens[i].title !== title) {
        await p.content.update({ where: { id: listens[i].id }, data: { title } })
        fixed++
      }
    }
    for (let i = 0; i < articles.length; i++) {
      const raw = passages[i]
      const title = raw && raw.title && !isBadTitle(raw.title)
        ? `TOEFL TPO ${tpo} - Reading ${i + 1}: ${raw.title.trim()}`
        : `TOEFL TPO ${tpo} - Reading Passage ${i + 1}`
      if (articles[i].title !== title) {
        await p.content.update({ where: { id: articles[i].id }, data: { title } })
        fixed++
      }
    }
  }

  console.log(`修正完成: 共 ${fixed} 处标题更新`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())