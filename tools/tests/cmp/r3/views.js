// 月・週・日: switching, 7/5/3 days, swiping and ‹ ›, a day's name to 日, a plan pressed (its edit sheet, put away after),
// an empty hour pressed (a new plan there), overlaps side by side, 終日 lanes and +N, kept on reload, the tab again, the
// month picker, hidden labels, now's line
const { chromium } = require('playwright');
let fails = 0;
const ok = (c, m, x) => { if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + m + (x !== undefined ? ': ' + (typeof x === 'string' ? x : JSON.stringify(x)) : '')); };
(async () => {
  const out = process.argv[2], base = process.argv[3] || 'http://localhost:8765/', pre = process.argv[4] || 'tsumikasane:';
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
  const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  const cdp = await p.context().newCDPSession(p);
  const swipe = async (dx) => {
    const box = await p.locator('.tg-fit').boundingBox(), x = box.x + box.width / 2, y = box.y + 120;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 8, y }] }); await p.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(600);
  };
  await p.goto(base); await p.evaluate((pre) => {
    localStorage.clear();
    const now = Date.now();
    localStorage.setItem(pre + 'labels', JSON.stringify([{ id: 'l1', name: '試験', color: 'blue', createdAt: 1 }, { id: 'l2', name: '隠す', color: 'red', createdAt: 2 }]));
    localStorage.setItem(pre + 'settings', JSON.stringify([{ id: 'calendar', hidden: ['l2'], updatedAt: 1 }]));
    localStorage.setItem(pre + 'events', JSON.stringify([
      { id: 'a', title: 'A', date: '2026-11-08', time: '14:00', endTime: '15:00', createdAt: now },
      { id: 'b', title: 'B', date: '2026-11-08', time: '14:00', endTime: '15:00', createdAt: now + 1 },
      { id: 'c', title: 'C', date: '2026-11-08', time: '14:30', endTime: '16:00', createdAt: now + 2 },
      { id: 'd', title: 'D', date: '2026-11-08', time: '17:00', endTime: '18:00', createdAt: now + 3 },
      { id: 'h', title: '隠れた予定', date: '2026-11-08', time: '10:00', endTime: '11:00', labelId: 'l2', createdAt: now + 4 },
      { id: 'r', title: '合宿', date: '2026-11-06', endDate: '2026-11-10', labelId: 'l1', createdAt: now + 5 },
      ...[1, 2, 3, 4, 5, 6].map((k) => ({ id: 'z' + k, title: '終日' + k, date: '2026-11-12', createdAt: now + 10 + k })),
    ]));
  }, pre);
  await p.goto(base + '#calendar'); await p.reload(); await p.waitForTimeout(900);
  const st = () => p.evaluate(() => ({ title: calMonthName.textContent, view: [...calViews.children].find((b) => b.getAttribute('aria-pressed') === 'true')?.dataset.view, days: [...tgHead.querySelectorAll('.tg-day')].map((x) => x.textContent), month: !document.querySelector('#sec-calendar .cal').hidden, tg: !calTime.hidden, seg: !!document.getElementById('calDays') && !calDays.hidden, prev: calPrev.getAttribute('aria-label') }));
  let s = await st();
  ok(s.view === 'month' && s.month && !s.tg && !s.seg && s.prev === '前の月', 'at first: 月', s);
  // 週: the week of the day picked (today), Sunday first
  await p.tap('#calViews button[data-view="week"]'); await p.waitForTimeout(400);
  s = await st();
  const wk = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); const a = `${d.getDate()}(日)`; d.setDate(d.getDate() + 6); return [a, `${d.getDate()}(土)`]; });
  ok(s.view === 'week' && !s.month && s.tg && s.seg && s.days.length === 7 && s.days[0] === wk[0] && s.days[6] === wk[1] && s.prev === '前の週', '週: this week, 日曜 first', s);
  ok(await p.evaluate(() => { const d = new Date(), key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, col = tgBody.querySelector(`.tg-col[data-day="${key}"]`); return !!col?.querySelector('.tg-now') && col.classList.contains('today'); }), 'now\'s line in today\'s column');
  const fit = await p.evaluate(() => { const f = document.querySelector('.tg-fit'), se = document.scrollingElement; return { fit: f.scrollHeight - f.clientHeight, page: se.scrollHeight - se.clientHeight, body: tgBody.offsetHeight, area: f.clientHeight, labels: tgBody.querySelectorAll('.tg-hours span').length }; });
  ok(fit.fit === 0 && fit.page === 0 && fit.body === fit.area && fit.labels === 23, 'fixed like the month: the whole day fits, nothing scrolls', fit);
  // to the week of 2026-11-01 (the seeded plans are in the week after), whatever today is
  const steps = await p.evaluate(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return Math.round((d - new Date(2026, 10, 1)) / 6048e5); });
  for (let k = 0; k < Math.abs(steps); k++) { await p.evaluate((back) => (back ? calPrev : calNext).click(), steps > 0); await p.waitForTimeout(450); }
  ok((await st()).days[0] === '1(日)', 'to the week of 11/1', (await st()).days);
  // swipe left: next week
  await swipe(-200);
  s = await st();
  ok(s.days[0] === '8(日)' && s.days[6] === '14(土)', 'swiped left: the next week', s.days);
  // overlaps: A and B at 14:00 side by side, C overlapping them, D alone
  const lay = await p.evaluate(() => Object.fromEntries([...tgBody.querySelectorAll('.tg-ev')].map((x) => [x.querySelector('.t').textContent, [x.style.left, x.style.width]])));
  ok(lay.A[1] === lay.B[1] && lay.A[0] !== lay.B[0] && lay.D[1] === '100%' && !lay['隠れた予定'], 'overlaps side by side, one alone full width, hidden label left out', lay);
  // 終日: the run across 8–10 (going on from before), six on the 12th: four lanes and +N
  const ad = await p.evaluate(() => ({ run: [...tgAllDay.querySelectorAll('.tg-bar')].filter((x) => x.textContent === '合宿').map((x) => [x.style.gridColumn, x.classList.contains('from')]), more: [...tgAllDay.querySelectorAll('.tg-more')].map((x) => [x.textContent, x.style.gridColumn]) }));
  ok(ad.run.length === 1 && /^1 \/ span 3$/.test(ad.run[0][0]) && ad.run[0][1], '終日: the run across its days here, open at its start', ad.run);
  ok(ad.more.length === 1 && ad.more[0][0] === '+2' && ad.more[0][1].startsWith('5'), '終日: four lanes, +2 on the 12th', ad.more);
  await p.screenshot({ path: `${out}/vt_week.png` });
  // ‹ ›: back a week
  await p.evaluate(() => calPrev.click()); await p.waitForTimeout(500);
  ok((await st()).days[0] === '1(日)', '‹: the week before');
  await p.evaluate(() => calNext.click()); await p.waitForTimeout(500);
  // 3日 from the day picked, ‹ › and swipes by three, the hours still fitted
  await p.tap('#calDays button[data-days="3"]'); await p.waitForTimeout(400);
  s = await st();
  const d3 = s.days[0];
  ok(s.days.length === 3 && s.prev === '前の3日', '3日: three days, ‹ › by three', s);
  const fit3 = await p.evaluate(() => { const f = document.querySelector('.tg-fit'), se = document.scrollingElement; return f.scrollHeight - f.clientHeight + se.scrollHeight - se.clientHeight; });
  ok(fit3 === 0, '3日: nothing scrolls either', fit3);
  await swipe(-200);
  ok(Number((await st()).days[0].split('(')[0]) === Number(d3.split('(')[0]) + 3, 'swiped in 3日: three days on', (await st()).days);
  await p.evaluate(() => calPrev.click()); await p.waitForTimeout(500);
  ok((await st()).days[0] === d3, '‹ in 3日: three days back', (await st()).days);
  await p.tap('#calDays button[data-days="5"]'); await p.waitForTimeout(400);
  ok((await st()).days.length === 5 && (await st()).prev === '前の5日', '5日: five days', (await st()).days);
  await p.tap('#calDays button[data-days="7"]'); await p.waitForTimeout(400);
  ok((await st()).days[0] === '8(日)' && (await st()).days.length === 7, '7日: the week again', (await st()).days);
  // a plan pressed: its edit sheet; saved: the sheet goes, the days stay
  await p.evaluate(() => [...tgBody.querySelectorAll('.tg-ev')].find((x) => x.textContent.startsWith('D')).click()); await p.waitForTimeout(500);
  let sh = await p.evaluate(() => ({ open: daySheet.open, title: sheetTitle.textContent, t: edTitle.value }));
  ok(sh.open && sh.title === '予定を編集' && sh.t === 'D', 'a plan pressed: its edit sheet straight away', sh);
  await p.fill('#edTitle', 'D2'); await p.tap('#sheetSave'); await p.waitForTimeout(700);
  sh = await p.evaluate(() => ({ open: daySheet.open, ev: JSON.parse(localStorage.getItem(document.documentElement.dataset.pre || 'x') || 'null') }));
  const ev = await p.evaluate((pre) => JSON.parse(localStorage.getItem(pre + 'events')).find((x) => x.id === 'd').title, pre);
  s = await st();
  ok(!sh.open && ev === 'D2' && s.view === 'week' && s.days[0] === '8(日)', 'saved: the sheet put away, back to the same week', { open: sh.open, ev, days: s.days[0] });
  // キャンセル too
  await p.evaluate(() => [...tgBody.querySelectorAll('.tg-ev')].find((x) => x.textContent.startsWith('A')).click()); await p.waitForTimeout(500);
  await p.tap('#sheetCancel'); await p.waitForTimeout(600);
  ok(!(await p.evaluate(() => daySheet.open)), 'キャンセル: put away too');
  await p.evaluate(() => [...tgHead.querySelectorAll('.tg-day')].find((x) => x.textContent.startsWith('9')).click()); await p.waitForTimeout(300);
  ok((await st()).view === 'day' && (await st()).title === '2026年11月9日(月)', 'a day\'s name pressed: that day in 日', await st());
  await p.tap('#calViews button[data-view="week"]'); await p.waitForTimeout(300);
  await p.tap('#calDays button[data-days="3"]'); await p.waitForTimeout(300);
  s = await st();
  ok(s.days[0] === '9(月)' && s.days.length === 3, '3日 from the day picked (9th)', s.days);
  await p.evaluate(() => [...tgAllDay.querySelectorAll('.tg-bar')].find((x) => x.textContent === '合宿').click()); await p.waitForTimeout(500);
  ok((await p.evaluate(() => sheetTitle.textContent)) === '予定を編集', 'a run pressed in 終日: its edit sheet');
  await p.tap('#sheetCancel'); await p.waitForTimeout(600);
  ok((await st()).days[0] === '9(月)', 'and the days stay (a run from before them)', (await st()).days);
  // an empty hour pressed: a new plan from that hour, for an hour, on that day
  await p.tap('#calViews button[data-view="day"]'); await p.waitForTimeout(400);
  const body = await p.evaluate(() => tgBody.offsetHeight);
  const c2 = await p.locator('#tgBody .tg-col').boundingBox();
  await p.mouse.click(c2.x + 100, c2.y + body * 15.5 / 24); await p.waitForTimeout(600);
  const np = await p.evaluate(() => ({ open: daySheet.open, title: sheetTitle.textContent, d: planDate.value, t: planTime.value, e: planEndTime.value }));
  ok(np.open && np.title === '新しい予定' && np.d === '2026-11-09' && np.t === '15:00' && np.e === '16:00', 'an empty hour pressed: 新しい予定 from 15:00 to 16:00 that day', np);
  await p.fill('#planTitle', '面接'); await p.tap('#planSave'); await p.waitForTimeout(600);
  const added = await p.evaluate(() => ({ open: daySheet.open, blocks: [...tgBody.querySelectorAll('.tg-ev .t')].map((x) => x.textContent) }));
  ok(!added.open && added.blocks.includes('面接'), 'added: the sheet put away, its block there', added);
  await p.screenshot({ path: `${out}/vt_day.png` });
  // kept on this device: reload, still 日
  await p.reload(); await p.waitForTimeout(900);
  s = await st();
  ok(s.view === 'day' && !s.month && s.tg, 'kept: 日 again after a reload', s);
  // the calendar's tab pressed again: today
  await p.evaluate(() => document.querySelector('.menu button[data-tab="calendar"]').click()); await p.waitForTimeout(500);
  ok((await st()).title === await p.evaluate(() => { const d = new Date(); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${'日月火水木金土'[d.getDay()]})`; }), 'the tab again: today', (await st()).title);
  // the month picker in 日: December → its 1st
  await p.tap('#calMonthBtn'); await p.waitForTimeout(500);
  await p.evaluate(() => { mpWheels.querySelectorAll('.wheel-col')[1].scrollTop += 40; }); await p.waitForTimeout(500); // (11月 → 12月 on the wheel)
  await p.tap('#sheetDone'); await p.waitForTimeout(600);
  ok((await st()).title === '2026年12月1日(火)', 'a month picked in 日: its 1st', (await st()).title);
  // swipe right in 日: the day before
  await swipe(200);
  ok((await st()).title === '2026年11月30日(月)', 'swiped right in 日: the day before', (await st()).title);
  // back to 月: that day's month, the squares fitted
  await p.tap('#calViews button[data-view="month"]'); await p.waitForTimeout(600);
  s = await st();
  ok(s.view === 'month' && s.month && s.title === '2026年11月' && await p.evaluate(() => document.querySelectorAll('#calGrid .cal-day').length >= 35), '月: that month, its squares', s);
  // 月曜 first in the settings: 週 from Monday
  await p.evaluate((pre) => { const s = JSON.parse(localStorage.getItem(pre + 'settings')); s[0].weekStart = 1; localStorage.setItem(pre + 'settings', JSON.stringify(s)); }, pre);
  await p.reload(); await p.waitForTimeout(800);
  await p.tap('#calViews button[data-view="week"]'); await p.waitForTimeout(400);
  await p.tap('#calDays button[data-days="7"]'); await p.waitForTimeout(400);
  ok((await st()).days[0].endsWith('(月)'), '月曜 first: the week from Monday', (await st()).days);
  // the days kept on this device: 3日 again after a reload
  await p.tap('#calDays button[data-days="3"]'); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(700);
  ok((await st()).days.length === 3 && (await st()).seg, '3日 kept after a reload', (await st()).days.length);
  console.log('errors', JSON.stringify(errors));
  console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await b.close();
})();
