/**
 * 调试：提取2001年答案解析PDF前5页的原始文本
 */
async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
  
  const url = 'https://raw.githubusercontent.com/m2kar/KaoYan-English/master/%E7%AD%94%E6%A1%88%E8%A7%A3%E6%9E%90/2001%E5%B9%B4%E8%80%83%E7%A0%94%E8%8B%B1%E8%AF%AD%E7%9C%9F%E9%A2%98%E7%AD%94%E6%A1%88%E5%8F%8A%E8%A7%A3%E6%9E%90.pdf'
  console.log('Downloading:', url)
  
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  
  const loadingTask = (pdfjs as any).getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  })
  const doc = await loadingTask.promise
  console.log('Pages:', doc.numPages)
  
  for (let i = 1; i <= Math.min(5, doc.numPages); i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    // 按原始顺序输出每个文本项
    const items = content.items.map((item: any) => `[${item.str}]`)
    console.log(`\n--- Page ${i} (raw items) ---`)
    console.log(items.join(' '))
    console.log('\n--- Page ' + i + ' (joined) ---')
    console.log(content.items.map((item: any) => item.str).join(''))
  }
  
  await doc.destroy()
}

main().catch(console.error)
