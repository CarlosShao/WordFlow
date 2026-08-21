/**
 * 导入 TOEFL 听力真题（toefl_final.json）到数据库
 * 运行: cd src/server && npx tsx src/scripts/import-toefl.ts
 * 幂等：Content 按 (source, sourceUrl) 唯一；题目按 contentId 先删后建；音频上传 MinIO。
 */
import { readFileSync } from 'node:fs'
import { getPrisma } from '../common/prisma.js'
import { getMinio, ensureBucket } from '../common/minio.js'
import { config } from '../config/index.js'

const JSON_PATH = 'D:/work/java/AI-workspace/WordFlow/src/scripts/zhenti/toefl_final.json'
const OPTS_FILTER = /^(click on|drag|listen|now listen|read the|choose|complete the|match|put the|select)/i

interface QItem {
  stem: string
  options: string[]
  answer: string
}
interface SecItem {
  sec: string
  topic?: string
  questions: QItem[]
  /** 可能附带的阅读原文（toefl_new 版本），字段名兼容多种解析结果 */
  article?: string
  passage?: string
  text?: string
}

/**
 * 判断 TOEFL section 类型：
 * 根据 topic/sec 字段关键词判断，无匹配则 default 为 LISTENING
 * 注：TPO 1-53 的 toefl_final.json 仅含听力，无阅读/口语/写作数据
 */
function guessType(secIndex1Based: number, totalInBook: number, sec: SecItem): { type: 'LISTENING' | 'ARTICLE' | 'SPEAKING'; contentText: string } {
  // 优先用内容判断：有 article/passage/text → 大概率阅读
  const contentText = [sec.article, sec.passage, sec.text].find((x) => typeof x === 'string' && x.length > 200) ?? ''
  const topic = (sec.topic || sec.sec || '').toLowerCase()

  if (/speaking|task[_\s]*[1-6]|independent|integrated task/i.test(topic)) {
    return { type: 'SPEAKING', contentText }
  }
  if (contentText.length > 500) {
    return { type: 'ARTICLE', contentText }
  }
  if (/reading|passage|article/i.test(topic)) {
    return { type: 'ARTICLE', contentText }
  }
  if (/listening|conversation|lecture|professor|student|audio|listen/i.test(topic)) {
    return { type: 'LISTENING', contentText }
  }
  // 兜底：默认听力（toefl_final.json 全为听力，toefl_new 的 sec 标签如 Cl/L2/C2 也全是听力）
  return { type: 'LISTENING', contentText }
}
interface TpoItem {
  sections: SecItem[]
  audio: Record<string, string>
}

async function uploadAudio(localPath: string, key: string): Promise<string> {
  const client = getMinio()
  await ensureBucket(config.minio.bucket)
  const buf = readFileSync(localPath)
  const ext = localPath.toLowerCase().endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg'
  await client.putObject(config.minio.bucket, key, buf, buf.length, { 'Content-Type': ext })
  return `${config.minio.useSSL ? 'https' : 'http'}://${config.minio.endpoint}:${config.minio.port}/${config.minio.bucket}/${key}`
}

function normalizeAnswer(a: string): string[] {
  const clean = a.replace(/[()（）]/g, '')
  return clean.split('').filter((c) => /[A-F]/i.test(c))
}

async function main() {
  const prisma = getPrisma()
  const data = JSON.parse(readFileSync(JSON_PATH, 'utf-8')) as Record<string, TpoItem>
  let nBooks = 0, nContents = 0, nQuestions = 0, nAudio = 0

  for (const [tpoStr, item] of Object.entries(data)) {
    const tpo = parseInt(tpoStr, 10)
    const title = `TOEFL TPO ${tpo}`
    let book = await prisma.examBook.findFirst({ where: { category: 'TOEFL', title } })
    if (!book) {
      book = await prisma.examBook.create({ data: { category: 'TOEFL', title } })
    }
    nBooks++

    for (let i = 0; i < item.sections.length; i++) {
      const sec = item.sections[i]
      const audioPath = item.audio?.[`sec${i + 1}`]
      const sourceUrl = `toefl:tpo:${tpo}:sec:${i + 1}`
      const secTitle = `TOEFL TPO ${tpo} - ${sec.topic || sec.sec || `Section ${i + 1}`}`
      const { type, contentText } = guessType(i + 1, item.sections.length, sec)

      let audioUrl: string | null = null
      if (audioPath && (type === 'LISTENING' || type === 'SPEAKING')) {
        try {
          audioUrl = await uploadAudio(audioPath, `toefl/tpo${tpo}/sec${i + 1}${audioPath.toLowerCase().endsWith('.m4a') ? '.m4a' : '.mp3'}`)
          nAudio++
        } catch (e) {
          console.warn(`TPO${tpo} sec${i + 1} 音频上传失败: ${(e as Error).message}`)
        }
      }

      const typeZh: Record<string, string> = { LISTENING: '听力', ARTICLE: '阅读', SPEAKING: '口语' }
      const subLabel = (() => {
        const sameTypeBefore = item.sections.slice(0, i).filter((s) => guessType(item.sections.indexOf(s) + 1, item.sections.length, s).type === type).length
        if (type === 'LISTENING' || type === 'SPEAKING') {
          return `第 ${sameTypeBefore + 1} 部分`
        }
        if (type === 'ARTICLE') return `Passage ${sameTypeBefore + 1}`
        return `第 ${sameTypeBefore + 1} 部分`
      })()
      const summary = `TOEFL TPO ${tpo} ${typeZh[type]} ${subLabel}（${sec.questions.length} 题）`

      let content = await prisma.content.findUnique({
        where: { source_sourceUrl: { source: 'TOEFL_TPO', sourceUrl } },
      })
      if (!content) {
        content = await prisma.content.create({
          data: {
            type,
            title: secTitle,
            source: 'TOEFL_TPO',
            sourceUrl,
            bookId: book.id,
            bookOrder: i + 1,
            audioUrl,
            content: contentText || undefined,
            summary,
          },
        })
      } else {
        // 已存在的按新规则再修正一下 type / summary / content / audioUrl
        const patch: Parameters<typeof prisma.content.update>[0]['data'] = {}
        if (content.type !== type) patch.type = type
        if ((content.summary || '') !== summary) patch.summary = summary
        if (contentText && (!content.content || content.content.length < contentText.length)) patch.content = contentText
        if (audioUrl && content.audioUrl !== audioUrl) patch.audioUrl = audioUrl
        if (!contentText && type === 'ARTICLE' && content.audioUrl) patch.audioUrl = null
        if (Object.keys(patch).length) {
          content = await prisma.content.update({ where: { id: content.id }, data: patch })
        }
      }
      nContents++

      // 题目幂等：先删后建
      await prisma.contentQuestion.deleteMany({ where: { contentId: content.id } })
      for (let qi = 0; qi < sec.questions.length; qi++) {
        const q = sec.questions[qi]
        if (!q.answer) continue
        const opts = (q.options || []).filter((o) => !OPTS_FILTER.test(o))
        const ans = normalizeAnswer(q.answer)
        const qtype = ans.length > 1 ? 'MCQ_MULTI' : 'MCQ'
        await prisma.contentQuestion.create({
          data: {
            contentId: content.id,
            type: qtype as 'MCQ' | 'MCQ_MULTI',
            stem: q.stem,
            options: opts,
            answer: ans,
            order: qi + 1,
          },
        })
        nQuestions++
      }
    }
  }
  console.log(`✅ 完成: books=${nBooks} contents=${nContents} questions=${nQuestions} audio=${nAudio}`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('导入失败:', e)
  process.exit(1)
})
