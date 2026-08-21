/**
 * 分析 ieltscat app.js 中 questionSource 参数
 */
const BASE = 'https://ieltscat.xdf.cn'

async function main() {
  const appRes = await fetch(`${BASE}/static/js/app.454159db.js`)
  const js = await appRes.text()
  
  // 搜索 questionSource
  const matches = js.match(/.{0,100}questionSource.{0,100}/gi)
  if (matches) {
    console.log('=== questionSource 相关 ===')
    for (const m of matches.slice(0, 10)) {
      console.log(m.replace(/\n/g, ' ').trim())
      console.log('---')
    }
  }
  
  // 搜索 mockList 调用
  const mockListMatches = js.match(/.{0,100}mockList.{0,100}/gi)
  if (mockListMatches) {
    console.log('\n=== mockList 相关 ===')
    for (const m of mockListMatches.slice(0, 5)) {
      console.log(m.replace(/\n/g, ' ').trim())
      console.log('---')
    }
  }
  
  // 搜索 mock/list 调用上下文
  const mockListCall = js.match(/.{0,200}mock\/(login\/)?list.{0,200}/gi)
  if (mockListCall) {
    console.log('\n=== mock/list 调用 ===')
    for (const m of mockListCall.slice(0, 5)) {
      console.log(m.replace(/\n/g, ' ').trim())
      console.log('---')
    }
  }
  
  // 搜索 questionSource 值
  const sourceValues = js.match(/questionSource["'\s:=]+["']([^"']+)["']/gi)
  console.log('\n=== questionSource 值 ===', sourceValues)
  
  // 搜索 cambridge/剑雅
  const cambridge = js.match(/.{0,50}(?:cambridge|剑雅|剑\d+).{0,50}/gi)
  if (cambridge) {
    console.log('\n=== 剑雅相关 ===')
    const seen = new Set<string>()
    for (const m of cambridge) {
      const t = m.replace(/\n/g, ' ').trim()
      if (!seen.has(t)) {
        seen.add(t)
        console.log(' ', t)
      }
      if (seen.size > 10) break
    }
  }
}

main().catch(console.error)
