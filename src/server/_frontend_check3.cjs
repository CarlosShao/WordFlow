// 前端阅读页复验 v3：UI 真实登录 → 打开阅读页 → 抽取渲染文本 + 截图
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = 'D:\\work\\java\\AI-workspace\\WordFlow\\.cluster\\toefl-reading-fix\\frontend';
fs.mkdirSync(OUT, { recursive: true });
const API = 'http://localhost:3002/api/v1';

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 2000 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));

  // 1) UI 登录
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2500));
  // 找输入框（email + password）填表提交
  const inputs = await page.$$('input');
  console.log('login inputs:', inputs.length);
  if (inputs.length >= 2) {
    await inputs[0].click({ clickCount: 3 });
    await inputs[0].type('verify@test.local');
    await inputs[1].click({ clickCount: 3 });
    await inputs[1].type('Verify123!');
    // 找提交按钮
    const btns = await page.$$('button');
    let clicked = false;
    for (const b of btns) {
      const txt = await b.evaluate(el => el.innerText);
      if (/登\s*录|login/i.test(txt)) { await b.click(); clicked = true; break; }
    }
    console.log('login button clicked:', clicked);
    await new Promise(r => setTimeout(r, 4000));
  }
  console.log('after login url:', page.url());

  // 2) 打开 TPO54 阅读页
  const books = (await (await fetch(API + '/exam/books?category=TOEFL')).json()).data;
  const b54 = books.find(b => b.title === 'TOEFL TPO 54');
  const d54 = (await (await fetch(API + '/exam/books/' + b54.id)).json()).data;
  const arts = d54.sections.filter(s => s.type === 'ARTICLE');
  console.log('TPO54 ARTICLE sections:', arts.length);
  for (let i = 0; i < arts.length; i++) {
    const art = arts[i];
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
    const fname = 'tpo54_p' + (i + 1) + '.png';
    await page.screenshot({ path: path.join(OUT, fname), fullPage: false });
    console.log('P' + (i + 1), JSON.stringify({
      path: state.path, paras: state.paras.length,
      chars: state.paras.join('\n').length,
      head: (state.paras[0] || '').slice(0, 60),
      tail: (state.paras[state.paras.length - 1] || '').slice(-60),
      layout: state.layout,
    }));
  }
  console.log('page errors:', errs.slice(0, 3));
  await browser.close();
}
main().catch(e => { console.error('ERR', e); process.exit(1); });
