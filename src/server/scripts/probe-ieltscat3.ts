/**
 * 探测 ieltscat 答案获取方式 - 尝试模拟提交考试
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
  'Content-Type': 'application/json',
}

async function fetchJson(url: string): Promise<any> {
  const sep = url.includes('?') ? '&' : '?'
  const res = await fetch(`${url}${sep}_t=${Date.now()}`, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  const data = await res.json()
  if (data.code !== 200) throw new Error(`API ${data.code}: ${data.data || data.msg}`)
  return data.data
}

async function postJson(url: string, body: any): Promise<any> {
  const sep = url.includes('?') ? '&' : '?'
  const res = await fetch(`${url}${sep}_t=${Date.now()}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  const data = await res.json()
  return data
}

async function main() {
  const qId = '6806' // 阅读题
  
  // 1. 创建考试
  const createData = await fetchJson(`${API}/exam/create/1/${qId}`)
  const examId = createData.examId
  console.log(`examId: ${examId}`)
  
  const qData = await fetchJson(`${API}/question/${examId}/${qId}`)
  
  // 2. 尝试提交答案并获取正确答案
  // 构造提交数据：假设所有题都选 A
  const answers: any[] = []
  for (const item of qData.contentList || []) {
    if (item.type === '203' || item.type === '201') {
      try {
        const c = JSON.parse(item.content)
        if (c.sccode) {
          answers.push({
            sccode: c.sccode,
            value: 'A', // 随便选一个
          })
        }
      } catch {}
    } else if (item.type === '216') {
      try {
        const c = JSON.parse(item.content)
        if (c.content) {
          const fillItems = JSON.parse(c.content)
          for (const fi of fillItems) {
            if (fi.sccode) {
              answers.push({
                sccode: fi.sccode,
                value: 'test',
              })
            }
          }
        }
      } catch {}
    }
  }
  
  console.log(`\n构造了 ${answers.length} 个答案`)
  
  // 尝试各种提交 API
  const submitApis = [
    { url: `${API}/exam/submit/${examId}`, body: { answers, examId, qId } },
    { url: `${API}/exam/submit/${examId}/${qId}`, body: { answers, examId, qId } },
    { url: `${API}/question/submit/${examId}/${qId}`, body: { answers, examId, qId } },
    { url: `${API}/exam/save/${examId}`, body: { answers, examId, qId } },
  ]
  
  for (const { url, body } of submitApis) {
    try {
      const data = await postJson(url, body)
      console.log(`\nPOST ${url.replace(API, '/api')}:`)
      console.log(`  response: ${JSON.stringify(data).substring(0, 800)}`)
    } catch (e: any) {
      console.log(`\nPOST ${url.replace(API, '/api')}: ${e.message}`)
    }
  }
  
  // 也尝试 GET 方式获取答案
  console.log('\n=== 尝试 GET 答案 API ===')
  const getApis = [
    `${API}/exam/answer/${examId}/${qId}`,
    `${API}/question/answer/${qId}`,
    `${API}/exam/analysis/${examId}/${qId}`,
    `${API}/question/analysis/${examId}/${qId}`,
    `${API}/question/explain/${examId}/${qId}`,
    `${API}/exam/detail/${examId}`,
    `${API}/question/detail/${examId}/${qId}`,
  ]
  
  for (const url of getApis) {
    try {
      const sep = url.includes('?') ? '&' : '?'
      const res = await fetch(`${url}${sep}_t=${Date.now()}`, { headers: HEADERS })
      if (res.ok) {
        const data = await res.json()
        console.log(`GET ${url.replace(API, '/api')}: ${JSON.stringify(data).substring(0, 500)}`)
      } else {
        console.log(`GET ${url.replace(API, '/api')}: HTTP ${res.status}`)
      }
    } catch (e: any) {
      console.log(`GET ${url.replace(API, '/api')}: ${e.message}`)
    }
  }
  
  // 最终方案：去网页前端 JS 找答案 API
  console.log('\n=== 获取前端 JS ===')
  try {
    const pageRes = await fetch(`${BASE}/mock`, { headers: HEADERS })
    const html = await pageRes.text()
    // 找 JS 文件
    const jsFiles = html.match(/src="([^"]*\.js[^"]*)"/g)
    if (jsFiles) {
      for (const jsf of jsFiles.slice(0, 5)) {
        const m = jsf.match(/src="([^"]*)"/)
        if (m) console.log(`  JS: ${m[1]}`)
      }
    }
  } catch (e: any) {
    console.log(`获取前端页面失败: ${e.message}`)
  }
}

main().catch(console.error)
