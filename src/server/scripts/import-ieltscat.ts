/**
 * 从新东方 ieltscat 导入剑雅真题（剑5-20）
 * 
 * 流程：
 * 1. 获取模考列表（questionSource=1）
 * 2. 对每个 Test 的每个 subject（听力/阅读），遍历 partList 中的 qId
 * 3. 用 exam/create 创建考试获取 examId
 * 4. 用 /api/question/{examId}/{qId} 获取题目详情
 * 5. 存入数据库
 * 
 * 运行：cd src/server && npx tsx scripts/import-ieltscat.ts
 */
import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'
import type { BookDataSource } from '@prisma/client'

const BASE = 'https://ieltscat.xdf.cn'
const API = `${BASE}/api`
const DATA_SOURCE: BookDataSource = 'OPENSOURCE'

const COOKIE = process.env.IELTSCAT_COOKIE || `br-current-appid=9634ef2d15c443978bc68ec2eeffa54e; bonree-version=2.4.4; gr_user_id=e377a17c-d5e6-403a-9c16-353d35460cd1; br-client=c2314a17-0015-4457-b709-8bb9fb951c01; isShowVipPop=false; U2ST=0bc4bdadde2669fc88c59a4f784f01b4098cc63cf6a8cf56376832c2b3ee35c5; U2AT=2afb473a-d338-4024-8f58-e99e9a3a0790; U2UserId=zGH7PJNafpJbSiqrzGYOLR2HVG6CDHHT1XOIOb9dpMlfXedg5bkJ91fHkKCNPSeD; U2Token=50F797AAB21AA265727614175F6F69AE_54DE6430081420175B630DB64AEEA93D; U2User=BkyQ5Ul1sgaMA5q09gdAOg%3D%3D; U2NickName=135****0772; userinfo_uc_ielts=8181491%24%24ieltscat.xdf.cn%24%241787149874941%24%240; userinfo_uc_toefl=8181491%24%24tpo.xdf.cn%24%241787149875150%24%240%24%24U2; token_uc=d86f1c69bd0248168fa8201f3f7899cc; JSESSIONID=BB25F59E1BC4FBCB16C399881D308BB2`

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

function stripHtml(html: string): string {
  return html
    .replace(/<p[^>]*>/g, '\n').replace(/<\/p>/g, '')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/g, '$1')
    .replace(/<em[^>]*>(.*?)<\/em>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&ndash;/g, '–').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n').trim()
}

