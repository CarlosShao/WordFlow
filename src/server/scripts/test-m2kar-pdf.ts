/**
 * 测试从 m2kar 仓库下载答案解析PDF并提取文本
 */
async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
  
  const url = 'https://raw.githubusercontent.com/m2kar/KaoYan-English/master/%E7%AD%94%E6%A1%88%E8%A7%A3%E6%9E%90/2000%E5%B9%B4%E8%80%83%E7%A0%94%E8%8B%B1%E8%AF%AD%E7%9C%9F%E9%A2%98%E7%AD%94%E6%A1%88%E5%8F%8A%E8%A7%A3%E6%9E%90.pdf'
  console.log('Downloading from:', url)
  
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  console.log('PDF size:', buffer.length, 'bytes')
  
  const loadingTask = (pdfjs as any).getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  })
  const doc = await loadingTask.promise
  console.log('Pages:', doc.numPages)
  
  // 提取前3页文本
  for (let i = 1; i <= Math.min(3, doc.numPages); i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item: any) => item.str).join('\n')
    console.log(`\n--- Page ${i} ---`)
    console.log(pageText.substring(0, 2000))
  }
  
  await doc.destroy()
}

main().catch(console.error)
