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
  
  // 查找所有 JS 文件引用
  const allMatches = html.match(/(src|href)=["'][^"']*\.js[^"']*["']/g)
  if (allMatches) {
    // 过滤掉非核心的
    const filtered = allMatches.filter(s => !s.includes('rangy') && !s.includes('jquery') && !s.includes('bonree') && !s.includes('md5'))
    console.log(`Found ${allMatches.length} JS refs, ${filtered.length} after filter:`)
    for (const s of filtered) {
      console.log(s)
    }
  }
  
  // 找 app.js
  const appMatch = html.match(/app[\.\-][^"'\s]*\.js/g)
  if (appMatch) console.log('\nApp JS:', appMatch)
  
  // 找 main JS bundle
  const mainMatch = html.match(/(main|index|chunk-vendors)[^"'\s]*\.js[^"'\s]*/g)
  if (mainMatch) console.log('\nMain JS:', mainMatch)
  
  // 找 script 标签
  const scriptTags = html.match(/<script[^>]*>/g)
  if (scriptTags) {
    console.log('\nAll script tags:')
    for (const s of scriptTags) {
      if (!s.includes('rangy') && !s.includes('bonree') && !s.includes('md5') && !s.includes('jquery')) {
        console.log(`  ${s}`)
      }
    }
  }
  
  // 找 prefetch/preload JS
  const prefetch = html.match(/<link[^>]*rel=["']?preload[^>]*>/g)
  if (prefetch) {
    console.log('\nPreload links:')
    for (const p of prefetch) {
      console.log(`  ${p}`)
    }
  }
  
  // 找 modulepreload
  const modulePreload = html.match(/<link[^>]*modulepreload[^>]*>/g)
  if (modulePreload) {
    console.log('\nModule preload:')
    for (const p of modulePreload) {
      console.log(`  ${p}`)
    }
  }
  
  // 最后 3000 字符
  console.log('\n--- HTML tail (last 3000 chars) ---')
  console.log(html.substring(html.length - 3000))
}

main().catch(console.error)
