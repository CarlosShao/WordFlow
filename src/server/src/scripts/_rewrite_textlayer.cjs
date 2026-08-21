// 强制重写文本层册阅读正文（修复被"删孤立%"污染的记录），且不二次删除 %
const fs = require('fs')
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

const JSON_PATH = process.env.RW_JSON
const SRC_PREFIX = process.env.RW_SRC || 'IELTS' // IELTS 或 IELTS_G

// 控制字符正则（C0 控制符 + 常见非常规空白）用 \u 转义，避免字面量
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g
const NBSP = /\u00a0/g
const OGHAM = /\u1680/g
const MMSP = /\u205f/g

function clean(body) {
  let t = body || ''
  t = t.replace(CTRL, ' ').replace(NBSP, ' ').replace(OGHAM, ' ').replace(MMSP, ' ')
  t = t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  // 方括号纯乱码脚注：只删含乱码符号或纯数字/单字母的方括号串（保留 legit [Palm oil] 等）
  t = t.replace(/\[[^\]\n]*(?:[@~)!#$%^&*=+<>?|]|\d{2,})[^\]\n]*\]/g, '')
  // OCR 错字修正：r 后跟数字+% 视为 8 误识别为 r（剑4 等册 PDF 文本层 'r8%' -> '8%'）
  t = t.replace(/\br\s*(\d+)%/g, '$1%')
  // 注意：绝不删除独立的 %，原样保留所有百分比
  return t
}

;(async () => {
  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'))
  let updated = 0, skipped = 0
  for (const [key, body] of Object.entries(data)) {
    if (!key.startsWith(SRC_PREFIX + '|')) continue
    const parts = key.split('|')
    const src = parts[0]
    const url = parts[1]
    if (!url) { skipped++; continue }
    const cleanBody = clean(body || '')
    const old = await p.content.findFirst({ where: { source: src, sourceUrl: url }, select: { id: true, content: true } })
    if (!old) { console.log('  未找到DB记录(跳过):', key); skipped++; continue }
    if (old.content === cleanBody) { skipped++; continue }
    await p.content.update({ where: { id: old.id }, data: { content: cleanBody } })
    updated++
  }
  console.log('完成: 更新 ' + updated + ' 条, 跳过 ' + skipped + ' 条 (src=' + SRC_PREFIX + ')')
  await p.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
