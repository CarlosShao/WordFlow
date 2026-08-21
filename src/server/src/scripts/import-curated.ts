/**
 * 精选题库导入脚本 — 按调研报告推荐数据源导入高质量真题
 *
 * 数据来源分层：
 *   - OFFICIAL   → 官方免费样题（ETS / BC / IELTS.org 等）
 *   - OPENSOURCE → 开源项目数据（HelloCET / m2kar / ERICXUCHI 等）
 *   - CURATED    → 精选高质量数据源（小站/考满分等公开页面人工采集后导入）
 *
 * 本脚本支持子命令：
 *   list       → 列出当前数据库中各来源的真题书数量
 *   helloCET   → 从 HelloCET GitHub 仓库导入四六级结构化真题
 *   greIssue   → 从 ETS 官方网页导入 GRE Issue 写作题库
 *   greArg     → 从 ETS 官方网页导入 GRE Argument 写作题库
 *
 * 用法：
 *   npx tsx src/scripts/import-curated.ts list
 *   npx tsx src/scripts/import-curated.ts helloCET
 *   npx tsx src/scripts/import-curated.ts greIssue
 *   npx tsx src/scripts/import-curated.ts greArg
 *
 * 调研文档参考：
 *   - DELIVERY/exam-sources-research/调研报告_五类考试题库数据源.md
 *   - DELIVERY/exam-sources-research/data-sources/subagent_01_ielts.md
 *   - DELIVERY/exam-sources-research/data-sources/subagent_02_toefl.md
 *   - DELIVERY/exam-sources-research/data-sources/subagent_03_gre.md
 *   - DELIVERY/exam-sources-research/data-sources/subagent_04_cet.md
 *   - DELIVERY/exam-sources-research/data-sources/subagent_05_kaoyan.md
 */
import { getPrisma } from '../common/prisma.js'
import { logger } from '../common/logger.js'

const prisma = getPrisma()

// ─── 通用工具 ──────────────────────────────────────────────

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA, Referer: new URL(url).origin },
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      logger.warn({ url, status: res.status }, 'import-curated: fetch not ok')
      return null
    }
    return await res.text()
  } catch (err) {
    logger.warn({ err, url }, 'import-curated: fetch failed')
    return null
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      logger.warn({ url, status: res.status }, 'import-curated: json fetch not ok')
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    logger.warn({ err, url }, 'import-curated: json fetch failed')
    return null
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n+\s*/g, '\n')
    .trim()
}

// ─── 子命令: list ──────────────────────────────────────────

async function listSources() {
  const books = await prisma.examBook.groupBy({
    by: ['dataSource'],
    _count: { _all: true },
  })
  console.log('\n=== 当前真题书数据来源统计 ===')
  for (const row of books) {
    console.log(`  ${row.dataSource.padEnd(12)} → ${row._count._all} 套`)
  }
  console.log('')
}

// ─── 子命令: helloCET ──────────────────────────────────────
// HelloCET: GitHub HashCookie/HelloCET
//   - 77 套结构化 JSON 试卷：CET4 2017-06~2023-03, CET6 2017-06~2022-12
//   - 每套含 writing directions, listening 选项, reading 分区, translation 题干
//   - 配套 answers.json：逐题答案 + 写作参考范文 + 翻译参考译文
//   - GPL-3.0（自用学习风险可控，商用需评估）
//
// 调研报告推荐优先级：P0（唯一结构化+答案+范文全备源）

