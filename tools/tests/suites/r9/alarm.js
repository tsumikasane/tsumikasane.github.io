// 通知アラーム: the choices as the photo (予定時間, minutes, every hour to 23, 1/2/3/7日前); an old choice on a plan kept
const { chromium } = require('playwright');
let fails = 0;
const ok = (c, m, x) => { if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + m + (x !== undefined ? ': ' + (typeof x === 'string' ? x : JSON.stringify(x)) : '')); };
(async () => {
  const out = process.argv[2], base = process.argv[3] || 'http://localhost:8765/', pre = process.argv[4] || 'tsumikasane:';
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(base); await p.evaluate(() => localStorage.clear());
  const day = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 3); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  await p.evaluate(([pre, day]) => localStorage.setItem(pre + 'events', JSON.stringify([{ id: 'e1', title: '前からの予定', date: day, time: '10:00', endTime: '11:00', alarms: [60, 10080, 20160], createdAt: 1 }])), [pre, day]);
  await p.goto(base + '#calendar'); await p.reload(); await p.waitForTimeout(800);
  // ---- a new plan: the choices
  await p.evaluate(() => document.getElementById('calAdd').click()); await p.waitForTimeout(700);
  await p.fill('#planTitle', '歯医者');
  await p.evaluate(() => document.getElementById('planAlarmBtn').click()); await p.waitForTimeout(500);
  const items = await p.evaluate(() => [...document.querySelectorAll('#alarmList button')].map((x) => x.textContent));
  const want = ['予定時間', '1分前', '3分前', '5分前', '10分前', '15分前', '20分前', '30分前', '45分前', ...Array.from({ length: 23 }, (_, i) => `${i + 1}時間前`), '1日前', '2日前', '3日前', '7日前'];
  ok(JSON.stringify(items) === JSON.stringify(want), 'the choices as the photo has them', items);
  ok(await p.evaluate(() => /最大3つ/.test(document.getElementById('alarmLead').textContent) && document.getElementById('sheetTitle').textContent === '通知アラーム'), 'its title and 最大3つ');
  // three chosen, a fourth refused
  for (const name of ['1時間前', '1日前', '3日前']) await p.evaluate((n) => [...document.querySelectorAll('#alarmList button')].find((x) => x.textContent === n).click(), name);
  await p.waitForTimeout(200);
  ok(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('#alarmList button[aria-pressed="true"]')].map((x) => x.textContent))) === JSON.stringify(['1時間前', '1日前', '3日前']), 'three chosen, checked');
  await p.evaluate(() => [...document.querySelectorAll('#alarmList button')].find((x) => x.textContent === '17時間前').click()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.querySelectorAll('#alarmList button[aria-pressed="true"]').length === 3), 'a fourth not taken');
  await p.evaluate(() => document.querySelectorAll('#alarmList button')[0].scrollIntoView());
  await p.screenshot({ path: `${out}/alarm_new_top.png` });
  await p.evaluate(() => [...document.querySelectorAll('#alarmList button')].find((x) => x.textContent === '20時間前').scrollIntoView({ block: 'center' }));
  await p.screenshot({ path: `${out}/alarm_new_hours.png` });
  // 戻る: the row says them, and the plan saved with them
  await p.evaluate(() => document.getElementById('sheetCancel').click()); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById('planAlarmText').textContent === '1時間前、1日前、3日前'), 'the form says them', await p.evaluate(() => document.getElementById('planAlarmText').textContent));
  await p.evaluate(() => document.getElementById('planSave').click()); await p.waitForTimeout(600);
  const saved = await p.evaluate((pre) => JSON.parse(localStorage.getItem(pre + 'events')).find((e) => e.title === '歯医者')?.alarms, pre);
  ok(JSON.stringify(saved) === '[60,1440,4320]', 'saved as minutes', saved);
  // ---- a plan with choices from before (1週間前 → 7日前, 2週間前 kept)
  await p.waitForTimeout(400);
  if (await p.evaluate(() => document.getElementById('daySheet').open)) { await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
  await p.evaluate((d) => { const c = [...document.querySelectorAll('.cal-day')].find((x) => (x.getAttribute('aria-label') || '').startsWith(`${Number(d.slice(5, 7))}月${Number(d.slice(8))}日`)); c.click(); }, day); await p.waitForTimeout(700);
  await p.evaluate(() => [...document.querySelectorAll('#calDayList .row-btn')].find((x) => x.textContent.includes('前からの予定')).click()); await p.waitForTimeout(600);
  const shown = await p.evaluate(() => document.getElementById('edAlarmText').textContent);
  ok(shown === '1時間前、7日前、14日前', 'an old plan: its choices still there (1週間前 now 7日前, 2週間前 as 14日前)', shown);
  await p.evaluate(() => document.getElementById('edAlarmBtn').click()); await p.waitForTimeout(400);
  const old = await p.evaluate(() => [...document.querySelectorAll('#alarmList button')].map((x) => x.textContent + (x.getAttribute('aria-pressed') === 'true' ? '✓' : '')));
  ok(old.includes('14日前✓') && old.indexOf('14日前✓') === old.length - 1 && old.includes('7日前✓'), 'its old choice on the page, checked, to take off', old.slice(-5));
  await p.evaluate(() => [...document.querySelectorAll('#alarmList button')].find((x) => x.textContent === '14日前').click()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('edAlarms').value) === '60,10080', 'taken off', await p.evaluate(() => document.getElementById('edAlarms').value));
  console.log('errors', JSON.stringify(errors));
  console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await b.close();
})();
