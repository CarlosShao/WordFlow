/**
 * 真题数据一次性修复脚本（直接改 DB，无需重跑导入）
 * 运行: cd src/server && npx tsx src/scripts/fix-exam-data.ts
 *
 * 修复内容：
 *  1. TOEFL 老书（TPO 1-53，sectionCount=6 且全部 type=LISTENING）→ 后3段改为 ARTICLE，
 *     清除 ARTICLE 段落的无效 audioUrl，改 summary（原脚本全部写死为 LISTENING + 听力X部分）
 *  2. IELTS 剑雅阅读 → 从 ielts_final.json 的 reading.passage 字段提取原文灌入 content.content
 *  3. TOEFL TPO 54-75 阅读 → 从 reading_54_75.json 提取 passage.article 灌入对应 DB 的 content.content
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { getPrisma } from '../common/prisma.js'

const ZHENTI_DIR = resolve('D:/work/java/AI-workspace/WordFlow/src/scripts/zhenti')
const IELTS_JSON = resolve(ZHENTI_DIR, 'ielts_final.json')
const TOEFL_READ_JSON = resolve(ZHENTI_DIR, 'reading_54_75.json')

/** 将 passage 字段（可能是 object/array/string）拍平成纯文本 */
function flattenPassage(p: unknown): string {
  if (p == null) return ''
  if (typeof p === 'string') return p
  if (Array.isArray(p)) {
    return p
      .map((x) => (typeof x === 'string' ? x : flattenPassage(x)))
      .filter(Boolean)
      .join('\n')
      .trim()
  }
  if (typeof p === 'object') {
    const obj = p as Record<string, unknown>
    // 尝试常见字段
    const candidates = ['article', 'text', 'content', 'passage', 'body', 'html']
    for (const k of candidates) {
      const v = obj[k]
      if (typeof v === 'string' && v.length > 100) return v
    }
    // 回退：把所有 string 值拼起来
    const chunks: string[] = []
    for (const v of Object.values(obj)) {
      if (typeof v === 'string') chunks.push(v)
      else if (v != null) {
        const s = flattenPassage(v)
        if (s.length > 100) chunks.push(s)
      }
    }
    return chunks.join('\n\n').trim()
  }
  return String(p)
}

/* ============================================================
 *  Step 1: Fix TOEFL old books (TPO 1 ~ 53) type + summary
 * ============================================================ */
async function fixToeflOld(): Promise<{ updated: number; skipped: number }> {
  const prisma = getPrisma()
  const books = await prisma.examBook.findMany({
    where: { category: 'TOEFL' },
    orderBy: [{ title: 'asc' }],
    include: {
      contents: { orderBy: [{ bookOrder: 'asc' }, { createdAt: 'asc' }] },
    },
  })
  let updated = 0
  let skipped = 0

  for (const book of books) {
    const cs = book.contents
    // sectionCount=6 且 6 段全是 LISTENING → 判定为"老脚本误导入"
    if (cs.length !== 6 || cs.some((c) => c.type !== 'LISTENING')) {
      skipped++
      continue
    }
    const tpo = book.title.match(/TPO\s+(\d+)/i)?.[1]
    const tpoLabel = tpo ? `TPO ${tpo}` : book.title

    for (let i = 0; i < cs.length; i++) {
      const order = cs[i].bookOrder || i + 1
      if (i < 3) {
        // 前 3：听力，只修 summary（旧脚本也是听力但 summary 可以更准确）
        await prisma.content.update({
          where: { id: cs[i].id },
          data: { summary: `${tpoLabel} 听力 Section ${order}（共 ${(cs[i] as any)._count?.contentQuestions ?? 0} 题）` },
        })
      } else {
        // 后 3：改为阅读 ARTICLE，去掉误加的 audioUrl
        const idx = i - 3 + 1 // 1/2/3
        await prisma.content.update({
          where: { id: cs[i].id },
          data: {
            type: 'ARTICLE',
            audioUrl: null,
            summary: `${tpoLabel} 阅读 Passage ${idx}（共 ${(cs[i] as any)._count?.contentQuestions ?? 0} 题）`,
          },
        })
      }
      updated++
    }
    console.log(`  [TOEFL] 修正 ${book.title}: 听力×3 / 阅读×3`)
  }

  return { updated, skipped }
}

/* ============================================================
 *  Step 2: Inject IELTS reading passage text into DB
 * ============================================================ */
