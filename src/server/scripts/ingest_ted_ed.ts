/**
 * 入库 TED-ED 926 集（B站双语视频 + 中英文本）。
 * 读取 clean/ted_merged.json，upsert 到 contents 表。
 * 运行：cd src/server && npx tsx scripts/ingest_ted_ed.ts
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataPath = resolve(__dirname, '../../../clean/ted_merged.json')
const BV = 'BV1Gf4y1y7wc'
const SOURCE = 'TED-ED'

interface TedRow {
  pnum: number
  cid: number
  duration: number
  date: string
  title: string
  author: string
  en: string
  zh: string
}

async function main() {
  const rows: TedRow[] = JSON.parse(readFileSync(dataPath, 'utf-8'))
  const prisma = getPrisma()
  let created = 0
  let updated = 0

  for (const r of rows) {
    const sourceUrl = `https://www.bilibili.com/video/${BV}?p=${r.pnum}`
    const videoUrl =
      `https://player.bilibili.com/player.html?bvid=${BV}&cid=${r.cid}` +
      `&page=${r.pnum}&high_quality=1&danmaku=0`
    const data = {
      type: 'VIDEO' as const,
      title: r.title,
      source: SOURCE,
      sourceUrl,
      author: r.author || null,
      content: r.en,
      translation: r.zh,
      videoUrl,
      duration: r.duration,
      publishedAt: r.date ? new Date(r.date) : null,
      tags: ['TED-ED', '视频', '双语'],
      isPublished: true,
    }
    const existing = await prisma.content.findUnique({
      where: { source_sourceUrl: { source: SOURCE, sourceUrl } },
      select: { id: true },
    })
    if (existing) {
      await prisma.content.update({ where: { id: existing.id }, data })
      updated++
    } else {
      await prisma.content.create({ data })
      created++
    }
    if ((created + updated) % 50 === 0) {
      console.log(`  progress: ${created} created, ${updated} updated`)
    }
  }

  console.log(`DONE: ${created} created, ${updated} updated (total ${rows.length})`)
  await disconnectPrisma()
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})