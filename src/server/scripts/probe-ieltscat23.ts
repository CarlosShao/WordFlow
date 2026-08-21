/**
 * 找到定义 API 路径的模块（包含 /mock/、/exam/、/question/ 等路径）
 */
const BASE = 'https://ieltscat.xdf.cn'

async function main() {
  const appRes = await fetch(`${BASE}/static/js/app.454159db.js`)
  const js = await appRes.text()
  
  // 搜索包含 getMockExamPage 或 getQuestionDetail 的模块
  // 这些函数名出现在 API 配置中
  const keywords = ['getMockExamPage', 'getQuestionDetail', 'getMockBpa', 'examUesr', 'modelResults']
  
  for (const kw of keywords) {
    const idx = js.indexOf(kw)
    if (idx >= 0) {
      // 找到包含这个关键词的函数块
      let start = idx
      for (let j = idx; j >= Math.max(0, idx - 2000); j--) {
        if (js.substring(j, j + 10).match(/\d+:"?\w*"?:function/) || 
            (js[j] === '{' && js[j-1] === ')' && js[j-2] === '(')) {
          start = j
          break
        }
      }
      let end = idx
      let depth = 0
      for (let j = idx; j < Math.min(js.length, idx + 5000); j++) {
        if (js[j] === '{') depth++
        if (js[j] === '}') {
          depth--
          if (depth <= 0) {
            end = j
            break
          }
        }
      }
      
      const block = js.substring(start, end + 1)
      console.log(`\n=== 包含 "${kw}" 的块 (${block.length} chars) ===`)
      console.log(block.substring(0, 1200))
      console.log('---')
      break  // 找到一个就够了
    }
  }
}

main().catch(console.error)
