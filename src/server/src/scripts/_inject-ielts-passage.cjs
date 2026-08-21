/**
 * 单步：IELTS 剑雅阅读原文再注入（ielts_final.json 的 questions[].options 里 ABCDEFG 就是段落全文）
 * 运行: cd src/server && node src/scripts/_inject-ielts-passage.cjs
 */
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const ZHENTI = 'D:/work/java/AI-workspace/WordFlow/src/scripts/zhenti'
const p = new PrismaClient()

const LETTER_PREFIX = /^\s*([A-Z]|[1-9]\d*)[.、)\]]\s*/
const ROMAN_PREFIX = /^\s*[ivxlcdm]{1,5}[.、)\]]\s*/i

function stripLabel(s) {
  return s.replace(LETTER_PREFIX, '').replace(ROMAN_PREFIX, '').trim()
}

/**
 * 从一个 reading section（passage:number + questions:[]）里抽出尽可能多的原文：
 *   1. 优先：任意 question.options 中"选项是带段落标号的长文本"数组，按字母顺序去标签拼接
 *   2. 其次：把所有 stem 拼成摘要
 */
function extractReadingText(sec) {
  // 1) 扫描所有 options，找那些"全部以 A. / B. 开头且长度>150 的选项组"（也就是段落组）
  const paraBanks = []
  const seenChunks = new Set()
  for (const q of sec.questions || []) {
    const opts = q.options
    if (!Array.isArray(opts) || opts.length < 3) continue
    const cleaned = opts
      .filter(o => typeof o === 'string' && o.length > 80)
      .map((o, i) => {
        const raw = o
        const without = stripLabel(o)
        // 必须有"标签变化"：要么有 A. B. 前缀，要么长度不同（区分题目的 A/B/C 选项 vs 段落列表）
        return { raw, without, len: without.length, i }
      })
      .filter(x => x.len > 80)
    if (cleaned.length >= 4) {
      // 认为这是段落列表（A-G），合并去重后加入
      const merged = []
      for (const c of cleaned) {
        if (!seenChunks.has(c.without.slice(0, 80))) {
          seenChunks.add(c.without.slice(0, 80))
          merged.push(c.without)
        }
      }
      if (merged.length >= 3) paraBanks.push(merged)
    }
  }

  let body = ''
  if (paraBanks.length) {
    // 选段落数量最多的那组作为主段落原文
    paraBanks.sort((a, b) => b.length - a.length)
    body = paraBanks[0].join('\n\n')
  }

  // 2) stem 合并（用于 COMPLETION 填空，题目 stem 本身是摘要），当作 fallback / 摘要块
  const stems = []
  for (const q of sec.questions || []) {
    if (typeof q.stem === 'string' && q.stem.length > 20) stems.push(q.stem)
  }
  if (stems.length > 0 && !body) {
    body = '（注：当前源数据未收录该阅读全文，以下为基于题目的摘要还原——详情请参考真题试卷原文。）\n\n' + stems.join('\n')
  } else if (stems.length > 0 && body.length < 500) {
    body += '\n\n\n—— 基于题目的摘要还原 ——\n' + stems.join('\n')
  }

  // 3) 实在没有任何文本，放占位提示
  if (!body) {
    body = '（暂无原文收录，正在补充。请暂参考真题书籍。）'
  }

  return body
}

async function main() {
  const raw = JSON.parse(fs.readFileSync(ZHENTI + '/ielts_final.json', 'utf-8'))
  let matched = 0, noText = 0, miss = 0, placeholder = 0

  for (const [bookKey, bookData] of Object.entries(raw)) {
    const m = bookKey.match(/^IELTS(\d+)(-[AG])?$/)
    if (!m) continue
    const volume = m[1]
    const isG = m[2] === '-G'
    const srcPrefix = isG ? 'IELTS_G' : 'IELTS'
    const srcTag = isG ? `g:${volume}` : volume

    for (const test of bookData.tests) {
      const tno = test.test_no
      for (let i = 0; i < (test.reading || []).length; i++) {
        const sec = test.reading[i]
        const passageNo =
          (typeof sec.passage === 'number' ? sec.passage : null) ??
          (typeof sec.passage_no === 'number' ? sec.passage_no : null) ??
          i + 1
        const text = extractReadingText(sec)
        const sourceUrl = `ielts:${srcTag}:test:${tno}:read:passage:${passageNo}`
        const existing = await p.content.findUnique({
          where: { source_sourceUrl: { source: srcPrefix, sourceUrl } },
        })
        if (!existing) { miss++; continue }
        const curLen = (existing.content || '').length
        if (/暂无原文收录/.test(text) && curLen === 0) {
          placeholder++
          await p.content.update({ where: { id: existing.id }, data: { content: text } })
          continue
        }
        if (text.length > Math.max(curLen, 200)) {
          await p.content.update({ where: { id: existing.id }, data: { content: text } })
          matched++
        } else if (curLen === 0 && text.length > 0) {
          noText++
          await p.content.update({ where: { id: existing.id }, data: { content: text } })
        }
      }
    }
  }

  console.log(`IELTS reading 原文注入:
  用长选项拼出真原文并替换/注入 = ${matched}
  只有摘要 fallback = ${noText}
  完全空 = ${placeholder} (写了占位提示)
  没匹配到 DB 记录 = ${miss}`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
