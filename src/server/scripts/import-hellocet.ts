/**
 * 从 GitHub HashCookie/HelloCET 仓库实际获取并导入四六级真题数据
 *
 * 数据结构：
 *   public/data/{CET4|CET6}/{year}/{examName}/  → 题目 JSON（每 section 一个文件）
 *   public/answers/{CET4|CET6}/{examName}.json   → 答案 JSON
 *
 * 题目类型：
 *   ListeningComprehension.json     → 听力（ passages + questions + options ）
 *   ReadingComprehensionA.json      → 选词填空（Banked Cloze, 15 选 10）
 *   ReadingComprehensionB.json      → 长篇阅读（信息匹配，段落匹配题）
 *   ReadingComprehensionC.json      → 仔细阅读（2 篇 × 5 题）
 *   Writing.json / Translation.json  → 写作/翻译（如有）
 *
 * 答案格式：{ "ListeningComprehension": {"1":"D",...}, "ReadingComprehension": {"26":"D",...}, "Writing":"...", "Translation":"..." }
 *
 * 运行：cd src/server && npx tsx scripts/import-hellocet.ts
 */
import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'
import type { ExamCategory, BookDataSource } from '@prisma/client'

// ─── 配置 ──────────────────────────────────────────────
const GITHUB_API = 'https://api.github.com/repos/HashCookie/HelloCET/git/trees/main?recursive=1'
const RAW_BASE = 'https://raw.githubusercontent.com/HashCookie/HelloCET/main/'
const DATA_SOURCE: BookDataSource = 'OPENSOURCE'

interface TreeItem {
  path: string
  type: string
  sha: string
  size?: number
}

interface AnswerData {
  ListeningComprehension?: Record<string, string>
  ReadingComprehension?: Record<string, string>
  Writing?: string
  Translation?: string
}

// HelloCET 题目 JSON 的各种结构
interface ReadingAData {
  title: string
  passages: string[]
  options: Record<string, string> // {"A":"associated","B":"examine",...}
}

interface ReadingBData {
  title: string
  passageTitle: string
  passages: string[]
  questions: { Number: number; Statement: string }[]
}

interface ReadingCData {
  title: string
  passagesOne: string[]
  questionsOne: { Number: number; Statement: string; Options: { key: string; text: string }[] }[]
  passagesTwo: string[]
  questionsTwo: { Number: number; Statement: string; Options: { key: string; text: string }[] }[]
}

interface ListeningData {
  title: string
  passages: string[]
  questions: { Number: number; Statement: string; Options?: { key: string; text: string }[] }[]
}

// ─── 工具 ──────────────────────────────────────────────

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'WordFlow-Importer/1.0',
      'Accept': 'application/vnd.github+json',
    },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`)
  }
  return res.json()
}

async function fetchRaw(path: string): Promise<any> {
  const url = RAW_BASE + encodeURIComponent(path).replace(/%2F/g, '/')
  // GitHub raw 可以直接用，但中文路径需要特殊处理
  const res = await fetch(RAW_BASE + path, {
    headers: { 'User-Agent': 'WordFlow-Importer/1.0' },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching raw ${path}`)
  }
  return res.json()
}

// 从文件名解析年份和套号
function parseExamName(filename: string): { category: ExamCategory; year: number; examTitle: string; set: number } | null {
  // e.g. "2017年12月英语四级真题_第1套"
  const m = filename.match(/(\d{4})年(\d{1,2})月英语(四级|六级)真题_第(\d)套/)
  if (!m) return null
  const [, yearStr, monthStr, level, setStr] = m
  const category: ExamCategory = level === '四级' ? 'CET4' : 'CET6'
  return {
    category,
    year: parseInt(yearStr),
    examTitle: `${yearStr}年${monthStr}月英语${level}真题 第${setStr}套`,
    set: parseInt(setStr),
  }
}

// ─── 主流程 ──────────────────────────────────────────────

