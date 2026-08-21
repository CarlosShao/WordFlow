/**
 * 深入搜索 o["b"] 的实际值
 */
const BASE = 'https://ieltscat.xdf.cn'

async function main() {
  const appRes = await fetch(`${BASE}/static/js/app.454159db.js`)
  const js = await appRes.text()
  
  // 搜索所有包含 "b" 的对象定义
  // 模式: {b:"xxx", c:"yyy"} 或 {b:"xxx"}
  const objPatterns = [
    /\{[a-z]:"b"\s*:\s*"([^"]+)"/g,  // {a:"b":"xxx"
    /\{[^}]*"b"\s*:\s*"([^"]+)"[^}]*\}/g,  // {..."b":"xxx"...}
    /\{[^}]*b\s*:\s*"([^"]+)"[^}]*\}/g,    // {...b:"xxx"...}
  ]
  
  for (const p of objPatterns) {
    const matches = [...js.matchAll(p)]
    if (matches.length > 0) {
      console.log(`Pattern ${p}:`)
      for (const m of matches.slice(0, 5)) {
        console.log(' ', m[0].substring(0, 300))
        console.log('  → b =', m[1])
      }
    }
  }
  
  // 搜索 o={...} 模式，minified 代码中 o 可能是任意字母
  const allObjs = js.match(/\{[^{}]{0,200}"b"\s*:\s*"[^"]+"[^{}]{0,200}\}/g)
  if (allObjs) {
    console.log('\n=== 包含 "b" 键的对象 ===')
    for (const o of allObjs.slice(0, 5)) {
      console.log(o.substring(0, 500))
      console.log('---')
    }
  }
  
  // 搜索 "b" 周围更大范围
  const bIdx = js.indexOf('"b"')
  if (bIdx >= 0) {
    // 向前搜索到最近的 = 或 {
    let start = bIdx
    for (let i = bIdx; i >= Math.max(0, bIdx - 500); i--) {
      if (js[i] === '=' || js[i] === '{' || js[i] === ',') {
        start = i
        break
      }
    }
    // 向后搜索到最近的 } 或 ,
    let end = bIdx
    for (let i = bIdx; i < Math.min(js.length, bIdx + 500); i++) {
      if (js[i] === '}' || js[i] === ';') {
        end = i
        break
      }
    }
    console.log('\n=== "b" 周围 ===')
    console.log(js.substring(start, end + 1))
  }
  
  // 搜索 webpack module exports 中的 b
  // 格式: n.d(t, "b", function() { return ... })
  const moduleExports = js.match(/n\.d\([^,]+,\s*["']b["']/g)
  console.log('\nModule exports for b:', moduleExports)
  
  // 搜索 defineProperty
  const defProps = js.match(/defineProperty[^}]*["']b["']/g)
  console.log('\nDefineProperty for b:', defProps)
  
  // 找 concat(o["b"] 的上下文
  const concatB = js.match(/.{0,300}concat\(o\["b"\]\).{0,100}/g)
  if (concatB) {
    console.log('\n=== concat(o["b"]) 上下文 ===')
    for (const c of concatB.slice(0, 3)) {
      console.log(c.replace(/\n/g, ' ').trim())
      console.log('---')
    }
  }
}

main().catch(console.error)
