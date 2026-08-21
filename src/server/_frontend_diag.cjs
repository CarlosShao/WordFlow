// 诊断：打开阅读页后 dump URL/标题/正文容器
const puppeteer = require('puppeteer');

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1800 });
  const url = 'http://localhost:5173/exam/content/438a35e5-ea9d-4d14-abc7-76d4a9a3f0d8';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('goto warn', e.message));
  await new Promise(r => setTimeout(r, 6000));
  console.log('final url:', page.url());
  console.log('title:', await page.title());
  const body = await page.evaluate(() => document.body.innerText.slice(0, 1200));
  console.log('body text head:\n', body);
  const html = await page.evaluate(() => document.body.innerHTML.slice(0, 800));
  console.log('body html head:\n', html);
  await browser.close();
}
main().catch(e => { console.error('ERR', e); process.exit(1); });
