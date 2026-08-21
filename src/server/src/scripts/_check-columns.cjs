const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const r = await p.$queryRawUnsafe(`SELECT version()`)
  console.log('DB version:', typeof r, r)
}
main().catch(e=>console.log('err:', e.message.split('\n')[0])).finally(()=>p.$disconnect().catch(()=>{}))