async function fixIeltsReading(): Promise<{ matched: number; noText: number; miss: number }> {
  if (!existsSync(IELTS_JSON)) {
    console.warn('  [IELTS] skip: ielts_final.json not found')
    return { matched: 0, noText: 0, miss: 0 }
  }
  const prisma = getPrisma()
  const raw = JSON.parse(readFileSync(IELTS_JSON, 'utf-8')) as Record<string, { tests: {
    test_no: number
    listening: unknown[]
    reading: unknown[]
  }[] }>

  let matched = 0
  let noText = 0
  let miss = 0

  for (const [bookKey, bookData] of Object.entries(raw)) {
    const m = bookKey.match(/^IELTS(\d+)(-[AG])?$/)
    if (!m) continue
    const volume = m[1]
    const isG = m[2] === '-G'
    const srcPrefix = isG ? 'IELTS_G' : 'IELTS'
    const srcTag = isG ? `g:${volume}` : volume

    for (const test of bookData.tests) {
      const tno = test.test_no
      const readings = test.reading as ({ passage?: unknown; part?: unknown; passage_no?: unknown; questions?: unknown[] })[]
      for (let i = 0; i < readings.length; i++) {
        const r = readings[i]
        const passageNo = (r as any).passage ?? (r as any).part ?? (r as any).passage_no ?? i + 1
        const text = flattenPassage(r.passage)
        const sourceUrl = `ielts:${srcTag}:test:${tno}:read:passage:${passageNo}`
        const existing = await prisma.content.findUnique({
          where: { source_sourceUrl: { source: srcPrefix, sourceUrl } },
        })
        if (!existing) {
          miss++
          continue
        }
        if (text.length < 100) {
          noText++
          continue
        }
        await prisma.content.update({
          where: { id: existing.id },
          data: { content: text },
        })
        matched++
      }
    }
  }

  return { matched, noText, miss }
}

/* ============================================================
 *  Step 3: Inject TOEFL TPO 54-75 reading passage text
 * ============================================================ */
async function fixToeflNewReading(): Promise<{ matched: number; noText: number; miss: number }> {
  if (!existsSync(TOEFL_READ_JSON)) {
    console.warn('  [TOEFL-54] skip: reading_54_75.json not found')
    return { matched: 0, noText: 0, miss: 0 }
  }
  const prisma = getPrisma()
  const raw = JSON.parse(readFileSync(TOEFL_READ_JSON, 'utf-8')) as Record<string, {
    passages?: { title?: string; article?: string; text?: string; content?: string }[]
  }>

  let matched = 0
  let noText = 0
  let miss = 0

  const toeflBooks = await prisma.examBook.findMany({
    where: { category: 'TOEFL', title: { contains: 'TPO' } },
    include: { contents: { where: { type: 'ARTICLE' }, orderBy: [{ bookOrder: 'asc' }] } },
  })
  const tpoMap = new Map<number, typeof toeflBooks[number]>()
  for (const b of toeflBooks) {
    const n = b.title.match(/TPO\s+(\d+)/i)?.[1]
    if (n) tpoMap.set(parseInt(n, 10), b)
  }

  for (const [tpoStr, data] of Object.entries(raw)) {
    const tpoNo = parseInt(tpoStr, 10)
    const book = tpoMap.get(tpoNo)
    if (!book) {
      console.warn(`  [TOEFL-54] skip TPO ${tpoNo}: DB 中没有这本书`)
      continue
    }
    const passages = data.passages ?? []
    if (passages.length === 0) continue

    const articles = book.contents.filter((c) => c.type === 'ARTICLE')
    for (let i = 0; i < passages.length; i++) {
      const p = passages[i]
      const text = [p.article, p.text, p.content].find((x) => typeof x === 'string' && x.length > 100) ?? ''
      const dbRow = articles[i]
      if (!dbRow) {
        miss++
        continue
      }
      if (text.length < 100) {
        noText++
        continue
      }
      await prisma.content.update({
        where: { id: dbRow.id },
        data: { content: text },
      })
      matched++
    }
    console.log(`  [TOEFL-54] TPO ${tpoNo}: 注入 ${passages.filter(p=> (p.article?.length ?? 0) > 100).length}/${passages.length} 篇原文`)
  }

  return { matched, noText, miss }
}

async function main() {
  console.log('\n======== Step 1: TOEFL 老书 TYPE 修正 ========')
  const step1 = await fixToeflOld()
  console.log(`Step1 result: updated=${step1.updated} rows, skipped=${step1.skipped} books (already ok / >6 sections)`)

  console.log('\n======== Step 2: IELTS 阅读原文注入 ========')
  const step2 = await fixIeltsReading()
  console.log(`Step2 result: matched=${step2.matched}, no-text=${step2.noText}, not-in-DB=${step2.miss}`)

  console.log('\n======== Step 3: TPO 54-75 阅读原文注入 ========')
  const step3 = await fixToeflNewReading()
  console.log(`Step3 result: matched=${step3.matched}, no-text=${step3.noText}, not-in-DB=${step3.miss}`)

  console.log('\n✅ DB 修复完毕')
  await getPrisma().$disconnect()
}

main().catch((e) => {
  console.error('修复失败:', e)
  process.exit(1)
})
