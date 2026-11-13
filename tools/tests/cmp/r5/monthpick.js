const { chromium } = require('playwright');
let fails = 0;
const ok = (c, m, x) => { if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + m + (x !== undefined ? ': ' + (typeof x === 'string' ? x : JSON.stringify(x)) : '')); };
(async () => {
  const out = process.argv[2], base = process.argv[3] || 'http://localhost:8765/';
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(base); await p.evaluate(() => localStorage.clear());
  await p.goto(base + '#calendar'); await p.reload(); await p.waitForTimeout(700);
  const title = () => p.evaluate(() => calMonthName.textContent);
  const band = () => p.evaluate(() => [...mpWheels.querySelectorAll('.wheel-col')].map((c) => c.querySelector('.wheel-item.on')?.textContent));
  const t0 = await title();
  await p.tap('#calMonthBtn'); await p.waitForTimeout(600);
  const st = await p.evaluate(() => ({ open: daySheet.open, title: sheetTitle.textContent, cancel: !sheetCancel.hidden && sheetCancel.textContent, done: !sheetDone.hidden && sheetDone.textContent, cols: mpWheels.querySelectorAll('.wheel-col').length, band: !!mpWheels.querySelector('.wheel-band'), today: !!mpToday }));
  ok(st.open && st.title === '月を選ぶ' && st.cancel === 'キャンセル' && st.done === '完了' && st.cols === 2 && st.band, 'the picker: two wheels in a band, キャンセル and 完了', st);
  ok(JSON.stringify(await band()) === JSON.stringify(t0.match(/(\d+年)(\d+月)/).slice(1)), 'it starts at the month on show', await band());
  await p.screenshot({ path: `${out}/mp_open.png` });
  // turn the year two rows down, the month three rows up (by touch-like scrolling), then 完了
  await p.evaluate(() => { const [y, m] = mpWheels.querySelectorAll('.wheel-col'); y.scrollTop += 80; m.scrollTop -= 120; });
  await p.waitForTimeout(500);
  const turned = await band();
  ok(JSON.stringify(turned) === '["2028年","8月"]', 'turned: 2028年 8月 in the band', turned);
  await p.tap('#sheetDone'); await p.waitForTimeout(600);
  ok((await title()) === '2028年8月' && !(await p.evaluate(() => daySheet.open)), '完了: the calendar at 2028年8月', await title());
  // キャンセル leaves it as it was
  await p.tap('#calMonthBtn'); await p.waitForTimeout(600);
  ok(JSON.stringify(await band()) === '["2028年","8月"]', 'opened again: at the month on show');
  await p.evaluate(() => { mpWheels.querySelectorAll('.wheel-col')[1].scrollTop += 200; }); await p.waitForTimeout(400);
  await p.tap('#sheetCancel'); await p.waitForTimeout(600);
  ok((await title()) === '2028年8月', 'キャンセル: as it was', await title());
  // the month wheel goes round: December on to January (the year stays: they turn apart, as the iPhone's do)
  await p.tap('#calMonthBtn'); await p.waitForTimeout(600);
  await p.evaluate(() => { mpWheels.querySelectorAll('.wheel-col')[1].scrollTop += 40 * 5; }); await p.waitForTimeout(500);
  ok(JSON.stringify(await band()) === '["2028年","1月"]', 'the months go round (8月 on 5 → 1月)', await band());
  // keys: ↓ a row at a time, End to the last year
  await p.focus('#mpWheels .wheel-col'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(300);
  ok((await band())[0] === '2029年', 'a key: the next year', await band());
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  ok((await title()) === '2028年8月' && !(await p.evaluate(() => daySheet.open)), 'Esc: as it was', await title());
  // 今月に戻る
  await p.tap('#calMonthBtn'); await p.waitForTimeout(600);
  await p.tap('#mpToday'); await p.waitForTimeout(600);
  ok((await title()) === t0, '今月に戻る: this month', await title());
  // in 日: 完了 goes to the month's 1st
  await p.tap('#calViews button[data-view="day"]'); await p.waitForTimeout(400);
  await p.tap('#calMonthBtn'); await p.waitForTimeout(600);
  await p.evaluate(() => { mpWheels.querySelectorAll('.wheel-col')[1].scrollTop += 40; }); await p.waitForTimeout(500);
  await p.tap('#sheetDone'); await p.waitForTimeout(600);
  ok(/^2026年12月1日/.test(await title()), '日: the picked month\'s 1st', await title());
  await p.tap('#calViews button[data-view="month"]'); await p.waitForTimeout(300);
  console.log('errors', JSON.stringify(errors));
  console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await b.close();
})();
