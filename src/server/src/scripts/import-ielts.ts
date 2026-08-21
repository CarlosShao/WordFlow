/**
 * 导入 IELTS 剑雅真题（ielts_final.json，视觉大模型解析版）到数据库
 * 运行: cd src/server && npx tsx src/scripts/import-ielts.ts
 * 幂等：ExamBook 按 (category,title) 查；Content 按 (source,sourceUrl) 唯一；题目按 contentId 先删后建；音频上传 MinIO。
 */
import { readFileSync } from 'node:fs'
import { getPrisma } from '../common/prisma.js'
import { getMinio, ensureBucket } from '../common/minio.js'
import { config } from '../config/index.js'

const JSON_PATH = '/app/src/scripts/ielts_final.json'
const AUDIO_DIR = '/app/src/scripts/ielts-audio'
// 各册音频文件名映射（剑17 已 docker cp 进容器；其他册按需扩展）
const AUDIO_FILES: Record<string, (audioKey: string) => string> = {
  '17': (k) => `ELT_IELTS17_${k}.mp3`,
  // 其他册音频暂未上传，按 BOOK_KEY 缺则跳过
}
const AUDIO_PATHS: Record<string, string> = {
  '17': '/app/src/scripts/ielts-audio',
  // 其他册可在此扩展
}

interface QItem {
  no: number
  stem: string
  options?: string[] | null
  type?: string
  answer?: string | null
}
interface SecItem {
  part?: number
  passage?: unknown // 原文可能是 string / {text:string} / string[] / any nested
  passage_no?: number
  audio?: string
  questions: QItem[]
}

/** 将 passage 字段拍平成纯文本 */
function flattenPassage(p: unknown): string {
  if (p == null) return ''
  if (typeof p === 'string') return p
  if (Array.isArray(p)) {
    return p
      .map((x) => (typeof x === 'string' ? x : flattenPassage(x)))
      .filter(Boolean)
      .join('\n')
      .trim()
  }
  if (typeof p === 'object') {
    const obj = p as Record<string, unknown>
    const candidates = ['article', 'text', 'content', 'passage', 'body', 'html']
    for (const k of candidates) {
      const v = obj[k]
      if (typeof v === 'string' && v.length > 100) return v
    }
    const chunks: string[] = []
    for (const v of Object.values(obj)) {
      if (typeof v === 'string') chunks.push(v)
      else if (v != null) {
        const s = flattenPassage(v)
        if (s.length > 100) chunks.push(s)
      }
    }
    return chunks.join('\n\n').trim()
  }
  return String(p)
}
interface TestItem {
  test_no: number
  listening: SecItem[]
  reading: SecItem[]
}

async function uploadAudio(localPath: string, key: string): Promise<string> {
  const client = getMinio()
  await ensureBucket(config.minio.bucket)
  const buf = readFileSync(localPath)
  const ext = localPath.toLowerCase().endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg'
  await client.putObject(config.minio.bucket, key, buf, buf.length, { 'Content-Type': ext })
  return `${config.minio.useSSL ? 'https' : 'http'}://${config.minio.endpoint}:${config.minio.port}/${config.minio.bucket}/${key}`
}

/** 题型映射到 schema 枚举 */
function mapType(t?: string): string {
  switch ((t || '').toUpperCase()) {
    case 'MCQ': return 'MCQ'
    case 'MCQ_MULTI': return 'MCQ_MULTI'
    case 'TFNG': return 'TRUE_FALSE_NOT_GIVEN'
    case 'YNNG': return 'TRUE_FALSE_NOT_GIVEN'
    case 'MATCHING': return 'MATCHING'
    case 'COMPLETION': return 'COMPLETION'
    default: return 'COMPLETION'
  }
}

/** 答案归一化：字母答案提取；TFNG 保留单词；填空保留原文 */
function normalizeAnswer(ans?: string | null, type?: string): string[] {
  if (!ans) return []
  const a = String(ans).trim()
  if (/^(TRUE|FALSE|NOT GIVEN|YES|NO)$/i.test(a)) return [a.toUpperCase().replace('NOT GIVEN', 'NOT_GIVEN')]
  // 字母（单选/多选/配对）：A、A D、35 / thirty five（填空数字）
  if (/^[A-F](?:\s+[A-F])*$/i.test(a)) {
    return a.toUpperCase().split(/\s+/)
  }
  // 填空：原样，去掉多余空格
  return [a.replace(/\s+/g, ' ')]
}

