/**
 * 调研小站雅思 aielts.zhan.com 的 API 结构
 */
const BASE = 'https://aiielts.zhan.com'

async function main() {
  console.log('=== 小站雅思 API 调研 ===\n')
  
  // 1. 获取首页
  const homeRes = await fetch(`${BASE}/exam-recall/listen`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html',
    },
  })
  const homeHtml = await homeRes.text()
  console.log('Status:', homeRes.status)
  console.log('HTML size:', homeHtml.length)
  
  // 找 JS 文件
  const scripts = homeHtml.match(/src=["']([^"']+\.js[^"']*)["']/g)
  console.log('Scripts:', scripts?.slice(0, 10))
  
  // 找 API 端点
  const apiHints = homeHtml.match(/["'](\/api\/[^"']+)["']/g)
  console.log('API hints:', apiHints)
  
  // 找内联 JS 中的配置
  const inlineConfigs = homeHtml.match(/(?:baseURL|apiUrl|API_URL|baseUrl|base_url)["'\s:=]+["']([^"']+)["']/gi)
  console.log('Base URL configs:', inlineConfigs)
  
  // 找 axios/fetch 调用
  const inlineFetch = homeHtml.match(/(?:fetch|axios|ajax)\s*\(\s*["']([^"']+)["']/g)
  console.log('Inline fetch calls:', inlineFetch?.slice(0, 5))
  
  // 找外部域名
  const domains = homeHtml.match(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/gi)
  const uniqueDomains = [...new Set(domains || [])].filter(d => !d.includes('w3.org') && !d.includes('schema.org'))
  console.log('Domains:', uniqueDomains.slice(0, 10))
  
  // 找 data-* 属性中的 API URL
  const dataAttrs = homeHtml.match(/data-[\w-]+=["']([^"']+api[^"']*)["']/gi)
  console.log('Data attrs with api:', dataAttrs?.slice(0, 5))
  
  // 2. 如果找到 JS 文件，分析它们
  if (scripts) {
    for (const scriptMatch of scripts.slice(0, 3)) {
      const src = scriptMatch.match(/src=["']([^"']+)["']/)?.[1]
      if (!src || src.includes('jquery') || src.includes('rangy')) continue
      
      const url = src.startsWith('http') ? src : `${BASE}${src}`
      console.log(`\n=== 分析 ${url} ===`)
      try {
        const jsRes = await fetch(url)
        const js = await jsRes.text()
        console.log('JS size:', js.length)
        
        const apiPaths = js.match(/["'](\/api\/[^"'\s]+)["']/g)
        if (apiPaths) {
          const unique = [...new Set(apiPaths.map(p => p.replace(/["']/g, '')))]
          console.log('API paths:', unique.slice(0, 20))
        }
        
        const baseUrls = js.match(/(?:baseURL|apiUrl|API_URL|baseUrl)["'\s:=]+["']([^"']+)["']/gi)
        console.log('Base URLs:', baseUrls)
        
        const loginPaths = js.match(/.{0,30}login.{0,30}/gi)
        console.log('Login hints (first 3):', loginPaths?.slice(0, 3))
      } catch (e: any) {
        console.log('Error:', e.message)
      }
    }
  }
  
  // 3. 尝试直接访问一些可能的 API
  console.log('\n=== API 探测 ===')
  const endpoints = [
    '/api/exam/list',
    '/api/exam-recall/list',
    '/api/ielts/listen',
    '/api/listening/list',
    '/exam/api/list',
    '/api/v1/exam',
  ]
  for (const ep of endpoints) {
    const res = await fetch(`${BASE}${ep}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'FromURL': 'aielts.zhan.com',
      },
    })
    const text = await res.text()
    console.log(`${ep}: ${res.status} ${text.substring(0, 100)}`)
  }
}

main().catch(console.error)
