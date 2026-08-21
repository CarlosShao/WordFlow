/**
 * 用正确的 /api 前缀抓取 ieltscat 剑雅真题
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
  console.log('=== 用 /api 前缀抓取剑雅真题 ===\n')

  // 1. 创建考试
  console.log('[1] 创建考试...')
  const createRes = await fetch(`${API}/exam/create/1/8534?_t=${Date.now()}`, {
    headers: HEADERS,
  })
  const createText = await createRes.text()
  console.log('Status:', createRes.status)
  console.log('Body (first 500):', createText.substring(0, 500))
  
  let examId = null
  try {
    const createData = JSON.parse(createText)
    console.log('Parsed:', JSON.stringify(createData).substring(0, 500))
    if (createData.data) {
      examId = typeof createData.data === 'string' ? createData.data : 
               typeof createData.data === 'number' ? String(createData.data) :
               (createData.data.examId || createData.data.id || JSON.stringify(createData.data))
    }
  } catch {}
  console.log('ExamId:', examId)

  if (!examId) {
    // 尝试 POST
    console.log('\n尝试 POST...')
    const postRes = await fetch(`${API}/exam/create/1/8534?_t=${Date.now()}`, {
      method: 'POST',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    const postText = await postRes.text()
    console.log('POST Status:', postRes.status)
    console.log('Body (first 500):', postText.substring(0, 500))
    try {
      const postData = JSON.parse(postText)
      if (postData.data) {
        examId = typeof postData.data === 'string' ? postData.data : 
                 typeof postData.data === 'number' ? String(postData.data) :
                 (postData.data.examId || postData.data.id)
      }
    } catch {}
    console.log('ExamId:', examId)
  }
  
  // 2. 获取题目
  if (examId) {
    console.log(`\n[2] 获取题目 /api/question/${examId}/8534`)
    const qRes = await fetch(`${API}/question/${examId}/8534?_t=${Date.now()}`, {
      headers: HEADERS,
    })
    const qText = await qRes.text()
    console.log('Status:', qRes.status)
    console.log('Body (first 2000):', qText.substring(0, 2000))
    
    // 3. 获取 section
    console.log(`\n[3] /api/question/section?examId=${examId}`)
    const sRes = await fetch(`${API}/question/section?examId=${examId}&_t=${Date.now()}`, {
      headers: HEADERS,
    })
    const sText = await sRes.text()
    console.log('Status:', sRes.status)
    console.log('Body (first 2000):', sText.substring(0, 2000))
    
    // 4. 获取 navigate
    console.log(`\n[4] /api/question/navigate?examId=${examId}&questionId=8534`)
    const nRes = await fetch(`${API}/question/navigate?examId=${examId}&questionId=8534&_t=${Date.now()}`, {
      headers: HEADERS,
    })
    const nText = await nRes.text()
    console.log('Status:', nRes.status)
    console.log('Body (first 2000):', nText.substring(0, 2000))
  }
  
  // 5. 获取模考题目页面
  console.log('\n[5] /api/mock/question/38841898/2 (阅读)')
  const mqRes = await fetch(`${API}/mock/question/38841898/2?_t=${Date.now()}`, {
    headers: HEADERS,
  })
  const mqText = await mqRes.text()
  console.log('Status:', mqRes.status)
  console.log('Body (first 2000):', mqText.substring(0, 2000))
  
  // 6. 获取答案
  console.log('\n[6] /api/mock/getBPAnswer/38841898')
  const ansRes = await fetch(`${API}/mock/getBPAnswer/38841898?_t=${Date.now()}`, {
    headers: HEADERS,
  })
  const ansText = await ansRes.text()
  console.log('Status:', ansRes.status)
  console.log('Body (first 2000):', ansText.substring(0, 2000))
}

main().catch(console.error)
