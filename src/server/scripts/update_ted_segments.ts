/**
 * 为 926 条 TED-ED 更新 segments（逐句双语对照）。
 * 读取 clean/segs.json，按 source_url 匹配更新。
 * 运行：cd src/server && npx tsx scripts/update_ted_segments.ts
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const segsPath = resolve(__dirname, '../../../clean/segs.json')
const BV = 'BV1Gf4y1y7wc'
const SOURCE = 'TED-ED'

async function main() {
  const segs: Record<string, Array<{ en: string; zh: string }>> = JSON.parse(readFileSync(segsPath, 'utf-8'))
  const prisma = getPrisma()
  let ok = 0
  let fail = 0

  for (const [pnum, list] of Object.entries(segs)) {
    const sourceUrl = `https://www.bilibili.com/video/${BV}?p=${pnum}`
    const existing = await prisma.content.findUnique({
      where: { source_sourceUrl: { source: SOURCE, sourceUrl } },
      select: { id: true },
    })
    if (!existing) {
      fail++
      continue
    }
    await prisma.content.update({
      where: { id: existing.id },
      data: { segments: list },
    })
    ok++
  }
  console.log(`DONE: ${ok} updated, ${fail} not found`)
  await disconnectPrisma()
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})