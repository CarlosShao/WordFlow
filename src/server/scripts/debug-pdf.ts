import pdfjs from 'pdfjs-dist/legacy/build/pdf.js'

async function main() {
  const res = await fetch('https://res-zhenti.burningvocabulary.cn/images/read/kaoyan/2024/01/8d77d55b5b4b465d0c4f14260dd4785d.pdf?v=2')
  const buf = Buffer.from(await res.arrayBuffer())
  const task = pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true })
  const doc = await task.promise
  const page = await doc.getPage(1)
  const content = await page.getTextContent()
  const text = content.items.map((i: any) => i.str).join(' ')
  console.log('=== PAGE 1 ===')
  console.log(text)
  console.log('\n=== PAGE 2 ===')
  const page2 = await doc.getPage(2)
  const content2 = await page2.getTextContent()
  console.log(content2.items.map((i: any) => i.str).join(' '))
  await doc.destroy()
}
main().catch(console.error)
