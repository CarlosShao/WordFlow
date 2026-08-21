/**
 * 找到 getMockExamPage 所在模块的 o 变量来源
 */
const BASE = 'https://ieltscat.xdf.cn'

async function main() {
  const appRes = await fetch(`${BASE}/static/js/app.454159db.js`)
  const js = await appRes.text()
  
  // 找到 getMockExamPage
  const idx = js.indexOf('getMockExamPage')
  
  // 向前搜索到模块函数开头，找 var o=n("xxx") 或 o=n("xxx")
  // 模块格式: "xxx":function(e,t,n){"use strict"; var o=n("yyy"),...
  let moduleStart = idx
  for (let j = idx; j >= Math.max(0, idx - 5000); j--) {
    // 搜索模块定义模式
    const sub = js.substring(j, j + 50)
    if (sub.match(/["'a-f0-9]+:function\(/) || sub.match(/\d+:function\(/)) {
      moduleStart = j
      break
    }
  }
  
  // 从模块开头搜索到 getMockExamPage
  const moduleCode = js.substring(moduleStart, idx + 2000)
  console.log('=== 模块代码 (from start to getMockExamPage+) ===')
  console.log(moduleCode.substring(0, 3000))
}

main().catch(console.error)
