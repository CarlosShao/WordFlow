// 前端复验 v5：TPO74/75 修复后重拍截图
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = 'D:\\work\\java\\AI-workspace\\WordFlow\\.cluster\\toefl-reading-fix\\frontend';
fs.mkdirSync(OUT, { recursive: true });
const API = 'http://localhost:3002/api/v1';

async function main() {
  const auth = (await (await fetch(API + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'verify@test.local', password: 'Verify123!' }),
  })).json()).data;
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 2000 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate((t) => {
    localStorage.setItem('wordflow-access-token', t.accessToken);
    localStorage.setItem('wordflow-refresh-token', t.refreshToken);
    localStorage.setItem('wordflow-auth-token', t.accessToken);
    localStorage.setItem('wordflow-auth-user', JSON.stringify({ id: t.user.id, username: t.user.username, email: t.user.email }));
  }, auth);

  const books = (await (await fetch(API + '/exam/books?category=TOEFL')).json()).data;
  const cases = [];
  for (const [label, title, orders] of [['tpo74', 'TOEFL TPO 74', [1, 2, 3]], ['tpo75', 'TOEFL TPO 75', [1, 2, 3]]]) {
    const b = books.find(x => x.title === title);
    const d = (await (await fetch(API + '/exam/books/' + b.id)).json()).data;
    const arts = d.sections.filter(s => s.type === 'ARTICLE');
    for (const o of orders) cases.push([`${label}_p${o}`, arts[o - 1]]);
  }
  const results = [];
  for (const [label, art] of cases) {
    await page.goto('http://localhost:5173/exam/content/' + art.id, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('goto warn', e.message));
    await new Promise(r => setTimeout(r, 4500));
    const state = await page.evaluate(() => {
      const paras = Array.from(document.querySelectorAll('.passage-paragraph, .passage-article p'))
        .map(e => e.innerText.trim()).filter(t => t.length > 20);
      return { path: location.pathname, paras };
    });
    await page.screenshot({ path: path.join(OUT, label + '.png'), fullPage: false });
    results.push({ label, paras: state.paras.length, chars: state.paras.join('\n').length,
      head: (state.paras[0] || '').slice(0, 70), tail: (state.paras[state.paras.length - 1] || '').slice(-70) });
    console.log(label, JSON.stringify(results[results.length - 1]).slice(0, 600));
  }
  console.log('page errors:', errs.slice(0, 3));
  await browser.close();
  console.log('DONE');
}
main().catch(e => { console.error('ERR', e); process.exit(1); });
