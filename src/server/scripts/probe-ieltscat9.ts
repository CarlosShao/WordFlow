/**
 * ieltscat 爬取 - 先获取模考列表，再尝试登录
 */
const BASE = 'https://ieltscat.xdf.cn'

async function main() {
  console.log('=== ieltscat 模考列表获取 ===\n')
  
  // 1. 先获取首页 cookie
  const homeRes = await fetch(`${BASE}/`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  })
  const cookies = homeRes.headers.getSetCookie?.() || []
  const cookieStr = cookies.map(c => c.split(';')[0]).join('; ')
  console.log('Cookies:', cookieStr || '(none)')
  
  // 2. 获取免登录模考列表
  console.log('\n[1] /api/mock/list (免登录)')
  const mockListRes = await fetch(`${BASE}/api/mock/list`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Referer': `${BASE}/mock`,
      'Cookie': cookieStr,
    },
  })
  const mockListText = await mockListRes.text()
  console.log('Status:', mockListRes.status)
  console.log('Content-Type:', mockListRes.headers.get('content-type'))
  console.log('Body (first 500):', mockListText.substring(0, 500))
  
  // 3. 获取登录模考列表
  console.log('\n[2] /api/mock/login/list')
  const loginMockRes = await fetch(`${BASE}/api/mock/login/list`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Referer': `${BASE}/mock`,
      'Cookie': cookieStr,
    },
  })
  const loginMockText = await loginMockRes.text()
  console.log('Status:', loginMockRes.status)
  console.log('Body (first 500):', loginMockText.substring(0, 500))
  
  // 4. 尝试用账号密码登录
  console.log('\n[3] 尝试登录 /user/login/phone.shtml')
  const loginRes = await fetch(`${BASE}/user/login/phone.shtml`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json, text/plain, */*',
      'Referer': `${BASE}/`,
      'Cookie': cookieStr,
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
  console.log('Body:', loginText.substring(0, 500))
  
  // 5. 如果有验证码接口，先获取验证码
  console.log('\n[4] /user/login/phone/val.shtml (验证码登录)')
  const valRes = await fetch(`${BASE}/user/login/phone/val.shtml`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json, text/plain, */*',
      'Referer': `${BASE}/`,
      'Cookie': cookieStr,
    },
    body: new URLSearchParams({
      phone: '13505110772',
    }).toString(),
  })
  const valText = await valRes.text()
  console.log('Status:', valRes.status)
  console.log('Body:', valText.substring(0, 500))
  
  // 6. 尝试 SSO 登录
  console.log('\n[5] SSO 登录')
  const ssoRes = await fetch(`${BASE}/sso/login?app_id=ieltscat_xdf_cn&redirect_uri=${encodeURIComponent(BASE + '/mock')}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html',
      'Cookie': cookieStr,
    },
    redirect: 'manual',
  })
  console.log('Status:', ssoRes.status)
  console.log('Location:', ssoRes.headers.get('location'))
  const ssoCookies = ssoRes.headers.getSetCookie?.() || []
  console.log('Set-Cookie:', ssoCookies)
}

main().catch(console.error)
