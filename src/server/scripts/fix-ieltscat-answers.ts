/**
 * 修复 ieltscat 题目数据
 * 
 * 使用 questionPreviewQuestion API（不需要 examId）获取带答案的完整题目
 * 
 * 题型映射：
 * - type 201 + options → MCQ（选择题，value 是字母如 "AC"）
 * - type 203 + options → TRUE_FALSE_NOT_GIVEN（判断题，value 是 T/F/NG）
 * - type 216 + content 填空 → COMPLETION（填空题，value 是数组如 ["Ardleigh"]）
 * 
 * 同时提取：
 * - audioUrl（从 docList.body.audio）
 * - 听力原文（从 docList 的 body 字段）
 * - 题型（从 content type 判断）
 * - 答案（从 value 字段）
 * - 选项（从 options 字段）
 */
import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

const BASE = 'https://ieltscat.xdf.cn'
const API = `${BASE}/api`

const COOKIE = process.env.IELTSCAT_COOKIE || `br-current-appid=9634ef2d15c443978bc68ec2eeffa54e; isShowVipPop=false; U2ST=0bc4bdadde2669fc88c59a4f784f01b4098cc63cf6a8cf56376832c2b3ee35c5; U2AT=2afb473a-d338-4024-8f58-e99e9a3a0790; U2UserId=zGH7PJNafpJbSiqrzGYOLR2HVG6CDHHT1XOIOb9dpMlfXedg5bkJ91fHkKCNPSeD; U2Token=50F797AAB21AA265727614175F6F69AE_54DE6430081420175B630DB64AEEA93D; token_uc=d86f1c69bd0248168fa8201f3f7899cc; JSESSIONID=BB25F59E1BC4FBCB16C399881D308BB2`

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json, text/plain, */*',
  'FromURL': 'ieltscat.xdf.cn',
  'Referer': `${BASE}/mock`,
  'Cookie': COOKIE,
}

function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<p[^>]*>/g, '\n').replace(/<\/p>/g, '')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/g, '$1')
    .replace(/<em[^>]*>(.*?)<\/em>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&ndash;/g, '–').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n').trim()
}

interface ParsedQuestion {
  stem: string
  options: string[] | null
  answer: string[]
  type: string
  order: number
}

function parseQuestions(contentList: any[]): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []
  let currentStem = ''
  let order = 0

  for (const item of contentList) {
    try {
      const c = JSON.parse(item.content)
      
      if (item.type === '101') {
        // 题干/说明
        currentStem = stripHtml(c.title || c.content || '')
      } else if (item.type === '201' || item.type === '203') {
        // 选择题 / 判断题
        order++
        const stem = stripHtml(c.title || '')
        let qType = 'MCQ'
        if (item.type === '203') {
          qType = 'TRUE_FALSE_NOT_GIVEN'
        }
        
        let options: string[] | null = null
        if (c.options) {
          try {
            const opts = typeof c.options === 'string' ? JSON.parse(c.options) : c.options
            if (Array.isArray(opts)) {
              options = opts.map((o: any) => {
                const name = o.name || ''
                const text = o.option || o.value || ''
                return `${name}. ${text}`
              })
            }
          } catch {}
        }
        
        // 解析答案
        const answer: string[] = []
        if (c.value) {
          if (typeof c.value === 'string') {
            // "AC" → ["A", "C"]; "T" → ["TRUE"]; "F" → ["FALSE"]; "NG" → ["NOT GIVEN"]
            if (qType === 'TRUE_FALSE_NOT_GIVEN') {
              const map: Record<string, string> = { T: 'TRUE', F: 'FALSE', NG: 'NOT GIVEN' }
              answer.push(map[c.value] || c.value)
            } else {
              // 拆分字母
              for (const ch of c.value) {
                if (/[A-Z]/.test(ch)) answer.push(ch)
              }
            }
          } else if (Array.isArray(c.value)) {
            for (const v of c.value) answer.push(String(v))
          }
        }
        
        questions.push({
          stem,
          options,
          answer,
          type: qType,
          order,
        })
        currentStem = ''
      } else if (item.type === '216') {
        // 填空题
        // content 字段是一个 JSON 数组，包含每个空的 sccode 和 value
        try {
          const fillContent = typeof c.content === 'string' ? JSON.parse(c.content) : c.content
          if (Array.isArray(fillContent)) {
            for (const fill of fillContent) {
              order++
              const answer: string[] = []
              if (fill.value) {
                if (Array.isArray(fill.value)) {
                  for (const v of fill.value) answer.push(String(v))
                } else {
                  answer.push(String(fill.value))
                }
              }
              questions.push({
                stem: stripHtml(c.title || currentStem || `Question ${order}`),
                options: null,
                answer,
                type: 'COMPLETION',
                order,
              })
            }
          }
        } catch {}
        currentStem = ''
      }
    } catch {}
  }
  
  return questions
}

async function main() {
  console.log('=== 修复 ieltscat 题目数据 ===\n')
  const prisma = getPrisma()

  const contents = await prisma.content.findMany({
    where: { source: 'ieltscat.xdf.cn' },
    select: { id: true, title: true },
    orderBy: { bookOrder: 'asc' },
  })
  console.log(`找到 ${contents.length} 篇 ieltscat 内容\n`)

  let updated = 0
  let failed = 0
  let skipped = 0
  let totalQuestions = 0

  for (const content of contents) {
    // 从 id 提取 qId: ielts-ieltscat-{camNum}-{testName}-{sectionName}-{qId}
    const parts = content.id.split('-')
    const qId = parts[parts.length - 1]
    if (!qId || !/^\d+$/.test(qId)) { skipped++; continue }

    try {
      // 使用 questionPreviewQuestion 获取带答案的题目
      const url = `${API}/questionPreviewQuestion/${qId}`
      const sep = url.includes('?') ? '&' : '?'
      const res = await fetch(`${url}${sep}_t=${Date.now()}`, { headers: HEADERS })
      if (!res.ok) { failed++; continue }
      const data = await res.json()
      const qData = data.data
      
      if (!qData || qData === 'string') { skipped++; continue }

      // 解析题目
      const parsedQuestions = parseQuestions(qData.contentList || [])
      
      // 提取音频
      let audioUrl: string | null = null
      if (qData.docList) {
        for (const doc of qData.docList) {
          if (doc.body && typeof doc.body === 'object' && doc.body.audio) {
            audioUrl = doc.body.audio
            break
          }
        }
      }

      // 提取听力原文（如果有）
      let transcript = ''
      if (qData.docList) {
        for (const doc of qData.docList) {
          if (doc.name === '听力原文' && doc.body && typeof doc.body === 'string') {
            transcript = stripHtml(doc.body)
            break
          }
        }
      }

      // 更新 content
      const isListening = content.title.includes('听力')
      const contentType = isListening ? 'LISTENING' : 'ARTICLE'
      
      // 构建 content：文章 + 听力原文
      let fullContent = ''
      if (qData.article) fullContent += qData.article
      if (transcript) {
        fullContent += (fullContent ? '\n\n' : '') + `[听力原文]\n${transcript}`
      }
      
      await prisma.content.update({
        where: { id: content.id },
        data: {
          audioUrl,
          type: contentType as any,
          content: fullContent || null,
        },
      })

      // 删除旧的题目
      await prisma.contentQuestion.deleteMany({ where: { contentId: content.id } })

      // 写入新题目
      for (const pq of parsedQuestions) {
        const qDbId = `${content.id}-q${pq.order}`
        await prisma.contentQuestion.create({
          data: {
            id: qDbId,
            contentId: content.id,
            type: pq.type as any,
            stem: pq.stem,
            options: pq.options,
            answer: pq.answer,
            explanation: null,
            order: pq.order,
          },
        })
        totalQuestions++
      }
      
      updated++
      
      if (updated % 20 === 0) {
        console.log(`  已处理 ${updated}/${contents.length} (${totalQuestions} 题)`)
      }
      
      // 间隔 300ms
      await new Promise(r => setTimeout(r, 300))
    } catch (e: any) {
      console.log(`  ${content.title}: 错误 - ${e.message}`)
      failed++
    }
  }

  console.log(`\n=== 修复完成 ===`)
  console.log(`  更新: ${updated}`)
  console.log(`  题目: ${totalQuestions}`)
  console.log(`  跳过: ${skipped}`)
  console.log(`  失败: ${failed}`)
  await disconnectPrisma()
}

main().catch(console.error)
