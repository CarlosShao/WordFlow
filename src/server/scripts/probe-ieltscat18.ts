/**
 * 抓取 ieltscat 剑雅真题 - 先用一套 Test 测试流程
 */
const BASE = 'https://ieltscat.xdf.cn'

const COOKIE = `br-current-appid=9634ef2d15c443978bc68ec2eeffa54e; bonree-version=2.4.4; gr_user_id=e377a17c-d5e6-403a-9c16-353d35460cd1; br-client=c2314a17-0015-4457-b709-8bb9fb951c01; isShowVipPop=false; U2ST=0bc4bdadde2669fc88c59a4f784f01b4098cc63cf6a8cf56376832c2b3ee35c5; U2AT=2afb473a-d338-4024-8f58-e99e9a3a0790; U2UserId=zGH7PJNafpJbSiqrzGYOLR2HVG6CDHHT1XOIOb9dpMlfXedg5bkJ91fHkKCNPSeD; U2Token=50F797AAB21AA265727614175F6F69AE_54DE6430081420175B630DB64AEEA93D; U2User=BkyQ5Ul1sgaMA5q09gdAOg%3D%3D; U2NickName=135****0772; userinfo_uc_ielts=8181491%24%24ieltscat.xdf.cn%24%241787149874941%24%240; userinfo_uc_toefl=8181491%24%24tpo.xdf.cn%24%241787149875150%24%240%24%24U2; token_uc=d86f1c69bd0248168fa8201f3f7899cc; JSESSIONID=BB25F59E1BC4FBCB16C399881D308BB2`

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json, text/plain, */*',
  'FromURL': 'ieltscat.xdf.cn',
  'Referer': `${BASE}/mock`,
  'Cookie': COOKIE,
}

async function main() {
  console.log('=== 抓取剑雅真题（测试流程）===\n')

  // 1. 获取模考列表
  console.log('[1] 获取模考列表...')
  const listRes = await fetch(`${BASE}/api/mock/login/list?questionSource=1&_t=${Date.now()}`, {
    headers: HEADERS,
  })
  const listData = await listRes.json()
  
  // 取剑雅20 Test 1 的数据
  const cam20 = listData.data.find((d: any) => d.level1Name === '剑雅20')
  const test1 = cam20.testList[0]
  console.log('剑雅20 Test 1:', JSON.stringify(test1).substring(0, 500))
  
  // 获取 mockId
  const mockId = test1.mockId
  console.log('mockId:', mockId)
  
  // subjectList 包含听力(1)、阅读(2)、写作(4)
  const listenSubject = test1.subjectList.find((s: any) => s.subjectType === '1')
  const readSubject = test1.subjectList.find((s: any) => s.subjectType === '2')
  
  console.log('\n听力 partList:', JSON.stringify(listenSubject?.partList).substring(0, 200))
  console.log('阅读 partList:', JSON.stringify(readSubject?.partList).substring(0, 200))
  
  // 2. 创建模考考试
  console.log('\n[2] 创建模考考试...')
  const examId = listenSubject?.partList[0]?.qId  // 第一个听力题的 qId
  console.log('第一个 qId:', examId)
  
  const createRes = await fetch(`${BASE}/exam/create/1/${examId}?_t=${Date.now()}`, {
    method: 'POST',
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  const createText = await createRes.text()
  console.log('创建考试 Status:', createRes.status)
  console.log('Response (first 500):', createText.substring(0, 500))
  
  let examIdFromCreate = null
  try {
    const createData = JSON.parse(createText)
    if (createData.data) {
      examIdFromCreate = createData.data.examId || createData.data.id || createData.data
      console.log('ExamId:', examIdFromCreate)
    }
  } catch {}
  
  // 3. 获取题目页面 (用 mockId)
  console.log('\n[3] 获取题目页面...')
  // /mock/question/{mockId}/{sectionType}
  // 但 mockId 在 subjectList 里可能不同
  // 先尝试用 qId 作为 examId
  if (examIdFromCreate) {
    const qDetailRes = await fetch(`${BASE}/question/${examIdFromCreate}/${examId}?_t=${Date.now()}`, {
      headers: HEADERS,
    })
    const qDetailText = await qDetailRes.text()
    console.log('题目详情 Status:', qDetailRes.status)
    console.log('Body (first 500):', qDetailText.substring(0, 500))
  }
  
  // 4. 尝试 /api/question/section 获取题目结构
  console.log('\n[4] /api/question/section...')
  const sectionRes = await fetch(`${BASE}/api/question/section?questionSource=1&_t=${Date.now()}`, {
    headers: HEADERS,
  })
  const sectionText = await sectionRes.text()
  console.log('Status:', sectionRes.status)
  console.log('Body (first 500):', sectionText.substring(0, 500))
  
  // 5. 尝试 /api/question/navigate
  console.log('\n[5] /api/question/navigate...')
  const navRes = await fetch(`${BASE}/api/question/navigate?questionId=${examId}&_t=${Date.now()}`, {
    headers: HEADERS,
  })
  const navText = await navRes.text()
  console.log('Status:', navRes.status)
  console.log('Body (first 500):', navText.substring(0, 500))
  
  // 6. 直接用 qId 获取题目
  console.log('\n[6] 直接用 qId 获取题目...')
  const qRes = await fetch(`${BASE}/question/${examId}/${examId}?_t=${Date.now()}`, {
    headers: HEADERS,
  })
  const qText = await qRes.text()
  console.log('Status:', qRes.status)
  console.log('Body (first 500):', qText.substring(0, 500))
  
  // 7. 尝试 mock/question
  console.log('\n[7] /mock/question/{mockId}/2 (阅读)...')
  if (mockId) {
    const mqRes = await fetch(`${BASE}/mock/question/${mockId}/2?_t=${Date.now()}`, {
      headers: HEADERS,
    })
    const mqText = await mqRes.text()
    console.log('Status:', mqRes.status)
    console.log('Body (first 1000):', mqText.substring(0, 1000))
  }
}

main().catch(console.error)
