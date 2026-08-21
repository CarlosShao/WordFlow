const BASE = 'https://ieltscat.xdf.cn'
const API = `${BASE}/api`
const COOKIE = `br-current-appid=9634ef2d15c443978bc68ec2eeffa54e; isShowVipPop=false; U2ST=0bc4bdadde2669fc88c59a4f784f01b4098cc63cf6a8cf56376832c2b3ee35c5; U2AT=2afb473a-d338-4024-8f58-e99e9a3a0790; U2UserId=zGH7PJNafpJbSiqrzGYOLR2HVG6CDHHT1XOIOb9dpMlfXedg5bkJ91fHkKCNPSeD; U2Token=50F797AAB21AA265727614175F6F69AE_54DE6430081420175B630DB64AEEA93D; token_uc=d86f1c69bd0248168fa8201f3f7899cc; JSESSIONID=BB25F59E1BC4FBCB16C399881D308BB2`
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json, text/plain, */*',
  'FromURL': 'ieltscat.xdf.cn',
  'Referer': `${BASE}/mock`,
  'Cookie': COOKIE,
}

async function main() {
  // 取一个听力题的 previewQuestion
  const url = `${API}/questionPreviewQuestion/6796`
  const sep = url.includes('?') ? '&' : '?'
  const res = await fetch(`${url}${sep}_t=${Date.now()}`, { headers: HEADERS })
  const data = await res.json()
  const qData = data.data
  
  console.log('docList:', JSON.stringify(qData.docList, null, 2).substring(0, 2000))
  
  // 也取一个阅读题
  const url2 = `${API}/questionPreviewQuestion/6806`
  const sep2 = url2.includes('?') ? '&' : '?'
  const res2 = await fetch(`${url2}${sep2}_t=${Date.now()}`, { headers: HEADERS })
  const data2 = await res2.json()
  const qData2 = data2.data
  
  console.log('\n阅读 docList:', JSON.stringify(qData2.docList, null, 2).substring(0, 500))
}

main().catch(console.error)
