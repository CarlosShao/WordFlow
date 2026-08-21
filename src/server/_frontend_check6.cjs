// 前端复验 v6：用户点名页面抽查（正文 + 题目渲染）
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
  // 目标：TPO74 Reading1, TPO66 Reading2(Visions), TPO22 Reading3(Allende), TPO2 Reading1(Desert Formation), TPO75 Reading1
  const targets = [
    ['tpo74_r1', 'TOEFL TPO 74', 1],
    ['tpo66_r2', 'TOEFL TPO 66', 2],
    ['tpo22_r3', 'TOEFL TPO 22', 3],
    ['tpo2_r1', 'TOEFL TPO 2', 1],
    ['tpo75_r1', 'TOEFL TPO 75', 1],
  ];
  const results = [];
  for (const [label, title, order] of targets) {
    const b = books.find(x => x.title === title);
    if (!b) { console.log(label, 'BOOK NOT FOUND'); continue; }
    const d = (await (await fetch(API + '/exam/books/' + b.id)).json()).data;
    const arts = d.sections.filter(s => s.type === 'ARTICLE');
    const art = arts[order - 1];
    if (!art) { console.log(label, 'ARTICLE NOT FOUND'); continue; }
    await page.goto('http://localhost:5173/exam/content/' + art.id, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('goto warn', e.message));
    await new Promise(r => setTimeout(r, 5000));
    const state = await page.evaluate(() => {
      const paras = Array.from(document.querySelectorAll('.passage-paragraph, .passage-article p'))
        .map(e => e.innerText.trim()).filter(t => t.length > 20);
      // 题目区文本（含题干与选项）
      const qs = Array.from(document.querySelectorAll('.question-card, .q-card, .question, [class*="question"]'))
        .map(e => e.innerText.trim()).filter(t => t.length > 10).slice(0, 12);
      return { paras, qs };
    });
    const shot = OUT + '/' + label + '.png';
    await page.screenshot({ path: shot, fullPage: false });
    results.push({ label, paras: state.paras.length,
      bodyHead: (state.paras[0] || '').slice(0, 60),
      bodyTail: (state.paras[state.paras.length - 1] || '').slice(-50),
      qs: state.qs.length, qHead: (state.qs[0] || '').slice(0, 80) });
    console.log(label, JSON.stringify(results[results.length - 1]).slice(0, 500));
  }
  console.log('page errors:', errs.slice(0, 3));
  await browser.close();
  console.log('DONE');
}
main().catch(e => { console.error('ERR', e); process.exit(1); });