async function main() {
  const prisma = getPrisma()
  const raw = JSON.parse(readFileSync(JSON_PATH, 'utf-8')) as Record<string, { tests: TestItem[] }>
  let nBooks = 0, nContents = 0, nQuestions = 0, nAudio = 0

  for (const [bookKey, bookData] of Object.entries(raw)) {
    const m = bookKey.match(/^IELTS(\d+)(-G)?/)
    if (!m) continue
    const volume = m[1]
    const isG = !!m[2]
    const title = isG ? `剑桥雅思 ${volume} G类` : `剑桥雅思 ${volume}`
    const srcPrefix = isG ? 'IELTS_G' : 'IELTS'
    const srcTag = isG ? `g:${volume}` : volume
    let book = await prisma.examBook.findFirst({ where: { category: 'IELTS', title } })
    if (!book) {
      book = await prisma.examBook.create({ data: { category: 'IELTS', title } })
    }
    nBooks++

    for (const test of bookData.tests) {
      const tno = test.test_no
      // 听力
      for (const sec of test.listening) {
        const part = sec.part ?? 1
        const sourceUrl = `ielts:${srcTag}:test:${tno}:listen:part:${part}`
        const secTitle = `${isG ? 'G' : 'A'}类 剑${volume} Test ${tno} Listening Part ${part}`
        let audioUrl: string | null = null
        if (sec.audio) {
          const fileMaker = AUDIO_FILES[volume]
          const audioDir = AUDIO_PATHS[volume]
          if (fileMaker && audioDir) {
            const fname = fileMaker(sec.audio)
            try {
              audioUrl = await uploadAudio(`${audioDir}/${fname}`, `ielts/${volume}/t${tno}_part${part}.mp3`)
              nAudio++
            } catch (e) {
              console.warn(`剑${volume} T${tno}P${part} 音频失败: ${(e as Error).message}`)
            }
          }
        }
        let content = await prisma.content.findUnique({
          where: { source_sourceUrl: { source: srcPrefix, sourceUrl } },
        })
        if (!content) {
          content = await prisma.content.create({
            data: {
              type: 'LISTENING',
              title: secTitle,
              source: srcPrefix,
              sourceUrl,
              bookId: book.id,
              bookOrder: (tno - 1) * 10 + part,
              audioUrl,
              summary: `${isG ? 'G' : 'A'}类 剑${volume} Test ${tno} 听力 Part ${part}（${sec.questions.length} 题）`,
            },
          })
        } else if (audioUrl && content.audioUrl !== audioUrl) {
          content = await prisma.content.update({ where: { id: content.id }, data: { audioUrl } })
        }
        nContents++
        await prisma.contentQuestion.deleteMany({ where: { contentId: content.id } })
        for (const q of sec.questions) {
          const qtype = mapType(q.type)
          const ans = normalizeAnswer(q.answer, q.type)
          if (!q.stem || !ans.length) continue
          await prisma.contentQuestion.create({
            data: {
              contentId: content.id,
              type: qtype as never,
              stem: q.stem,
              options: q.options || [],
              answer: ans,
              order: q.no,
            },
          })
          nQuestions++
        }
      }
      // 阅读
      for (const sec of test.reading) {
        const passageNo = (sec as any).passage_no ?? (sec as any).part ?? (typeof sec.passage === 'number' ? sec.passage : null) ?? test.reading.indexOf(sec) + 1
        const text = flattenPassage(sec.passage)
        const sourceUrl = `ielts:${srcTag}:test:${tno}:read:passage:${passageNo}`
        const secTitle = `${isG ? 'G' : 'A'}类 剑${volume} Test ${tno} Reading Passage ${passageNo}`
        let content = await prisma.content.findUnique({
          where: { source_sourceUrl: { source: srcPrefix, sourceUrl } },
        })
        if (!content) {
          content = await prisma.content.create({
            data: {
              type: 'ARTICLE',
              title: secTitle,
              source: srcPrefix,
              sourceUrl,
              bookId: book.id,
              bookOrder: (tno - 1) * 10 + 4 + passageNo,
              content: text || undefined,
              summary: `${isG ? 'G' : 'A'}类 剑${volume} Test ${tno} 阅读 Passage ${passageNo}（${sec.questions.length} 题）`,
            },
          })
        } else if (text && (!content.content || content.content.length < text.length)) {
          content = await prisma.content.update({ where: { id: content.id }, data: { content: text } })
        }
        nContents++
        await prisma.contentQuestion.deleteMany({ where: { contentId: content.id } })
        for (const q of sec.questions) {
          const qtype = mapType(q.type)
          const ans = normalizeAnswer(q.answer, q.type)
          if (!q.stem || !ans.length) continue
          await prisma.contentQuestion.create({
            data: {
              contentId: content.id,
              type: qtype as never,
              stem: q.stem,
              options: q.options || [],
              answer: ans,
              order: q.no,
            },
          })
          nQuestions++
        }
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
