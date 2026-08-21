/**
 * 探测 ieltscat API 返回结构
 */
import { getPrisma, disconnectPrisma } from '../src/common/prisma.js'

const BASE = 'https://ieltscat.xdf.cn'
const API = `${BASE}/api`

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

async function main() {
  const prisma = getPrisma()
  
  // 取 3 个不同类型的 ieltscat 内容（听力/阅读各取几个）
  const contents = await prisma.content.findMany({
    where: { source: 'ieltscat.xdf.cn' },
    take: 3,
    select: { id: true, title: true },
  })
  
  for (const c of contents) {
    const qId = c.id.split('-').pop()
    console.log(`\n=== ${c.title} (qId=${qId}) ===`)
    
    try {
      const createData = await fetchJson(`${API}/exam/create/1/${qId}`)
      const examId = createData.examId
      console.log(`examId: ${examId}`)
      
      const qData = await fetchJson(`${API}/question/${examId}/${qId}`)
      
      // 打印结构
      console.log('Top-level keys:', Object.keys(qData))
      console.log('article:', qData.article?.substring(0, 100))
      console.log('number:', qData.number)
      console.log('spptName:', qData.spptName)
      console.log('qTopic:', qData.qTopic)
      
      // 打印 contentList
      if (qData.contentList) {
        console.log(`\ncontentList (${qData.contentList.length} items):`)
        for (let i = 0; i < Math.min(qData.contentList.length, 30); i++) {
          const item = qData.contentList[i]
          console.log(`\n  [${i}] type=${item.type}`)
          try {
            const c = JSON.parse(item.content)
            console.log(`  content keys:`, Object.keys(c))
            // 打印所有字段
            for (const [k, v] of Object.entries(c)) {
              const sv = typeof v === 'string' ? v.substring(0, 200) : JSON.stringify(v)?.substring(0, 200)
              console.log(`    ${k}: ${sv}`)
            }
          } catch {
            console.log(`  raw: ${item.content?.substring(0, 200)}`)
          }
        }
      }
      
      // 打印 docList
      if (qData.docList) {
        console.log(`\ndocList (${qData.docList.length} items):`)
        for (const doc of qData.docList) {
          console.log(`  doc:`, JSON.stringify(doc).substring(0, 300))
        }
      }
      
      // 打印 answer 相关
      console.log('\nAnswer-related fields:')
      console.log('  answer:', qData.answer)
      console.log('  answerList:', qData.answerList)
      console.log('  correctAnswer:', qData.correctAnswer)
      console.log('  analysis:', qData.analysis?.substring(0, 200))
      console.log('  explain:', qData.explain?.substring(0, 200))
      
      // 打印所有其他可能有用的字段
      for (const [k, v] of Object.entries(qData)) {
        if (!['contentList', 'docList', 'article'].includes(k)) {
          const sv = typeof v === 'string' ? v.substring(0, 200) : JSON.stringify(v)?.substring(0, 200)
          console.log(`  ${k}: ${sv}`)
        }
      }
    } catch (e: any) {
      console.log(`错误: ${e.message}`)
    }
    
    await new Promise(r => setTimeout(r, 500))
  }
  
  await disconnectPrisma()
}

main().catch(console.error)
