/**
 * 尝试 questionPreviewQuestion 获取带答案的题目
 */
const BASE = 'https://ieltscat.xdf.cn'
const API = `${BASE}/api`

const COOKIE = process.env.IELTSCAT_COOKIE || `br-current-appid=9634ef2d15c443978bc68ec2eeffa54e; isShowVipPop=false; U2ST=0bc4bdadde2669fc88c59a4f784f01b4098cc63cf6a8cf56376832c2b3ee35c5; U2AT=2afb473a-d338-4024-8f58-e99e9a3a0790; U2UserId=zGH7PJNafpJbSiqrzGYOLR2HVG6CDHHT1XOIOb9dpMlfXedg5bkJ91fHkKCNPSeD; U2Token=50F797AAB21AA265727614175F6F69AE_54DE6430081420175B630DB64AEEA93D; token_uc=d86f1c69bd0248168fa8201f3f7899cc; JSESSIONID=BB25F59E1BC4FBCB16C399881D308BB2`

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json, text/plain, */*',
  'FromURL': 'ieltscat.xdf.cn',
  'Referer': `${BASE}/mock`,
  'Cookie': COOKIE,
}

async function main() {
  const qIds = ['6796', '6802', '6806']
  
  for (const qId of qIds) {
    console.log(`\n=== qId=${qId} ===`)
    
    // questionPreviewQuestion (mode=2)
    try {
      const url = `${API}/questionPreviewQuestion/${qId}`
      const sep = url.includes('?') ? '&' : '?'
      const res = await fetch(`${url}${sep}_t=${Date.now()}`, { headers: HEADERS })
      console.log(`questionPreviewQuestion: HTTP ${res.status}`)
      if (res.ok) {
        const data = await res.json()
        const d = data.data || data
        console.log(`keys: ${Object.keys(d).join(', ')}`)
        
        if (d.contentList) {
          console.log(`contentList (${d.contentList.length} items):`)
          for (let i = 0; i < Math.min(d.contentList.length, 20); i++) {
            const item = d.contentList[i]
            console.log(`\n  [${i}] type=${item.type}`)
            try {
              const c = JSON.parse(item.content)
              console.log(`  keys: ${Object.keys(c).join(', ')}`)
              if (c.value) console.log(`  value: ${c.value}`)
              if (c.answer) console.log(`  answer: ${c.answer}`)
              if (c.title) console.log(`  title: ${c.title.substring(0, 150)}`)
              if (c.options) console.log(`  options: ${JSON.stringify(c.options).substring(0, 200)}`)
              if (c.analysis) console.log(`  analysis: ${c.analysis.substring(0, 200)}`)
              if (c.explain) console.log(`  explain: ${c.explain.substring(0, 200)}`)
              if (c.content) console.log(`  content: ${JSON.stringify(c.content).substring(0, 200)}`)
              if (c.sccode) console.log(`  sccode: ${c.sccode}`)
              // 检查所有字段
              for (const [k, v] of Object.entries(c)) {
                if (!['sctype', 'title', 'options', 'content', 'sccode', 'sccnt', 'valcnt', 'isBDX', 'caseSensitive', 'showType', 'name'].includes(k)) {
                  const sv = typeof v === 'string' ? v.substring(0, 200) : JSON.stringify(v)?.substring(0, 200)
                  console.log(`  ${k}: ${sv}`)
                }
              }
            } catch {
              console.log(`  raw: ${item.content?.substring(0, 200)}`)
            }
          }
        }
        
        // 检查其他可能的答案字段
        console.log(`\nOther fields:`)
        for (const [k, v] of Object.entries(d)) {
          if (k !== 'contentList' && k !== 'article') {
            const sv = typeof v === 'string' ? v.substring(0, 200) : JSON.stringify(v)?.substring(0, 200)
            console.log(`  ${k}: ${sv}`)
          }
        }
      }
    } catch (e: any) {
      console.log(`questionPreviewQuestion error: ${e.message}`)
    }
    
    await new Promise(r => setTimeout(r, 500))
  }
}

main().catch(console.error)
