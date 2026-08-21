/**
 * 导入 TOEFL 口语真题（speaking_54_75.json）到数据库
 * 运行: cd src/server && npx tsx src/scripts/import-speaking.ts
 * Content type=SPEAKING，任务按号去重；音频上传 MinIO；TPO65 用旧目录 mp3 补。
 */
import { readFileSync } from 'node:fs'
import { getPrisma } from '../common/prisma.js'
import { getMinio, ensureBucket } from '../common/minio.js'
import { config } from '../config/index.js'

const JSON_PATH = 'D:/work/java/AI-workspace/WordFlow/src/scripts/zhenti/speaking_54_75.json'
// TPO65 旧目录口语 mp3（新目录是 .ts 流）
const OLD_SPEAK: Record<string, Record<number, string>> = {
  65: {
    2: 'E:/work/data/English/TOEFL/TPO全套1-75题目+音频/61-70/65/TPO65(S)/TPO65 Speaking Task2.mp3',
    3: 'E:/work/data/English/TOEFL/TPO全套1-75题目+音频/61-70/65/TPO65(S)/TPO65 Speaking Task3.mp3',
    4: 'E:/work/data/English/TOEFL/TPO全套1-75题目+音频/61-70/65/TPO65(S)/TPO65 Speaking Task4.mp3',
  },
}

async function uploadAudio(localPath: string, key: string): Promise<string> {
  const client = getMinio()
  await ensureBucket(config.minio.bucket)
  const buf = readFileSync(localPath)
  const ext = localPath.toLowerCase().endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg'
  await client.putObject(config.minio.bucket, key, buf, buf.length, { 'Content-Type': ext })
  return `${config.minio.useSSL ? 'https' : 'http'}://${config.minio.endpoint}:${config.minio.port}/${config.minio.bucket}/${key}`
}

interface SpkTask { no: number; prompt: string }
interface SpkItem { tasks: SpkTask[]; audio: Record<string, string> }

async function main() {
  const prisma = getPrisma()
  const data = JSON.parse(readFileSync(JSON_PATH, 'utf-8')) as Record<string, SpkItem>
  let nContents = 0, nAudio = 0

  for (const [tpoStr, item] of Object.entries(data)) {
    const tpo = parseInt(tpoStr, 10)
    const book = await prisma.examBook.findFirst({ where: { category: 'TOEFL', title: `TOEFL TPO ${tpo}` } })
    // 任务去重（按 no 取第一个）
    const seen = new Set<number>()
    for (const task of item.tasks) {
      if (seen.has(task.no)) continue
      seen.add(task.no)
      const sourceUrl = `toefl:speaking:tpo:${tpo}:task:${task.no}`
      // 音频：新目录优先，65 用旧目录
      let audioPath = item.audio[String(task.no)]
      if (!audioPath && OLD_SPEAK[tpoStr]?.[task.no]) {
        audioPath = OLD_SPEAK[tpoStr][task.no]
      }
      let audioUrl: string | null = null
      if (audioPath && audioPath.endsWith('.mp3')) {
        try {
          audioUrl = await uploadAudio(audioPath, `toefl/speaking/tpo${tpo}/task${task.no}.mp3`)
          nAudio++
        } catch (e) {
          console.warn(`TPO${tpo} task${task.no} 音频失败: ${(e as Error).message}`)
        }
      }
      const existing = await prisma.content.findUnique({
        where: { source_sourceUrl: { source: 'TOEFL_TPO_SPEAKING', sourceUrl } },
      })
      if (!existing) {
        await prisma.content.create({
          data: {
            type: 'SPEAKING',
            title: `TOEFL TPO ${tpo} - Speaking Task ${task.no}`,
            content: task.prompt || null,
            source: 'TOEFL_TPO_SPEAKING',
            sourceUrl,
            bookId: book?.id ?? null,
            bookOrder: task.no,
            audioUrl,
            summary: `TOEFL TPO ${tpo} 口语 Task ${task.no}`,
          },
        })
        nContents++
      } else if (audioUrl && existing.audioUrl !== audioUrl) {
        await prisma.content.update({ where: { id: existing.id }, data: { audioUrl } })
      }
    }
  }
  console.log(`✅ 口语导入完成: contents=${nContents} audio=${nAudio}`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('导入失败:', e)
  process.exit(1)
})
