/**
 * 从 Power TOEFL (power-toefl.com) 导入托福题库
 * 
 * 数据源：Supabase REST API（无需登录，anon key 公开）
 * 数据：482篇阅读文章 + 题目（含答案和中文解析）
 * 
 * 运行：cd src/server && npx tsx scripts/import-power-toefl.ts
 */
import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'
import type { BookDataSource } from '@prisma/client'

const DATA_SOURCE: BookDataSource = 'OPENSOURCE'
const SUPABASE_URL = 'https://tenayihnqaqwslswfrnn.supabase.co'

// 从前端 JS 中提取 anon key
async function getAnonKey(): Promise<string> {
  const jsRes = await fetch('https://power-toefl.com/assets/index-5RdqfUC4.js')
  const js = await jsRes.text()
  const keyMatch = js.match(/(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/)
  if (!keyMatch) throw new Error('未找到 Supabase anon key')
  return keyMatch[1]
}

async function fetchFromSupabase(table: string, query: string, apiKey: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase ${table} HTTP ${res.status}: ${text}`)
  }
  return res.json()
}

async function main() {
  console.log('=== Power TOEFL 导入 ===\n')

  const apiKey = await getAnonKey()
  console.log('获取到 Supabase API key')

  const prisma = getPrisma()

  // 1. 创建 ExamBook
  const bookId = 'toefl-power-toefl'
  const sections = ['reading', 'listening', 'speaking', 'writing'] as const
  
  let totalPassages = 0
  let totalQuestions = 0
  let failed = 0

  for (const section of sections) {
    console.log(`\n→ 处理 ${section} ...`)

    try {
      // 获取该 section 的所有文章
      const passages = await fetchFromSupabase(
        'passages',
        `select=id,section,passage_type,title,slug,content,word_count,difficulty,topic,subject_area,cefr_level,audio_text,audio_url,is_published&section=eq.${section}&is_published=eq.true&order=created_at.asc`,
        apiKey,
      )

      console.log(`  文章数: ${passages.length}`)

      if (passages.length === 0) {
        continue
      }

      // 创建该 section 的 ExamBook
      const sectionBookId = `${bookId}-${section}`
      const sectionTitle = {
        reading: 'Power TOEFL 阅读题库',
        listening: 'Power TOEFL 听力题库',
        speaking: 'Power TOEFL 口语题库',
        writing: 'Power TOEFL 写作题库',
      }[section]

      await prisma.examBook.upsert({
        where: { id: sectionBookId },
        update: {
          title: sectionTitle,
          category: 'TOEFL',
          dataSource: DATA_SOURCE,
          description: `来源: power-toefl.com (Supabase API), ${passages.length} 篇文章`,
        },
        create: {
          id: sectionBookId,
          title: sectionTitle,
          category: 'TOEFL',
          dataSource: DATA_SOURCE,
          description: `来源: power-toefl.com (Supabase API), ${passages.length} 篇文章`,
        },
      })

      // 按文章批量导入
      let bookOrder = 0
      for (const passage of passages) {
        bookOrder++
        const contentId = `toefl-pt-${section}-${passage.slug || passage.id}`

        // 构建文章内容
        let fullContent = passage.content || ''
        if (passage.audio_text) {
          fullContent += `\n\n[Audio Transcript]\n${passage.audio_text}`
        }

        await prisma.content.upsert({
          where: { id: contentId },
          update: {
            type: 'ARTICLE' as any,
            title: passage.title,
            source: 'power-toefl.com',
          sourceUrl: `https://power-toefl.com/zh-CN/questions/${section}#${passage.slug || passage.id}`,
          content: fullContent,
          bookId: sectionBookId,
          bookOrder,
          isPublished: true,
          tags: [passage.difficulty, passage.topic, passage.subject_area].filter(Boolean) as string[],
        },
        create: {
          id: contentId,
          type: 'ARTICLE' as any,
          title: passage.title,
          source: 'power-toefl.com',
          sourceUrl: `https://power-toefl.com/zh-CN/questions/${section}#${passage.slug || passage.id}`,
            content: fullContent,
            bookId: sectionBookId,
            bookOrder,
            isPublished: true,
            tags: [passage.difficulty, passage.topic, passage.subject_area].filter(Boolean) as string[],
          },
        })
        totalPassages++

        // 获取该文章下的所有题目
        const questions = await fetchFromSupabase(
          'pool_questions',
          `select=id,passage_id,section,question_type,question_number,slug,question_text,options,correct_answer,explanation,explanation_zh_cn,difficulty,skill_tag,trap_patterns&passage_id=eq.${passage.id}&is_published=eq.true&order=question_number.asc`,
          apiKey,
        )

        for (const q of questions) {
          const qId = `toefl-pt-${section}-${passage.slug || passage.id}-q${q.question_number}`
          
          // 构建选项数组
          let options: string[] | null = null
          if (q.options && Array.isArray(q.options)) {
            options = q.options.map((opt: string, i: number) => 
              `${String.fromCharCode(65 + i)}. ${opt}`
            )
          }

          // 构建解析
          let explanation = q.explanation || ''
          if (q.explanation_zh_cn) {
            explanation += `\n\n[中文解析]\n${q.explanation_zh_cn}`
          }
          if (q.trap_patterns && Array.isArray(q.trap_patterns) && q.trap_patterns.length > 0) {
            explanation += `\n\n[陷阱模式]\n${q.trap_patterns.join(', ')}`
          }

          await prisma.contentQuestion.upsert({
            where: { id: qId },
            update: {
              contentId,
              type: 'MCQ',
              stem: q.question_text,
              options,
              answer: q.correct_answer ? [q.correct_answer] : [],
              explanation: explanation || null,
              order: q.question_number,
            },
            create: {
              id: qId,
              contentId,
              type: 'MCQ',
              stem: q.question_text,
              options,
              answer: q.correct_answer ? [q.correct_answer] : [],
              explanation: explanation || null,
              order: q.question_number,
            },
          })
          totalQuestions++
        }
      }

      console.log(`  ✓ ${passages.length} 篇文章已导入`)
    } catch (e: any) {
      console.log(`  ✗ 错误: ${e.message}`)
      failed++
    }
  }

  // 导入 test_rounds 作为模考套题
  console.log('\n→ 导入模考轮次 ...')
  try {
    const rounds = await fetchFromSupabase(
      'test_rounds',
      'select=id,round_number,status,question_count,difficulty_tier,target_score,tags&order=round_number.asc',
      apiKey,
    )
    console.log(`  模考轮次: ${rounds.length}`)

    const roundsBookId = `${bookId}-rounds`
    await prisma.examBook.upsert({
      where: { id: roundsBookId },
      update: {
        title: 'Power TOEFL 模考套题',
        category: 'TOEFL',
        dataSource: DATA_SOURCE,
        description: `来源: power-toefl.com, ${rounds.length} 套模考`,
      },
      create: {
        id: roundsBookId,
        title: 'Power TOEFL 模考套题',
        category: 'TOEFL',
        dataSource: DATA_SOURCE,
        description: `来源: power-toefl.com, ${rounds.length} 套模考`,
      },
    })

    for (const round of rounds) {
      const contentId = `toefl-pt-round-${round.round_number}`
      await prisma.content.upsert({
        where: { id: contentId },
        update: {
          type: 'ARTICLE' as any,
          title: `Power TOEFL 模考 Round ${round.round_number}`,
          source: 'power-toefl.com',
          sourceUrl: `https://power-toefl.com/zh-CN/questions/cat#round-${round.round_number}`,
          content: `模考轮次 ${round.round_number}: ${round.question_count} 题, 难度: ${round.difficulty_tier}, 目标分数: ${round.target_score}`,
          bookId: roundsBookId,
          bookOrder: round.round_number,
          isPublished: true,
          tags: [round.difficulty_tier, ...(round.tags || [])].filter(Boolean) as string[],
        },
        create: {
          id: contentId,
          type: 'ARTICLE' as any,
          title: `Power TOEFL 模考 Round ${round.round_number}`,
          source: 'power-toefl.com',
          sourceUrl: `https://power-toefl.com/zh-CN/questions/cat#round-${round.round_number}`,
          content: `模考轮次 ${round.round_number}: ${round.question_count} 题, 难度: ${round.difficulty_tier}, 目标分数: ${round.target_score}`,
          bookId: roundsBookId,
          bookOrder: round.round_number,
          isPublished: true,
          tags: [round.difficulty_tier, ...(round.tags || [])].filter(Boolean) as string[],
        },
      })
    }
  } catch (e: any) {
    console.log(`  ✗ 错误: ${e.message}`)
    failed++
  }

  console.log(`\n=== 导入完成 ===`)
  console.log(`  文章: ${totalPassages}`)
  console.log(`  题目: ${totalQuestions}`)
  if (failed > 0) console.log(`  失败: ${failed}`)

  await disconnectPrisma()
  console.log('\n完成!')
}

main().catch(console.error)
