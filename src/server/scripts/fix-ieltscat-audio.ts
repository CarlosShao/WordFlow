/**
 * 修复 ieltscat 音频 URL
 * 使用 /exam/create + /question/{examId}/{qId} API 获取音频
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

async function fetchJson(url: string): Promise<any> {
  const sep = url.includes('?') ? '&' : '?'
  const res = await fetch(`${url}${sep}_t=${Date.now()}`, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  const data = await res.json()
  if (data.code !== 200) throw new Error(`API ${data.code}: ${data.data || data.msg}`)
  return data.data
}

async function main() {
  console.log('=== 修复 ieltscat 音频 ===\n')
  const prisma = getPrisma()

  // 只修复听力题（title 包含 "听力"）
  const contents = await prisma.content.findMany({
    where: { source: 'ieltscat.xdf.cn', title: { contains: '听力' } },
    select: { id: true, title: true },
    orderBy: { bookOrder: 'asc' },
  })
  console.log(`找到 ${contents.length} 篇听力内容\n`)

  let updated = 0
  let failed = 0
  let noAudio = 0

  for (const content of contents) {
    const parts = content.id.split('-')
    const qId = parts[parts.length - 1]
    if (!qId || !/^\d+$/.test(qId)) { continue }

    try {
      // 创建考试
      const createData = await fetchJson(`${API}/exam/create/1/${qId}`)
      const examId = createData.examId
      if (!examId) { failed++; continue }

      // 获取题目详情（含音频）
      const qData = await fetchJson(`${API}/question/${examId}/${qId}`)
      
      // 从 docList 提取音频
      let audioUrl: string | null = null
      if (qData.docList) {
        for (const doc of qData.docList) {
          if (doc.body) {
            if (typeof doc.body === 'object' && doc.body.audio) {
              audioUrl = doc.body.audio
              break
            }
            // 有时 body 是 JSON 字符串
            if (typeof doc.body === 'string') {
              try {
                const parsed = JSON.parse(doc.body)
                if (parsed.audio) {
                  audioUrl = parsed.audio
                  break
                }
              } catch {}
            }
          }
          // 也检查 list 里的元素
          if (doc.list) {
            for (const item of doc.list) {
              if (item.body) {
                if (typeof item.body === 'object' && item.body.audio) {
                  audioUrl = item.body.audio
                  break
                }
                if (typeof item.body === 'string') {
                  // body 可能包含音频链接
                  const audioMatch = item.body.match(/https?:\/\/[^\s"']+\.mp3/)
                  if (audioMatch) {
                    audioUrl = audioMatch[0]
                    break
                  }
                }
              }
            }
            if (audioUrl) break
          }
        }
      }

      // 也检查 bPA 字段
      if (!audioUrl && qData.bPA) {
        const bpaStr = JSON.stringify(qData.bPA)
        const audioMatch = bpaStr.match(/https?:\/\/[^\s"']+\.mp3/)
        if (audioMatch) {
          audioUrl = audioMatch[0]
        }
      }

      if (audioUrl) {
        await prisma.content.update({
          where: { id: content.id },
          data: { audioUrl },
        })
        updated++
      } else {
        noAudio++
      }
      
      if (updated % 20 === 0 && updated > 0) {
        console.log(`  已更新 ${updated}/${contents.length}...`)
      }
      
      await new Promise(r => setTimeout(r, 300))
    } catch (e: any) {
      console.log(`  ${content.title}: 错误 - ${e.message}`)
      failed++
    }
  }

  console.log(`\n=== 音频修复完成 ===`)
  console.log(`  更新: ${updated}`)
  console.log(`  无音频: ${noAudio}`)
  console.log(`  失败: ${failed}`)
  await disconnectPrisma()
}

main().catch(console.error)
