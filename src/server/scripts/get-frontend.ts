async function main() {
  const BASE = 'https://ieltscat.xdf.cn'
  const COOKIE = `br-current-appid=9634ef2d15c443978bc68ec2eeffa54e; bonree-version=2.4.4; gr_user_id=e377a17c-d5e6-403a-9c16-353d35460cd1; br-client=c2314a17-0015-4457-b709-8bb9fb951c01; isShowVipPop=false; U2ST=0bc4bdadde2669fc88c59a4f784f01b4098cc63cf6a8cf56376832c2b3ee35c5; U2AT=2afb473a-d338-4024-8f58-e99e9a3a0790; U2UserId=zGH7PJNafpJbSiqrzGYOLR2HVG6CDHHT1XOIOb9dpMlfXedg5bkJ91fHkKCNPSeD; U2Token=50F797AAB21AA265727614175F6F69AE_54DE6430081420175B630DB64AEEA93D; U2User=BkyQ5Ul1sgaMA5q09gdAOg%3D%3D; U2NickName=135****0772; userinfo_uc_ielts=8181491%24%24ieltscat.xdf.cn%24%241787149874941%24%240; userinfo_uc_toefl=8181491%24%24tpo.xdf.cn%24%241787149875150%24%240%24%24U2; token_uc=d86f1c69bd0248168fa8201f3f7899cc; JSESSIONID=BB25F59E1BC4FBCB16C399881D308BB2`
  
  const res = await fetch(`${BASE}/mock?source=1`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': COOKIE,
    }
  })
  const html = await res.text()
  
  // Find JS files
  const jsMatches = html.match(/src=["']([^"']*\.js[^"']*)["']/g)
  if (jsMatches) {
    for (const m of jsMatches) {
      const url = m.match(/src=["']([^"']*)["']/)?.[1]
      console.log(`JS: ${url}`)
    }
  }
  
  // Also look for any API paths mentioned in the HTML
  const apiMatches = html.match(/\/api\/[a-zA-Z\/]+/g)
  if (apiMatches) {
    const unique = [...new Set(apiMatches)]
    for (const a of unique) {
      console.log(`API in HTML: ${a}`)
    }
  }
  
  console.log(`\nHTML length: ${html.length}`)
  console.log(`\nFirst 2000 chars:\n${html.substring(0, 2000)}`)
}

main().catch(console.error)
