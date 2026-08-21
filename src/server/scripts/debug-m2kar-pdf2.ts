/**
 * 调试：查看2001年答案解析PDF中文本项的具体内容，重点关注答案附近
 */
async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
  
  const url = 'https://raw.githubusercontent.com/m2kar/KaoYan-English/master/%E7%AD%94%E6%A1%88%E8%A7%A3%E6%9E%90/2001%E5%B9%B4%E8%80%83%E7%A0%94%E8%8B%B1%E8%AF%AD%E7%9C%9F%E9%A2%98%E7%AD%94%E6%A1%88%E5%8F%8A%E8%A7%A3%E6%9E%90.pdf'
  
  const res = await fetch(url)
  const buffer = Buffer.from(await res.arrayBuffer())
  
  const loadingTask = (pdfjs as any).getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  })
  const doc = await loadingTask.promise
  
  // 提取第1页，按原始文本项输出
  const page = await doc.getPage(1)
  const content = await page.getTextContent()
  
  // 找到包含"答案"的文本项及其上下文
  const items = content.items.map((item: any) => item.str)
  for (let i = 0; i < items.length; i++) {
    if (items[i].includes('答案')) {
      // 打印前5个和后5个项
      const start = Math.max(0, i - 5)
      const end = Math.min(items.length, i + 5)
      console.log(`\n--- Found "答案" at item index ${i} ---`)
      for (let j = start; j < end; j++) {
        console.log(`  [${j}]: "${items[j]}"`)
      }
    }
  }
  
  // 也试试把所有文本项合并后用不同方式搜索
  const fullText = items.join('')
  console.log('\n--- Full text search for 答案 ---')
  let idx = 0
  while ((idx = fullText.indexOf('答案', idx)) >= 0) {
    console.log(`  At char ${idx}: ...${fullText.substring(Math.max(0, idx-10), idx+20)}...`)
    idx += 2
    if (idx > 200) break // 只看前几个
  }
  
  await doc.destroy()
}

main().catch(console.error)
