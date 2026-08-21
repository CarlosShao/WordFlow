/**
 * 用 cookie 抓取新东方 ieltscat 剑雅真题
 * 先获取模考列表，再逐套获取题目
 */
const BASE = 'https://ieltscat.xdf.cn'

const COOKIE = `br-current-appid=9634ef2d15c443978bc68ec2eeffa54e; bonree-version=2.4.4; gr_user_id=e377a17c-d5e6-403a-9c16-353d35460cd1; br-client=c2314a17-0015-4457-b709-8bb9fb951c01; isShowVipPop=false; U2ST=0bc4bdadde2669fc88c59a4f784f01b4098cc63cf6a8cf56376832c2b3ee35c5; U2AT=2afb473a-d338-4024-8f58-e99e9a3a0790; U2UserId=zGH7PJNafpJbSiqrzGYOLR2HVG6CDHHT1XOIOb9dpMlfXedg5bkJ91fHkKCNPSeD; U2Token=50F797AAB21AA265727614175F6F69AE_54DE6430081420175B630DB64AEEA93D; U2User=BkyQ5Ul1sgaMA5q09gdAOg%3D%3D; U2NickName=135****0772; userinfo_uc_ielts=8181491%24%24ieltscat.xdf.cn%24%241787149874941%24%240; userinfo_uc_toefl=8181491%24%24tpo.xdf.cn%24%241787149875150%24%240%24%24U2; token_uc=d86f1c69bd0248168fa8201f3f7899cc; JSESSIONID=BB25F59E1BC4FBCB16C399881D308BB2`

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Content-Type': 'application/x-www-form-urlencoded',
  'FromURL': 'ieltscat.xdf.cn',
  'Referer': `${BASE}/mock`,
  'Cookie': COOKIE,
}

async function main() {
  console.log('=== 新东方 ieltscat 抓取 ===\n')

  // 1. 模考列表
  console.log('[1] 获取模考列表...')
  const listRes = await fetch(`${BASE}/api/mock/login/list?_t=${Date.now()}`, {
    headers: HEADERS,
  })
  const listText = await listRes.text()
  console.log('Status:', listRes.status)
  
  try {
    const listData = JSON.parse(listText)
    console.log('Response status:', listData.status)
    console.log('Message:', listData.message)
    
    if (listData.data) {
      const data = listData.data
      if (Array.isArray(data)) {
        console.log(`找到 ${data.length} 套模考`)
        for (const item of data.slice(0, 5)) {
          console.log(`  - ${JSON.stringify(item).substring(0, 200)}`)
        }
      } else {
        console.log('Data (first 500):', JSON.stringify(data).substring(0, 500))
      }
    } else {
      console.log('Full response (first 500):', listText.substring(0, 500))
    }
  } catch {
    console.log('Not JSON, body (first 500):', listText.substring(0, 500))
  }

  // 2. 免登录列表
  console.log('\n[2] 获取免登录模考列表...')
  const freeListRes = await fetch(`${BASE}/api/mock/list?_t=${Date.now()}`, {
    headers: HEADERS,
  })
  const freeListText = await freeListRes.text()
  console.log('Status:', freeListRes.status)
  try {
    const freeData = JSON.parse(freeListText)
    if (freeData.data) {
      console.log('Data type:', typeof freeData.data)
      if (Array.isArray(freeData.data)) {
        console.log(`找到 ${freeData.data.length} 套`)
        for (const item of freeData.data.slice(0, 3)) {
          console.log(`  - ${JSON.stringify(item).substring(0, 200)}`)
        }
      } else {
        console.log('Data keys:', Object.keys(freeData.data))
        console.log('Data (first 500):', JSON.stringify(freeData.data).substring(0, 500))
      }
    } else {
      console.log('Full (first 500):', freeListText.substring(0, 500))
    }
  } catch {
    console.log('Not JSON:', freeListText.substring(0, 200))
  }
  
  // 3. 用户信息（验证登录状态）
  console.log('\n[3] 验证登录状态...')
  const userRes = await fetch(`${BASE}/api/mock/user/info?_t=${Date.now()}`, {
    headers: HEADERS,
  })
  const userText = await userRes.text()
  console.log('Status:', userRes.status)
  console.log('Body (first 300):', userText.substring(0, 300))
  
  // 4. 尝试获取剑雅真题列表
  console.log('\n[4] 获取剑雅真题列表...')
  const ieltsListRes = await fetch(`${BASE}/api/list/login/ielts/?_t=${Date.now()}`, {
    headers: HEADERS,
  })
  const ieltsListText = await ieltsListRes.text()
  console.log('Status:', ieltsListRes.status)
  try {
    const ieltsData = JSON.parse(ieltsListText)
    console.log('Status:', ieltsData.status)
    if (ieltsData.data) {
      console.log('Data (first 500):', JSON.stringify(ieltsData.data).substring(0, 500))
    }
  } catch {
    console.log('Body (first 300):', ieltsListText.substring(0, 300))
  }
}

main().catch(console.error)
