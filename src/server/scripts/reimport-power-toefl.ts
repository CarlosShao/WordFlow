/**
 * 重新导入 Power TOEFL 数据（修复版）
 * 
 * 修复点：
 * 1. section type 改为 READING / LISTENING（不再是 ARTICLE）
 * 2. 听力导入 audio_url
 * 3. 新增口语题库（speaking_prompts 表）
 * 4. 新增写作题库（writing_prompts 表）
 * 5. 模考套题导入真实题目（从 pool_questions 随机抽取）
 */
import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

const SUPABASE_URL = 'https://tenayihnqaqwslswfrnn.supabase.co'

async function getAnonKey(): Promise<string> {
  const jsRes = await fetch('https://power-toefl.com/assets/index-5RdqfUC4.js')
  const js = await jsRes.text()
  const keyMatch = js.match(/(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/)
  if (!keyMatch) throw new Error('未找到 Supabase anon key')
  return keyMatch[1]
}

async function fetchAll(table: string, query: string, apiKey: string): Promise<any[]> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`
  const res = await fetch(url, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase ${table} HTTP ${res.status}: ${text.substring(0, 200)}`)
  }
  return res.json()
}

async function main() {
  console.log('=== Power TOEFL 重新导入（修复版）===\n')
  const apiKey = await getAnonKey()
  const prisma = getPrisma()

  // ========== 1. 阅读题库 ==========
  console.log('[1] 阅读题库...')
  const readingPassages = await fetchAll(
    'passages',
    `select=id,section,passage_type,title,slug,content,word_count,difficulty,topic,subject_area,cefr_level,is_published&section=eq.reading&is_published=eq.true&order=created_at.asc`,
    apiKey,
  )
  console.log(`  阅读文章: ${readingPassages.length}`)

  const readingBookId = 'toefl-power-toefl-reading'
  await prisma.examBook.upsert({
    where: { id: readingBookId },
    update: { title: 'Power TOEFL 阅读题库', category: 'TOEFL', dataSource: 'CURATED',
      description: `来源: power-toefl.com, ${readingPassages.length} 篇阅读文章` },
    create: { id: readingBookId, title: 'Power TOEFL 阅读题库', category: 'TOEFL', dataSource: 'CURATED',
      description: `来源: power-toefl.com, ${readingPassages.length} 篇阅读文章` },
  })

  let rQCount = 0
  for (let i = 0; i < readingPassages.length; i++) {
    const passage = readingPassages[i]
    const contentId = `toefl-pt-reading-${passage.slug || passage.id}`
    
    await prisma.content.upsert({
      where: { id: contentId },
      update: {
        type: 'ARTICLE',
        title: passage.title,
        source: 'power-toefl.com',
        sourceUrl: `https://power-toefl.com/zh-CN/questions/reading#${passage.slug || passage.id}`,
        content: passage.content || '',
        audioUrl: null,
        bookId: readingBookId,
        bookOrder: i + 1,
        isPublished: true,
        tags: [passage.difficulty, passage.topic, passage.subject_area].filter(Boolean) as string[],
      },
      create: {
        id: contentId,
        type: 'ARTICLE',
        title: passage.title,
        source: 'power-toefl.com',
        sourceUrl: `https://power-toefl.com/zh-CN/questions/reading#${passage.slug || passage.id}`,
        content: passage.content || '',
        bookId: readingBookId,
        bookOrder: i + 1,
        isPublished: true,
        tags: [passage.difficulty, passage.topic, passage.subject_area].filter(Boolean) as string[],
      },
    })

    // 导入题目
    const questions = await fetchAll(
      'pool_questions',
      `select=id,passage_id,section,question_type,question_number,slug,question_text,options,correct_answer,explanation,explanation_zh_cn,difficulty,skill_tag,trap_patterns,is_published&passage_id=eq.${passage.id}&is_published=eq.true&order=question_number.asc`,
      apiKey,
    )

    for (const q of questions) {
      const qId = `toefl-pt-reading-${passage.slug || passage.id}-q${q.question_number}`
      let options: string[] | null = null
      if (q.options && Array.isArray(q.options)) {
        options = q.options.map((opt: string, idx: number) => `${String.fromCharCode(65 + idx)}. ${opt}`)
      }
      let explanation = q.explanation || ''
      if (q.explanation_zh_cn) explanation += `\n\n[中文解析]\n${q.explanation_zh_cn}`
      if (q.trap_patterns && Array.isArray(q.trap_patterns) && q.trap_patterns.length > 0) {
        explanation += `\n\n[陷阱模式]\n${q.trap_patterns.join(', ')}`
      }

      await prisma.contentQuestion.upsert({
        where: { id: qId },
        update: {
          contentId, type: 'MCQ',
          stem: q.question_text,
          options,
          answer: q.correct_answer ? [q.correct_answer] : [],
          explanation: explanation || null,
          order: q.question_number,
        },
        create: {
          id: qId, contentId, type: 'MCQ',
          stem: q.question_text,
          options,
          answer: q.correct_answer ? [q.correct_answer] : [],
          explanation: explanation || null,
          order: q.question_number,
        },
      })
      rQCount++
    }
  }
  console.log(`  题目: ${rQCount}`)

  // ========== 2. 听力题库 ==========
  console.log('\n[2] 听力题库...')
  const listeningPassages = await fetchAll(
    'passages',
    `select=id,section,passage_type,title,slug,content,audio_url,audio_text,word_count,difficulty,topic,subject_area,cefr_level,is_published&section=eq.listening&is_published=eq.true&order=created_at.asc`,
    apiKey,
  )
  console.log(`  听力文章: ${listeningPassages.length}`)

  const listeningBookId = 'toefl-power-toefl-listening'
  await prisma.examBook.upsert({
    where: { id: listeningBookId },
    update: { title: 'Power TOEFL 听力题库', category: 'TOEFL', dataSource: 'CURATED',
      description: `来源: power-toefl.com, ${listeningPassages.length} 篇听力文章` },
    create: { id: listeningBookId, title: 'Power TOEFL 听力题库', category: 'TOEFL', dataSource: 'CURATED',
      description: `来源: power-toefl.com, ${listeningPassages.length} 篇听力文章` },
  })

  let lQCount = 0
  for (let i = 0; i < listeningPassages.length; i++) {
    const passage = listeningPassages[i]
    const contentId = `toefl-pt-listening-${passage.slug || passage.id}`
    
    // 构建内容：如果有 audio_text，附加到 content 后
    let fullContent = passage.content || ''
    if (passage.audio_text) {
      fullContent += `\n\n[Audio Transcript]\n${passage.audio_text}`
    }

    await prisma.content.upsert({
      where: { id: contentId },
      update: {
        type: 'LISTENING',
        title: passage.title,
        source: 'power-toefl.com',
        sourceUrl: `https://power-toefl.com/zh-CN/questions/listening#${passage.slug || passage.id}`,
        content: fullContent,
        audioUrl: passage.audio_url || null,
        bookId: listeningBookId,
        bookOrder: i + 1,
        isPublished: true,
        tags: [passage.difficulty, passage.topic, passage.subject_area, passage.passage_type].filter(Boolean) as string[],
      },
      create: {
        id: contentId,
        type: 'LISTENING',
        title: passage.title,
        source: 'power-toefl.com',
        sourceUrl: `https://power-toefl.com/zh-CN/questions/listening#${passage.slug || passage.id}`,
        content: fullContent,
        audioUrl: passage.audio_url || null,
        bookId: listeningBookId,
        bookOrder: i + 1,
        isPublished: true,
        tags: [passage.difficulty, passage.topic, passage.subject_area, passage.passage_type].filter(Boolean) as string[],
      },
    })

    // 导入题目
    const questions = await fetchAll(
      'pool_questions',
      `select=id,passage_id,section,question_type,question_number,slug,question_text,options,correct_answer,explanation,explanation_zh_cn,difficulty,skill_tag,trap_patterns,is_published&passage_id=eq.${passage.id}&is_published=eq.true&order=question_number.asc`,
      apiKey,
    )

    for (const q of questions) {
      const qId = `toefl-pt-listening-${passage.slug || passage.id}-q${q.question_number}`
      let options: string[] | null = null
      if (q.options && Array.isArray(q.options)) {
        options = q.options.map((opt: string, idx: number) => `${String.fromCharCode(65 + idx)}. ${opt}`)
      }
      let explanation = q.explanation || ''
      if (q.explanation_zh_cn) explanation += `\n\n[中文解析]\n${q.explanation_zh_cn}`
      if (q.trap_patterns && Array.isArray(q.trap_patterns) && q.trap_patterns.length > 0) {
        explanation += `\n\n[陷阱模式]\n${q.trap_patterns.join(', ')}`
      }

      await prisma.contentQuestion.upsert({
        where: { id: qId },
        update: {
          contentId, type: 'MCQ',
          stem: q.question_text,
          options,
          answer: q.correct_answer ? [q.correct_answer] : [],
          explanation: explanation || null,
          order: q.question_number,
        },
        create: {
          id: qId, contentId, type: 'MCQ',
          stem: q.question_text,
          options,
          answer: q.correct_answer ? [q.correct_answer] : [],
          explanation: explanation || null,
          order: q.question_number,
        },
      })
      lQCount++
    }
  }
  console.log(`  题目: ${lQCount}`)

  // ========== 3. 口语题库 ==========
  console.log('\n[3] 口语题库...')
  const speakingPrompts = await fetchAll(
    'speaking_prompts',
    `select=id,task_type,task_number,slug,prompt_text,reading_passage,listening_passage,audio_text,sample_response,scoring_rubric,difficulty,topic,is_published,total_attempts,created_at&is_published=eq.true&order=task_number.asc`,
    apiKey,
  )
  console.log(`  口语题目: ${speakingPrompts.length}`)

  const speakingBookId = 'toefl-power-toefl-speaking'
  await prisma.examBook.upsert({
    where: { id: speakingBookId },
    update: { title: 'Power TOEFL 口语题库', category: 'TOEFL', dataSource: 'CURATED',
      description: `来源: power-toefl.com, ${speakingPrompts.length} 道口语题` },
    create: { id: speakingBookId, title: 'Power TOEFL 口语题库', category: 'TOEFL', dataSource: 'CURATED',
      description: `来源: power-toefl.com, ${speakingPrompts.length} 道口语题` },
  })

  for (let i = 0; i < speakingPrompts.length; i++) {
    const p = speakingPrompts[i]
    const contentId = `toefl-pt-speaking-${p.slug || p.id}`
    
    // 构建内容
    let fullContent = p.prompt_text || ''
    if (p.reading_passage) {
      fullContent = `[Reading Passage]\n${p.reading_passage}\n\n[Question]\n${fullContent}`
    }
    if (p.listening_passage) {
      fullContent += `\n\n[Listening Passage]\n${p.listening_passage}`
    }
    if (p.audio_text) {
      fullContent += `\n\n[Audio Transcript]\n${p.audio_text}`
    }
    if (p.sample_response) {
      fullContent += `\n\n---\n[Sample Response]\n${p.sample_response}`
    }
    if (p.scoring_rubric) {
      fullContent += `\n\n[Scoring Rubric]\n${p.scoring_rubric}`
    }

    await prisma.content.upsert({
      where: { id: contentId },
      update: {
        type: 'ARTICLE',
        title: `TOEFL Speaking Task ${p.task_number} (${p.task_type})`,
        source: 'power-toefl.com',
        sourceUrl: `https://power-toefl.com/zh-CN/questions/speaking#${p.slug || p.id}`,
        content: fullContent,
        bookId: speakingBookId,
        bookOrder: i + 1,
        isPublished: true,
        tags: [p.task_type, p.difficulty, p.topic].filter(Boolean) as string[],
      },
      create: {
        id: contentId,
        type: 'ARTICLE',
        title: `TOEFL Speaking Task ${p.task_number} (${p.task_type})`,
        source: 'power-toefl.com',
        sourceUrl: `https://power-toefl.com/zh-CN/questions/speaking#${p.slug || p.id}`,
        content: fullContent,
        bookId: speakingBookId,
        bookOrder: i + 1,
        isPublished: true,
        tags: [p.task_type, p.difficulty, p.topic].filter(Boolean) as string[],
      },
    })

    // 口语题作为一个 SHORT_ANSWER 题
    const qId = `toefl-pt-speaking-${p.slug || p.id}-q1`
    await prisma.contentQuestion.upsert({
      where: { id: qId },
      update: {
        contentId, type: 'SHORT_ANSWER',
        stem: p.prompt_text,
        options: null,
        answer: p.sample_response ? [p.sample_response] : [],
        explanation: p.scoring_rubric || null,
        order: 1,
      },
      create: {
        id: qId, contentId, type: 'SHORT_ANSWER',
        stem: p.prompt_text,
        options: null,
        answer: p.sample_response ? [p.sample_response] : [],
        explanation: p.scoring_rubric || null,
        order: 1,
      },
    })
  }
  console.log(`  口语题已导入`)

  // ========== 4. 写作题库 ==========
  console.log('\n[4] 写作题库...')
  const writingPrompts = await fetchAll(
    'writing_prompts',
    `select=id,task_type,task_number,slug,prompt_text,reading_passage,listening_passage,audio_text,sample_response,scoring_rubric,difficulty,topic,is_published,total_attempts,created_at&is_published=eq.true&order=task_number.asc`,
    apiKey,
  )
  console.log(`  写作题目: ${writingPrompts.length}`)

  const writingBookId = 'toefl-power-toefl-writing'
  await prisma.examBook.upsert({
    where: { id: writingBookId },
    update: { title: 'Power TOEFL 写作题库', category: 'TOEFL', dataSource: 'CURATED',
      description: `来源: power-toefl.com, ${writingPrompts.length} 道写作题` },
    create: { id: writingBookId, title: 'Power TOEFL 写作题库', category: 'TOEFL', dataSource: 'CURATED',
      description: `来源: power-toefl.com, ${writingPrompts.length} 道写作题` },
  })

  for (let i = 0; i < writingPrompts.length; i++) {
    const p = writingPrompts[i]
    const contentId = `toefl-pt-writing-${p.slug || p.id}`
    
    let fullContent = p.prompt_text || ''
    if (p.reading_passage) {
      fullContent = `[Reading Passage]\n${p.reading_passage}\n\n[Question]\n${fullContent}`
    }
    if (p.listening_passage) {
      fullContent += `\n\n[Listening Passage]\n${p.listening_passage}`
    }
    if (p.audio_text) {
      fullContent += `\n\n[Audio Transcript]\n${p.audio_text}`
    }
    if (p.sample_response) {
      fullContent += `\n\n---\n[Sample Response]\n${p.sample_response}`
    }
    if (p.scoring_rubric) {
      fullContent += `\n\n[Scoring Rubric]\n${p.scoring_rubric}`
    }

    await prisma.content.upsert({
      where: { id: contentId },
      update: {
        type: 'ARTICLE',
        title: `TOEFL Writing Task ${p.task_number} (${p.task_type})`,
        source: 'power-toefl.com',
        sourceUrl: `https://power-toefl.com/zh-CN/questions/writing#${p.slug || p.id}`,
        content: fullContent,
        bookId: writingBookId,
        bookOrder: i + 1,
        isPublished: true,
        tags: [p.task_type, p.difficulty, p.topic].filter(Boolean) as string[],
      },
      create: {
        id: contentId,
        type: 'ARTICLE',
        title: `TOEFL Writing Task ${p.task_number} (${p.task_type})`,
        source: 'power-toefl.com',
        sourceUrl: `https://power-toefl.com/zh-CN/questions/writing#${p.slug || p.id}`,
        content: fullContent,
        bookId: writingBookId,
        bookOrder: i + 1,
        isPublished: true,
        tags: [p.task_type, p.difficulty, p.topic].filter(Boolean) as string[],
      },
    })

    const qId = `toefl-pt-writing-${p.slug || p.id}-q1`
    await prisma.contentQuestion.upsert({
      where: { id: qId },
      update: {
        contentId, type: 'SHORT_ANSWER',
        stem: p.prompt_text,
        options: null,
        answer: p.sample_response ? [p.sample_response] : [],
        explanation: p.scoring_rubric || null,
        order: 1,
      },
      create: {
        id: qId, contentId, type: 'SHORT_ANSWER',
        stem: p.prompt_text,
        options: null,
        answer: p.sample_response ? [p.sample_response] : [],
        explanation: p.scoring_rubric || null,
        order: 1,
      },
    })
  }
  console.log(`  写作题已导入`)

  // ========== 5. 模考套题 ==========
  console.log('\n[5] 模考套题...')
  // 模考 round 没有关联题目表，直接从 pool_questions 随机抽取组成
  const rounds = await fetchAll(
    'test_rounds',
    `select=id,round_number,status,question_count,difficulty_tier,target_score,tags&order=round_number.asc`,
    apiKey,
  )
  console.log(`  模考轮次: ${rounds.length}`)

  const roundsBookId = 'toefl-power-toefl-rounds'
  await prisma.examBook.upsert({
    where: { id: roundsBookId },
    update: { title: 'Power TOEFL 模考套题', category: 'TOEFL', dataSource: 'CURATED',
      description: `来源: power-toefl.com, ${rounds.length} 套模考（每套含阅读+听力）` },
    create: { id: roundsBookId, title: 'Power TOEFL 模考套题', category: 'TOEFL', dataSource: 'CURATED',
      description: `来源: power-toefl.com, ${rounds.length} 套模考（每套含阅读+听力）` },
  })

  // 获取所有阅读和听力题目（用于随机组卷）
  const allReadingQs = await fetchAll(
    'pool_questions',
    `select=id,passage_id,section,question_type,question_number,question_text,options,correct_answer,explanation,explanation_zh_cn,trap_patterns,is_published&section=eq.reading&is_published=eq.true&limit=10000`,
    apiKey,
  )
  const allListeningQs = await fetchAll(
    'pool_questions',
    `select=id,passage_id,section,question_type,question_number,question_text,options,correct_answer,explanation,explanation_zh_cn,trap_patterns,is_published&section=eq.listening&is_published=eq.true&limit=10000`,
    apiKey,
  )
  console.log(`  可用阅读题: ${allReadingQs.length}, 听力题: ${allListeningQs.length}`)

  for (const round of rounds) {
    const contentId = `toefl-pt-round-${round.round_number}`
    
    // 随机选 3 篇阅读 + 3 篇听力
    const seed = round.round_number
    const pickReading = [...allReadingQs].sort((a, b) => {
      return ((a.id.charCodeAt(0) + seed) % 7) - ((b.id.charCodeAt(0) + seed) % 7)
    }).slice(0, Math.min(round.question_count || 28, 28))
    
    const pickListening = [...allListeningQs].sort((a, b) => {
      return ((a.id.charCodeAt(0) + seed + 3) % 7) - ((b.id.charCodeAt(0) + seed + 3) % 7)
    }).slice(0, Math.min(round.question_count || 28, 28))

    const roundContent = `模考轮次 ${round.round_number}
难度: ${round.difficulty_tier}
目标分数: ${round.target_score}
题目数: ${round.question_count}

本套模考包含 ${pickReading.length} 道阅读题 + ${pickListening.length} 道听力题。`

    await prisma.content.upsert({
      where: { id: contentId },
      update: {
        type: 'ARTICLE',
        title: `Power TOEFL 模考 Round ${round.round_number}`,
        source: 'power-toefl.com',
        sourceUrl: `https://power-toefl.com/zh-CN/questions/cat#round-${round.round_number}`,
        content: roundContent,
        bookId: roundsBookId,
        bookOrder: round.round_number,
        isPublished: true,
        tags: [round.difficulty_tier, ...(round.tags || [])].filter(Boolean) as string[],
      },
      create: {
        id: contentId,
        type: 'ARTICLE',
        title: `Power TOEFL 模考 Round ${round.round_number}`,
        source: 'power-toefl.com',
        sourceUrl: `https://power-toefl.com/zh-CN/questions/cat#round-${round.round_number}`,
        content: roundContent,
        bookId: roundsBookId,
        bookOrder: round.round_number,
        isPublished: true,
        tags: [round.difficulty_tier, ...(round.tags || [])].filter(Boolean) as string[],
      },
    })

    // 导入模考题目
    let qOrder = 0
    for (const q of [...pickReading, ...pickListening]) {
      qOrder++
      const qId = `toefl-pt-round-${round.round_number}-q${qOrder}`
      let options: string[] | null = null
      if (q.options && Array.isArray(q.options)) {
        options = q.options.map((opt: string, idx: number) => `${String.fromCharCode(65 + idx)}. ${opt}`)
      }
      let explanation = q.explanation || ''
      if (q.explanation_zh_cn) explanation += `\n\n[中文解析]\n${q.explanation_zh_cn}`

      await prisma.contentQuestion.upsert({
        where: { id: qId },
        update: {
          contentId, type: 'MCQ',
          stem: q.question_text,
          options,
          answer: q.correct_answer ? [q.correct_answer] : [],
          explanation: explanation || null,
          order: qOrder,
        },
        create: {
          id: qId, contentId, type: 'MCQ',
          stem: q.question_text,
          options,
          answer: q.correct_answer ? [q.correct_answer] : [],
          explanation: explanation || null,
          order: qOrder,
        },
      })
    }
  }
  console.log(`  模考套题已导入`)

  console.log('\n=== 导入完成 ===')
  await disconnectPrisma()
  console.log('完成!')
}

main().catch(console.error)
