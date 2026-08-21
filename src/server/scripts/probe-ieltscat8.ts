/**
 * 搜索 ieltscat 的正确 chunk 文件，找到 API 路径
 */
const BASE = 'https://ieltscat.xdf.cn'

async function main() {
  // 获取 HTML 提取 chunk 文件路径
  const homeRes = await fetch(`${BASE}/`)
  const html = await homeRes.text()
  
  // 提取所有 JS chunk 文件路径
  const jsChunks = html.match(/\/static\/js\/[a-z0-9.-]+\.js/g)
  if (!jsChunks) { console.log('No JS chunks found'); return }
  
  const uniqueChunks = [...new Set(jsChunks)]
  console.log(`Found ${uniqueChunks.length} JS chunks\n`)
  
  const allApis = new Set<string>()
  const allKeywords = new Set<string>()
  
  // 先分析 app.js
  console.log('=== app.js ===')
  const appRes = await fetch(`${BASE}/static/js/app.454159db.js`)
  const appJs = await appRes.text()
  console.log('Size:', appJs.length)
  
  // 搜索 API 路径
  const appApis = appJs.match(/["'](\/[a-z]+\/[a-z]+[^"'\s]*)["']/g)
  if (appApis) {
    for (const a of appApis.map(s => s.replace(/["']/g, ''))) {
      allApis.add(a)
    }
  }
  
  // 搜索 axios 配置
  const axiosConfig = appJs.match(/(?:axios|http|request|api|fetch)\s*\.\s*(?:get|post|put|delete|create)\s*\(\s*["']([^"']+)["']/gi)
  if (axiosConfig) {
    for (const a of axiosConfig) {
      const url = a.match(/["']([^"']+)["']/)?.[1]
      if (url) allApis.add(url)
    }
  }
  
  // 搜索 baseURL
  const baseURL = appJs.match(/baseURL\s*:\s*["']([^"']+)["']/i)
  console.log('baseURL:', baseURL?.[1])
  
  // 批量搜索所有 chunk 文件
  console.log('\n=== 搜索 chunk 文件 ===')
  for (const chunkPath of uniqueChunks) {
    if (chunkPath.includes('chunk-vendors') || chunkPath.includes('app.')) continue
    
    try {
      const res = await fetch(`${BASE}${chunkPath}`)
      if (!res.ok) continue
      const js = await res.text()
      
      // 搜索 API 路径
      const apis = js.match(/["'](\/(?:api|mock|practice|exam|question|passage|listen|read|speak|write|user|login|register)\/[^"'\s]+)["']/g)
      if (apis) {
        for (const a of apis.map(s => s.replace(/["']/g, ''))) {
          allApis.add(a)
        }
      }
      
      // 搜索请求调用
      const requests = js.match(/\.(?:get|post|put|delete)\s*\(\s*["']([^"']+)["']/gi)
      if (requests) {
        for (const r of requests) {
          const url = r.match(/["']([^"']+)["']/)?.[1]
          if (url) allKeywords.add(url)
        }
      }
      
      // 搜索 url 字段
      const urls = js.match(/url\s*:\s*["']([^"']+)["']/gi)
      if (urls) {
        for (const u of urls) {
          const url = u.match(/["']([^"']+)["']/)?.[1]
          if (url && url.length > 3) allKeywords.add(url)
        }
      }
    } catch (e) {}
  }
  
  console.log('\n=== API 路径 ===')
  for (const api of [...allApis].sort()) {
    console.log(' ', api)
  }
  
  console.log('\n=== 请求 URL ===')
  for (const url of [...allKeywords].sort()) {
    console.log(' ', url)
  }
}

main().catch(console.error)