async function importHelloCET() {
  console.log('\n=== 导入 HelloCET 四六级真题 ===')
  console.log('数据源: github.com/HashCookie/HelloCET (GPL-3.0)')
  console.log('覆盖范围: CET4 2017-06~2023-03, CET6 2017-06~2022-12\n')

  // 通过 jsdelivr CDN 获取仓库目录结构
  // HelloCET 的数据组织：每套真题一个 JSON 文件 + 对应的 answers.json
  const CDN_BASE = 'https://cdn.jsdelivr.net/gh/HashCookie/HelloCET@main'

  // 获取仓库文件列表
  interface GhTreeEntry {
    path: string
    type: string
  }
  const tree = await fetchJson<{ tree: GhTreeEntry[] }>(
    'https://api.github.com/repos/HashCookie/HelloCET/git/trees/main?recursive=1',
  )
  if (!tree || !tree.tree) {
    console.error('无法获取 HelloCET 仓库文件列表')
    return
  }

  // 找出所有试卷 JSON 文件（非 answers 文件）
  const examFiles = tree.tree
    .filter(
      (e) =>
        e.type === 'blob' &&
        e.path.endsWith('.json') &&
        !e.path.includes('answers') &&
        !e.path.includes('package') &&
        !e.path.includes('tsconfig'),
    )
    .map((e) => e.path)

  console.log(`发现 ${examFiles.length} 个试卷文件`)

  let imported = 0
  let skipped = 0

  for (const filePath of examFiles) {
    // 解析文件名获取考试类型和场次信息
    // 文件名格式: cet4/2017-6-1.json 或 cet6/2018-12-2.json
    const parts = filePath.split('/')
    const fileName = parts[parts.length - 1].replace('.json', '')
    const dirName = parts[0] // cet4 or cet6
    const isCET4 = dirName.toLowerCase().includes('cet4') || dirName.toLowerCase().includes('cet-4')
    const isCET6 = dirName.toLowerCase().includes('cet6') || dirName.toLowerCase().includes('cet-6')

    if (!isCET4 && !isCET6) {
      skipped++
      continue
    }

    const category = isCET4 ? 'CET4' : 'CET6'

    // 解析年份和月份
    const match = fileName.match(/(\d{4})-(\d{1,2})/)
    if (!match) {
      skipped++
      continue
    }
    const year = parseInt(match[1], 10)
    const month = parseInt(match[2], 10)

    const title = `CET${isCET4 ? '4' : '6'} ${year}年${month}月 第${fileName.match(/(\d)$/)?.[1] ?? '1'}套`

    // 获取试卷 JSON
    const examUrl = `${CDN_BASE}/${filePath}`
    const examData = await fetchJson<Record<string, unknown>>(examUrl)
    if (!examData) {
      console.warn(`  跳过: ${filePath} (无法获取)`)
      skipped++
      continue
    }

    // 获取答案 JSON
    const answerPath = filePath.replace('.json', '-answers.json')
    // 也尝试在 answers 子目录找
    const answerUrl = `${CDN_BASE}/${answerPath}`
    const answerData = await fetchJson<Record<string, unknown>>(answerUrl)

    // 检查是否已存在（幂等）
    const existing = await prisma.examBook.findFirst({
      where: {
        title,
        dataSource: 'OPENSOURCE',
      },
    })
    if (existing) {
      skipped++
      continue
    }

    // 创建 ExamBook
    const book = await prisma.examBook.create({
      data: {
        category,
        dataSource: 'OPENSOURCE',
        title,
        year,
        description: `HelloCET 结构化真题 - ${fileName}（来源: github.com/HashCookie/HelloCET, GPL-3.0）`,
      },
    })

    // 解析试卷内容，创建 Content 记录
    // HelloCET 的 JSON 结构通常包含：writing, listening, reading, translation 四个部分
    const sections = parseHelloCETExam(examData, answerData, title)
    let bookOrder = 0
    for (const sec of sections) {
      await prisma.content.create({
        data: {
          title: sec.title,
          type: sec.type,
          source: `HelloCET_${category}`,
          sourceUrl: `${examUrl}#${sec.section}`,
          content: sec.content,
          translation: sec.translation,
          bookId: book.id,
          bookOrder: bookOrder++,
          isPublished: true,
        },
      })
    }

    console.log(`  导入: ${title} (${sections.length} 段)`)
    imported++
  }

  console.log(`\n导入完成: ${imported} 套, 跳过 ${skipped} 套`)
}

interface HelloCETSection {
  title: string
  type: 'ARTICLE' | 'LISTENING' | 'SPEAKING'
  section: string
  content: string
  translation?: string
}

function parseHelloCETExam(
  examData: Record<string, unknown>,
  answerData: Record<string, unknown> | null,
  bookTitle: string,
): HelloCETSection[] {
  const sections: HelloCETSection[] = []

  // Writing section
  const writing = examData.writing as
    | { directions?: string; question?: string; title?: string }
    | undefined
  if (writing?.directions || writing?.question) {
    const writingContent = [writing?.directions, writing?.question, writing?.title]
      .filter(Boolean)
      .join('\n\n')
    const refEssay = answerData?.referenceEssay as string | undefined
    sections.push({
      title: `${bookTitle} - 写作`,
      type: 'ARTICLE',
      section: 'writing',
      content: writingContent,
      translation: refEssay,
    })
  }

  // Listening section
  const listening = examData.listening as
    | { questions?: Array<{ stem?: string; options?: string[] }> }
    | undefined
  if (listening?.questions?.length) {
    const listenContent = listening.questions
      .map((q, i) => {
        const opts = (q.options ?? []).map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`).join('\n')
        return `Q${i + 1}. ${q.stem ?? ''}\n${opts}`
      })
      .join('\n\n')
    sections.push({
      title: `${bookTitle} - 听力`,
      type: 'LISTENING',
      section: 'listening',
      content: listenContent,
    })
  }

  // Reading sections
  const reading = examData.reading as
    | { passages?: Array<{ passage?: string; questions?: Array<{ stem?: string; options?: string[] }> }> }
    | undefined
  if (reading?.passages?.length) {
    reading.passages.forEach((p, idx) => {
      const passageText = p.passage ?? ''
      const qText = (p.questions ?? [])
        .map((q, i) => {
          const opts = (q.options ?? []).map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`).join('\n')
          return `Q${i + 1}. ${q.stem ?? ''}\n${opts}`
        })
        .join('\n\n')
      sections.push({
        title: `${bookTitle} - 阅读 Passage ${idx + 1}`,
        type: 'ARTICLE',
        section: `reading-${idx + 1}`,
        content: `${passageText}\n\n--- Questions ---\n${qText}`,
      })
    })
  }

  // Translation section
  const translation = examData.translation as { question?: string; directions?: string } | undefined
  if (translation?.question || translation?.directions) {
    const transContent = [translation?.directions, translation?.question].filter(Boolean).join('\n\n')
    const refTrans = answerData?.referenceTranslation as string | undefined
    sections.push({
      title: `${bookTitle} - 翻译`,
      type: 'ARTICLE',
      section: 'translation',
      content: transContent,
      translation: refTrans,
    })
  }

  return sections
}

