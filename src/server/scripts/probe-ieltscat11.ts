/**
 * 用正确的 header 访问 ieltscat API
 */
const BASE = 'https://ieltscat.xdf.cn'

async function main() {
  console.log('=== ieltscat API (带 FromURL header) ===\n')
  
  // 1. 获取首页 cookie
  const homeRes = await fetch(`${BASE}/`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  })
  const cookies = homeRes.headers.getSetCookie?.() || []
  const cookieStr = cookies.map(c => c.split(';')[0]).join('; ')
  console.log('Cookies:', cookieStr || '(none)')
  
  const commonHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'FromURL': 'ieltscat.xdf.cn',
    'Referer': `${BASE}/mock`,
    'Cookie': cookieStr,
  }
  
  // 2. 模考列表
  console.log('\n[1] /api/mock/list')
  const listRes = await fetch(`${BASE}/api/mock/list?_t=${Date.now()}`, {
    headers: commonHeaders,
  })
  const listText = await listRes.text()
  console.log('Status:', listRes.status)
  console.log('Body (first 1000):', listText.substring(0, 1000))
  
  // 3. 登录模考列表
  console.log('\n[2] /api/mock/login/list')
  const loginListRes = await fetch(`${BASE}/api/mock/login/list?_t=${Date.now()}`, {
    headers: commonHeaders,
  })
  const loginListText = await loginListRes.text()
  console.log('Status:', loginListRes.status)
  console.log('Body (first 1000):', loginListText.substring(0, 1000))
  
  // 4. 尝试登录（带 FromURL）
  console.log('\n[3] 登录 /user/login/phone.shtml')
  const loginRes = await fetch(`${BASE}/user/login/phone.shtml?_t=${Date.now()}`, {
    method: 'POST',
    headers: {
      ...commonHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      phone: '13505110772',
      password: 'henji2168Carlos',
    }).toString(),
  })
  const loginText = await loginRes.text()
  const loginCookies = loginRes.headers.getSetCookie?.() || []
  console.log('Status:', loginRes.status)
  console.log('Set-Cookie:', loginCookies)
  console.log('Body (first 500):', loginText.substring(0, 500))
  
  // 5. 获取题目列表
  console.log('\n[4] /api/list/ielts/')
  const ieltsListRes = await fetch(`${BASE}/api/list/ielts/?_t=${Date.now()}`, {
    headers: commonHeaders,
  })
  const ieltsListText = await ieltsListRes.text()
  console.log('Status:', ieltsListRes.status)
  console.log('Body (first 1000):', ieltsListText.substring(0, 1000))
  
  // 6. 获取练习列表
  console.log('\n[5] /practice/detail/')
  const detailRes = await fetch(`${BASE}/practice/detail/?_t=${Date.now()}`, {
    headers: commonHeaders,
  })
  const detailText = await detailRes.text()
  console.log('Status:', detailRes.status)
  console.log('Body (first 500):', detailText.substring(0, 500))
  
  // 7. 模考详情
  console.log('\n[6] /mock/detail/')
  const mockDetailRes = await fetch(`${BASE}/mock/detail/?_t=${Date.now()}`, {
    headers: commonHeaders,
  })
  const mockDetailText = await mockDetailRes.text()
  console.log('Status:', mockDetailRes.status)
  console.log('Body (first 500):', mockDetailText.substring(0, 500))
}

main().catch(console.error)
