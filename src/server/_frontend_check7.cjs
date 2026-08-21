// 前端复验 v7：抽查含 Q7 的页面，确认无黑块无粘连
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
  await page.setViewport({ width: 1280, height: 2200 });
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
  const targets = [
    ['tpo22_allende', 'TOEFL TPO 22', 3],
    ['tpo20_q7', 'TOEFL TPO 20', 1],
    ['tpo12_q7', 'TOEFL TPO 12', 2],
  ];
  for (const [label, title, order] of targets) {
    const b = books.find(x => x.title === title);
    if (!b) continue;
    const d = (await (await fetch(API + '/exam/books/' + b.id)).json()).data;
    const art = d.sections.filter(s => s.type === 'ARTICLE')[order - 1];
    if (!art) continue;
    await page.goto('http://localhost:5173/exam/content/' + art.id, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 5000));
    const state = await page.evaluate(() => {
      const text = document.body.innerText;
      const qs = Array.from(document.querySelectorAll('.question-card, .q-card, [class*="question"]'))
        .map(e => e.innerText.trim()).filter(t => t.length > 10).slice(0, 10);
      // 检测黑块字符与超长粘连
      const block = (text.match(/[\u2580-\u25FF\u2B00-\u2BFF]/g) || []).length;
      const glue = (text.match(/[a-zA-Z]{18,}/g) || []).length;
      return { block, glue, qs };
    });
    await page.screenshot({ path: path.join(OUT, label + '.png'), fullPage: false });
    console.log(label, JSON.stringify({ block: state.block, glue: state.glue, qs: state.qs.length,
      q7: (state.qs[6] || '').slice(0, 120) }));
  }
  console.log('page errors:', errs.slice(0, 2));
  await browser.close();
  console.log('DONE');
}
main().catch(e => { console.error('ERR', e); process.exit(1); });
