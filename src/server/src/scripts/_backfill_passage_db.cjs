/**
 * 将 backfill_ielts_passages.py 产出的 passage_backfill.json 写回 DB contents.content。
 * 按 "SOURCE|sourceUrl" 匹配，覆盖旧的“摘要还原”占位内容；保留已通过 options 拼出的更优正文。
 * 运行: cd src/server && node src/scripts/_backfill_passage_db.cjs
 */
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const ZHENTI = 'D:/work/java/AI-workspace/WordFlow/src/scripts/zhenti'
const p = new PrismaClient()

async function main() {
  const raw = JSON.parse(fs.readFileSync(ZHENTI + '/passage_backfill.json', 'utf-8'))
  const keys = Object.keys(raw)
  console.log(`待写回 ${keys.length} 条`)
  let updated = 0, kept = 0, miss = 0
  for (const key of keys) {
    const [source, sourceUrl] = key.split('|')
    const body = raw[key]
    const existing = await p.content.findUnique({
      where: { source_sourceUrl: { source, sourceUrl } },
    })
    if (!existing) { miss++; console.log(`  ⚠️ 无匹配: ${key}`); continue }
    const old = existing.content || ''
    const oldIsSummary = /摘要还原|未收录该阅读全文|暂无原文收录/.test(old)
    if (oldIsSummary || old.length < body.length * 0.8) {
      await p.content.update({ where: { id: existing.id }, data: { content: body } })
      updated++
    } else {
      kept++
    }
  }
  console.log(`完成: 更新=${updated} 保留=${kept} 未匹配=${miss}`)
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