async function main() {
  console.log('=== HelloCET 真题数据导入 ===\n')

  // 1. 获取仓库文件树
  console.log('[1/5] 获取 HelloCET 仓库文件树...')
  const tree = await fetchJson(GITHUB_API)
  const allItems: TreeItem[] = tree.tree.filter((t: TreeItem) => t.type === 'blob')

  // 2. 找出所有套题目录
  const dataFiles = allItems.filter(t => t.path.startsWith('public/data/CET'))
  const answerFiles = allItems.filter(t => t.path.startsWith('public/answers/CET'))

  // 收集套题名（去重）
  const examSet = new Map<string, { category: ExamCategory; year: number; examTitle: string; set: number }>()
  for (const item of dataFiles) {
    const parts = item.path.split('/')
    if (parts.length < 5) continue
    const filename = parts[4] // e.g. "2017年12月英语四级真题_第1套"
    const info = parseExamName(filename)
    if (info) {
      examSet.set(filename, info)
    }
  }

  // CET6 answer 目录
  const cet6AnswerFiles = allItems.filter(t => t.path.startsWith('public/answers/CET6/'))
  for (const item of cet6AnswerFiles) {
    const filename = item.path.split('/').pop()!.replace('.json', '')
    const info = parseExamName(filename)
    if (info) {
      examSet.set(filename, info)
    }
  }

  console.log(`  找到 ${examSet.size} 套真题`)
  console.log(`  CET4: ${[...examSet.values()].filter(e => e.category === 'CET4').length} 套`)
  console.log(`  CET6: ${[...examSet.values()].filter(e => e.category === 'CET6').length} 套\n`)

  const prisma = getPrisma()
  let bookCount = 0
  let sectionCount = 0
  let questionCount = 0

  // 3. 逐套处理
  console.log('[2/5] 开始逐套获取并处理数据...')
  for (const [examName, info] of examSet) {
    const { category, year, examTitle } = info

    // 创建 ExamBook
    const book = await prisma.examBook.upsert({
      where: {
        id: `hellocet-${category}-${examName}`,
      },
      update: {
        title: examTitle,
        category,
        dataSource: DATA_SOURCE,
        year,
        description: `HelloCET 开源真题 - ${examTitle}`,
      },
      create: {
        id: `hellocet-${category}-${examName}`,
        title: examTitle,
        category,
        dataSource: DATA_SOURCE,
        year,
        description: `HelloCET 开源真题 - ${examTitle}`,
      },
    })
    bookCount++

    // 获取答案文件
    const answerPath = `public/answers/${category}/${examName}.json`
    let answerData: AnswerData = {}
    try {
      answerData = await fetchRaw(answerPath)
    } catch (e) {
      console.warn(`  ⚠ 答案文件缺失: ${answerPath}`)
    }

    // 处理每个 section
    const examDir = `public/data/${category}/${year}/${examName}`
    const sectionFiles = dataFiles.filter(t => t.path.startsWith(examDir + '/'))

    for (const sf of sectionFiles) {
      const sectionName = sf.path.split('/').pop()!.replace('.json', '')
      let sectionData: any
      try {
        sectionData = await fetchRaw(sf.path)
      } catch (e) {
        console.warn(`  ⚠ 无法获取 ${sf.path}`)
        continue
      }

      const result = processSection(sectionName, sectionData, answerData, examTitle)
      if (!result) continue

      // 写入 Content
      const contentId = `hellocet-${category}-${examName}-${sectionName}`
      await prisma.content.upsert({
        where: { id: contentId },
        update: {
          type: result.contentType,
          title: result.title,
          source: 'HelloCET',
          sourceUrl: `https://github.com/HashCookie/HelloCET/blob/main/${sf.path}`,
          content: result.passageText,
          bookId: book.id,
          bookOrder: result.order,
          isPublished: true,
        },
        create: {
          id: contentId,
          type: result.contentType,
          title: result.title,
          source: 'HelloCET',
          sourceUrl: `https://github.com/HashCookie/HelloCET/blob/main/${sf.path}`,
          content: result.passageText,
          bookId: book.id,
          bookOrder: result.order,
          isPublished: true,
        },
      })
      sectionCount++

      // 写入题目
      for (const q of result.questions) {
        await prisma.contentQuestion.upsert({
          where: { id: q.id },
          update: {
            contentId,
            type: q.type,
            stem: q.stem,
            options: q.options ?? null,
            answer: q.answer,
            explanation: q.explanation,
            order: q.order,
          },
          create: {
            id: q.id,
            contentId,
            type: q.type,
            stem: q.stem,
            options: q.options ?? null,
            answer: q.answer,
            explanation: q.explanation,
            order: q.order,
          },
        })
        questionCount++
      }
    }

    // 处理写作和翻译（如果答案文件中有）
    if (answerData.Writing) {
      const contentId = `hellocet-${category}-${examName}-Writing`
      await prisma.content.upsert({
        where: { id: contentId },
        update: {
          type: 'ARTICLE',
          title: `${examTitle} - 写作`,
          source: 'HelloCET',
          content: answerData.Writing,
          bookId: book.id,
          bookOrder: 5,
          isPublished: true,
        },
        create: {
          id: contentId,
          type: 'ARTICLE',
          title: `${examTitle} - 写作`,
          source: 'HelloCET',
          content: answerData.Writing,
          bookId: book.id,
          bookOrder: 5,
          isPublished: true,
        },
      })
      sectionCount++
    }

    if (answerData.Translation) {
      const contentId = `hellocet-${category}-${examName}-Translation`
      await prisma.content.upsert({
        where: { id: contentId },
        update: {
          type: 'ARTICLE',
          title: `${examTitle} - 翻译`,
          source: 'HelloCET',
          content: answerData.Translation,
          bookId: book.id,
          bookOrder: 6,
          isPublished: true,
        },
        create: {
          id: contentId,
          type: 'ARTICLE',
          title: `${examTitle} - 翻译`,
          source: 'HelloCET',
          content: answerData.Translation,
          bookId: book.id,
          bookOrder: 6,
          isPublished: true,
        },
      })
      sectionCount++
    }
  }

  console.log(`\n[3/5] 数据导入完成`)
  console.log(`  书目: ${bookCount}`)
  console.log(`  段落: ${sectionCount}`)
  console.log(`  题目: ${questionCount}`)

  // 4. 统计验证
  console.log('\n[4/5] 数据库统计验证:')
  const stats = await prisma.examBook.groupBy({
    by: ['category', 'dataSource'],
    where: { dataSource: DATA_SOURCE },
    _count: { _all: true },
  })
  for (const s of stats) {
    console.log(`  ${s.category} [${s.dataSource}]: ${s._count._all} 套`)
  }

  console.log('\n[5/5] 完成!')
  await disconnectPrisma()
}

