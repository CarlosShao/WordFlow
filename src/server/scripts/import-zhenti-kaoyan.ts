/**
 * 从烧词真题站（zhenti.burningvocabulary.cn）获取考研英语真题并导入数据库
 *
 * 工作流程：
 * 1. 从列表页获取所有套题 URL（2000-2026 年，英一/英二）
 * 2. 访问每套题页面，从 HTML 中提取 globalConfig（含 PDF URL 加密参数）
 * 3. 下载 PDF 文件
 * 4. 用 pdf-parse 提取文本
 * 5. 解析完形填空、阅读理解等题型
 * 6. 写入 ExamBook + Content + ContentQuestion
 *
 * 运行：cd src/server && npx tsx scripts/import-zhenti-kaoyan.ts
 */
import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'
import type { ExamCategory, BookDataSource } from '@prisma/client'

const DATA_SOURCE: BookDataSource = 'CURATED'
const SITE_BASE = 'https://zhenti.burningvocabulary.cn'

interface GlobalConfig {
  title: string
  filePath: string
  pdfHost: string
  fnameVersion?: number
  fn: { f1: string[]; f2: string[] }
  year: number
}

// ─── 工具函数 ──────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return res.text()
}

function extractGlobalConfig(html: string): GlobalConfig | null {
  // 找到 globalConfig = { 开始位置
  const startIdx = html.indexOf('globalConfig')
  if (startIdx < 0) return null
  const braceStart = html.indexOf('{', startIdx)
  if (braceStart < 0) return null

  // 手动匹配大括号，考虑字符串内的花括号
  let depth = 0
  let inString = false
  let escape = false
  let endIdx = -1
  for (let i = braceStart; i < html.length; i++) {
    const ch = html[i]
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\' && inString) {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) {
        endIdx = i
        break
      }
    }
  }
  if (endIdx < 0) return null

  const jsonStr = html.substring(braceStart, endIdx + 1)
  try {
    // 用 eval 因为 globalConfig 不是严格 JSON（含 HTML 标签等）
    const cfg = eval(`(${jsonStr})`)
    return cfg
  } catch (e) {
    console.error('Failed to parse globalConfig:', e)
    return null
  }
}

function buildPdfUrl(cfg: GlobalConfig): string {
  const combined = cfg.fn.f1.concat(cfg.fn.f2).reverse().join('')
  const v = cfg.fnameVersion ? `?v=${cfg.fnameVersion}` : ''
  return `${cfg.pdfHost}/images/read/${cfg.filePath}/${combined}.pdf${v}`
}

