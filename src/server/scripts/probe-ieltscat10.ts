/**
 * 分析 ieltscat app.js 中的请求拦截器和签名逻辑
 */
const BASE = 'https://ieltscat.xdf.cn'

async function main() {
  const appRes = await fetch(`${BASE}/static/js/app.454159db.js`)
  const js = await appRes.text()
  console.log('app.js size:', js.length)
  
  // 搜索请求拦截器
  console.log('\n=== 请求拦截器 ===')
  const interceptorMatch = js.match(/.{0,200}(?:interceptors|request\.use|response\.use).{0,200}/gi)
  if (interceptorMatch) {
    for (const m of interceptorMatch.slice(0, 5)) {
      console.log(m.replace(/\n/g, ' ').trim())
      console.log('---')
    }
  }
  
  // 搜索 header 设置
  console.log('\n=== Header 设置 ===')
  const headerMatch = js.match(/.{0,100}(?:setRequestHeader|headers|Authorization|X-Token|X-Sign|x-csrf|csrf).{0,100}/gi)
  if (headerMatch) {
    for (const m of headerMatch.slice(0, 10)) {
      console.log(m.replace(/\n/g, ' ').trim())
      console.log('---')
    }
  }
  
  // 搜索签名/加密
  console.log('\n=== 签名/加密 ===')
  const signMatch = js.match(/.{0,100}(?:sign|encrypt|md5|sha|hash|secret|key|token|nonce|timestamp).{0,100}/gi)
  if (signMatch) {
    for (const m of signMatch.slice(0, 15)) {
      console.log(m.replace(/\n/g, ' ').trim())
      console.log('---')
    }
  }
  
  // 搜索 status:42 相关逻辑
  console.log('\n=== status 42 处理 ===')
  const status42 = js.match(/.{0,100}42.{0,100}/g)
  if (status42) {
    for (const m of status42.slice(0, 5)) {
      console.log(m.replace(/\n/g, ' ').trim())
      console.log('---')
    }
  }
  
  // 搜索 ajaxSetup / axios.create
  console.log('\n=== axios 配置 ===')
  const axiosConfig = js.match(/.{0,200}(?:axios\.create|ajaxSetup|\.defaults).{0,200}/gi)
  if (axiosConfig) {
    for (const m of axiosConfig.slice(0, 5)) {
      console.log(m.replace(/\n/g, ' ').trim())
      console.log('---')
    }
  }
  
  // 搜索 jQuery ajax
  console.log('\n=== jQuery ajax ===')
  const jqueryAjax = js.match(/\$\.ajax\s*\(\s*\{[\s\S]*?\}\s*\)/g)
  if (jqueryAjax) {
    for (const m of jqueryAjax.slice(0, 3)) {
      console.log(m.substring(0, 300))
      console.log('---')
    }
  }
  
  // 搜索 beforeSend
  console.log('\n=== beforeSend ===')
  const beforeSend = js.match(/.{0,200}beforeSend.{0,200}/gi)
  if (beforeSend) {
    for (const m of beforeSend.slice(0, 3)) {
      console.log(m.replace(/\n/g, ' ').trim())
      console.log('---')
    }
  }
}

main().catch(console.error)
