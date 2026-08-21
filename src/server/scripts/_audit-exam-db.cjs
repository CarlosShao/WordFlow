/**
 * 审计 WordFlow 数据库真题数据 - 只读不改。
 * 绕过 Prisma raw SQL 的 enum 参数问题：先拉全量 book id 列表，再用 IN 子句过滤
 * 运行: cd src/server && node scripts/_audit-exam-db.cjs
 */
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

function one(sql) {
  return p.$queryRawUnsafe(sql).then(arr => Array.isArray(arr) ? arr[0] : arr)
}
function all(sql) {
  return p.$queryRawUnsafe(sql).then(arr => Array.isArray(arr) ? arr : [])
}

async function categoryData(cat) {
  // 先拿该分类所有 book id
  const ids = (await all(`SELECT id, title FROM exam_books WHERE category = '${cat}' ORDER BY title`)).map(r => r.id)

  const idList = ids.map((_, i) => `$${i+1}`).join(',')
  const idParams = ids

  const segCount = await one(`SELECT COUNT(*)::int AS n FROM contents WHERE "book_id" IN (${idList})`, idParams)
  const qCount = await one(`SELECT COUNT(*)::int AS n FROM content_questions WHERE "content_id" IN (SELECT id FROM contents WHERE "book_id" IN (${idList}))`, idParams)
  const empty = await one(`SELECT COUNT(*)::int AS n FROM exam_books WHERE category = '${cat}' AND id NOT IN (SELECT DISTINCT "book_id" FROM contents)`, [])

  // 卷号明细
  const books = await all(`SELECT id, title FROM exam_books WHERE category = '${cat}' ORDER BY title`)
  const rows = []
  for (const bk of books) {
    const num = (bk.title.match(/(\d+)/) || [])[1] || '?'
    const sc = await one(`SELECT COUNT(*)::int AS n FROM contents WHERE "book_id" = '${bk.id}'`)
    const qc = await one(`SELECT COUNT(*)::int AS n FROM content_questions WHERE "content_id" IN (SELECT id FROM contents WHERE "book_id" = '${bk.id}')`)
    const flags = []
    if ((sc.n || 0) === 0) flags.push('⚠空')
    if ((sc.n || 0) > 0 && (qc.n || 0) === 0) flags.push('⚠无题')
    rows.push({ num, title: bk.title, seg: sc.n || 0, q: qc.n || 0, flags })
  }

  // 段落类型
  const types = await all(`SELECT type, COUNT(*)::int AS cnt FROM contents WHERE "book_id" IN (${idList}) GROUP BY type ORDER BY cnt DESC`, idParams)

  // 题目题型
  const qts = await all(`SELECT "type" AS question_type, COUNT(*)::int AS cnt FROM content_questions WHERE "content_id" IN (SELECT id FROM contents WHERE "book_id" IN (${idList})) GROUP BY "type" ORDER BY cnt DESC`, idParams)

  // 题目完整性
  const integ = await one(`SELECT COUNT(*)::int AS total, COUNT(CASE WHEN answer IS NULL OR answer = '[]' OR answer IN ('null','\"\"') THEN 1 END)::int AS no_answer, COUNT(CASE WHEN options IS NULL OR jsonb_array_length(options) = 0 THEN 1 END)::int AS no_options, COUNT(CASE WHEN explanation IS NULL OR explanation = '' THEN 1 END)::int AS no_expl FROM content_questions WHERE "content_id" IN (SELECT id FROM contents WHERE "book_id" IN (${idList}))`, idParams)

  // sourceUrl
  const src = await one(`SELECT COUNT(*)::int AS total, COUNT(CASE WHEN "source_url" IS NOT NULL AND "source_url" != '' THEN 1 END)::int AS w FROM contents WHERE "book_id" IN (${idList})`, idParams)

  return { bookCount: books.length, segCount: segCount.n, qCount: qCount.n, empty: empty.n, rows, types, qts, integ, src }
}

async function main() {
  console.log('========== 真题库数据审计 ==========\n')

  const b = await one('SELECT COUNT(*)::int AS n FROM exam_books')
  const pg = await one('SELECT COUNT(*)::int AS n FROM contents')
  const q = await one('SELECT COUNT(*)::int AS n FROM content_questions')
  console.log('[总表计数]')
  console.log(`  真题书: ${b.n}  段落: ${pg.n}  题目: ${q.n}\n`)

  for (const cat of ['TOEFL', 'IELTS']) {
    console.log(`[${cat}]`)
    const d = await categoryData(cat)
    console.log(`  真题书: ${d.bookCount}  段落: ${d.segCount}  题目: ${d.qCount}  空书: ${d.empty}`)
    console.log('  卷号明细:')
    for (const r of d.rows) {
      console.log(`    卷号 ${r.num.padEnd(3)} | ${r.title.padEnd(35)} | 段:${String(r.seg).padStart(3)} 题:${String(r.q).padStart(4)} ${r.flags.join(' ')}`)
    }
    console.log('\n  段落类型:')
    for (const t of d.types) console.log(`    ${t.type}: ${t.cnt}`)
    console.log('\n  题目题型:')
    for (const t of d.qts) console.log(`    ${t.question_type}: ${t.cnt}`)
    console.log('\n  题目完整性:')
    console.log(`    总题数: ${d.integ.total}`)
    console.log(`    无答案: ${d.integ.no_answer}`)
    console.log(`    无选项: ${d.integ.no_options}`)
    console.log(`    无解析: ${d.integ.no_expl}`)
    console.log(`\n  段落来源URL: 有 ${d.src.w}  无 ${(d.src.total||0) - (d.src.w||0)}`)
    console.log()
  }

  console.log('========== 雅思阅读缺损概览 ==========')
  const missing = await one("SELECT COUNT(*)::int AS n FROM contents WHERE \"type\" = 'ARTICLE' AND content LIKE '%当前源数据未收录%'")
  const articles = await one("SELECT COUNT(*)::int AS n FROM contents WHERE \"type\" = 'ARTICLE'")
  console.log(`  阅读段落总数: ${articles.n}`)
  console.log(`  含占位"当前源数据未收录": ${missing.n}`)
  console.log(`  缺损占比: ${(missing.n / articles.n * 100).toFixed(1)}%`)
  console.log('\n审计完成（只读，未修改任何数据）。')
}

main()
  .catch(e => { console.error('\n审计失败:', e.message.split('\n').slice(0,3).join(' | ')); process.exit(1) })
  .finally(() => p.$disconnect())
