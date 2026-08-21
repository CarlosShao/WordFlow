/**
 * 分析 power-toefl.com 的前端 JS 文件，找到 API 端点
 */
async function main() {
  console.log('=== 下载前端 JS ===')
  const res = await fetch('https://power-toefl.com/assets/index-5RdqfUC4.js')
  const js = await res.text()
  console.log('JS size:', js.length, 'bytes')
  
  // 搜索 API 路径
  const apiPaths = js.match(/["'](\/api\/[^"'\s]+)["']/g)
  console.log('\nAPI paths found:', apiPaths?.length)
  if (apiPaths) {
    const unique = [...new Set(apiPaths.map(p => p.replace(/["']/g, '')))]
    for (const p of unique.slice(0, 30)) {
      console.log(' ', p)
    }
  }
  
  // 搜索 fetch/axios 调用
  const fetchCalls = js.match(/(?:fetch|axios|useFetch|useAsyncData)\s*\(\s*["'`]([^"'`]+)/g)
  console.log('\nFetch calls:', fetchCalls?.length)
  if (fetchCalls) {
    for (const f of fetchCalls.slice(0, 15)) {
      console.log(' ', f)
    }
  }
  
  // 搜索 supabase/firebase 等后端
  const backendHints = js.match(/(?:supabase|firebase|firestore|amplify|appsync)["'\s]/gi)
  console.log('\nBackend hints:', backendHints)
  
  // 搜索题目相关关键词
  const questionHints = js.match(/["'](question|passage|reading|listening|speaking|writing)["'][\s\S]{0,50}?(?:url|api|endpoint|fetch)["']/gi)
  console.log('\nQuestion-related API hints:', questionHints?.slice(0, 10))
  
  // 直接搜索 /api/ 或者其他后端域名
  const externalUrls = js.match(/https?:\/\/[^"'\s]+/g)
  const filtered = externalUrls?.filter(u => !u.includes('w3.org') && !u.includes('schema.org') && !u.includes('ets.org'))
  console.log('\nExternal URLs (filtered):', [...new Set(filtered)]?.slice(0, 15))
}

main().catch(console.error)
