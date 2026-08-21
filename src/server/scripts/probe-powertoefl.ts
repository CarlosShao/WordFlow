/**
 * 调研 power-toefl.com 的 API 结构
 */
async function main() {
  // 1. 首页
  console.log('=== 1. 首页 ===')
  const homeRes = await fetch('https://power-toefl.com/zh-CN/questions')
  const homeHtml = await homeRes.text()
  console.log('Status:', homeRes.status)
  console.log('Length:', homeHtml.length)
  
  // 查找 API 端点线索
  const scriptMatches = homeHtml.match(/src="([^"]*\.js[^"]*)"/g)
  if (scriptMatches) {
    console.log('Scripts:', scriptMatches.slice(0, 5))
  }
  
  // 查找内联 JSON 数据
  const jsonMatches = homeHtml.match(/__NUXT__\s*=\s*\{[\s\S]*?\};/)
  const nuxtData = homeHtml.match(/window\.__[A-Z_]+__\s*=/g)
  console.log('Nuxt data found:', !!jsonMatches)
  console.log('Window vars:', nuxtData)
  
  // 查找 API 调用
  const apiHints = homeHtml.match(/["'](\/api\/[^"']*["'])/g)
  console.log('API hints:', apiHints?.slice(0, 10))
  
  // 2. 尝试常见 API 端点
  console.log('\n=== 2. API 探测 ===')
  const apiEndpoints = [
    '/api/questions',
    '/api/questions/reading',
    '/api/v1/questions',
    '/api/v1/questions/reading',
    '/api/question-bank',
    '/api/reading/questions',
  ]
  
  for (const endpoint of apiEndpoints) {
    try {
      const res = await fetch(`https://power-toefl.com${endpoint}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      })
      console.log(`${endpoint}: ${res.status} ${res.headers.get('content-type')}`)
      if (res.ok) {
        const text = await res.text()
        console.log(`  Body (first 200): ${text.substring(0, 200)}`)
      }
    } catch (e: any) {
      console.log(`${endpoint}: ${e.message}`)
    }
  }
  
  // 3. 尝试 practice rounds 端点
  console.log('\n=== 3. Practice rounds ===')
  const roundsRes = await fetch('https://power-toefl.com/zh-CN/practice/rounds')
  const roundsHtml = await roundsRes.text()
  console.log('Status:', roundsRes.status)
  console.log('Length:', roundsHtml.length)
  // 找 API 端点
  const roundsApi = roundsHtml.match(/["'](\/api\/[^"']*["'])/g)
  console.log('API hints:', roundsApi?.slice(0, 10))
  
  // 4. 看看 Nuxt 的 data 获取
  console.log('\n=== 4. 检查 Nuxt payload ===')
  // Nuxt 3 使用 __NUXT_DATA__ 或 payload
  const payloadMatch = homeHtml.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (payloadMatch) {
    console.log('Found __NUXT_DATA__')
    console.log('Data (first 500):', payloadMatch[1].substring(0, 500))
  } else {
    console.log('No __NUXT_DATA__ found')
  }
  
  // 检查是否有 JSON-LD 或者内联数据
  const jsonLd = homeHtml.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)
  console.log('JSON scripts:', jsonLd?.length)
  
  // 5. 看看 meta 信息
  const titleMatch = homeHtml.match(/<title>(.*?)<\/title>/)
  console.log('Title:', titleMatch?.[1])
}

main().catch(console.error)
