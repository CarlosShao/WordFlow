/**
 * 找到 webpack module export "b" 的实际值
 */
const BASE = 'https://ieltscat.xdf.cn'

async function main() {
  const appRes = await fetch(`${BASE}/static/js/app.454159db.js`)
  const js = await appRes.text()
  
  // n.d(t, "b", function() { return xxx })
  // 找到 xxx 的值
  const exportPattern = /n\.d\([^,]+,\s*["']b["']\s*,\s*function\(\)\s*\{\s*return\s+([^}\s]+)\s*\}/g
  const matches = [...js.matchAll(exportPattern)]
  console.log(`Found ${matches.length} exports for "b"`)
  for (const m of matches) {
    console.log('  return value:', m[1])
    // 找这个值的定义
    const varName = m[1]
    // 在附近搜索 varName = "xxx" 或 varName = 'xxx'
    const varDefPattern = new RegExp(`${varName}\\s*=\\s*["']([^"']+)["']`, 'g')
    const varMatches = [...js.matchAll(varDefPattern)]
    if (varMatches.length > 0) {
      console.log('  定义:')
      for (const vm of varMatches.slice(0, 3)) {
        console.log(`    ${varName} = "${vm[1]}"`)
      }
    }
  }
  
  // 也搜索所有 n.d exports
  const allExports = js.match(/n\.d\([^,]+,\s*["']([a-z])["']\s*,\s*function\(\)\s*\{\s*return\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\}/g)
  if (allExports) {
    console.log('\n=== 所有 exports ===')
    for (const e of allExports.slice(0, 20)) {
      console.log(' ', e)
    }
  }
  
  // 搜索完整的模块定义块
  // 格式: xxx:function(t,n,e){ ... n.d(e,"b",...) ... var xxx="yyy" ... }
  const modulePattern = /(\d+|"[a-f0-9]+")\s*:\s*function\s*\([^)]*\)\s*\{[^{}]*n\.d\([^,]+,\s*["']b["'][^}]*\}[^}]*\}/g
  const moduleMatches = [...js.matchAll(modulePattern)]
  console.log(`\nFound ${moduleMatches.length} module blocks with "b" export`)
  for (const m of moduleMatches.slice(0, 3)) {
    console.log('\n=== Module block ===')
    console.log(m[0].substring(0, 800))
  }
  
  // 更宽泛：找包含 n.d(e,"b" 的整个函数
  for (let i = 0; i < js.length; i++) {
    if (js.substring(i, i + 10).includes('n.d(t,"b"') || js.substring(i, i + 10).includes('n.d(e,"b"')) {
      // 向前找函数开头
      let start = i
      let depth = 0
      for (let j = i; j >= Math.max(0, i - 2000); j--) {
        if (js[j] === '}') depth++
        if (js[j] === '{') {
          if (depth === 0) {
            start = j
            break
          }
          depth--
        }
      }
      // 向后找函数结尾
      let end = i
      depth = 0
      for (let j = i; j < Math.min(js.length, i + 2000); j++) {
        if (js[j] === '{') depth++
        if (js[j] === '}') {
          depth--
          if (depth === 0) {
            end = j
            break
          }
        }
      }
      const block = js.substring(start, end + 1)
      // 在这个块中找字符串赋值
      const strings = block.match(/\w+\s*=\s*["']([^"']{5,})["']/g)
      console.log(`\n=== Block at ${i} ===`)
      console.log('Block (first 600):', block.substring(0, 600))
      console.log('Strings:', strings?.slice(0, 10))
      break
    }
  }
}

main().catch(console.error)
