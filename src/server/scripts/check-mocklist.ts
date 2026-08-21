/**
 * 检查模考列表中每个 Test 的 mockId
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
  const res = await fetch(`${API}/mock/login/list?questionSource=1&_t=${Date.now()}`, { headers: HEADERS })
  const data = await res.json()
  
  for (const mock of data.data) {
    console.log(`\n${mock.level1Name}:`)
    for (const test of mock.testList || []) {
      console.log(`  ${test.level2Name}: mockId=${test.mockId}, finish=${test.finish}, doneNum=${test.doneNum}`)
      // 看 subjectList
      for (const sub of test.subjectList || []) {
        const subName = sub.subjectType === '1' ? '听力' : sub.subjectType === '2' ? '阅读' : sub.subjectType === '4' ? '写作' : sub.subjectType
        console.log(`    ${subName}: ${sub.partList?.length} parts`)
      }
    }
  }
}

main().catch(console.error)
