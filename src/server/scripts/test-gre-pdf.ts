/**
 * 测试从 ERICXUCHI/GRE-Resource 下载并提取PDF文本
 */
async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
  
  const tests = [
    { name: 'GRE阅读题库2019年', url: 'https://raw.githubusercontent.com/ERICXUCHI/GRE-Resource/master/GRE%E9%98%85%E8%AF%BB%E9%A2%98%E5%BA%932019%E5%B9%B4.pdf' },
    { name: '500题', url: 'https://raw.githubusercontent.com/ERICXUCHI/GRE-Resource/master/500%E9%A2%98.pdf' },
    { name: 'GRE填空习题集', url: 'https://raw.githubusercontent.com/ERICXUCHI/GRE-Resource/master/GRE%E5%A1%AB%E7%A9%BA%E4%B9%A0%E9%A2%98%E9%9B%86.pdf' },
  ]
  
  for (const test of tests) {
    console.log(`\n=== ${test.name} ===`)
    try {
      const res = await fetch(test.url, { signal: AbortSignal.timeout(30000) })
      if (!res.ok) {
        console.log(`  HTTP ${res.status}`)
        continue
      }
      const buffer = Buffer.from(await res.arrayBuffer())
      const doc = await (pdfjs as any).getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise
      console.log(`  Pages: ${doc.numPages}`)
      
      // 提取第1页
      const page = await doc.getPage(1)
      const content = await page.getTextContent()
      const text = content.items.map((item: any) => item.str).join('')
      console.log(`  Page 1: ${text.length} chars`)
      console.log(`  First 500: ${text.substring(0, 500)}`)
      
      // 提取第2页
      if (doc.numPages > 1) {
        const page2 = await doc.getPage(2)
        const content2 = await page2.getTextContent()
        const text2 = content2.items.map((item: any) => item.str).join('')
        console.log(`  Page 2: ${text2.length} chars`)
        console.log(`  First 500: ${text2.substring(0, 500)}`)
      }
      
      await doc.destroy()
    } catch (e: any) {
      console.log(`  Error: ${e.message}`)
    }
  }
}

main().catch(console.error)
