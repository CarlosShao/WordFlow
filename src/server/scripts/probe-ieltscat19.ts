/**
 * 找到 o["b"] 基础路径，并用正确方式创建考试
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
  console.log('=== 找 o["b"] 并创建考试 ===\n')
  
  // 先分析 app.js 找 o["b"]
  const appRes = await fetch(`${BASE}/static/js/app.454159db.js`)
  const js = await appRes.text()
  
  // 搜索 o = { ... b: "..." ... }
  // minified: 可能在模块定义中
  const bContexts = js.match(/.{0,200}["']b["']\s*[:=]\s*.{0,200}/g)
  if (bContexts) {
    console.log('=== b 相关上下文 ===')
    for (const c of bContexts.slice(0, 10)) {
      if (c.includes('http') || c.includes('url') || c.includes('api') || c.includes('/')) {
        console.log(c.replace(/\n/g, ' ').trim())
        console.log('---')
      }
    }
  }
  
  // 搜索 o = 或 var o =
  const oDef = js.match(/(?:var\s+|const\s+|let\s+)?o\s*=\s*\{[^}]+\}/g)
  if (oDef) {
    for (const d of oDef.slice(0, 5)) {
      if (d.includes('"b"') || d.includes("'b'")) {
        console.log('\n=== o 对象定义 ===')
        console.log(d.substring(0, 500))
      }
    }
  }
  
  // 直接搜索可能的 baseURL 值
  const urlMatches = js.match(/["'](\/(?:mock|exam|question|api|report)[^"']*)["']/g)
  if (urlMatches) {
    const unique = [...new Set(urlMatches.map(s => s.replace(/["']/g, '')))]
    console.log('\n=== 路径字符串 ===')
    for (const u of unique.sort()) {
      console.log(' ', u)
    }
  }
  
  // 尝试 GET 方式的 exam/create
  console.log('\n=== 创建考试 (GET) ===')
  const createRes = await fetch(`${BASE}/exam/create/1/8534?_t=${Date.now()}`, {
    method: 'GET',
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
      examId = typeof createData.data === 'string' ? createData.data : (createData.data.examId || createData.data.id || createData.data)
    }
  } catch {}
  console.log('ExamId:', examId)
  
  // 如果拿到了 examId，获取题目
  if (examId) {
    console.log('\n=== 获取题目 ===')
    // /question/{examId}/{questionId}
    const qRes = await fetch(`${BASE}/question/${examId}/8534?_t=${Date.now()}`, {
      headers: HEADERS,
    })
    const qText = await qRes.text()
    console.log('Status:', qRes.status)
    console.log('Body (first 1000):', qText.substring(0, 1000))
    
    // /api/question/section
    console.log('\n/api/question/section...')
    const sRes = await fetch(`${BASE}/api/question/section?examId=${examId}&_t=${Date.now()}`, {
      headers: HEADERS,
    })
    const sText = await sRes.text()
    console.log('Status:', sRes.status)
    console.log('Body (first 1000):', sText.substring(0, 1000))
    
    // /api/question/navigate
    console.log('\n/api/question/navigate...')
    const nRes = await fetch(`${BASE}/api/question/navigate?examId=${examId}&questionId=8534&_t=${Date.now()}`, {
      headers: HEADERS,
    })
    const nText = await nRes.text()
    console.log('Status:', nRes.status)
    console.log('Body (first 1000):', nText.substring(0, 1000))
  }
  
  // 也试试直接用 mockId 调 API
  console.log('\n=== 用 mockId 调 API ===')
  // /mock/question/38841898/2 -- 但这个返回了 HTML
  // 可能需要加 Accept: application/json
  const mqRes = await fetch(`${BASE}/mock/question/38841898/2?_t=${Date.now()}`, {
    headers: {
      ...HEADERS,
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })
  const mqText = await mqRes.text()
  console.log('Status:', mqRes.status)
  console.log('Content-Type:', mqRes.headers.get('content-type'))
  console.log('Body (first 500):', mqText.substring(0, 500))
  
  // 试试 /api/mock/create
  console.log('\n/api/mock/create/...')
  const mcRes = await fetch(`${BASE}/api/mock/create/8534?_t=${Date.now()}`, {
    headers: HEADERS,
  })
  const mcText = await mcRes.text()
  console.log('Status:', mcRes.status)
  console.log('Body (first 500):', mcText.substring(0, 500))
}

main().catch(console.error)
