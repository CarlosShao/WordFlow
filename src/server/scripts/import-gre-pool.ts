/**
 * 从 GitHub MinhasKamal/GRExercise 仓库获取 ETS 官方 GRE Issue/Argument 写作题库池并导入数据库
 *
 * 数据结构：
 * - res/strings/ets-issue-pool/NNNq.txt - Issue 题目
 * - res/strings/ets-issue-pool/NNNd.txt - Issue 写作指令
 * - res/strings/ets-argument-pool/NNNq.txt - Argument 题目
 * - res/strings/ets-argument-pool/NNNd.txt - Argument 写作指令
 *
 * 运行：cd src/server && npx tsx scripts/import-gre-pool.ts
 */
import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'
import type { BookDataSource } from '@prisma/client'

const DATA_SOURCE: BookDataSource = 'OFFICIAL'
const RAW_BASE = 'https://raw.githubusercontent.com/MinhasKamal/GRExercise/main/res/strings'
const API_BASE = 'https://api.github.com/repos/MinhasKamal/GRExercise/contents'

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return res.text()
}

async function getFileList(dir: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/${dir}`, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Mozilla/5.0',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} listing ${dir}`)
  const items = await res.json()
  return items
    .filter((i: any) => i.type === 'file' && i.name.endsWith('q.txt'))
    .map((i: any) => i.name.replace('q.txt', ''))
}

