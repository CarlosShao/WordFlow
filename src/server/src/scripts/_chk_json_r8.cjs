const fs = require('fs')
const f = 'D:/work/java/AI-workspace/WordFlow/src/scripts/zhenti/passage_backfill_A.json'
const data = JSON.parse(fs.readFileSync(f, 'utf-8'))
const key = Object.keys(data).find((k) => k.includes('T1') && k.includes('R1') && k.includes('剑4'))
console.log('key:', key)
const c = data[key] || ''
const i = c.indexOf('pupils')
console.log('pupils上下文:', JSON.stringify(c.slice(Math.max(0, i - 60), i + 60)))
// 同时列出所有含 r8 或 % 的 key 取样
const samples = Object.entries(data).filter(([k, v]) => /r8/i.test(v || '')).slice(0, 3)
samples.forEach(([k, v]) => console.log('r8样本:', k, '=>', JSON.stringify((v || '').slice((v || '').indexOf('r8') - 30, (v || '').indexOf('r8') + 30))))
