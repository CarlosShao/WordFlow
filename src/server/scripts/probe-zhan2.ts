/**
 * 深入分析小站雅思的前端 JS，找到所有 API 路径
 */
const BASE = 'https://aiielts.zhan.com'

async function main() {
  console.log('=== 小站雅思 JS 深入分析 ===\n')
  
  const jsRes = await fetch(`${BASE}/js/index-_8hsVzHY.js`)
  const js = await jsRes.text()
  console.log('JS size:', js.length)
  
  // 搜索所有 /api/ 路径
  const apiPaths = js.match(/["'](\/api\/[^"'\s]+)["']/g)
  if (apiPaths) {
    const unique = [...new Set(apiPaths.map(p => p.replace(/["']/g, '')))]
    console.log(`\n找到 ${unique.length} 个 API 路径:`)
    for (const p of unique.sort()) {
      console.log(' ', p)
    }
  }
  
  // 搜索 zhenti（真题）相关
  console.log('\n=== 真题相关 ===')
  const zhentiPaths = js.match(/.{0,50}zhenti.{0,50}/gi)
  if (zhentiPaths) {
    const seen = new Set<string>()
    for (const p of zhentiPaths) {
      const t = p.replace(/\n/g, ' ').trim()
      if (!seen.has(t)) {
        seen.add(t)
        console.log(' ', t)
      }
      if (seen.size > 20) break
    }
  }
  
  // 搜索 exam（考试）相关
  console.log('\n=== 考试相关 ===')
  const examPaths = js.match(/.{0,30}exam.{0,30}/gi)
  if (examPaths) {
    const seen = new Set<string>()
    for (const p of examPaths) {
      const t = p.replace(/\n/g, ' ').trim()
      if (!seen.has(t) && t.length < 100) {
        seen.add(t)
        console.log(' ', t)
      }
      if (seen.size > 15) break
    }
  }
  
  // 搜索 listen/read（听力/阅读）
  console.log('\n=== 听力/阅读相关 ===')
  const listenRead = js.match(/.{0,30}(?:listen|read).{0,30}/gi)
  if (listenRead) {
    const seen = new Set<string>()
    for (const p of listenRead) {
      const t = p.replace(/\n/g, ' ').trim()
      if (!seen.has(t) && t.length < 100 && !t.includes('readyRead')) {
        seen.add(t)
        console.log(' ', t)
      }
      if (seen.size > 15) break
    }
  }
  
  // 搜索域名
  const domains = js.match(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}[^"'\s]*/gi)
  const uniqueDomains = [...new Set(domains || [])].filter(d => 
    !d.includes('w3.org') && !d.includes('schema.org') && !d.includes('ets.org') && !d.includes('wx.qq.com') && !d.includes('alicdn')
  )
  console.log('\n=== 域名 ===')
  for (const d of uniqueDomains.slice(0, 10)) {
    console.log(' ', d)
  }
  
  // 搜索 VIP/付费相关
  console.log('\n=== 付费/VIP 相关 ===')
  const vipPaths = js.match(/.{0,30}(?:vip|pay|order|price|unlock|lock).{0,30}/gi)
  if (vipPaths) {
    const seen = new Set<string>()
    for (const p of vipPaths) {
      const t = p.replace(/\n/g, ' ').trim()
      if (!seen.has(t) && t.length < 100) {
        seen.add(t)
        console.log(' ', t)
      }
      if (seen.size > 10) break
    }
  }
}

main().catch(console.error)
