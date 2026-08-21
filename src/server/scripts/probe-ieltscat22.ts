/**
 * 找到模块 "3de1" 中 o 和 i 的定义
 */
const BASE = 'https://ieltscat.xdf.cn'

async function main() {
  const appRes = await fetch(`${BASE}/static/js/app.454159db.js`)
  const js = await appRes.text()
  
  // 找到 "3de1" 模块的完整代码
  const moduleIdx = js.indexOf('"3de1":function')
  if (moduleIdx < 0) {
    console.log('Module not found')
    return
  }
  
  // 提取整个模块函数
  let start = moduleIdx
  let depth = 0
  let end = moduleIdx
  let inFunction = false
  for (let i = moduleIdx; i < js.length; i++) {
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
  
  const moduleCode = js.substring(start, end + 1)
  console.log('=== 模块 "3de1" 完整代码 ===')
  console.log(moduleCode)
  console.log('\n=== 长度 ===', moduleCode.length)
}

main().catch(console.error)
