/**
 * 分析 ieltscat app.js 中的题目获取 API
 */
const BASE = 'https://ieltscat.xdf.cn'

async function main() {
  const appRes = await fetch(`${BASE}/static/js/app.454159db.js`)
  const js = await appRes.text()
  
  // 搜索 getDetailApi / getSubjectApi / question 相关
  const patterns = [
    'getDetailApi',
    'getSubjectApi', 
    'getQuestionApi',
    'reviewQuestion',
    'previewQuestion',
    'question/',
    '/question?',
    'navigate',
    'section',
    'getBPAnswer',
  ]
  
  for (const p of patterns) {
    const matches = js.match(new RegExp(`.{0,150}${p}.{0,150}`, 'gi'))
    if (matches) {
      console.log(`\n=== ${p} ===`)
      for (const m of matches.slice(0, 3)) {
        console.log(m.replace(/\n/g, ' ').trim())
        console.log('---')
      }
    }
  }
  
  // 搜索 b= 的定义（API 基础路径）
  const bDef = js.match(/["']b["']\s*:\s*["']([^"']+)["']/g)
  console.log('\n=== b 定义 ===', bDef)
  
  // 搜索 o={b:...c:...} 模式
  const objDef = js.match(/\{[^{}]*["']b["']\s*:\s*["'][^"']+["'][^{}]*\}/g)
  if (objDef) {
    console.log('\n=== 包含 b 的对象 ===')
    for (const d of objDef.slice(0, 3)) {
      console.log(d.substring(0, 300))
    }
  }
  
  // 搜索 mock/question
  const mockQ = js.match(/.{0,100}mock\/question.{0,100}/gi)
  if (mockQ) {
    console.log('\n=== mock/question ===')
    for (const m of mockQ.slice(0, 3)) {
      console.log(m.replace(/\n/g, ' ').trim())
    }
  }
}

main().catch(console.error)
