/**
 * 深入探测 ieltscat API - 关注 navList 和可能的答案获取方式
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
  
  // 取一个听力选择题（qId=6802 有 options 的那个）
  const qId = '6802'
  console.log(`=== 探测 qId=${qId} ===`)
  
  const createData = await fetchJson(`${API}/exam/create/1/${qId}`)
  const examId = createData.examId
  console.log(`examId: ${examId}`)
  
  const qData = await fetchJson(`${API}/question/${examId}/${qId}`)
  
  // 打印 navList 完整内容
  console.log('\n=== navList ===')
  if (qData.navList) {
    for (let i = 0; i < qData.navList.length; i++) {
      const navPage = qData.navList[i]
      console.log(`\nnavList[${i}]:`)
      if (Array.isArray(navPage)) {
        for (let j = 0; j < navPage.length; j++) {
          console.log(`  [${j}]: ${JSON.stringify(navPage[j])}`)
        }
      } else {
        console.log(`  ${JSON.stringify(navPage).substring(0, 500)}`)
      }
    }
  }
  
  // 尝试获取答案的 API
  console.log('\n=== 尝试获取答案 ===')
  // 可能的答案 API：
  // /api/exam/answer/{examId}
  // /api/question/answer/{examId}/{qId}
  // /api/exam/result/{examId}
  const answerApis = [
    `${API}/exam/answer/${examId}`,
    `${API}/question/answer/${examId}/${qId}`,
    `${API}/exam/result/${examId}`,
    `${API}/exam/result/${examId}/${qId}`,
    `${API}/question/result/${examId}/${qId}`,
    `${API}/exam/score/${examId}`,
  ]
  
  for (const url of answerApis) {
    try {
      const sep = url.includes('?') ? '&' : '?'
      const res = await fetch(`${url}${sep}_t=${Date.now()}`, { headers: HEADERS })
      console.log(`\n  ${url.replace(API, '/api')}: HTTP ${res.status}`)
      if (res.ok) {
        const data = await res.json()
        console.log(`  response: ${JSON.stringify(data).substring(0, 500)}`)
      }
    } catch (e: any) {
      console.log(`  ${url.replace(API, '/api')}: ${e.message}`)
    }
  }
  
  // 查看 contentList 里 type=201 的 content 字段是否有答案
  console.log('\n=== contentList type=201 详情 ===')
  for (const item of qData.contentList || []) {
    if (item.type === '201') {
      try {
        const c = JSON.parse(item.content)
        console.log('All keys:', Object.keys(c))
        // 检查 value 字段
        console.log('value:', c.value)
        console.log('options:', JSON.stringify(c.options)?.substring(0, 500))
        // 检查 sccode
        console.log('sccode:', c.sccode)
        console.log('sccnt:', c.sccnt)
        console.log('valcnt:', c.valcnt)
      } catch {}
    }
  }
  
  // 也取一个阅读的选择题
  console.log('\n\n=== 取一个阅读题 ===')
  const readContents = await prisma.content.findMany({
    where: { source: 'ieltscat.xdf.cn', title: { contains: '阅读' } },
    take: 1,
    select: { id: true, title: true },
  })
  if (readContents.length > 0) {
    const rQid = readContents[0].id.split('-').pop()
    console.log(`阅读题: ${readContents[0].title} (qId=${rQid})`)
    
    const rCreate = await fetchJson(`${API}/exam/create/1/${rQid}`)
    const rExamId = rCreate.examId
    const rData = await fetchJson(`${API}/question/${rExamId}/${rQid}`)
    
    console.log('\ncontentList:')
    for (let i = 0; i < Math.min(rData.contentList?.length || 0, 10); i++) {
      const item = rData.contentList[i]
      console.log(`\n  [${i}] type=${item.type}`)
      try {
        const c = JSON.parse(item.content)
        console.log(`  keys: ${Object.keys(c).join(', ')}`)
        console.log(`  name: ${c.name}`)
        if (c.title) console.log(`  title: ${c.title.substring(0, 200)}`)
        if (c.options) console.log(`  options: ${JSON.stringify(c.options).substring(0, 300)}`)
        if (c.value) console.log(`  value: ${c.value}`)
        if (c.content) console.log(`  content: ${JSON.stringify(c.content).substring(0, 300)}`)
      } catch {
        console.log(`  raw: ${item.content?.substring(0, 200)}`)
      }
    }
  }
  
  await disconnectPrisma()
}

main().catch(console.error)
