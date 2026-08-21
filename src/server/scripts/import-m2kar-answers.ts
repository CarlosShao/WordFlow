/**
 * 从 GitHub m2kar/KaoYan-English 仓库获取考研英语答案解析
 *
 * 工作流程：
 * 1. 从 GitHub API 获取"答案解析"目录下所有 PDF 文件
 * 2. 下载每个 PDF 并提取文本
 * 3. 用正则提取答案（完形填空 1-10, 阅读理解 11-50 等）
 * 4. 更新数据库中已有题目的 answer 字段
 *
 * 运行：cd src/server && npx tsx scripts/import-m2kar-answers.ts
 */
import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

const GITHUB_API = 'https://api.github.com/repos/m2kar/KaoYan-English/contents/%E7%AD%94%E6%A1%88%E8%A7%A3%E6%9E%90'

interface AnswerEntry {
  questionNumber: number
  answer: string
}

// ─── 工具函数 ──────────────────────────────────────────────

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/vnd.github.v3+json',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return res.json()
}

async function downloadPdf(url: string, retries = 3): Promise<Buffer> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const arrayBuffer = await res.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (e: any) {
      if (attempt < retries - 1) {
        console.log(`    (retry ${attempt + 1}/${retries}: ${e.message})`)
        await new Promise(r => setTimeout(r, 2000))
      } else {
        throw e
      }
    }
  }
  throw new Error('unreachable')
}

// ─── 答案提取 ──────────────────────────────────────────────

/**
 * 从答案解析 PDF 文本中提取选择题答案
 * 支持两种格式：
 * 1. 集中列表格式（2000年等旧版）：1. C 2. A 3. B 4. A 5. C ...
 * 2. 分散格式（2001年+）：在每题解析中有 [答案] D
 *    题号在前如 "1.[A] as to 关于，至于 ...[答案] D[解析]"
 */
function extractAnswers(text: string, year: number): AnswerEntry[] {
  const answers: AnswerEntry[] = []
  const fullText = text.replace(/\r/g, '')
  const seen = new Set<number>()

  // 策略1：匹配 [答案]X 或 【答案】X 格式（2001年+ 的分散格式）
  // 文本拼接后格式为:
  //   2001-2004: "1.[A] as to ...[答案] D[解析]"
  //   2005+:     "1.[A] although ...【答案】 D【考点】"
  // 先找答案标记，然后往前找最近的题号
  const answerMarker = /[\[【]答案[\]】]\s*([ABCD])/g
  let amMatch: RegExpExecArray | null
  while ((amMatch = answerMarker.exec(fullText)) !== null) {
    const ans = amMatch[1]
    const answerPos = amMatch.index
    
    // 往前找最近的题号: 数字后跟点
    const beforeText = fullText.substring(Math.max(0, answerPos - 500), answerPos)
    const numMatch = beforeText.match(/(\d{1,2})\./g)
    if (numMatch && numMatch.length > 0) {
      // 取最后一个匹配的题号
      const lastNum = numMatch[numMatch.length - 1].match(/(\d{1,2})/)!
      const num = parseInt(lastNum[1])
      if (num >= 1 && num <= 60 && !seen.has(num)) {
        seen.add(num)
        answers.push({ questionNumber: num, answer: ans })
      }
    }
  }

  // 策略2：如果策略1没提取到足够答案，用集中列表格式匹配
  // 格式: "1. C 2. A 3. B 4. A 5. C 6. D 7. B 8.D 9. C 10. D"
  if (answers.length < 10) {
    const pattern2 = /(\d{1,2})\s*\.\s*([ABCD])\b/g
    let match: RegExpExecArray | null
    while ((match = pattern2.exec(fullText)) !== null) {
      const num = parseInt(match[1])
      const ans = match[2]
      if (num < 1 || num > 60) continue
      if (seen.has(num)) continue
      seen.add(num)
      answers.push({ questionNumber: num, answer: ans })
    }
  }

  return answers
}

// ─── 主流程 ──────────────────────────────────────────────

