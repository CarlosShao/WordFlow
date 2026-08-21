/**
 * 找到 ieltscat 的正确 JS chunk 文件路径
 */
const BASE = 'https://ieltscat.xdf.cn'

async function main() {
  const res = await fetch(`${BASE}/`)
  const html = await res.text()
  
  // 打印完整的 HTML 来看结构
  console.log('=== 完整 HTML ===')
  console.log(html)
}

main().catch(console.error)
