/**
 * 探查 Power TOEFL Supabase API 的表结构和口语/写作数据
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
    console.log(`  [${table}] HTTP ${res.status}: ${text.substring(0, 200)}`)
    return []
  }
  return res.json()
}

async function main() {
  const apiKey = await getAnonKey()
  console.log('API key obtained\n')

  // 1. passages 表的所有 section
  const sections = ['reading', 'listening', 'speaking', 'writing'] as const
  for (const section of sections) {
    const passages = await fetchFromSupabase(
      'passages',
      `select=id,section,passage_type,title,slug,audio_url,audio_text,word_count,is_published&section=eq.${section}&is_published=eq.true&order=created_at.asc&limit=3`,
      apiKey,
    )
    console.log(`\n=== ${section} passages (${passages.length} sample) ===`)
    for (const p of passages) {
      console.log(`  id=${p.id} type=${p.passage_type} title="${p.title?.substring(0, 50)}" audio=${p.audio_url ? 'Y' : 'N'} audioText=${p.audio_text ? 'Y' : 'N'}`)
    }
    
    // count
    const allPassages = await fetchFromSupabase(
      'passages',
      `select=id&section=eq.${section}&is_published=eq.true`,
      apiKey,
    )
    console.log(`  total: ${allPassages.length}`)
  }

  // 2. speaking passages - 看看有没有特殊字段
  console.log('\n=== speaking passages 详细字段 ===')
  const speakingPassages = await fetchFromSupabase(
    'passages',
    `select=*&section=eq.speaking&is_published=eq.true&limit=2`,
    apiKey,
  )
  for (const p of speakingPassages) {
    console.log(`  id=${p.id}`)
    console.log(`  title="${p.title}"`)
    console.log(`  passage_type=${p.passage_type}`)
    console.log(`  content=${p.content ? p.content.substring(0, 100) + '...' : 'null'}`)
    console.log(`  audio_url=${p.audio_url}`)
    console.log(`  audio_text=${p.audio_text ? p.audio_text.substring(0, 100) + '...' : 'null'}`)
    // 打印所有 key
    console.log(`  all keys: ${Object.keys(p).join(', ')}`)
  }

  // 3. speaking 的问题
  console.log('\n=== speaking questions ===')
  if (speakingPassages.length > 0) {
    const questions = await fetchFromSupabase(
      'pool_questions',
      `select=*&passage_id=eq.${speakingPassages[0].id}&is_published=eq.true&order=question_number.asc`,
      apiKey,
    )
    console.log(`  questions count: ${questions.length}`)
    for (const q of questions.slice(0, 3)) {
      console.log(`  q#${q.question_number} type=${q.question_type}`)
      console.log(`    stem="${q.question_text?.substring(0, 100)}"`)
      console.log(`    options=${JSON.stringify(q.options)?.substring(0, 100)}`)
      console.log(`    answer=${q.correct_answer}`)
      console.log(`    all keys: ${Object.keys(q).join(', ')}`)
    }
  }

  // 4. writing passages
  console.log('\n=== writing passages 详细字段 ===')
  const writingPassages = await fetchFromSupabase(
    'passages',
    `select=*&section=eq.writing&is_published=eq.true&limit=2`,
    apiKey,
  )
  for (const p of writingPassages) {
    console.log(`  id=${p.id}`)
    console.log(`  title="${p.title}"`)
    console.log(`  passage_type=${p.passage_type}`)
    console.log(`  content=${p.content ? p.content.substring(0, 100) + '...' : 'null'}`)
    console.log(`  audio_url=${p.audio_url}`)
    console.log(`  all keys: ${Object.keys(p).join(', ')}`)
  }

  // 5. writing questions
  console.log('\n=== writing questions ===')
  if (writingPassages.length > 0) {
    const questions = await fetchFromSupabase(
      'pool_questions',
      `select=*&passage_id=eq.${writingPassages[0].id}&is_published=eq.true&order=question_number.asc`,
      apiKey,
    )
    console.log(`  questions count: ${questions.length}`)
    for (const q of questions.slice(0, 3)) {
      console.log(`  q#${q.question_number} type=${q.question_type}`)
      console.log(`    stem="${q.question_text?.substring(0, 100)}"`)
      console.log(`    options=${JSON.stringify(q.options)?.substring(0, 100)}`)
      console.log(`    answer=${q.correct_answer}`)
    }
  }

  // 6. listening passages - 看看有没有 audio_url
  console.log('\n=== listening passages audio ===')
  const listeningPassages = await fetchFromSupabase(
    'passages',
    `select=id,title,audio_url,audio_text,slug&section=eq.listening&is_published=eq.true&limit=5`,
    apiKey,
  )
  for (const p of listeningPassages) {
    console.log(`  id=${p.id} title="${p.title?.substring(0, 40)}" audio_url=${p.audio_url || 'NONE'} audio_text=${p.audio_text ? 'Y' : 'N'}`)
  }

  // 7. test_rounds - 查看模考的题目
  console.log('\n=== test_rounds 详细 ===')
  const rounds = await fetchFromSupabase(
    'test_rounds',
    `select=*&order=round_number.asc&limit=3`,
    apiKey,
  )
  for (const r of rounds) {
    console.log(`  round=${r.round_number} questions=${r.question_count} status=${r.status}`)
    console.log(`    all keys: ${Object.keys(r).join(', ')}`)
    // 尝试获取模考题目
    if (r.id) {
      const roundQuestions = await fetchFromSupabase(
        'round_questions',
        `select=*&round_id=eq.${r.id}&limit=5`,
        apiKey,
      )
      console.log(`    round_questions: ${roundQuestions.length}`)
      for (const rq of roundQuestions) {
        console.log(`      keys: ${Object.keys(rq).join(', ')}`)
        console.log(`      ${JSON.stringify(rq).substring(0, 200)}`)
      }
    }
  }

  // 8. 尝试其他可能的表
  console.log('\n=== 尝试其他表 ===')
  for (const table of ['question_types', 'speaking_samples', 'writing_samples', 'round_questions', 'round_passages']) {
    const data = await fetchFromSupabase(table, 'select=*&limit=1', apiKey)
    console.log(`  ${table}: ${data.length} rows ${data.length > 0 ? 'keys: ' + Object.keys(data[0]).join(', ') : ''}`)
  }

  await disconnectPrisma()
}

main().catch(console.error)
