const { chromium } = require('playwright');
const seed = require('./recseed.js');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 393, height: 793 }, hasTouch: true, isMobile: true });
  const errors = []; p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await p.goto('http://localhost:8765/'); await seed(p); await p.reload(); await p.waitForTimeout(500);
  for (const tab of ['home', 'calendar', 'todo', 'records', 'goal']) { await p.evaluate((t) => document.querySelector(`button[data-tab="${t}"]`)?.click(), tab); await p.waitForTimeout(400); }
  console.log('tabs opened, errors:', JSON.stringify(errors));
  await b.close();
})();
