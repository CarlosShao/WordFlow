// Test: does the column name in DB use book_id (from @map) or bookId?
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  try {
    const r = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM contents WHERE "book_id" = (SELECT id FROM exam_books LIMIT 1)')
    console.log('book_id WORKS:', r)
  } catch(e) {
    console.log('book_id ERR:', e.message.split('\n')[0])
  }
  try {
    const r = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM contents WHERE "bookId" = (SELECT id FROM exam_books LIMIT 1)')
    console.log('bookId WORKS:', r)
  } catch(e) {
    console.log('bookId ERR:', e.message.split('\n')[0])
  }
}
main().catch(e=>console.log('fatal:',e.message)).finally(()=>p.$disconnect().catch(()=>{}))
