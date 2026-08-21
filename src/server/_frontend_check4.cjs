// 前端阅读页复验 v4：正确 token 键名注入
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
  for (const [label, title] of [['tpo54', 'TOEFL TPO 54'], ['tpo75', 'TOEFL TPO 75'], ['tpo10', 'TOEFL TPO 10'], ['tpo1', 'TOEFL TPO 1']]) {
    const b = books.find(x => x.title === title);
    const d = (await (await fetch(API + '/exam/books/' + b.id)).json()).data;
    const art = d.sections.filter(s => s.type === 'ARTICLE')[0];
    cases.push([label, art]);
  }
  const results = [];
  for (const [label, art] of cases) {
    await page.goto('http://localhost:5173/exam/content/' + art.id, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('goto warn', e.message));
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
      return { path: location.pathname, paras, layout };
    });
    const fname = label + '.png';
    await page.screenshot({ path: path.join(OUT, fname), fullPage: false });
    results.push({ label, path: state.path, paras: state.paras.length,
      chars: state.paras.join('\n').length,
      head: (state.paras[0] || '').slice(0, 70),
      tail: (state.paras[state.paras.length - 1] || '').slice(-70),
      layout: state.layout });
    console.log(label, JSON.stringify(results[results.length - 1]).slice(0, 700));
  }
  console.log('page errors:', errs.slice(0, 3));
  fs.writeFileSync(path.join(OUT, 'render_check.json'), JSON.stringify(results, null, 2));
  await browser.close();
  console.log('DONE');
}
main().catch(e => { console.error('ERR', e); process.exit(1); });
