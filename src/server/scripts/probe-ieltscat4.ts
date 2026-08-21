/**
 * 通过 /mock/getBPAnswer/{qId} 获取答案
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
  return data
}

async function main() {
  const prisma = getPrisma()
  
  // 测试几个不同的 qId
  const testQids = ['6796', '6802', '6806']
  
  for (const qId of testQids) {
    console.log(`\n=== qId=${qId} ===`)
    
    // 尝试 getBPAnswer
    try {
      const url = `${API}/mock/getBPAnswer/${qId}`
      const sep = url.includes('?') ? '&' : '?'
      const res = await fetch(`${url}${sep}_t=${Date.now()}`, { headers: HEADERS })
      console.log(`getBPAnswer: HTTP ${res.status}`)
      if (res.ok) {
        const data = await res.json()
        console.log(`response: ${JSON.stringify(data).substring(0, 1000)}`)
      }
    } catch (e: any) {
      console.log(`getBPAnswer error: ${e.message}`)
    }
    
    // 也尝试 questionReviewQuestion
    try {
      // 先创建 exam
      const createRes = await fetch(`${API}/exam/create/1/${qId}?_t=${Date.now()}`, { headers: HEADERS })
      const createData = await createRes.json()
      const examId = createData.data?.examId
      console.log(`examId: ${examId}`)
      
      if (examId) {
        const reviewUrl = `${API}/questionReviewQuestion/${examId}`
        const sep = reviewUrl.includes('?') ? '&' : '?'
        const reviewRes = await fetch(`${reviewUrl}${sep}_t=${Date.now()}`, { headers: HEADERS })
        console.log(`questionReviewQuestion: HTTP ${reviewRes.status}`)
        if (reviewRes.ok) {
          const reviewData = await reviewRes.json()
          const data = reviewData.data || reviewData
          console.log(`review response: ${JSON.stringify(data).substring(0, 2000)}`)
          
          // 看看 contentList 里有没有答案
          if (data.contentList) {
            for (let i = 0; i < Math.min(data.contentList.length, 20); i++) {
              const item = data.contentList[i]
              console.log(`\n  [${i}] type=${item.type}`)
              try {
                const c = JSON.parse(item.content)
                console.log(`  keys: ${Object.keys(c).join(', ')}`)
                if (c.value) console.log(`  value: ${c.value}`)
                if (c.answer) console.log(`  answer: ${c.answer}`)
                if (c.title) console.log(`  title: ${c.title.substring(0, 100)}`)
                if (c.options) console.log(`  options: ${JSON.stringify(c.options).substring(0, 200)}`)
                if (c.analysis) console.log(`  analysis: ${c.analysis.substring(0, 200)}`)
                if (c.explain) console.log(`  explain: ${c.explain.substring(0, 200)}`)
                if (c.content) console.log(`  content: ${JSON.stringify(c.content).substring(0, 200)}`)
              } catch {
                console.log(`  raw: ${item.content?.substring(0, 200)}`)
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.log(`review error: ${e.message}`)
    }
    
    await new Promise(r => setTimeout(r, 500))
  }
  
  await disconnectPrisma()
}

main().catch(console.error)