async function main() {
  console.log('=== m2kar 考研英语答案解析导入 ===\n')

  // 动态导入 pdfjs-dist
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')

  const parsePdf = async (buffer: Buffer): Promise<string> => {
    const loadingTask = (pdfjs as any).getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    })
    const doc = await loadingTask.promise
    let text = ''
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      // 用空字符串拼接（不要用 \n），这样 [ 答案 ] D 会变成 [答案] D
      const pageText = content.items
        .map((item: any) => item.str)
        .join('')
      text += pageText + '\n'
    }
    await doc.destroy()
    return text
  }

  // 1. 获取答案解析目录下的所有文件
  console.log('[1] 获取 GitHub 仓库文件列表...')
  const files = await fetchJson(GITHUB_API)
  const pdfFiles = files.filter((f: any) => f.name.endsWith('.pdf'))
  console.log(`  找到 ${pdfFiles.length} 个 PDF 文件`)

  const prisma = getPrisma()
  let totalUpdated = 0
  let totalAnswers = 0
  let failed = 0

  console.log('\n[2] 开始下载并提取答案...\n')

  for (const file of pdfFiles) {
    // 从文件名提取年份
    const yearMatch = file.name.match(/(\d{4})/)
    if (!yearMatch) {
      console.log(`  ⚠ 无法识别年份: ${file.name}`)
      continue
    }
    const year = parseInt(yearMatch[1])

    console.log(`  → ${year} 年 ...`)

    try {
      const pdfBuffer = await downloadPdf(file.download_url)
      const text = await parsePdf(pdfBuffer)
      const answers = extractAnswers(text, year)

      if (answers.length === 0) {
        console.log(`    ⚠ 未提取到答案`)
        failed++
        continue
      }

      console.log(`    提取到 ${answers.length} 个答案`)

      // 更新数据库中已有题目的答案
      // 烧词站数据的 sourceUrl 格式：https://zhenti.burningvocabulary.cn/kaoyan/{year}/01#sec{0}
      // 我们需要找到对应年份的题目

      // 批量查找对应年份的所有题目
      const contents = await prisma.content.findMany({
        where: {
          source: '烧词真题站',
          sourceUrl: { contains: `/kaoyan/${year}/` },
        },
        include: { contentQuestions: true },
      })

      if (contents.length === 0) {
        console.log(`    ⚠ 数据库中未找到 ${year} 年的题目`)
        continue
      }

      const allQuestions = contents.flatMap(c => c.contentQuestions)
      console.log(`    数据库中找到 ${allQuestions.length} 道题目`)

      for (const ans of answers) {
        // 找到对应题号的题目
        const q = allQuestions.find(q => q.order === ans.questionNumber)
        if (q) {
          // 如果题目没有答案，或者答案不同，则更新
          const currentAns = q.answer && q.answer.length > 0 ? q.answer[0] : null
          if (currentAns !== ans.answer) {
            await prisma.contentQuestion.update({
              where: { id: q.id },
              data: { answer: [ans.answer] },
            })
            totalUpdated++
          }
        }
      }
      totalAnswers += answers.length
    } catch (e: any) {
      console.log(`    ✗ 错误: ${e.message}`)
      failed++
    }
  }

  console.log(`\n[3] 导入完成`)
  console.log(`  提取答案总数: ${totalAnswers}`)
  console.log(`  更新题目数: ${totalUpdated}`)
  if (failed > 0) console.log(`  失败: ${failed}`)

  // 统计：有多少题目已有答案
  const totalQuestions = await prisma.contentQuestion.count({
    where: { content: { source: '烧词真题站' } },
  })
  const answeredQuestions = await prisma.contentQuestion.count({
    where: {
      content: { source: '烧词真题站' },
      NOT: { answer: { equals: [] } },
    },
  })
  console.log(`\n[4] 数据库统计:`)
  console.log(`  烧词站总题目: ${totalQuestions}`)
  console.log(`  已有答案: ${answeredQuestions} (${totalQuestions > 0 ? Math.round(answeredQuestions / totalQuestions * 100) : 0}%)`)

  await disconnectPrisma()
  console.log('\n[5] 完成!')
}

main().catch(console.error)
