/**
 * 尝试不同的 questionSource 参数获取 ieltscat 模考列表
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
  console.log('=== 尝试不同 questionSource ===\n')
  
  // questionSource 可能的值
  const sources = ['1', '2', '3', '4', 'listen', 'read', 'speak', 'write', 'ielts', 'cambridge', 'mock']
  
  for (const src of sources) {
    // /api/mock/login/list
    const res = await fetch(`${BASE}/api/mock/login/list?questionSource=${src}&_t=${Date.now()}`, {
      headers: HEADERS,
    })
    const text = await res.text()
    
    if (res.status === 200) {
      try {
        const data = JSON.parse(text)
        if (data.status === 200 || data.code === 200) {
          console.log(`✓ questionSource=${src}: 成功!`)
          const d = data.data
          if (Array.isArray(d)) {
            console.log(`  ${d.length} 套模考`)
            for (const item of d.slice(0, 3)) {
              console.log(`  - ${JSON.stringify(item).substring(0, 200)}`)
            }
          } else {
            console.log(`  Data: ${JSON.stringify(d).substring(0, 300)}`)
          }
          break
        } else {
          console.log(`  ${src}: status=${data.status} msg=${data.message}`)
        }
      } catch {
        console.log(`  ${src}: 非 JSON`)
      }
    } else {
      console.log(`  ${src}: HTTP ${res.status}`)
    }
  }
  
  // 尝试 jianyaList_login 格式: /api/list/login/ielts/{source}/{page}
  console.log('\n=== 尝试 jianyaList_login ===')
  for (const src of ['1', '2', 'listen', 'read']) {
    const res = await fetch(`${BASE}/api/list/login/ielts/${src}/1?_t=${Date.now()}`, {
      headers: HEADERS,
    })
    const text = await res.text()
    console.log(`/api/list/login/ielts/${src}/1: ${res.status}`)
    try {
      const data = JSON.parse(text)
      if (data.status === 200 || data.code === 200) {
        console.log(`  ✓ 成功! Data: ${JSON.stringify(data.data).substring(0, 300)}`)
      } else {
        console.log(`  status=${data.status} msg=${data.message}`)
      }
    } catch {
      console.log(`  Body (first 200): ${text.substring(0, 200)}`)
    }
  }
  
  // 也试试 /api/mock/list 带 questionSource
  console.log('\n=== /api/mock/list 带 questionSource ===')
  for (const src of ['1', '2', 'listen', 'read', 'cambridge']) {
    const res = await fetch(`${BASE}/api/mock/list?questionSource=${src}&_t=${Date.now()}`, {
      headers: HEADERS,
    })
    const text = await res.text()
    try {
      const data = JSON.parse(text)
      if (data.status === 200 || data.code === 200) {
        console.log(`✓ /api/mock/list?questionSource=${src}: 成功!`)
        console.log(`  Data: ${JSON.stringify(data.data).substring(0, 500)}`)
        break
      } else {
        console.log(`  ${src}: ${data.status} ${data.message}`)
      }
    } catch {
      console.log(`  ${src}: 非 JSON`)
    }
  }
}

main().catch(console.error)
