/**
 * 审计 WordFlow 数据库真题相关数据，只读不改。
 * Schema: ExamBook(exam_books) -> Content(contents) -> ContentQuestion(content_questions)
 * 运行: cd src/server && node src/scripts/_audit-exam-db.cjs
 */
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function one(sql, params) {
  const r = params
    ? await p.$queryRawUnsafe(sql, ...params)
    : await p.$queryRawUnsafe(sql)
  return Array.isArray(r) ? r[0] : r
}

async function all(sql, params) {
  const r = params
    ? await p.$queryRawUnsafe(sql, ...params)
    : await p.$queryRawUnsafe(sql)
  return Array.isArray(r) ? r : [r]
}

async function main() {
  console.log('========== 真题库数据审计 ==========\n')

  // 1. 总表计数
  const booksTotal = await one('SELECT COUNT(*)::int AS n FROM exam_books')
  const passTotal  = await one('SELECT COUNT(*)::int AS n FROM contents')
  const qTotal     = await one('SELECT COUNT(*)::int AS n FROM content_questions')
  console.log('[总表计数]')
  console.log(`  真题书 (exam_books):      ${booksTotal.n}`)
  console.log(`  段落 (contents):          ${passTotal.n}`)
  console.log(`  题目 (content_questions): ${qTotal.n}\n`)

  // 2. 各分类概览
  for (const cat of ['TOEFL', 'IELTS']) {
    console.log(`[${cat}]`)

    const ob = await one('SELECT COUNT(*)::int AS n FROM exam_books WHERE category = $1', [cat])
    console.log(`  真题书: ${ob.n}`)

    const pc = await one('SELECT COUNT(*)::int AS n FROM contents WHERE "bookId" IN (SELECT id FROM exam_books WHERE category = $1)', [cat])
    console.log(`  段落: ${pc.n}`)

    const qc = await one('SELECT COUNT(*)::int AS n FROM content_questions WHERE "contentId" IN (SELECT id FROM contents WHERE "bookId" IN (SELECT id FROM exam_books WHERE category = $1))', [cat])
    console.log(`  题目: ${qc.n}`)

    const empty = await one('SELECT COUNT(*)::int AS n FROM exam_books WHERE category = $1 AND id NOT IN (SELECT DISTINCT "bookId" FROM contents)', [cat])
    console.log(`  空书(无段落): ${empty.n}`)

    const rows = await all('SELECT id, title FROM exam_books WHERE category = $1 ORDER BY title', [cat])
    console.log('  卷号明细:')
    for (const b of rows) {
      const num = (b.title.match(/(\d+)/) || [])[1] || '?'
      const sc = await one('SELECT COUNT(*)::int AS n FROM contents WHERE "bookId" = $1', [b.id])
      const qc2 = await one('SELECT COUNT(*)::int AS n FROM content_questions WHERE "contentId" IN (SELECT id FROM contents WHERE "bookId" = $1)', [b.id])
      const flags = []
      if (sc.n === 0) flags.push('⚠空')
      if (sc.n > 0 && qc2.n === 0) flags.push('⚠无题')
      console.log(`    卷号 ${num.padEnd(3)} | ${b.title.padEnd(35)} | 段:${String(sc.n).padStart(3)} 题:${String(qc2.n).padStart(4)} ${flags.join(' ')}`)
    }

    // 段落类型
    const types = await all('SELECT type, COUNT(*)::int AS cnt FROM contents WHERE "bookId" IN (SELECT id FROM exam_books WHERE category = $1) GROUP BY type ORDER BY cnt DESC', [cat])
    console.log(`\n  段落类型:`)
    for (const t of types) console.log(`    ${t.type}: ${t.cnt}`)

    // 题题型 (type 字段)
    const qts = await all('SELECT type, COUNT(*)::int AS cnt FROM content_questions WHERE "contentId" IN (SELECT id FROM contents WHERE "bookId" IN (SELECT id FROM exam_books WHERE category = $1)) GROUP BY type ORDER BY cnt DESC', [cat])
    console.log(`\n  题目题型 (type):`)
    for (const t of qts) console.log(`    ${t.type}: ${t.cnt}`)

    // 题目完整性 (answer 存正确答案)
    const integ = await one(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN answer IS NULL OR answer = '[]' OR answer = 'null' OR answer = '""' THEN 1 END)::int AS no_answer,
        COUNT(CASE WHEN options IS NULL OR jsonb_array_length(options) = 0 THEN 1 END)::int AS no_options,
        COUNT(CASE WHEN explanation IS NULL OR explanation = '' THEN 1 END)::int AS no_expl
      FROM content_questions
      WHERE "contentId" IN (SELECT id FROM contents WHERE "bookId" IN (SELECT id FROM exam_books WHERE category = $1))`, [cat])
    console.log(`\n  题目完整性 (answer 为正确答案):`)
    console.log(`    总题数:       ${integ.total}`)
    console.log(`    无答案:       ${integ.no_answer}`)
    console.log(`    无选项:       ${integ.no_options}`)
    console.log(`    无解析:       ${integ.no_expl}`)
    console.log()
  }

  // 段落 sourceUrl
  console.log('========== 段落来源URL覆盖 ==========')
  for (const cat of ['TOEFL', 'IELTS']) {
    const r = await one(`SELECT COUNT(*)::int AS total, COUNT(CASE WHEN "sourceUrl" IS NOT NULL AND "sourceUrl" != '' THEN 1 END)::int AS with_url FROM contents WHERE "bookId" IN (SELECT id FROM exam_books WHERE category = $1)`, [cat])
    console.log(`  [${cat}] 段落 ${r.total} 篇 | 有 sourceUrl: ${r.with_url}  无: ${r.total - r.with_url}`)
  }

  // 缺损阅读（占位在 content 字段）
  const missing = await one('SELECT COUNT(*)::int AS n FROM contents WHERE type = \'ARTICLE\' AND content LIKE \'%当前源数据未收录%\'')
  const articles = await one('SELECT COUNT(*)::int AS n FROM contents WHERE type = \'ARTICLE\'')
  console.log(`\n========== 雅思阅读缺损概览 ==========  Readonly, no changes`)
  console.log(`  阅读段落总数: ${articles.n}`)
  console.log(`  含占位"当前源数据未收录": ${missing.n}`)
  if (articles.n > 0) {
    console.log(`  缺损占比: ${(missing.n / articles.n * 100).toFixed(1)}%`)
  }

  console.log('\n审计完成.')
}

main()
  .catch(e => { console.error('审计失败:', e.message); process.exit(1) })
  .finally(() => p.$disconnect())