async function main() {
  console.log('=== ETS GRE Issue/Argument 题库池导入 ===\n')

  const prisma = getPrisma()

  // ─── 1. Issue Pool ─────────────────────────────────
  console.log('[1] 获取 GRE Issue 题库列表...')
  const issueIds = await getFileList('res/strings/ets-issue-pool')
  console.log(`  找到 ${issueIds.length} 道 Issue 题`)

  console.log('\n[2] 下载并导入 Issue 题目...')
  let issueCount = 0
  for (const id of issueIds) {
    try {
      const question = await fetchText(`${RAW_BASE}/ets-issue-pool/${id}q.txt`)
      let direction = ''
      try {
        direction = await fetchText(`${RAW_BASE}/ets-issue-pool/${id}d.txt`)
      } catch {}

      const contentId = `gre-issue-${id}`

      await prisma.content.upsert({
        where: { id: contentId },
        update: {
          type: 'ARTICLE',
          title: `GRE Issue #${id}`,
          source: 'ETS Official (GRExercise)',
          sourceUrl: `https://github.com/MinhasKamal/GRExercise/blob/main/res/strings/ets-issue-pool/${id}q.txt`,
          content: question.trim(),
          isPublished: true,
        },
        create: {
          id: contentId,
          type: 'ARTICLE',
          title: `GRE Issue #${id}`,
          source: 'ETS Official (GRExercise)',
          sourceUrl: `https://github.com/MinhasKamal/GRExercise/blob/main/res/strings/ets-issue-pool/${id}q.txt`,
          content: question.trim(),
          isPublished: true,
        },
      })

      // 添加写作指令作为题目
      if (direction) {
        await prisma.contentQuestion.upsert({
          where: { id: `${contentId}-q1` },
          update: {
            contentId,
            type: 'SHORT_ANSWER',
            stem: direction.trim(),
            options: null,
            answer: [],
            order: 1,
          },
          create: {
            id: `${contentId}-q1`,
            contentId,
            type: 'SHORT_ANSWER',
            stem: direction.trim(),
            options: null,
            answer: [],
            order: 1,
          },
        })
      }

      issueCount++
    } catch (e: any) {
      console.log(`  ⚠ Issue #${id} 失败: ${e.message}`)
    }
  }
  console.log(`  ✓ 导入 ${issueCount} 道 Issue 题`)

  // ─── 2. Argument Pool ─────────────────────────────────
  console.log('\n[3] 获取 GRE Argument 题库列表...')
  const argIds = await getFileList('res/strings/ets-argument-pool')
  console.log(`  找到 ${argIds.length} 道 Argument 题`)

  console.log('\n[4] 下载并导入 Argument 题目...')
  let argCount = 0
  for (const id of argIds) {
    try {
      const question = await fetchText(`${RAW_BASE}/ets-argument-pool/${id}q.txt`)
      let direction = ''
      try {
        direction = await fetchText(`${RAW_BASE}/ets-argument-pool/${id}d.txt`)
      } catch {}

      const contentId = `gre-argument-${id}`

      await prisma.content.upsert({
        where: { id: contentId },
        update: {
          type: 'ARTICLE',
          title: `GRE Argument #${id}`,
          source: 'ETS Official (GRExercise)',
          sourceUrl: `https://github.com/MinhasKamal/GRExercise/blob/main/res/strings/ets-argument-pool/${id}q.txt`,
          content: question.trim(),
          isPublished: true,
        },
        create: {
          id: contentId,
          type: 'ARTICLE',
          title: `GRE Argument #${id}`,
          source: 'ETS Official (GRExercise)',
          sourceUrl: `https://github.com/MinhasKamal/GRExercise/blob/main/res/strings/ets-argument-pool/${id}q.txt`,
          content: question.trim(),
          isPublished: true,
        },
      })

      if (direction) {
        await prisma.contentQuestion.upsert({
          where: { id: `${contentId}-q1` },
          update: {
            contentId,
            type: 'SHORT_ANSWER',
            stem: direction.trim(),
            options: null,
            answer: [],
            order: 1,
          },
          create: {
            id: `${contentId}-q1`,
            contentId,
            type: 'SHORT_ANSWER',
            stem: direction.trim(),
            options: null,
            answer: [],
            order: 1,
          },
        })
      }

      argCount++
    } catch (e: any) {
      console.log(`  ⚠ Argument #${id} 失败: ${e.message}`)
    }
  }
  console.log(`  ✓ 导入 ${argCount} 道 Argument 题`)

  // ─── 3. 创建 ExamBook 汇总 ─────────────────────────────────
  console.log('\n[5] 创建 ExamBook 汇总...')

  // Issue Book
  const issueBookId = 'gre-issue-pool'
  await prisma.examBook.upsert({
    where: { id: issueBookId },
    update: {
      title: 'GRE Issue 题库池 (ETS 官方)',
      category: 'GRE',
      dataSource: DATA_SOURCE,
      description: `ETS 官方 GRE Issue 题库池，共 ${issueCount} 道题。来源：MinhasKamal/GRExercise`,
    },
    create: {
      id: issueBookId,
      title: 'GRE Issue 题库池 (ETS 官方)',
      category: 'GRE',
      dataSource: DATA_SOURCE,
      description: `ETS 官方 GRE Issue 题库池，共 ${issueCount} 道题。来源：MinhasKamal/GRExercise`,
    },
  })

  // 将 Issue contents 关联到 book
  await prisma.content.updateMany({
    where: { source: 'ETS Official (GRExercise)', content: { contains: 'society' } },
    data: { bookId: issueBookId },
  })

  // Argument Book
  const argBookId = 'gre-argument-pool'
  await prisma.examBook.upsert({
    where: { id: argBookId },
    update: {
      title: 'GRE Argument 题库池 (ETS 官方)',
      category: 'GRE',
      dataSource: DATA_SOURCE,
      description: `ETS 官方 GRE Argument 题库池，共 ${argCount} 道题。来源：MinhasKamal/GRExercise`,
    },
    create: {
      id: argBookId,
      title: 'GRE Argument 题库池 (ETS 官方)',
      category: 'GRE',
      dataSource: DATA_SOURCE,
      description: `ETS 官方 GRE Argument 题库池，共 ${argCount} 道题。来源：MinhasKamal/GRExercise`,
    },
  })

  console.log('\n[6] 导入完成!')
  console.log(`  Issue: ${issueCount} 道`)
  console.log(`  Argument: ${argCount} 道`)

  await disconnectPrisma()
  console.log('\n[7] 完成!')
}

main().catch(console.error)
