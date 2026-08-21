// 前端阅读页渲染复验：用 puppeteer 打开真实页面，抽取渲染文本 + 截图
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = 'D:\\work\\java\\AI-workspace\\WordFlow\\.cluster\\toefl-reading-fix\\frontend';
fs.mkdirSync(OUT, { recursive: true });

const API = 'http://localhost:3002/api/v1';

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--window-size=1440,2000'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1800 });

  // 1) 拿 TPO54 书 id 与第一篇文章 content id
  const books = (await (await fetch(API + '/exam/books?category=TOEFL')).json()).data;
  const b54 = books.find(b => b.title === 'TOEFL TPO 54');
  const b10 = books.find(b => b.title === 'TOEFL TPO 10'); // 未修复对照
  const detail54 = (await (await fetch(API + '/exam/books/' + b54.id)).json()).data;
  const detail10 = (await (await fetch(API + '/exam/books/' + b10.id)).json()).data;
  const art54 = detail54.sections.filter(s => s.type === 'ARTICLE');
  const art10 = detail10.sections.filter(s => s.type === 'ARTICLE');

  const results = [];
  // 2) 打开阅读页（修复后 TPO54 P1）
  for (const [label, art] of [['tpo54_fixed', art54[0]], ['tpo10_unfixed', art10[0]]]) {
    if (!art) continue;
    const url = 'http://localhost:5173/exam/content/' + art.id;
    console.log('opening', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('goto warn', e.message));
    await new Promise(r => setTimeout(r, 5000));
    // 抽取渲染后的正文段落
    const paras = await page.evaluate(() => {
      const els = document.querySelectorAll('.passage-paragraph, .passage-article p');
      return Array.from(els).map(e => e.innerText.trim()).filter(t => t.length > 20);
    });
    // 文章容器高度/滚动情况（检查 CSS 2000px 截断）
    const layout = await page.evaluate(() => {
      const el = document.querySelector('.passage-article');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { scrollH: el.scrollHeight, clientH: el.clientHeight, maxH: cs.maxHeight, overflow: cs.overflow };
    });
    const fname = label + '.png';
    await page.screenshot({ path: path.join(OUT, fname), fullPage: false });
    results.push({ label, url, paras: paras.length, totalChars: paras.join('\n').length,
                   first: (paras[0] || '').slice(0, 80), last: (paras[paras.length - 1] || '').slice(-80),
                   layout });
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'render_check.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}

main().catch(e => { console.error('ERR', e); process.exit(1); });
