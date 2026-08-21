const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function query(sql) {
  try {
    const r = await p.$queryRawUnsafe(sql)
    return r
  } catch(e) {
    return `ERROR: ${e.message.split('\n')[0]}`
  }
}

async function main() {
  const tables = ['exam_books', 'ExamBooks', 'contents', 'Contents', 'questions', 'Questions', 'users', 'Users']
  console.log('=== 探测表名 ===')
  for (const t of tables) {
    const r = await query(`SELECT COUNT(*)::int AS n FROM "${t}"`)
    if (typeof r === 'object' && r !== null && r[0]?.n !== undefined) {
      console.log(`  ${t}: ${r[0].n}`)
    } else {
      console.log(`  ${t}: ${typeof r === 'string' ? r.substring(0,60) : '?'}`)
    }
  }
}
main().catch(e=>{}).finally(()=>p.$disconnect().catch(()=>{}))
