/**
 * 探测 power-toefl.com 的 Supabase 后端 API
 */
const SUPABASE_URL = 'https://tenayihnqaqwslswfrnn.supabase.co'

async function main() {
  console.log('=== Supabase API 探测 ===')
  console.log('URL:', SUPABASE_URL)
  
  // 1. 尝试无 key 访问 REST API
  const endpoints = [
    '/rest/v1/',
    '/rest/v1/questions',
    '/rest/v1/question',
    '/rest/v1/reading_questions',
    '/rest/v1/listening_questions',
    '/rest/v1/speaking_questions',
    '/rest/v1/writing_questions',
    '/rest/v1/passages',
    '/rest/v1/practice_rounds',
    '/rest/v1/rounds',
    '/rest/v1/toefl_questions',
    '/rest/v1/exercises',
  ]
  
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${SUPABASE_URL}${ep}`, {
        headers: {
          'Accept': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbmF5aG5xYXF3c2xzd2ZybW4iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNzU5MzYwMH0.placeholder', // placeholder anon key
        },
      })
      const text = await res.text()
      console.log(`${ep}: ${res.status} - ${text.substring(0, 150)}`)
    } catch (e: any) {
      console.log(`${ep}: ${e.message}`)
    }
  }
  
  // 2. 从前端 JS 中提取真实的 anon key
  console.log('\n=== 从 JS 中提取 Supabase key ===')
  const jsRes = await fetch('https://power-toefl.com/assets/index-5RdqfUC4.js')
  const js = await jsRes.text()
  
  // Supabase anon key 通常是一个 JWT token
  const keyMatch = js.match(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)
  if (keyMatch) {
    console.log('Found JWT keys:', keyMatch.length)
    for (const k of keyMatch) {
      console.log(' ', k.substring(0, 60) + '...')
    }
  }
  
  // 搜索 supabase 配置
  const configMatch = js.match(/supabase[^}]*?url[^}]*?["']([^"']+)["'][^}]*?key[^}]*?["']([^"']+)["']/i)
    || js.match(/createClient\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/)
  if (configMatch) {
    console.log('\nSupabase config:')
    console.log('  URL:', configMatch[1])
    console.log('  Key:', configMatch[2]?.substring(0, 60) + '...')
  }
  
  // 更通用的搜索
  const createClientMatch = js.match(/createClient\([^)]+\)/g)
  console.log('\ncreateClient calls:', createClientMatch?.length)
  
  // 搜索所有包含 supabase 的代码片段
  const supabaseContexts = js.match(/.{0,100}supabase.{0,100}/gi)
  if (supabaseContexts) {
    console.log('\nSupabase contexts (first 5):')
    for (const ctx of supabaseContexts.slice(0, 5)) {
      console.log('  ', ctx.replace(/\n/g, ' ').trim())
    }
  }
}

main().catch(console.error)
