/**
 * 找到模块 "923a" 中 o["b"] 和 o["c"] 的实际值
 */
const BASE = 'https://ieltscat.xdf.cn'

async function main() {
  const appRes = await fetch(`${BASE}/static/js/app.454159db.js`)
  const js = await appRes.text()
  
  // 找到 "923a":function 模块
  const idx = js.indexOf('"923a":function')
  if (idx < 0) {
    console.log('Module "923a" not found, trying other patterns...')
    // 可能是 923a:function 或 '923a':function
    const altIdx = js.indexOf('923a:function')
    if (altIdx >= 0) {
      console.log('Found at alt index')
    } else {
      console.log('Not found at all')
      return
    }
  }
  
  const startIdx = idx >= 0 ? idx : js.indexOf('923a:function')
  
  // 提取整个模块
  let depth = 0
  let inFunction = false
  let end = startIdx
  for (let i = startIdx; i < js.length; i++) {
    if (js[i] === '{') {
      depth++
      inFunction = true
    }
    if (js[i] === '}') {
      depth--
      if (depth === 0 && inFunction) {
        end = i
        break
      }
    }
  }
  
  const moduleCode = js.substring(startIdx, end + 1)
  console.log('=== 模块 "923a" ===')
  console.log('Length:', moduleCode.length)
  console.log(moduleCode)
}

main().catch(console.error)
