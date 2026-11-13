const { chromium } = require('playwright');
let fails = 0;
const ok = (c, m, x) => { if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + m + (x !== undefined ? ': ' + (typeof x === 'string' ? x : JSON.stringify(x)) : '')); };
(async () => {
  const out = process.argv[2], base = process.argv[3] || 'http://localhost:8765/', pre = process.argv[4] || 'tsumikasane:';
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(base); await p.evaluate((pre) => {
    localStorage.clear();
    localStorage.setItem(pre + 'todos', JSON.stringify([{ id: 't1', text: '買い物', due: '2026-11-20', memo: '牛乳\n卵\nパン', createdAt: 1 }]));
  }, pre);
  await p.goto(base + '#calendar'); await p.reload(); await p.waitForTimeout(800);
  const evs = () => p.evaluate((pre) => JSON.parse(localStorage.getItem(pre + 'events') || '[]'), pre);
  const vis = (sel) => p.evaluate((sel) => { const x = document.querySelector(sel); return !!x && !!x.offsetParent; }, sel);
  await p.tap('#calAdd'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => planMemoText.textContent === 'メモ' && planMemoText.classList.contains('none')) && !(await vis('#planMemo')), 'the form: a メモ row (greyed), the field itself not there');
  await p.fill('#planTitle', '打ち合わせ');
  await p.tap('#planMemoBtn'); await p.waitForTimeout(400);
  const pg = await p.evaluate(() => ({ title: sheetTitle.textContent, done: !memoDone.hidden, cancel: !sheetCancel.hidden, add: !planSave.hidden, focus: document.activeElement.id, h: planMemo.getBoundingClientRect().height, vh: innerHeight }));
  ok(pg.title === 'メモ' && pg.done && !pg.cancel && !pg.add && pg.focus === 'planMemo', 'its page: メモ, 完了 alone on the bar, the field focused', pg);
  ok(!(await vis('#planTitle')) && !(await vis('#planWhen')) && !(await vis('#planPlace')), 'the form\'s other fields out of sight');
  ok(pg.h > pg.vh * 0.6, 'the field big (down to the bottom)', { h: pg.h, vh: pg.vh });
  await p.keyboard.type('議題\n・予算\n・日程\n持ち物：資料');
  await p.screenshot({ path: `${out}/memo_page.png` });
  await p.tap('#memoDone'); await p.waitForTimeout(300);
  const back = await p.evaluate(() => ({ title: sheetTitle.textContent, add: !planSave.hidden, text: planMemoText.textContent, focus: document.activeElement.id, t: planTitle.value }));
  ok(back.title === '新しい予定' && back.add && back.text.startsWith('議題\n・予算') && back.focus === 'planMemoBtn' && back.t === '打ち合わせ', '完了: the form again, its row showing the memo', back);
  ok(await vis('#planTitle') && !(await vis('#planMemo')), 'the fields back, the big field away');
  await p.screenshot({ path: `${out}/memo_form.png` });
  await p.tap('#planSave'); await p.waitForTimeout(500);
  let e = (await evs())[0];
  ok(e?.memo === '議題\n・予算\n・日程\n持ち物：資料', 'added: the memo with its lines', e?.memo);
  // its day's list: the memo's first two lines
  await p.evaluate((d) => { const c = [...document.querySelectorAll('.cal-day')].find((x) => (x.getAttribute('aria-label') || '').startsWith(`${Number(d.slice(5, 7))}月${Number(d.slice(8))}日`)); c.click(); }, e.date); await p.waitForTimeout(700);
  ok(await p.evaluate(() => !!document.querySelector('#calDayList .ev-memo.clamp')), 'the day\'s list: the memo clamped');
  // its edit sheet: the row says it, its page holds it; Esc back to the form, not out of the sheet
  await p.evaluate(() => [...document.querySelectorAll('#calDayList .row-btn')].find((x) => x.textContent.includes('打ち合わせ')).click()); await p.waitForTimeout(500);
  ok((await p.evaluate(() => edMemoText.textContent)).startsWith('議題'), 'its edit sheet: the row shows the memo');
  await p.tap('#edMemoBtn'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => sheetTitle.textContent === 'メモ' && edMemo.value.startsWith('議題') && !edCopy.offsetParent && !edDelete.offsetParent && sheetSave.hidden), 'its page from the edit sheet: the memo, 複製 and 削除 out of sight');
  await p.keyboard.type('\n追記');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => daySheet.open && sheetTitle.textContent === '予定を編集' && edMemoText.textContent.endsWith('追記')), 'Esc: back to the edit form, the change kept there');
  // left with the change: asked first
  await p.tap('#edMemoBtn'); await p.waitForTimeout(300);
  await p.evaluate(() => { const r = daySheet.getBoundingClientRect(); daySheet.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 5, clientY: r.top - 20 })); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => discardAsk.open), 'a tap above the sheet with a change, on its page: asked first');
  await p.evaluate(() => discardNo.click()); await p.waitForTimeout(200);
  await p.tap('#memoDone'); await p.waitForTimeout(200);
  await p.tap('#sheetSave'); await p.waitForTimeout(500);
  e = (await evs())[0];
  ok(e.memo.endsWith('\n追記'), 'saved: the memo changed', e.memo);
  // この予定を複製: its memo, the row showing it
  await p.evaluate(() => [...document.querySelectorAll('#calDayList .row-btn')].find((x) => x.textContent.includes('打ち合わせ')).click()); await p.waitForTimeout(500);
  await p.tap('#edCopy'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => planMemo.value.endsWith('追記') && planMemoText.textContent.startsWith('議題')), '複製: the memo too');
  await p.tap('#sheetCancel'); await p.waitForTimeout(300); await p.tap('#sheetDone').catch(() => {}); await p.waitForTimeout(600);
  // a draft: written on its page as the app went away, back in the form after
  await p.tap('#calAdd'); await p.waitForTimeout(600);
  await p.fill('#planTitle', '下書き'); await p.tap('#planMemoBtn'); await p.waitForTimeout(300);
  await p.keyboard.type('一行目\n二行目');
  await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await p.reload(); await p.waitForTimeout(1000);
  const dr = await p.evaluate(() => ({ open: daySheet.open, title: sheetTitle.textContent, memo: planMemo.value, row: planMemoText.textContent }));
  ok(dr.open && dr.title === '新しい予定' && dr.memo === '一行目\n二行目' && dr.row === '一行目\n二行目', 'a draft: the form again, its memo in it and on its row', dr);
  await p.tap('#sheetCancel'); await p.waitForTimeout(500);
  // a ToDo made a plan: its memo with its lines
  await p.goto(base + '#todo'); await p.reload(); await p.waitForTimeout(700);
  await p.evaluate(() => document.querySelector('#todoList [data-edit="t1"]').click()); await p.waitForTimeout(500);
  await p.evaluate(() => recPlan.click()); await p.waitForTimeout(500);
  ok(await p.evaluate(() => planMemo.value === '牛乳\n卵\nパン' && planMemoText.textContent === '牛乳\n卵\nパン'), 'この内容で予定を作る: the ToDo\'s memo, lines and all');
  console.log('errors', JSON.stringify(errors));
  console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await b.close();
})();
