async function main() {
  const BASE = 'https://ieltscat.xdf.cn'
  const COOKIE = `br-current-appid=9634ef2d15c443978bc68ec2eeffa54e; isShowVipPop=false; U2ST=0bc4bdadde2669fc88c59a4f784f01b4098cc63cf6a8cf56376832c2b3ee35c5; U2AT=2afb473a-d338-4024-8f58-e99e9a3a0790; U2UserId=zGH7PJNafpJbSiqrzGYOLR2HVG6CDHHT1XOIOb9dpMlfXedg5bkJ91fHkKCNPSeD; U2Token=50F797AAB21AA265727614175F6F69AE_54DE6430081420175B630DB64AEEA93D; token_uc=d86f1c69bd0248168fa8201f3f7899cc; JSESSIONID=BB25F59E1BC4FBCB16C399881D308BB2`
  
  const res = await fetch(`${BASE}/mock?source=1`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': COOKIE,
    }
  })
  const html = await res.text()
  
  // Find app.js or main js bundle
  const jsMatches = html.match(/src=["']([^"']*\.js[^"']*)["']/g)
  if (jsMatches) {
    for (const m of jsMatches) {
      const url = m.match(/src=["']([^"']*)["']/)?.[1]
      if (url && url.includes('app')) {
        console.log(`APP JS: ${url}`)
      } else if (url && !url.includes('rangy') && !url.includes('jquery') && !url.includes('bonree') && !url.includes('md5')) {
        console.log(`OTHER JS: ${url}`)
      }
    }
  }
  
  // Also look for chunk-vendors or similar
  const allSrc = html.match(/src=["']([^"']*)["']/g)
  if (allSrc) {
    for (const s of allSrc) {
      if (s.includes('.js') && !s.includes('rangy') && !s.includes('jquery') && !s.includes('bonree') && !s.includes('md5')) {
        console.log(`SCRIPT: ${s}`)
      }
    }
  }
  
  // Also look for link to js in prefetch/preload
  const prefetchJs = html.match(/href=["']([^"']*\.js[^"']*)["']/g)
  if (prefetchJs) {
    const unique = [...new Set(prefetchJs)]
    for (const s of unique.slice(0, 10)) {
      console.log(`PREFETCH: ${s}`)
    }
  }
}

main().catch(console.error)
