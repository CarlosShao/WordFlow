/**
 * 从 JS 中提取 Supabase anon key 并访问 API
 */
async function main() {
  const jsRes = await fetch('https://power-toefl.com/assets/index-5RdqfUC4.js')
  const js = await jsRes.text()
  
  // 提取完整的 JWT key
  const keyMatch = js.match(/(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/)
  const anonKey = keyMatch?.[1]
  
  if (!anonKey) {
    console.log('未找到 anon key')
    return
  }
  
  console.log('找到 anon key:', anonKey.substring(0, 80) + '...')
  
  // 解码 JWT payload 看看权限
  const payloadBase64 = anonKey.split('.')[1]
  const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString())
  console.log('JWT payload:', JSON.stringify(payload))
  
  const SUPABASE_URL = 'https://tenayihnqaqwslswfrnn.supabase.co'
  
  // 尝试各种表名
  const tableNames = [
    'questions',
    'question',
    'toefl_questions',
    'reading_questions',
    'listening_questions',
    'speaking_questions',
    'writing_questions',
    'passages',
    'reading_passages',
    'practice_rounds',
    'rounds',
    'test_rounds',
    'exercises',
    'reading',
    'listening',
  ]
  
  console.log('\n=== 尝试访问表 ===')
  for (const table of tableNames) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=1`, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Accept': 'application/json',
        },
      })
      
      if (res.ok) {
        const data = await res.json()
        console.log(`✓ ${table}: ${res.status} - ${JSON.stringify(data).substring(0, 300)}`)
      } else if (res.status !== 404) {
        const text = await res.text()
        console.log(`⚠ ${table}: ${res.status} - ${text.substring(0, 100)}`)
      }
    } catch (e: any) {
      // skip
    }
  }
  
  // 也看看 JS 中有没有表名提示
  console.log('\n=== 从 JS 中搜索表名 ===')
  const tableHints = js.match(/from\(["']([a-z_]+)["']\)|\.from\(["']([a-z_]+)["']\)|table["']?\s*[:=]\s*["']([a-z_]+)["']/g)
  if (tableHints) {
    const tables = new Set<string>()
    for (const h of tableHints) {
      const m = h.match(/["']([a-z_]+)["']/)
      if (m) tables.add(m[1])
    }
    console.log('表名提示:', [...tables])
  }
  
  // 搜索 .from() 调用
  const fromCalls = js.match(/\.from\(["']([^"']+)["']\)/g)
  if (fromCalls) {
    const tables = new Set(fromCalls.map(c => c.match(/["']([^"']+)["']/)?.[1]))
    console.log('from() 调用:', [...tables])
  }
  
  // 搜索 select 调用
  const selectCalls = js.match(/\.select\(["']([^"']+)["']\)/g)
  if (selectCalls) {
    console.log('\nselect() 调用 (first 10):')
    for (const s of selectCalls.slice(0, 10)) {
      console.log(' ', s)
    }
  }
}

main().catch(console.error)
