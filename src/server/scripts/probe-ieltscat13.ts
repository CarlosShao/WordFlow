/**
 * 找 ieltscat app.js 中的 API 基础路径配置 o["b"] 和 o["c"]
 */
const BASE = 'https://ieltscat.xdf.cn'

async function main() {
  const appRes = await fetch(`${BASE}/static/js/app.454159db.js`)
  const js = await appRes.text()
  
  // 搜索 o = { ... b: ... c: ... } 的定义
  // Vue CLI minified 代码中, 配置对象通常在模块开头定义
  // 搜索 "b" 和 "c" 的赋值
  const patterns = [
    /["']b["']\s*:\s*["']([^"']+)["']/g,  // b: "url"
    /["']c["']\s*:\s*["']([^"']+)["']/g,  // c: "url"
    /b\s*=\s*["'](https?:\/\/[^"']+)["']/g,  // b = "url"
    /c\s*=\s*["'](https?:\/\/[^"']+)["']/g,  // c = "url"
  ]
  
  for (const p of patterns) {
    const matches = [...js.matchAll(p)]
    if (matches.length > 0) {
      console.log(`Pattern ${p}:`)
      for (const m of matches.slice(0, 10)) {
        console.log(' ', m[0], '→', m[1])
      }
    }
  }
  
  // 搜索 https:// 开头的字符串
  console.log('\n=== 所有 https:// 字符串 ===')
  const httpsStrings = js.match(/["'](https?:\/\/[^"'\s]+)["']/g)
  if (httpsStrings) {
    const unique = [...new Set(httpsStrings.map(s => s.replace(/["']/g, '')))]
    for (const s of unique) {
      console.log(' ', s)
    }
  }
  
  // 搜索 "b" 和 "c" 定义的上下文
  // 模式: var o = { ... b: "xxx", c: "yyy" ... }
  const configMatch = js.match(/\{[^}]*["']b["']\s*:\s*["'][^"']+["'][^}]*["']c["']\s*:\s*["'][^"']+["'][^}]*\}/)
  if (configMatch) {
    console.log('\n=== 配置对象 ===')
    console.log(configMatch[0])
  }
  
  // 搜索包含 xdf.cn 的上下文
  const xdfContexts = js.match(/.{0,100}xdf\.cn.{0,100}/g)
  if (xdfContexts) {
    console.log('\n=== xdf.cn 上下文 (unique) ===')
    const seen = new Set<string>()
    for (const ctx of xdfContexts) {
      const trimmed = ctx.replace(/\n/g, ' ').trim()
      if (!seen.has(trimmed)) {
        seen.add(trimmed)
        console.log(' ', trimmed)
      }
      if (seen.size > 15) break
    }
  }
}

main().catch(console.error)
