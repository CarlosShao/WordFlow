/**
 * 通过模拟浏览器行为探测 ieltscat 的真实 API
 * 策略：先访问首页 → 获取 cookie → 尝试登录 → 抓取题目数据
 */
const BASE = 'https://ieltscat.xdf.cn'

async function main() {
  console.log('=== ieltscat 模拟浏览器探测 ===\n')
  
  // 1. 访问首页获取 cookie
  console.log('[1] 访问首页...')
  const homeRes = await fetch(`${BASE}/`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  })
  
  const setCookies = homeRes.headers.getSetCookie?.() || homeRes.headers.get('set-cookie')
  console.log('Status:', homeRes.status)
  console.log('Set-Cookie:', setCookies)
  
  const homeHtml = await homeRes.text()
  
  // 找所有 script src，包括 chunk 文件
  const scripts = homeHtml.match(/src=["']([^"']+\.js)["']/g)
  console.log('Scripts:', scripts)
  
  // 找预加载的 chunk 文件名
  const preloadChunks = homeHtml.match(/chunk-[a-f0-9]+/g)
  console.log('Preload chunks:', [...new Set(preloadChunks || [])].slice(0, 10))
  
  // 2. 下载 app.js 并分析
  console.log('\n[2] 下载 app.js...')
  const appRes = await fetch(`${BASE}/js/app.js`)
  const appJs = await appRes.text()
  console.log('app.js size:', appJs.length)
  
  // Vue CLI 的 app.js 通常包含路由配置和 API 配置
  // 搜索所有字符串引用
  const strings = appJs.match(/["'`]([^"'`\s]{3,})["'`]/g)
  const apiStrings = strings?.filter(s => 
    /mock|practice|question|login|user|listen|read|speak|write|exam|test|api/i.test(s)
  ).map(s => s.replace(/["'`]/g, ''))
  console.log('API strings in app.js:', [...new Set(apiStrings || [])].slice(0, 30))
  
  // 3. 直接下载一个 chunk 文件看看内容
  console.log('\n[3] 下载 chunk 文件...')
  if (preloadChunks) {
    const chunkName = preloadChunks[0]
    const chunkRes = await fetch(`${BASE}/js/${chunkName}.js`)
    const chunkJs = await chunkRes.text()
    console.log(`${chunkName}.js size:`, chunkJs.length)
    console.log(`Content (first 500):`, chunkJs.substring(0, 500))
    
    // 搜索 API
    const chunkApis = chunkJs.match(/["'](\/[^"'\s]{5,})["']/g)
    console.log(`API paths in ${chunkName}:`, chunkApis?.slice(0, 10))
  }
  
  // 4. 用 webpack 的 chunk 文件名格式尝试
  console.log('\n[4] 尝试 webpack chunk 格式...')
  // Vue CLI 使用数字作为 chunk ID
  for (let i = 0; i < 10; i++) {
    const res = await fetch(`${BASE}/js/${i}~${preloadChunks?.[0] || 'chunk-000f64b2'}.js`, { method: 'HEAD' })
    console.log(`/js/${i}~...js: ${res.status}`)
  }
  
  // 5. 看看有没有 css 中的 preload 列表
  console.log('\n[5] CSS preload 分析...')
  const cssLinks = homeHtml.match(/<link[^>]*rel="preload"[^>]*>/g)
  console.log('Preload links:', cssLinks?.slice(0, 5))
  
  // 6. 尝试直接访问练习页面
  console.log('\n[6] 尝试 /practice/read 页面...')
  const readRes = await fetch(`${BASE}/practice/read`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html',
      'Referer': `${BASE}/`,
    },
  })
  const readHtml = await readRes.text()
  console.log('Status:', readRes.status)
  console.log('HTML size:', readHtml.length)
  
  // 找 JS 文件
  const readScripts = readHtml.match(/src=["']([^"']+\.js)["']/g)
  console.log('Scripts in /practice/read:', readScripts)
}

main().catch(console.error)