// ─── Section 处理逻辑 ──────────────────────────────────────────────

interface ProcessedSection {
  contentType: 'LISTENING' | 'ARTICLE' | 'SPEAKING'
  title: string
  passageText: string
  order: number
  questions: {
    id: string
    type: any
    stem: string
    options: any
    answer: any
    explanation?: string
    order: number
  }[]
}

function processSection(
  sectionName: string,
  data: any,
  answerData: AnswerData,
  examTitle: string,
): ProcessedSection | null {
  const prefix = `hellocet-${sectionName}`

  switch (sectionName) {
    case 'ListeningComprehension': {
      const ld = data as ListeningData
      const passageText = ld.passages?.join('\n\n') || ''
      const answers = answerData.ListeningComprehension || {}
      const questions = (ld.questions || []).map((q, i) => {
        const num = q.Number
        const ans = answers[String(num)] || ''
        return {
          id: `${prefix}-q${num}`,
          type: 'MCQ' as const,
          stem: `${num}. ${q.Statement}`,
          options: q.Options ? q.Options.map(o => `${o.key}. ${o.text}`) : null,
          answer: [ans],
          order: i,
        }
      })
      return {
        contentType: 'LISTENING',
        title: `${examTitle} - 听力理解`,
        passageText,
        order: 1,
        questions,
      }
    }

    case 'ReadingComprehensionA': {
      // 选词填空 (Banked Cloze): 26-35
      const rd = data as ReadingAData
      const passageText = rd.passages?.join('\n\n') || ''
      const options = rd.options || {}
      const optionArray = Object.entries(options).map(([k, v]) => `${k}. ${v}`)
      const answers = answerData.ReadingComprehension || {}

      // 从 passages 中提取空位编号
      const blankNums: number[] = []
      for (let i = 26; i <= 35; i++) {
        if (answers[String(i)]) blankNums.push(i)
      }

      const questions = blankNums.map((num, i) => {
        const ans = answers[String(num)] || ''
        return {
          id: `${prefix}-q${num}`,
          type: 'COMPLETION' as const,
          stem: `Blank ${num}: ${options[ans] || '_____'}`,
          options: optionArray,
          answer: [ans],
          order: i,
        }
      })
      return {
        contentType: 'ARTICLE',
        title: `${examTitle} - 选词填空`,
        passageText,
        order: 2,
        questions,
      }
    }

    case 'ReadingComprehensionB': {
      // 长篇阅读 (信息匹配): 36-45
      const rd = data as ReadingBData
      const passageText = rd.passages?.join('\n\n') || ''
      const answers = answerData.ReadingComprehension || {}

      const questions = (rd.questions || []).map((q, i) => {
        const num = q.Number
        const ans = answers[String(num)] || ''
        return {
          id: `${prefix}-q${num}`,
          type: 'MATCHING' as const,
          stem: `${num}. ${q.Statement}`,
          options: null,
          answer: [ans],
          order: i,
        }
      })
      return {
        contentType: 'ARTICLE',
        title: `${examTitle} - 长篇阅读`,
        passageText,
        order: 3,
        questions,
      }
    }

    case 'ReadingComprehensionC': {
      // 仔细阅读: 46-55
      const rd = data as ReadingCData
      const passageText = [
        ...(rd.passagesOne || []),
        '---',
        ...(rd.passagesTwo || []),
      ].join('\n\n')
      const answers = answerData.ReadingComprehension || {}

      const allQs = [...(rd.questionsOne || []), ...(rd.questionsTwo || [])]
      const questions = allQs.map((q, i) => {
        const num = q.Number
        const ans = answers[String(num)] || ''
        return {
          id: `${prefix}-q${num}`,
          type: 'MCQ' as const,
          stem: `${num}. ${q.Statement}`,
          options: q.Options ? q.Options.map(o => `${o.key}. ${o.text}`) : null,
          answer: [ans],
          order: i,
        }
      })
      return {
        contentType: 'ARTICLE',
        title: `${examTitle} - 仔细阅读`,
        passageText,
        order: 4,
        questions,
      }
    }

    default:
      return null
  }
}

main().catch(console.error)
