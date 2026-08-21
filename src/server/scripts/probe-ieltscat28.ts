/**
 * 用 exam/create 为每个 Test 创建 mockId，然后获取题目
 */
const BASE = 'https://ieltscat.xdf.cn'
const API = `${BASE}/api`

const COOKIE = `br-current-appid=9634ef2d15c443978bc68ec2eeffa54e; bonree-version=2.4.4; gr_user_id=e377a17c-d5e6-403a-9c16-353d35460cd1; br-client=c2314a17-0015-4457-b709-8bb9fb951c01; isShowVipPop=false; U2ST=0bc4bdadde2669fc88c59a4f784f01b4098cc63cf6a8cf56376832c2b3ee35c5; U2AT=2afb473a-d338-4024-8f58-e99e9a3a0790; U2UserId=zGH7PJNafpJbSiqrzGYOLR2HVG6CDHHT1XOIOb9dpMlfXedg5bkJ91fHkKCNPSeD; U2Token=50F797AAB21AA265727614175F6F69AE_54DE6430081420175B630DB64AEEA93D; U2User=BkyQ5Ul1sgaMA5q09gdAOg%3D%3D; U2NickName=135****0772; userinfo_uc_ielts=8181491%24%24ieltscat.xdf.cn%24%241787149874941%24%240; userinfo_uc_toefl=8181491%24%24tpo.xdf.cn%24%241787149875150%24%240%24%24U2; token_uc=d86f1c69bd0248168fa8201f3f7899cc; JSESSIONID=BB25F59E1BC4FBCB16C399881D308BB2`

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json, text/plain, */*',
  'FromURL': 'ieltscat.xdf.cn',
  'Referer': `${BASE}/mock`,
  'Cookie': COOKIE,
}

async function main() {
  // 获取模考列表
  const listRes = await fetch(`${API}/mock/login/list?questionSource=1&_t=${Date.now()}`, { headers: HEADERS })
  const listData = await listRes.json()
  
  // 取剑雅20 Test 2 的第一个 qId 来创建考试
  const cam20 = listData.data.find((d: any) => d.level1Name === '剑雅20')
  const test2 = cam20.testList.find((t: any) => t.level2Name === 'Test 2')
  const listenSubject = test2.subjectList.find((s: any) => s.subjectType === '1')
  const firstQId = listenSubject.partList[0].qId
  
  console.log(`剑雅20 Test 2 第一个听力 qId: ${firstQId}`)
  
  // 创建考试
  const createRes = await fetch(`${API}/exam/create/1/${firstQId}?_t=${Date.now()}`, { headers: HEADERS })
  const createData = await createRes.json()
  console.log('创建考试:', JSON.stringify(createData).substring(0, 200))
  
  const examId = createData.data?.examId
  console.log('examId:', examId)
  
  // 获取题目（用 examId + qId）
  if (examId) {
    const qRes = await fetch(`${API}/question/${examId}/${firstQId}?_t=${Date.now()}`, { headers: HEADERS })
    const qData = await qRes.json()
    console.log('\n题目详情:')
    console.log('code:', qData.code)
    if (qData.data) {
      const d = qData.data
      console.log('spptName:', d.spptName)
      console.log('article:', d.article)
      console.log('number:', d.number)
      console.log('level1Name:', d.level1Name)
      console.log('level2Name:', d.level2Name)
      console.log('allCount:', d.allCount)
      console.log('contentList length:', d.contentList?.length)
      if (d.contentList?.[0]) {
        console.log('First content (first 500):', d.contentList[0].content?.substring(0, 500))
      }
    }
  }
  
  // 也可以用 questionId 直接作为 mockId 来调 mock/question
  // 但 mock/question 需要 mockId 不是 examId
  // 看看 getMockBpa 是什么
  console.log('\n=== getBPAnswer ===')
  if (examId) {
    const ansRes = await fetch(`${API}/mock/getBPAnswer/${examId}?_t=${Date.now()}`, { headers: HEADERS })
    const ansData = await ansRes.json()
    console.log('Status:', ansRes.status)
    console.log('Body (first 500):', JSON.stringify(ansData).substring(0, 500))
  }
}

main().catch(console.error)