async function main() {
  console.log('=== 新东方 ieltscat 剑雅真题导入 ===\n')
  const prisma = getPrisma()

  // 1. 获取模考列表
  console.log('[1] 获取模考列表...')
  const mockList = await fetchJson(`${API}/mock/login/list?questionSource=1`)
  console.log(`找到 ${mockList.length} 套剑雅真题\n`)

  // 创建 ExamBook
  const bookId = 'ielts-ieltscat-cambridge'
  await prisma.examBook.upsert({
    where: { id: bookId },
    update: { title: '剑雅真题 (ieltscat.xdf.cn)', category: 'IELTS', dataSource: DATA_SOURCE,
      description: `来源: 新东方 ieltscat.xdf.cn, 剑5-20 听力+阅读真题` },
    create: { id: bookId, title: '剑雅真题 (ieltscat.xdf.cn)', category: 'IELTS', dataSource: DATA_SOURCE,
      description: `来源: 新东方 ieltscat.xdf.cn, 剑5-20 听力+阅读真题` },
  })

  let totalContents = 0
  let totalQuestions = 0
  let failed = 0
  let bookOrder = 0

  // 2. 遍历每套真题
  for (const mock of mockList) {
    const camName = mock.level1Name
    const camNum = camName.match(/\d+/)?.[0]
    if (!camNum) continue

    for (const test of mock.testList || []) {
      const testName = test.level2Name
      console.log(`→ ${camName} ${testName}`)

      // 遍历听力(1)和阅读(2)
      for (const subject of test.subjectList || []) {
        const subjectType = subject.subjectType
        if (subjectType !== '1' && subjectType !== '2') continue // 跳过写作
        
        const sectionName = subjectType === '1' ? '听力' : '阅读'

        for (const part of subject.partList || []) {
          const qId = part.qId
          if (!qId) continue

          bookOrder++
          
          try {
            // 创建考试
            const createData = await fetchJson(`${API}/exam/create/1/${qId}`)
            const examId = createData.examId
            if (!examId) { failed++; continue }

            // 获取题目详情
            const qData = await fetchJson(`${API}/question/${examId}/${qId}`)
            
            const contentId = `ielts-ieltscat-${camNum}-${testName.replace(/\s/g, '')}-${sectionName}-${qId}`
            let fullContent = ''
            if (qData.number) fullContent += `[${qData.number}]\n`
            if (qData.article) fullContent += `${qData.article}\n\n`
            if (qData.spptName) fullContent += `Section: ${qData.spptName}\n`

            // 解析 contentList
            const questions: { stem: string; options?: string[] }[] = []
            for (const item of qData.contentList || []) {
              try {
                const c = JSON.parse(item.content)
                const text = stripHtml(c.title || c.content || '')
                if (item.type === '101') {
                  questions.push({ stem: text })
                } else if ((item.type === '203' || item.type === '216') && c.options) {
                  const lastQ = questions[questions.length - 1]
                  if (lastQ) {
                    lastQ.options = c.options.map((opt: string) => stripHtml(opt))
                  }
                }
              } catch {}
            }

            // 音频
            if (qData.docList) {
              for (const doc of qData.docList) {
                if (doc.body?.audio) {
                  fullContent += `\n[Audio]: ${doc.body.audio}\n`
                }
              }
            }

            await prisma.content.upsert({
              where: { id: contentId },
              update: {
                type: 'ARTICLE' as any,
                title: `${camName} ${testName} ${sectionName} - ${qData.article || qData.spptName || qData.number || qId}`,
                source: 'ieltscat.xdf.cn',
                sourceUrl: `${BASE}/mock#${contentId}`,
                content: fullContent,
                bookId, bookOrder, isPublished: true,
                tags: [camName, testName, sectionName, qData.qTopic].filter(Boolean) as string[],
              },
              create: {
                id: contentId,
                type: 'ARTICLE' as any,
                title: `${camName} ${testName} ${sectionName} - ${qData.article || qData.spptName || qData.number || qId}`,
                source: 'ieltscat.xdf.cn',
                sourceUrl: `${BASE}/mock#${contentId}`,
                content: fullContent,
                bookId, bookOrder, isPublished: true,
                tags: [camName, testName, sectionName, qData.qTopic].filter(Boolean) as string[],
              },
            })
            totalContents++

            // 保存题目
            let qOrder = 0
            for (const q of questions) {
              qOrder++
              const qDbId = `${contentId}-q${qOrder}`
              await prisma.contentQuestion.upsert({
                where: { id: qDbId },
                update: {
                  contentId, type: 'MCQ',
                  stem: q.stem,
                  options: q.options || null,
                  answer: [], order: qOrder,
                },
                create: {
                  id: qDbId, contentId, type: 'MCQ',
                  stem: q.stem,
                  options: q.options || null,
                  answer: [], order: qOrder,
                },
              })
              totalQuestions++
            }

            console.log(`  ${sectionName} ${qData.spptName || qId}: ${questions.length} questions`)
          } catch (e: any) {
            console.log(`  ${sectionName} ${qId}: 错误 - ${e.message}`)
            failed++
          }
          
          // 间隔 300ms
          await new Promise(r => setTimeout(r, 300))
        }
      }
    }
  }

  console.log(`\n=== 导入完成 ===`)
  console.log(`  文章: ${totalContents}`)
  console.log(`  题目: ${totalQuestions}`)
  if (failed > 0) console.log(`  失败: ${failed}`)
  await disconnectPrisma()
  console.log('完成!')
}

main().catch(console.error)
