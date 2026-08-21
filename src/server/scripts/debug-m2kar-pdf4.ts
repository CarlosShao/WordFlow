/**
 * 调试：检查2005年之后PDF是否有文本层
 */
async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
  
  for (const year of [2005, 2006, 2010]) {
    const url = `https://raw.githubusercontent.com/m2kar/KaoYan-English/master/%E7%AD%94%E6%A1%88%E8%A7%A3%E6%9E%90/${year}%E5%B9%B4%E8%80%83%E7%A0%94%E8%8B%B1%E8%AF%AD%E7%9C%9F%E9%A2%98%E7%AD%94%E6%A1%88%E5%8F%8A%E8%A7%A3%E6%9E%90.pdf`
    console.log(`\n=== ${year} 年 ===`)
    
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
      if (!res.ok) {
        console.log(`  HTTP ${res.status}`)
        continue
      }
      const buffer = Buffer.from(await res.arrayBuffer())
      const doc = await (pdfjs as any).getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise
      console.log(`  Pages: ${doc.numPages}`)
      
      // 检查第1页和第2页的文本
      for (const pageNum of [1, 2]) {
        const page = await doc.getPage(pageNum)
        const content = await page.getTextContent()
        const text = content.items.map((item: any) => item.str).join('')
        console.log(`  Page ${pageNum}: ${text.length} chars`)
        if (text.length > 0) {
          // 搜索答案关键词
          const answerIdx = text.indexOf('答案')
          if (answerIdx >= 0) {
            console.log(`    Found "答案" at ${answerIdx}: ...${text.substring(Math.max(0, answerIdx-20), answerIdx+30)}...`)
          }
          // 打印前200字符看看格式
          console.log(`    First 200: ${text.substring(0, 200)}`)
        }
      }
      
      await doc.destroy()
    } catch (e: any) {
      console.log(`  Error: ${e.message}`)
    }
  }
}

main().catch(console.error)
