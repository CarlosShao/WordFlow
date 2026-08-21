/**
 * 修复 Power TOEFL 数据
 * 
 * 1. 口语题：标题改为含实际题目内容；explanation 存 scoring_rubric
 * 2. 阅读/听力 0 题 section：删除（API 确实没有对应题目）
 * 3. 模考套题：每套关联真实的阅读和听力 passage 作为文章
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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
  })
  if (!res.ok) { console.log(`  [${table}] HTTP ${res.status}`); return [] }
  return res.json()
}

async function main() {
  console.log('=== 修复 Power TOEFL 数据 ===\n')
  const apiKey = await getAnonKey()
  const prisma = getPrisma()

  // ====== 1. 口语题：重新导入，修正标题和 explanation ======
  console.log('[1] 修复口语题库...')
  const speakingPrompts = await fetchAll(
    'speaking_prompts',
    `select=id,task_type,task_number,slug,prompt_text,reading_passage,listening_passage,audio_text,sample_response,scoring_rubric,difficulty,topic,is_published&is_published=eq.true&order=created_at.asc`,
    apiKey,
  )
  console.log('  口语题数: ' + speakingPrompts.length)

  // 删除旧的口语 sections
  await prisma.content.deleteMany({ where: { bookId: 'toefl-power-toefl-speaking' } })

  for (let i = 0; i < speakingPrompts.length; i++) {
    const p = speakingPrompts[i]
    const contentId = 'toefl-pt-speaking-' + (p.slug || p.id)
    
    // 标题：用 prompt_text 前 50 字符
    const shortPrompt = (p.prompt_text || '').substring(0, 50)
    const title = 'Speaking ' + p.task_type + ' #' + (i + 1) + ': ' + shortPrompt
    
    // 内容
    let fullContent = p.prompt_text || ''
    if (p.reading_passage) {
      fullContent = '[Reading Passage]\n' + p.reading_passage + '\n\n[Question]\n' + fullContent
    }
    if (p.listening_passage) {
      fullContent += '\n\n[Listening Passage]\n' + p.listening_passage
    }
    if (p.audio_text) {
      fullContent += '\n\n[Audio Transcript]\n' + p.audio_text
    }
    if (p.sample_response) {
      fullContent += '\n\n---\n[Sample Response]\n' + p.sample_response
    }
    
    await prisma.content.create({
      data: {
        id: contentId,
        type: 'ARTICLE',
        title: title,
        source: 'power-toefl.com',
        sourceUrl: 'https://power-toefl.com/zh-CN/questions/speaking#' + (p.slug || p.id),
        content: fullContent,
        bookId: 'toefl-power-toefl-speaking',
        bookOrder: i + 1,
        isPublished: true,
        tags: [p.task_type, p.difficulty, p.topic].filter(Boolean),
      },
    })

    // 题目：explanation 存 scoring_rubric，answer 存 sample_response
    await prisma.contentQuestion.create({
      data: {
        id: contentId + '-q1',
        contentId: contentId,
        type: 'SHORT_ANSWER',
        stem: p.prompt_text,
        options: null,
        answer: p.sample_response ? [p.sample_response] : [],
        explanation: p.scoring_rubric || null,
        order: 1,
      },
    })
  }
  console.log('  口语题已重新导入（含 explanation）')

  // ====== 2. 写作题：同样修复标题和 explanation ======
  console.log('\n[2] 修复写作题库...')
  const writingPrompts = await fetchAll(
    'writing_prompts',
    `select=id,task_type,task_number,slug,prompt_text,reading_passage,listening_passage,audio_text,sample_response,scoring_rubric,difficulty,topic,is_published&is_published=eq.true&order=created_at.asc`,
    apiKey,
  )
  console.log('  写作题数: ' + writingPrompts.length)

  await prisma.content.deleteMany({ where: { bookId: 'toefl-power-toefl-writing' } })

  for (let i = 0; i < writingPrompts.length; i++) {
    const p = writingPrompts[i]
    const contentId = 'toefl-pt-writing-' + (p.slug || p.id)
    
    const shortPrompt = (p.prompt_text || '').substring(0, 50)
    const title = 'Writing ' + p.task_type + ' #' + (i + 1) + ': ' + shortPrompt
    
    let fullContent = p.prompt_text || ''
    if (p.reading_passage) {
      fullContent = '[Reading Passage]\n' + p.reading_passage + '\n\n[Question]\n' + fullContent
    }
    if (p.listening_passage) {
      fullContent += '\n\n[Listening Passage]\n' + p.listening_passage
    }
    if (p.audio_text) {
      fullContent += '\n\n[Audio Transcript]\n' + p.audio_text
    }
    if (p.sample_response) {
      fullContent += '\n\n---\n[Sample Response]\n' + p.sample_response
    }
    
    await prisma.content.create({
      data: {
        id: contentId,
        type: 'ARTICLE',
        title: title,
        source: 'power-toefl.com',
        sourceUrl: 'https://power-toefl.com/zh-CN/questions/writing#' + (p.slug || p.id),
        content: fullContent,
        bookId: 'toefl-power-toefl-writing',
        bookOrder: i + 1,
        isPublished: true,
        tags: [p.task_type, p.difficulty, p.topic].filter(Boolean),
      },
    })

    await prisma.contentQuestion.create({
      data: {
        id: contentId + '-q1',
        contentId: contentId,
        type: 'SHORT_ANSWER',
        stem: p.prompt_text,
        options: null,
        answer: p.sample_response ? [p.sample_response] : [],
        explanation: p.scoring_rubric || null,
        order: 1,
      },
    })
  }
  console.log('  写作题已重新导入（含 explanation）')

  // ====== 3. 删除阅读/听力 0 题的 section ======
  console.log('\n[3] 删除 0 题的 section...')
  
  // 阅读 0 题
  const readingZero = await prisma.content.findMany({
    where: { bookId: 'toefl-power-toefl-reading' },
    select: { id: true, title: true, _count: { select: { contentQuestions: true } } },
  })
  const readingToDelete = readingZero.filter(c => c._count.contentQuestions === 0).map(c => c.id)
  console.log('  阅读 0 题 section 删除: ' + readingToDelete.length)
  if (readingToDelete.length > 0) {
    await prisma.content.deleteMany({ where: { id: { in: readingToDelete } } })
  }

  // 听力 0 题
  const listeningZero = await prisma.content.findMany({
    where: { bookId: 'toefl-power-toefl-listening' },
    select: { id: true, title: true, _count: { select: { contentQuestions: true } } },
  })
  const listeningToDelete = listeningZero.filter(c => c._count.contentQuestions === 0).map(c => c.id)
  console.log('  听力 0 题 section 删除: ' + listeningToDelete.length)
  if (listeningToDelete.length > 0) {
    await prisma.content.deleteMany({ where: { id: { in: listeningToDelete } } })
  }

  // 重新排序 bookOrder
  for (const bookId of ['toefl-power-toefl-reading', 'toefl-power-toefl-listening']) {
    const contents = await prisma.content.findMany({
      where: { bookId },
      select: { id: true },
      orderBy: { bookOrder: 'asc' },
    })
    for (let i = 0; i < contents.length; i++) {
      await prisma.content.update({
        where: { id: contents[i].id },
        data: { bookOrder: i + 1 },
      })
    }
  }

  // ====== 4. 模考套题：每套关联真实的阅读+听力文章 ======
  console.log('\n[4] 修复模考套题...')
  
  // 获取所有阅读和听力 passage（含题目）
  const readingPassages = await prisma.content.findMany({
    where: { bookId: 'toefl-power-toefl-reading' },
    select: { id: true, title: true, content: true, bookOrder: true },
    orderBy: { bookOrder: 'asc' },
  })
  const listeningPassages = await prisma.content.findMany({
    where: { bookId: 'toefl-power-toefl-listening' },
    select: { id: true, title: true, content: true, audioUrl: true, bookOrder: true },
    orderBy: { bookOrder: 'asc' },
  })
  console.log('  可用阅读: ' + readingPassages.length + ', 听力: ' + listeningPassages.length)

  // 获取所有阅读和听力题目
  const readingQs = await prisma.contentQuestion.findMany({
    where: { content: { bookId: 'toefl-power-toefl-reading' } },
    select: { id: true, contentId: true, stem: true, options: true, answer: true, explanation: true, order: true, type: true },
    orderBy: { order: 'asc' },
  })
  const listeningQs = await prisma.contentQuestion.findMany({
    where: { content: { bookId: 'toefl-power-toefl-listening' } },
    select: { id: true, contentId: true, stem: true, options: true, answer: true, explanation: true, order: true, type: true },
    orderBy: { order: 'asc' },
  })

  // 获取模考 rounds
  const rounds = await fetchAll(
    'test_rounds',
    'select=id,round_number,status,question_count,difficulty_tier,target_score,tags&order=round_number.asc',
    apiKey,
  )

  for (const round of rounds) {
    const contentId = 'toefl-pt-round-' + round.round_number
    
    // 每套模考选 3 篇阅读 + 2 篇听力 + 1 篇 conversation
    const rStart = (round.round_number * 3) % Math.max(1, readingPassages.length - 3)
    const lStart = (round.round_number * 2) % Math.max(1, listeningPassages.length - 4)
    
    const selectedReading = readingPassages.slice(rStart, rStart + 3)
    const selectedListening = listeningPassages.slice(lStart, lStart + 3)
    
    // 构建模考内容：包含文章 + 听力原文
    let roundContent = '模考轮次 ' + round.round_number + '\n'
    roundContent += '难度: ' + round.difficulty_tier + '\n'
    roundContent += '目标分数: ' + round.target_score + '\n'
    roundContent += '题目数: ' + round.question_count + '\n\n'
    
    roundContent += '====== 阅读部分 ======\n\n'
    for (let i = 0; i < selectedReading.length; i++) {
      const p = selectedReading[i]
      roundContent += '【阅读 ' + (i + 1) + '】' + p.title + '\n'
      roundContent += (p.content || '') + '\n\n'
    }
    
    roundContent += '====== 听力部分 ======\n\n'
    for (let i = 0; i < selectedListening.length; i++) {
      const p = selectedListening[i]
      roundContent += '【听力 ' + (i + 1) + '】' + p.title + '\n'
      roundContent += (p.content || '') + '\n\n'
    }

    // 更新模考 content
    await prisma.content.update({
      where: { id: contentId },
      data: { content: roundContent },
    })

    // 删除旧题目
    await prisma.contentQuestion.deleteMany({ where: { contentId: contentId } })

    // 从选中的阅读和听力 passage 关联题目，重新创建
    let qOrder = 0
    for (const p of selectedReading) {
      const pQs = readingQs.filter(q => q.contentId === p.id)
      for (const q of pQs) {
        qOrder++
        await prisma.contentQuestion.create({
          data: {
            id: contentId + '-q' + qOrder,
            contentId: contentId,
            type: q.type,
            stem: q.stem,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
            order: qOrder,
          },
        })
      }
    }
    for (const p of selectedListening) {
      const pQs = listeningQs.filter(q => q.contentId === p.id)
      for (const q of pQs) {
        qOrder++
        await prisma.contentQuestion.create({
          data: {
            id: contentId + '-q' + qOrder,
            contentId: contentId,
            type: q.type,
            stem: q.stem,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
            order: qOrder,
          },
        })
      }
    }
  }
  console.log('  模考套题已修复（含文章+听力原文+题目）')

  // ====== 5. 验证 ======
  console.log('\n[5] 验证...')
  for (const bookId of ['toefl-power-toefl-speaking', 'toefl-power-toefl-writing', 'toefl-power-toefl-reading', 'toefl-power-toefl-listening', 'toefl-power-toefl-rounds']) {
    const secCount = await prisma.content.count({ where: { bookId } })
    const qCount = await prisma.contentQuestion.count({ where: { content: { bookId } } })
    const zeroQ = await prisma.content.count({
      where: { bookId, contentQuestions: { none: {} } },
    })
    console.log('  ' + bookId + ': sections=' + secCount + ' questions=' + qCount + ' zeroQ=' + zeroQ)
  }

  // 口语 explanation 检查
  const speakWithExpl = await prisma.contentQuestion.count({
    where: { content: { bookId: 'toefl-power-toefl-speaking' }, NOT: { explanation: null } },
  })
  console.log('  口语有 explanation: ' + speakWithExpl)

  await disconnectPrisma()
  console.log('\n完成!')
}

main().catch(console.error)
