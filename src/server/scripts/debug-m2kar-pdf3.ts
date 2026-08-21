/**
 * 调试：对比2005年和2006年答案解析PDF的文本格式
 */
async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
  
  for (const year of [2005, 2006, 2010, 2015]) {
    const url = `https://raw.githubusercontent.com/m2kar/KaoYan-English/master/%E7%AD%94%E6%A1%88%E8%A7%A3%E6%9E%90/${year}%E5%B9%B4%E8%80%83%E7%A0%94%E8%8B%B1%E8%AF%AD%E7%9C%9F%E9%A2%98%E7%AD%94%E6%A1%88%E5%8F%8A%E8%A7%A3%E6%9E%90.pdf`
    console.log(`\n=== ${year} 年 ===`)
    
    try {
      const res = await fetch(url)
      if (!res.ok) {
        console.log(`  HTTP ${res.status}`)
        continue
      }
      const buffer = Buffer.from(await res.arrayBuffer())
      const doc = await (pdfjs as any).getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise
      
      // 只看第1页
      const page = await doc.getPage(1)
      const content = await page.getTextContent()
      const fullText = content.items.map((item: any) => item.str).join('')
      
      // 搜索 "答案" 出现的位置
      let idx = 0
      let count = 0
      while ((idx = fullText.indexOf('答案', idx)) >= 0 && count < 5) {
        console.log(`  "答案" at ${idx}: ...${fullText.substring(Math.max(0, idx-20), idx+30).replace(/\n/g, '⏎')}...`)
        idx += 2
        count++
      }
      if (count === 0) {
        console.log(`  No "答案" found on page 1`)
        // 打印前500字符
        console.log(`  First 500 chars: ${fullText.substring(0, 500)}`)
      }
      
      await doc.destroy()
    } catch (e: any) {
      console.log(`  Error: ${e.message}`)
    }
  }
}

main().catch(console.error)
