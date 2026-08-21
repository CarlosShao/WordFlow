// 前端阅读页渲染复验 v2：注入登录态后打开真实页面
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = 'D:\\work\\java\\AI-workspace\\WordFlow\\.cluster\\toefl-reading-fix\\frontend';
fs.mkdirSync(OUT, { recursive: true });
const API = 'http://localhost:3002/api/v1';

async function login() {
  const r = await fetch(API + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'verify@test.local', password: 'Verify123!' }),
  });
  const j = await r.json();
  return j.data;
}

async function main() {
  const auth = await login();
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--window-size=1280,2200'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 2000 });
  // 先打开站点注入 localStorage，再导航
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.evaluate((t) => {
    localStorage.setItem('wordflow_access_token', t.accessToken);
    localStorage.setItem('wordflow_refresh_token', t.refreshToken);
    localStorage.setItem('wordflow_user', JSON.stringify({ id: t.user.id, username: t.user.username, email: t.user.email }));
  }, auth);

  const books = (await (await fetch(API + '/exam/books?category=TOEFL')).json()).data;
  const b54 = books.find(b => b.title === 'TOEFL TPO 54');
  const b10 = books.find(b => b.title === 'TOEFL TPO 10');
  const d54 = (await (await fetch(API + '/exam/books/' + b54.id)).json()).data;
  const d10 = (await (await fetch(API + '/exam/books/' + b10.id)).json()).data;
  const art54 = d54.sections.filter(s => s.type === 'ARTICLE');
  const art10 = d10.sections.filter(s => s.type === 'ARTICLE');

  const results = [];
  for (const [label, art] of [['tpo54_fixed', art54[0]], ['tpo10_unfixed', art10[0]]]) {
    if (!art) continue;
    const url = 'http://localhost:5173/exam/content/' + art.id;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('goto warn', e.message));
    await new Promise(r => setTimeout(r, 5000));
    const state = await page.evaluate(() => {
      const paras = Array.from(document.querySelectorAll('.passage-paragraph, .passage-article p'))
        .map(e => e.innerText.trim()).filter(t => t.length > 20);
      const el = document.querySelector('.passage-article');
      let layout = null;
      if (el) {
        const cs = getComputedStyle(el);
        layout = { scrollH: el.scrollHeight, clientH: el.clientHeight, maxH: cs.maxHeight, overflow: cs.overflow };
      }
      return { url: location.pathname, paras, layout };
    });
    const fname = label + '.png';
    await page.screenshot({ path: path.join(OUT, fname), fullPage: false });
    results.push({
      label, url, paras: state.paras.length,
      totalChars: state.paras.join('\n').length,
      first: (state.paras[0] || '').slice(0, 90),
      last: (state.paras[state.paras.length - 1] || '').slice(-90),
      layout: state.layout,
    });
    console.log(label, JSON.stringify(results[results.length - 1], null, 2).slice(0, 900));
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'render_check.json'), JSON.stringify(results, null, 2));
  console.log('DONE');
}

main().catch(e => { console.error('ERR', e); process.exit(1); });
