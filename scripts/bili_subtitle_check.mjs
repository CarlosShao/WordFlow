import fs from 'node:fs'
import https from 'node:https'

const cookie = fs
  .readFileSync('d:/work/java/AI-workspace/WordFlow/.bilibili_cookie.txt', 'utf8')
  .split('\n')
  .filter((l) => l && !l.startsWith('#') && l.includes('\t'))
  .map((l) => {
    const p = l.replace(/\r$/, '').split('\t')
    return `${p[5]}=${p[6]}`
  })
  .filter((x) => !x.startsWith('undefined'))
  .join('; ')

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.bilibili.com', Cookie: cookie } }, (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => resolve({ status: res.statusCode, data }))
      })
      .on('error', reject)
  })
}

// Test with a known Bilibili comedy video: BV1diEtzTEhR (stand-up comedy for kids, bilingual)
const bvid = process.argv[2] || 'BV1diEtzTEhR'
const v = await get(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`)
const vj = JSON.parse(v.data)
console.log('view code:', vj.code, 'title:', vj.data?.title)
const cid = vj.data?.cid
if (cid) {
  console.log('cid:', cid, 'pages:', vj.data?.pages?.map((p) => `${p.page}:${p.part}`).join(' | '))
  const s = await get(
    `https://api.bilibili.com/x/player/wbi/v2?bvid=${bvid}&cid=${cid}`,
  )
  const sj = JSON.parse(s.data)
  const subs = sj.data?.subtitle?.subtitles ?? []
  console.log('subtitle code:', sj.code, 'count:', subs.length)
  for (const sub of subs) {
    console.log('  lan:', sub.lan, 'lang:', sub.lan_doc, 'url:', sub.subtitle_url)
  }
}
