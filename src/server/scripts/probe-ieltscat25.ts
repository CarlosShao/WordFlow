/**
 * 找到完整模块定义，找到 o=n("xxx") 导入
 */
const BASE = 'https://ieltscat.xdf.cn'

async function main() {
  const appRes = await fetch(`${BASE}/static/js/app.454159db.js`)
  const js = await appRes.text()
  
  // 找到 getMockExamPage 的位置
  const idx = js.indexOf('getMockExamPage')
  
  // 向前搜索更远，找到模块定义
  // 模块定义格式: "hex_id":function(e,t,n){"use strict";var ...o=n("...")...
  const before = js.substring(Math.max(0, idx - 10000), idx)
  
  // 找最后一个 function(e,t,n) 模式
  const moduleDefPattern = /["']?[a-f0-9]+["']?:function\(e,t,n\)/g
  const matches = [...before.matchAll(moduleDefPattern)]
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1]
    const moduleStartInBefore = lastMatch.index!
    const moduleStart = Math.max(0, idx - 10000) + moduleStartInBefore
    
    // 提取到 getMockExamPage 后面一点
    const moduleCode = js.substring(moduleStart, idx + 3000)
    
    console.log('=== 完整模块代码 ===')
    console.log(moduleCode.substring(0, 5000))
  }
}

main().catch(console.error)
