// 快速探测 Prisma $queryRawUnsafe 返回的原始格式
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  try {
    const r = await p.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM exam_books`)
    console.log('typeof:', typeof r)
    console.log('isArray:', Array.isArray(r))
    // 尝试所有可能的取值方式
    const a = Array.isArray(r) ? r[0] : null
    console.log('r[0] type:', typeof a, 'value:', a)
    console.log('r keys:', Object.keys(r))
    console.log('r.n:', r.n)
    console.log('JSON:', JSON.stringify(r).slice(0,200))
  } catch(e) {
    console.log('ERR:', e.message.split('\n')[0])
  }
}
main().catch(e=>console.log('fatal:',e.message)).finally(()=>p.$disconnect().catch(()=>{}))
