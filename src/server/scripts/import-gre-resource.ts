/**
 * 从 ERICXUCHI/GRE-Resource 获取 GRE 题库数据
 * 
 * 工作流程：
 * 1. 从 GitHub API 获取文件列表
 * 2. 下载关键 PDF 文件
 * 3. 用 pdfjs 提取文本
 * 4. 解析填空题和阅读题
 * 5. 写入 ExamBook + Content + ContentQuestion
 * 
 * 运行：cd src/server && npx tsx scripts/import-gre-resource.ts
 */
import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'
import type { ExamCategory, BookDataSource } from '@prisma/client'

const DATA_SOURCE: BookDataSource = 'OPENSOURCE'
const REPO_API = 'https://api.github.com/repos/ERICXUCHI/GRE-Resource/contents'

// ─── 工具函数 ──────────────────────────────────────────────

async function fetchJson(url: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    } catch (e: any) {
      if (attempt < retries - 1) {
        console.log(`  (retry ${attempt + 1}/${retries}: ${e.message})`)
        await new Promise(r => setTimeout(r, 2000))
      } else {
        throw e
      }
    }
  }
  throw new Error('unreachable')
}

async function downloadFile(url: string, retries = 3): Promise<Buffer> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(60000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const arrayBuffer = await res.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (e: any) {
      if (attempt < retries - 1) {
        console.log(`  (retry ${attempt + 1}/${retries}: ${e.message})`)
        await new Promise(r => setTimeout(r, 3000))
      } else {
        throw e
      }
    }
  }
  throw new Error('unreachable')
}

// ─── PDF 解析 ──────────────────────────────────────────────

async function parsePdfText(buffer: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
  const loadingTask = (pdfjs as any).getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  })
  const doc = await loadingTask.promise
  let text = ''
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item: any) => item.str).join('')
    text += pageText + '\n'
  }
  await doc.destroy()
  return text
}

// ─── GRE 填空题解析 ──────────────────────────────────────────────

interface ParsedGREQuestion {
  number: number
  stem: string
  options: string[] | null
  answer: string | null
  type: 'BLANK' | 'MCQ' | 'READING'
}

interface ParsedGREPassage {
  passageText: string
  questions: ParsedGREQuestion[]
}

/**
 * 解析 GRE 填空题
 * 格式通常为：
 *   1. Despite the _______ , the team managed to complete the project.
 *   A. setbacks  B. advantages  C. breakthroughs  D. challenges  E. opportunities
 */
function parseFillBlanks(text: string): ParsedGREQuestion[] {
  const questions: ParsedGREQuestion[] = []
  
  // GRE填空题格式：题号. 题干（含空格） 选项A-E
  // 匹配模式：数字. 开头，后面有 _____ 或 blank，然后是 A. B. C. D. E. 选项
  const pattern = /(\d{1,3})\.\s+(.+?)(?=\d{1,3}\.\s|[A-E]\.\s|$)/gs
  
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    const num = parseInt(match[1])
    const stem = match[2].trim()
    
    if (stem.length < 10) continue
    if (num < 1 || num > 1000) continue
    
    // 检查是否包含空格标记
    const hasBlank = /_{2,}|blank/i.test(stem)
    if (!hasBlank) continue
    
    questions.push({
      number: num,
      stem,
      options: null, // 选项可能在题干后面
      answer: null,
      type: 'BLANK',
    })
  }
  
  return questions
}

/**
 * 解析 GRE 阅读题
 * 格式通常为：
 *   [文章段落]
 *   1. The author's main purpose is to...
 *   A. option  B. option  C. option  D. option  E. option
 */
function parseReadingQuestions(text: string): ParsedGREPassage[] {
  const passages: ParsedGREPassage[] = []
  
  // GRE阅读理解格式：文章段落 + 题目
  // 简化解析：按题号分组
  const questionPattern = /(\d{1,2})\.\s+(.+?)(?=\d{1,2}\.\s|[A-E]\.\s|$)/gs
  
  let match: RegExpExecArray | null
  const questions: ParsedGREQuestion[] = []
  while ((match = questionPattern.exec(text)) !== null) {
    const num = parseInt(match[1])
    const stem = match[2].trim()
    
    if (stem.length < 10) continue
    if (num < 1 || num > 50) continue
    
    questions.push({
      number: num,
      stem,
      options: null,
      answer: null,
      type: 'READING',
    })
  }
  
  if (questions.length > 0) {
    passages.push({
      passageText: text.substring(0, 2000), // 简化：取前2000字作为文章
      questions,
    })
  }
  
  return passages
}

// ─── 主流程 ──────────────────────────────────────────────

