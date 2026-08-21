/**
 * 深入探测 power-toefl.com 的 Supabase API，获取完整数据结构
 */
const SUPABASE_URL = 'https://tenayihnqaqwslswfrnn.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbmF5aG5xYXF3c2xzd2ZybW4iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3NDk0MjYzMywiZXhwIjoyMDkwNTE4NjMzfQplaceholder'

async function main() {
  // 先从 JS 中提取真实 key
  const jsRes = await fetch('https://power-toefl.com/assets/index-5RdqfUC4.js')
  const js = await jsRes.text()
  const keyMatch = js.match(/(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/)
  const key = keyMatch?.[1]
  if (!key) { console.log('no key'); return }
  
  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Accept': 'application/json',
  }
  
  // 1. 探测所有可能的表
  console.log('=== 探测表 ===')
  const tables = [
    'passages', 'pool_questions', 'test_rounds', 'questions',
    'reading_passages', 'listening_passages', 'speaking_tasks', 'writing_tasks',
    'question_options', 'answers', 'explanations',
    'categories', 'topics', 'difficulty_levels',
    'user_progress', 'bookmarks', 'practice_rounds',
    'round_questions', 'test_questions',
  ]
  
  const found: string[] = []
  for (const table of tables) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=1`, { headers })
    if (res.ok) {
      const data = await res.json()
      const count = Array.isArray(data) ? data.length : 'N/A'
      const fields = Array.isArray(data) && data[0] ? Object.keys(data[0]) : []
      console.log(`✓ ${table}: ${count} rows, fields: [${fields.join(', ')}]`)
      found.push(table)
    }
  }
  
  // 2. 获取 passages 的完整数据量
  console.log('\n=== passages 统计 ===')
  const passagesRes = await fetch(`${SUPABASE_URL}/rest/v1/passages?select=id,section,passage_type,title,slug`, {
    headers: { ...headers, 'Prefer': 'count=exact' },
  })
  const passagesData = await passagesRes.json()
  const totalCount = passagesRes.headers.get('content-range')
  console.log('Content-Range:', totalCount)
  console.log('Sample passages:')
  for (const p of passagesData.slice(0, 5)) {
    console.log(`  [${p.section}] ${p.passage_type}: ${p.title}`)
  }
  
  // 3. 获取 pool_questions 的结构
  console.log('\n=== pool_questions ===')
  const qRes = await fetch(`${SUPABASE_URL}/rest/v1/pool_questions?limit=3`, { headers })
  if (qRes.ok) {
    const qData = await qRes.json()
    if (qData[0]) {
      console.log('Fields:', Object.keys(qData[0]))
      console.log('Sample:', JSON.stringify(qData[0]).substring(0, 500))
    }
  }
  
  // 4. 获取 test_rounds 的完整数据
  console.log('\n=== test_rounds 统计 ===')
  const roundsRes = await fetch(`${SUPABASE_URL}/rest/v1/test_rounds?select=id,round_number,status,question_count,difficulty_tier&order=round_number.asc`, {
    headers: { ...headers, 'Prefer': 'count=exact' },
  })
  const roundsData = await roundsRes.json()
  const roundsRange = roundsRes.headers.get('content-range')
  console.log('Content-Range:', roundsRange)
  console.log(`Total rounds: ${roundsData.length}`)
  for (const r of roundsData.slice(0, 5)) {
    console.log(`  Round ${r.round_number}: ${r.question_count} questions, ${r.difficulty_tier}, ${r.status}`)
  }
  
  // 5. 获取一个完整的 passage（含问题和选项）
  console.log('\n=== 完整 passage 示例 ===')
  const fullRes = await fetch(`${SUPABASE_URL}/rest/v1/passages?select=*&limit=1`, { headers })
  const fullData = await fullRes.json()
  if (fullData[0]) {
    const p = fullData[0]
    console.log('ID:', p.id)
    console.log('Title:', p.title)
    console.log('Section:', p.section)
    console.log('Type:', p.passage_type)
    console.log('Content (first 300):', p.content?.substring(0, 300))
    console.log('All fields:', Object.keys(p).join(', '))
  }
}

main().catch(console.error)
