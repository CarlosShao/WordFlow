// 诊断 v2：登录后打开阅读页 dump 可见文本与错误
const puppeteer = require('puppeteer');

async function main() {
  const authRes = await fetch('http://localhost:3002/api/v1/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'verify@test.local', password: 'Verify123!' }),
  });
  const auth = (await authRes.json()).data;
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 2000 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.evaluate((t) => {
    localStorage.setItem('wordflow_access_token', t.accessToken);
    localStorage.setItem('wordflow_refresh_token', t.refreshToken);
    localStorage.setItem('wordflow_user', JSON.stringify({ id: t.user.id, username: t.user.username, email: t.user.email }));
  }, auth);
  await page.goto('http://localhost:5173/exam/content/438a35e5-ea9d-4d14-abc7-76d4a9a3f0d8', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('goto warn', e.message));
  await new Promise(r => setTimeout(r, 7000));
  console.log('url:', page.url());
  const body = await page.evaluate(() => document.body.innerText.slice(0, 1500));
  console.log('body text:\n', body);
  console.log('console errors:', errors.slice(0, 5));
  await browser.close();
}
main().catch(e => { console.error('ERR', e); process.exit(1); });