async function main() {
  console.log('=== ERICXUCHI/GRE-Resource 导入 ===\n')

  const prisma = getPrisma()

  // 要处理的文件列表
  const targetFiles = [
    { path: '500题.pdf', title: 'GRE 500题（填空）', category: 'GRE' as ExamCategory, type: 'fill_blank' },
    { path: 'GRE阅读题库2019年.pdf', title: 'GRE 阅读题库 2019', category: 'GRE' as ExamCategory, type: 'reading' },
    { path: 'GRE填空习题集.pdf', title: 'GRE 填空习题集', category: 'GRE' as ExamCategory, type: 'fill_blank' },
    { path: 'GRE阅读题库（270+120）.pdf', title: 'GRE 阅读题库（270+120）', category: 'GRE' as ExamCategory, type: 'reading' },
  ]

  let totalBooks = 0
  let totalContents = 0
  let totalQuestions = 0
  let failed = 0

  for (const file of targetFiles) {
    console.log(`\n→ ${file.title} ...`)

    try {
      // 获取文件信息
      const fileInfo = await fetchJson(`${REPO_API}/${encodeURIComponent(file.path)}`)
      console.log(`  文件大小: ${fileInfo.size} bytes`)

      // 下载 PDF
      console.log(`  下载中...`)
      const pdfBuffer = await downloadFile(fileInfo.download_url)
      console.log(`  下载完成: ${pdfBuffer.length} bytes`)

      // 提取文本
      console.log(`  解析PDF...`)
      const text = await parsePdfText(pdfBuffer)
      console.log(`  提取文本: ${text.length} chars`)

      if (text.length < 100) {
        console.log(`  ⚠ 文本太少，可能是扫描件PDF`)
        failed++
        continue
      }

      // 创建 ExamBook
      const bookId = `gre-ericxuchi-${file.type}`
      await prisma.examBook.upsert({
        where: { id: bookId },
        update: {
          title: file.title,
          category: file.category,
          dataSource: DATA_SOURCE,
          description: `来源: ERICXUCHI/GRE-Resource`,
        },
        create: {
          id: bookId,
          title: file.title,
          category: file.category,
          dataSource: DATA_SOURCE,
          description: `来源: ERICXUCHI/GRE-Resource`,
        },
      })
      totalBooks++

      // 解析题目
      let questions: ParsedGREQuestion[] = []
      if (file.type === 'fill_blank') {
        questions = parseFillBlanks(text)
      } else {
        const passages = parseReadingQuestions(text)
        for (let i = 0; i < passages.length; i++) {
          const p = passages[i]
          const contentId = `${bookId}-passage${i}`
          await prisma.content.upsert({
            where: { id: contentId },
            update: {
              type: 'ARTICLE' as any,
              title: `${file.title} - Passage ${i + 1}`,
              source: 'ERICXUCHI/GRE-Resource',
              sourceUrl: `${fileInfo.html_url}#passage${i}`,
              content: p.passageText,
              bookId,
              bookOrder: i + 1,
              isPublished: true,
            },
            create: {
              id: contentId,
              type: 'ARTICLE' as any,
              title: `${file.title} - Passage ${i + 1}`,
              source: 'ERICXUCHI/GRE-Resource',
              sourceUrl: `${fileInfo.html_url}#passage${i}`,
              content: p.passageText,
              bookId,
              bookOrder: i + 1,
              isPublished: true,
            },
          })
          totalContents++

          for (const q of p.questions) {
            const qId = `${contentId}-q${q.number}`
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
            totalQuestions++
          }
        }
        continue
      }

      // 填空题：创建一个 Content 放所有题目
      if (questions.length > 0) {
        const contentId = `${bookId}-all`
        await prisma.content.upsert({
          where: { id: contentId },
          update: {
            type: 'ARTICLE' as any,
            title: `${file.title} - All Questions`,
            source: 'ERICXUCHI/GRE-Resource',
            sourceUrl: fileInfo.html_url,
            content: text.substring(0, 5000),
            bookId,
            bookOrder: 1,
            isPublished: true,
          },
          create: {
            id: contentId,
            type: 'ARTICLE' as any,
            title: `${file.title} - All Questions`,
            source: 'ERICXUCHI/GRE-Resource',
            sourceUrl: fileInfo.html_url,
            content: text.substring(0, 5000),
            bookId,
            bookOrder: 1,
            isPublished: true,
          },
        })
        totalContents++

        for (const q of questions) {
          const qId = `${contentId}-q${q.number}`
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
          totalQuestions++
        }

        console.log(`  ✓ ${questions.length} 题`)
      } else {
        console.log(`  ⚠ 未解析出题目`)
      }
    } catch (e: any) {
      console.log(`  ✗ 错误: ${e.message}`)
      failed++
    }
  }

  console.log(`\n=== 导入完成 ===`)
  console.log(`  书目: ${totalBooks}`)
  console.log(`  内容: ${totalContents}`)
  console.log(`  题目: ${totalQuestions}`)
  if (failed > 0) console.log(`  失败: ${failed}`)

  await disconnectPrisma()
  console.log('\n完成!')
}

main().catch(console.error)