async function downloadPdf(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading PDF from ${url}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// ─── 获取所有套题列表 ──────────────────────────────────────────────

async function getExamList(): Promise<{ url: string; year: number; type: string }[]> {
  console.log('[1] 获取考研真题列表...')
  const html = await fetchHtml(`${SITE_BASE}/kaoyan`)
  const exams: { url: string; year: number; type: string }[] = []

  // 匹配 /kaoyan/2025/01 和 /kaoyan/2025/02 等
  const matches = [...html.matchAll(/href="(\/kaoyan\/(\d{4})\/(\d{2}))"/g)]
  for (const m of matches) {
    const [, path, yearStr, typeStr] = m
    const year = parseInt(yearStr)
    const type = typeStr === '01' ? '英语一' : typeStr === '02' ? '英语二' : '统一卷'
    exams.push({ url: `${SITE_BASE}${path}`, year, type })
  }

  // 去重
  const seen = new Set<string>()
  const unique = exams.filter(e => {
    const key = e.url
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  console.log(`  找到 ${unique.length} 套真题`)
  return unique
}

// ─── PDF 文本解析 ──────────────────────────────────────────────

interface ParsedSection {
  type: 'use_of_english' | 'reading_a' | 'reading_b' | 'reading_c' | 'translation' | 'writing'
  title: string
  passageText: string
  questions: ParsedQuestion[]
}

interface ParsedQuestion {
  number: number
  stem: string
  options: string[] | null
  answer: string | null
}

function parsePdfText(text: string, year: number, examType: string): ParsedSection[] {
  const sections: ParsedSection[] = []

  // 清理文本：移除页码行和 URL 行
  const cleanText = text
    .replace(/\r/g, '')
    .replace(/\d+\s+https:\/\/zhenti\.burningvocabulary\.\w+/g, '') // 移除页码+URL行
    .replace(/\n{3,}/g, '\n\n')
  const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  // 合并为一个大文本方便正则匹配
  const fullText = lines.join('\n')

  // 找 Section I Use of English
  const useOfEnglishMatch = fullText.match(/Section\s*I\s*Use\s*of\s*English([\s\S]*?)(?=Section\s*II|$)/i)
  if (useOfEnglishMatch) {
    const passage = useOfEnglishMatch[1]
    // 提取选项：格式为 1. A. xxx B. xxx C. xxx D. xxx 2. A. xxx ...
    const questions: ParsedQuestion[] = []
    // 改进的正则：匹配每题的所有4个选项
    const optionPattern = /(\d+)\.\s*A[\.\s]+(.+?)\s+B[\.\s]+(.+?)\s+C[\.\s]+(.+?)\s+D[\.\s]+(.+?)(?=\d+\.\s*A[\.\s]|$)/gs
    let match
    while ((match = optionPattern.exec(passage)) !== null) {
      const num = parseInt(match[1])
      questions.push({
        number: num,
        stem: `Blank ${num}`,
        options: [`A. ${match[2].trim()}`, `B. ${match[3].trim()}`, `C. ${match[4].trim()}`, `D. ${match[5].trim()}`],
        answer: null,
      })
    }

    // 去掉选项部分的 passage（只保留文章正文）
    const passageOnly = passage
      .replace(/(\d+)\.\s*A[\.\s]+[\s\S]*?(?=Section\s*II|$)/gi, '')
      .replace(/Directions:.*?(?=There|Located|In|The|A|For|Self|It|This|When|If|While|After|Before)/i, '')
      .trim()

    if (questions.length > 0 || passageOnly.length > 50) {
      sections.push({
        type: 'use_of_english',
        title: 'Use of English (完形填空)',
        passageText: passageOnly || passage,
        questions,
      })
    }
  }

  // 找 Section II Reading Comprehension
  const readingMatch = fullText.match(/Section\s*II\s*Reading\s*Comprehension([\s\S]*?)(?=Section\s*III|$)/i)
  if (readingMatch) {
    const readingText = readingMatch[1]
    // 提取阅读题
    const readingQuestions: ParsedQuestion[] = []
    // 阅读题格式：21. Question text... A. option B. option C. option D. option
    const readingQPattern = /(\d{1,2})\.\s+(.+?)\s+A[\.\s]+(.+?)\s+B[\.\s]+(.+?)\s+C[\.\s]+(.+?)\s+D[\.\s]+(.+?)(?=\d{1,2}\.\s|Part\s|Section|$)/gs
    let rMatch
    while ((rMatch = readingQPattern.exec(readingText)) !== null) {
      const num = parseInt(rMatch[1])
      const stem = rMatch[2].trim()
      readingQuestions.push({
        number: num,
        stem,
        options: [`A. ${rMatch[3].trim()}`, `B. ${rMatch[4].trim()}`, `C. ${rMatch[5].trim()}`, `D. ${rMatch[6].trim()}`],
        answer: null,
      })
    }

    sections.push({
      type: 'reading_a',
      title: 'Reading Comprehension (阅读理解)',
      passageText: readingText,
      questions: readingQuestions,
    })
  }

  // 找 Section III Translation
  const transMatch = fullText.match(/Section\s*III\s*Translation([\s\S]*?)(?=Section\s*IV|$)/i)
  if (transMatch) {
    sections.push({
      type: 'translation',
      title: 'Translation (翻译)',
      passageText: transMatch[1].trim(),
      questions: [],
    })
  }

  // 找 Section IV Writing
  const writingMatch = fullText.match(/Section\s*IV\s*Writing([\s\S]*?)$/i)
  if (writingMatch) {
    sections.push({
      type: 'writing',
      title: 'Writing (写作)',
      passageText: writingMatch[1].trim(),
      questions: [],
    })
  }

  return sections
}

// ─── 主流程 ──────────────────────────────────────────────

async function main() {
  console.log('=== 烧词真题站 考研真题导入 ===\n')

  // 动态导入 pdfjs-dist（支持加密 PDF）
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
  
  // 封装 PDF 文本提取
  const parsePdf = async (buffer: Buffer): Promise<string> => {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    })
    const doc = await loadingTask.promise
    let text = ''
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ')
      text += pageText + '\n'
    }
    await doc.destroy()
    return text
  }

  // 1. 获取套题列表
  const exams = await getExamList()

  const prisma = getPrisma()
  let bookCount = 0
  let sectionCount = 0
  let questionCount = 0
  let failed = 0

  console.log('\n[2] 开始逐套下载并处理...\n')

  for (const exam of exams) {
    const { url, year, type } = exam
    console.log(`  → ${year} ${type} ...`)

    try {
      // 获取页面 HTML
      const html = await fetchHtml(url)
      const cfg = extractGlobalConfig(html)
      if (!cfg) {
        console.log(`    ⚠ 无法解析 globalConfig，跳过`)
        failed++
        continue
      }

      // 下载 PDF
      const pdfUrl = buildPdfUrl(cfg)
      const pdfBuffer = await downloadPdf(pdfUrl)

      // 提取文本
      const text = await parsePdf(pdfBuffer)

      // 解析题目
      const sections = parsePdfText(text, year, type)
      if (sections.length === 0) {
        console.log(`    ⚠ 未解析出任何题目段落`)
        failed++
        continue
      }

      // 写入数据库
      const category: ExamCategory = 'KAOYAN'
      const bookId = `zhenti-kaoyan-${year}-${type}`

      await prisma.examBook.upsert({
        where: { id: bookId },
        update: {
          title: `${year}年考研${type}`,
          category,
          dataSource: DATA_SOURCE,
          year,
          description: `烧词真题站 - ${year}年考研${type}`,
        },
        create: {
          id: bookId,
          title: `${year}年考研${type}`,
          category,
          dataSource: DATA_SOURCE,
          year,
          description: `烧词真题站 - ${year}年考研${type}`,
        },
      })
      bookCount++

      for (let i = 0; i < sections.length; i++) {
        const s = sections[i]
        const contentId = `zhenti-kaoyan-${year}-${type}-sec${i}`

        const contentType = s.type === 'translation' || s.type === 'writing' ? 'ARTICLE' : 'ARTICLE'

        await prisma.content.upsert({
          where: { id: contentId },
          update: {
            type: contentType as any,
            title: `${year}年考研${type} - ${s.title}`,
            source: '烧词真题站',
            sourceUrl: `${url}#sec${i}`,
            content: s.passageText,
            bookId,
            bookOrder: i + 1,
            isPublished: true,
          },
          create: {
            id: contentId,
            type: contentType as any,
            title: `${year}年考研${type} - ${s.title}`,
            source: '烧词真题站',
            sourceUrl: `${url}#sec${i}`,
            content: s.passageText,
            bookId,
            bookOrder: i + 1,
            isPublished: true,
          },
        })
        sectionCount++

        for (const q of s.questions) {
          const qId = `zhenti-kaoyan-${year}-${type}-sec${i}-q${q.number}`
          await prisma.contentQuestion.upsert({
            where: { id: qId },
            update: {
              contentId,
              type: 'MCQ',
              stem: q.stem,
              options: q.options,
              answer: q.answer ? [q.answer] : [],
              order: q.number,
            },
            create: {
              id: qId,
              contentId,
              type: 'MCQ',
              stem: q.stem,
              options: q.options,
              answer: q.answer ? [q.answer] : [],
              order: q.number,
            },
          })
          questionCount++
        }
      }

      console.log(`    ✓ ${sections.length} 段落, ${sections.reduce((a, s) => a + s.questions.length, 0)} 题目`)
    } catch (e: any) {
      console.log(`    ✗ 错误: ${e.message}`)
      failed++
    }
  }

  console.log(`\n[3] 导入完成`)
  console.log(`  书目: ${bookCount}`)
  console.log(`  段落: ${sectionCount}`)
  console.log(`  题目: ${questionCount}`)
  if (failed > 0) console.log(`  失败: ${failed}`)

  // 统计
  console.log('\n[4] 数据库统计:')
  const stats = await prisma.examBook.groupBy({
    by: ['category', 'dataSource'],
    _count: { _all: true },
    where: { dataSource: DATA_SOURCE },
  })
  for (const s of stats) {
    console.log(`  ${s.category} [${s.dataSource}]: ${s._count._all} 套`)
  }

  await disconnectPrisma()
  console.log('\n[5] 完成!')
}

main().catch(console.error)
