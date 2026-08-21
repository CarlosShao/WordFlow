/**
 * 提取 ieltscat app.js 中的完整请求拦截器代码
 */
const BASE = 'https://ieltscat.xdf.cn'

async function main() {
  const appRes = await fetch(`${BASE}/static/js/app.454159db.js`)
  const js = await appRes.text()
  
  // 找 interceptors.request.use 的完整代码
  const idx = js.indexOf('interceptors.request.use')
  if (idx >= 0) {
    // 提取前后 500 字符
    const start = Math.max(0, idx - 200)
    const end = Math.min(js.length, idx + 800)
    console.log('=== 请求拦截器完整代码 ===')
    console.log(js.substring(start, end))
  }
  
  // 找 FromURL
  const fromUrlIdx = js.indexOf('FromURL')
  if (fromUrlIdx >= 0) {
    const start = Math.max(0, fromUrlIdx - 300)
    const end = Math.min(js.length, fromUrlIdx + 500)
    console.log('\n=== FromURL 上下文 ===')
    console.log(js.substring(start, end))
  }
  
  // 找 baseURL 或 API 域名配置
  console.log('\n=== API 配置 ===')
  // 搜索 o["b"] 和 o["c"] 的定义
  const configIdx = js.indexOf('"b"')
  if (configIdx >= 0) {
    console.log(js.substring(Math.max(0, configIdx - 200), configIdx + 500))
  }
  
  // 搜索域名
  const domains = js.match(/["'](https?:\/\/[^"']+\.xdf\.cn[^"']*)["']/g)
  console.log('\n域名:', domains?.slice(0, 10))
  
  // 搜索 concat 调用
  const concats = js.match(/concat\(([^)]+)\)/g)
  console.log('\nconcat 调用 (first 20):')
  if (concats) {
    for (const c of concats.slice(0, 20)) {
      console.log(' ', c)
    }
  }
  
  // 搜索 sso 相关
  const ssoIdx = js.indexOf('sso')
  if (ssoIdx >= 0) {
    console.log('\n=== SSO 上下文 ===')
    console.log(js.substring(Math.max(0, ssoIdx - 200), ssoIdx + 500))
  }
  
  // 搜索 getLoginUrl
  const loginUrlIdx = js.indexOf('getLoginUrl')
  if (loginUrlIdx >= 0) {
    console.log('\n=== getLoginUrl ===')
    console.log(js.substring(Math.max(0, loginUrlIdx - 200), loginUrlIdx + 500))
  }
}

main().catch(console.error)