// ─── 子命令: greIssue / greArg ─────────────────────────────
// ETS 官方 GRE Issue/Argument 题库池
//   - 调研报告推荐优先级: P0（唯一权威、免费、低风险，写作功能命脉）
//   - URL: https://www.ets.org/gre/test-takers/general-test/prepare/content/analytical-writing/issue.html
//   - URL: https://www.ets.org/gre/test-takers/general-test/prepare/content/analytical-writing/argument.html
//   - 含官方评分范文（5/6 分样本）

async function importGrePool(type: 'issue' | 'argument') {
  const url =
    type === 'issue'
      ? 'https://www.ets.org/gre/test-takers/general-test/prepare/content/analytical-writing/issue.html'
      : 'https://www.ets.org/gre/test-takers/general-test/prepare/content/analytical-writing/argument.html'

  console.log(`\n=== 导入 GRE ${type === 'issue' ? 'Issue' : 'Argument'} 题库池 ===`)
  console.log(`数据源: ${url}\n`)

  const html = await fetchPage(url)
  if (!html) {
    console.error('无法获取 ETS 官网页面')
    return
  }

  // ETS 官方页面通常将题目放在 <p> 标签中
  // 提取所有可能的题目文本
  const topicRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
  const topics: string[] = []
  let match: RegExpExecArray | null
  while ((match = topicRegex.exec(html)) !== null) {
    const text = stripHtml(match[1]).trim()
    // 过滤：题目通常 >= 30 字符，不含导航/菜单文本
    if (text.length >= 30 && !text.includes('Copyright') && !text.includes('All rights reserved') && !text.includes('nav')) {
      topics.push(text)
    }
  }

  if (topics.length === 0) {
    console.error('未能从页面提取到任何题目，ETS 可能已更新页面结构')
    console.log('（ETS 官网有 403 反爬可能，请尝试使用浏览器手动获取）')
    return
  }

  console.log(`从 ETS 官方页面提取到 ${topics.length} 个候选题目`)

  // 检查是否已存在
  const title = `GRE ${type === 'issue' ? 'Issue' : 'Argument'} 题库池`
  const existing = await prisma.examBook.findFirst({
    where: { title, dataSource: 'OFFICIAL' },
  })
  if (existing) {
    console.log(`已存在: ${title}，跳过`)
    return
  }

  // 创建 ExamBook
  const book = await prisma.examBook.create({
    data: {
      category: 'GRE',
      dataSource: 'OFFICIAL',
      title,
      description: `ETS 官方 ${type === 'issue' ? 'Issue' : 'Argument'} 写作题库池（来源: ${url}）`,
    },
  })

  // 将题目内容存为 Content
  const content = topics.map((t, i) => `### Topic ${i + 1}\n\n${t}`).join('\n\n---\n\n')
  await prisma.content.create({
    data: {
      title: `${title} - 全部题目`,
      type: 'ARTICLE',
      source: 'ETS_OFFICIAL',
      sourceUrl: url,
      content,
      bookId: book.id,
      bookOrder: 0,
      isPublished: true,
    },
  })

  console.log(`导入完成: ${title} (${topics.length} 题)`)
}

// ─── 主入口 ────────────────────────────────────────────────

const command = process.argv[2]

async function main() {
  switch (command) {
    case 'list':
      await listSources()
      break
    case 'helloCET':
      await importHelloCET()
      break
    case 'greIssue':
      await importGrePool('issue')
      break
    case 'greArg':
      await importGrePool('argument')
      break
    default:
      console.log(`
用法: npx tsx src/scripts/import-curated.ts <command>

可用命令:
  list       列出当前数据库中各来源的真题书数量
  helloCET   从 HelloCET GitHub 仓库导入四六级结构化真题
  greIssue   从 ETS 官方网页导入 GRE Issue 写作题库池
  greArg     从 ETS 官方网页导入 GRE Argument 写作题库池

调研文档参考:
  DELIVERY/exam-sources-research/调研报告_五类考试题库数据源.md
`)
      break
  }
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('导入脚本执行失败:', err)
  process.exit(1)
})
