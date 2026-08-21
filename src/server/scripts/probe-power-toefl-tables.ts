/**
 * 探测 Power TOEFL 的 speaking_prompts, writing_prompts 等表
 */

async function getAnonKey(): Promise<string> {
  const jsRes = await fetch('https://power-toefl.com/assets/index-5RdqfUC4.js')
  const js = await jsRes.text()
  const keyMatch = js.match(/(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/)
  if (!keyMatch) throw new Error('未找到 Supabase anon key')
  return keyMatch[1]
}

async function fetchFromSupabase(table: string, query: string, apiKey: string): Promise<any[]> {
  const res = await fetch(`https://tenayihnqaqwslswfrnn.supabase.co/rest/v1/${table}?${query}`, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    console.log(`  [${table}] HTTP ${res.status}: ${text.substring(0, 300)}`)
    return []
  }
  return res.json()
}

async function main() {
  const apiKey = await getAnonKey()
  
  // 探测各种可能的表名
  const tables = [
    'speaking_prompts', 'writing_prompts',
    'speaking_questions', 'writing_questions',
    'speaking_passages', 'writing_passages',
    'user_question_history',
    'pool_questions', // 已知表，看看有没有 speaking/writing 的
  ]
  
  for (const table of tables) {
    console.log(`\n=== ${table} ===`)
    const data = await fetchFromSupabase(table, 'select=*&limit=2', apiKey)
    if (data.length > 0) {
      console.log(`  rows: ${data.length} (sample)`)
      console.log(`  keys: ${Object.keys(data[0]).join(', ')}`)
      console.log(`  sample: ${JSON.stringify(data[0]).substring(0, 500)}`)
    }
  }

  // pool_questions 中的 question_type 分布
  console.log('\n=== pool_questions question_type distribution ===')
  const allQs = await fetchFromSupabase(
    'pool_questions',
    'select=question_type&is_published=eq.true&limit=10000',
    apiKey,
  )
  const typeMap: Record<string, number> = {}
  for (const q of allQs) {
    typeMap[q.question_type] = (typeMap[q.question_type] || 0) + 1
  }
  console.log(`  types: ${JSON.stringify(typeMap)}`)

  // 看看 passages 里有没有 passage_type 为 speaking/writing 的
  console.log('\n=== passages passage_type distribution ===')
  const allPassages = await fetchFromSupabase(
    'passages',
    'select=section,passage_type,is_published&limit=10000',
    apiKey,
  )
  const ptMap: Record<string, number> = {}
  for (const p of allPassages) {
    const key = p.section + '/' + p.passage_type
    ptMap[key] = (ptMap[key] || 0) + 1
  }
  console.log(`  types: ${JSON.stringify(ptMap)}`)

  // 尝试 OpenAPI 描述
  console.log('\n=== Supabase OpenAPI ===')
  const openApiRes = await fetch(`https://tenayihnqaqwslswfrnn.supabase.co/rest/v1/`, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/openapi+json',
    },
  })
  if (openApiRes.ok) {
    const openApi = await openApiRes.json()
    const tables = Object.keys(openApi.paths || {}).filter(p => p.startsWith('/rest/v1/'))
    console.log(`  Available tables: ${tables.length}`)
    for (const t of tables) {
      console.log(`    ${t}`)
    }
  }
}

main().catch(console.error)
