// a ToDo checked off goes down to 完了 a moment after (the user's call, 2026-11-22: every one checked off to 完了; before
// it, one done today kept its place): for that moment it stays where it was, then it is the first in 完了 (the other half
// of the bar at the foot, the user's call the same day), its name and line one lighter grey; unchecked there, it is one
// to do again in its place, in すべて
const { chromium } = require('playwright');
let fails = 0;
const ok = (c, m, x) => { if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + m + (x !== undefined ? ': ' + (typeof x === 'string' ? x : JSON.stringify(x)) : '')); };
(async () => {
  const out = process.argv[2], base = process.argv[3] || 'http://localhost:8765/', pre = process.argv[4] || 'tsumikasane:';
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
  const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(base); await p.evaluate(() => localStorage.clear());
  await p.evaluate((pre) => {
    const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const now = Date.now(), midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const T = [
      { id: 'a1', text: '請求書を送る', done: false, due: day(-2), createdAt: 1 },
      { id: 'a2', text: '部屋の掃除', done: false, due: day(-1), createdAt: 2 },
      { id: 'b1', text: '歯医者の予約', done: false, due: day(0), createdAt: 3, memo: '午前中なら空いている' },
      { id: 'b2', text: 'ゴミ出し', done: false, due: day(0), repeat: 'weekly', createdAt: 4 },
      { id: 'b3', text: '牛乳を買う', done: false, due: day(0), createdAt: 5 },
      { id: 'c1', text: '本を返す', done: false, due: '', createdAt: 6 },
      { id: 'c2', text: '写真の整理', done: false, due: '', createdAt: 7 },
      { id: 'y1', text: 'きのうやったこと', done: true, due: '', createdAt: 8, doneAt: midnight.getTime() - 3600e3 },
    ];
    for (let i = 0; i < 12; i++) T.push({ id: 'o' + i, text: '前にやったこと' + i, done: true, due: '', createdAt: 100 + i, doneAt: now - (2 + i) * 864e5 });
    localStorage.setItem(pre + 'todos', JSON.stringify(T));
  }, pre);
  await p.goto(base + '#todo'); await p.reload(); await p.waitForTimeout(900);
  const rows = () => p.evaluate(() => [...todoList.children].map((li) => li.classList.contains('dayhead') ? '#' + li.querySelector('[role=heading]').textContent + '|' + li.querySelector('.dayhead-count').textContent : li.querySelector('.row-link') ? (li.classList.contains('done') ? '✓' : '') + li.querySelector('.row-link').textContent + (li.classList.contains('kept') ? '(kept)' : '') : li.textContent));
  const check = (name) => p.evaluate((name) => [...todoList.querySelectorAll('li')].find((li) => li.querySelector('.row-link')?.textContent === name).querySelector('.check').click(), name);
  const rowOf = (name) => p.evaluate((name) => { const li = [...todoList.querySelectorAll('li')].find((x) => x.querySelector('.row-link')?.textContent === name); if (!li) return null; const t = li.querySelector('.row-link'), cs = getComputedStyle(t); return { cls: li.className, sub: !!li.querySelector('.sub'), day: li.querySelector('.done-day')?.textContent || '', del: !!li.querySelector(':scope > .del'), color: cs.color, line: cs.textDecorationLine, lineColor: cs.textDecorationColor }; }, name);
  const head = (r, name) => r.findIndex((x) => x.startsWith('#' + name + '|'));
  let r = await rows();
  console.log('before', JSON.stringify(r));
  // (すべて・完了 in the bar at the foot, the user's call 2026-11-22: 完了 is the bar's other half)
  const part = async (n) => { await p.evaluate((n) => document.querySelector(`#todoParts button[data-part="${n}"]`).click(), n); await p.waitForTimeout(250); };
  // ---- one in きょう checked: for a moment it stays where it was, then it is the first in 完了
  await check('歯医者の予約'); await p.waitForTimeout(300);
  r = await rows();
  ok(r[head(r, 'きょう') + 1] === '✓歯医者の予約', 'checked: done at once, for a moment where it was', r.slice(head(r, 'きょう'), head(r, 'きょう') + 2));
  await p.waitForTimeout(1900);
  r = await rows();
  console.log('after1', JSON.stringify(r));
  ok(r[head(r, 'きょう')] === '#きょう|2 件' && !r.some((x) => x.includes('歯医者の予約')) && head(r, '完了') < 0, 'after the moment: gone from すべて, 2 left in きょう, no 完了 there', r.slice(head(r, 'きょう'), head(r, 'きょう') + 3));
  await part('done');
  r = await rows();
  ok(r[0] === '#完了|14 件' && r[1] === '✓歯医者の予約', '…the first in 完了', r.slice(0, 2));
  let s = await rowOf('歯医者の予約');
  ok(s && /\bdone\b/.test(s.cls) && !/\bkept\b/.test(s.cls) && s.day === 'きょう' && s.del, 'its row: done, one line, きょう at its end, with ×', s);
  ok(s.color === 'rgb(142, 142, 147)' && s.line.includes('line-through') && s.lineColor === s.color, 'its name and line one lighter grey (#8e8e93), not red', s);
  await p.screenshot({ path: `${out}/done_1.png` });
  await part('open');
  // ---- a repeat checked: its turn in 完了, the next one in これから
  await check('ゴミ出し'); await p.waitForTimeout(2100);
  r = await rows();
  console.log('after2', JSON.stringify(r));
  ok(head(r, 'これから') > head(r, 'きょう') && r[head(r, 'これから') + 1] === 'ゴミ出し', 'its next turn in これから', r.slice(head(r, 'これから'), head(r, 'これから') + 2));
  await part('done');
  r = await rows();
  ok(r[1] === '✓ゴミ出し', "a repeat's turn in 完了, the first there", r.slice(0, 3));
  await part('open');
  await check('牛乳を買う'); await p.waitForTimeout(2100);
  r = await rows();
  ok(head(r, 'きょう') < 0, 'きょう all done: its heading gone', r.slice(0, 6));
  // ---- 期限切れ all done: gone too, its きょうに移す with it
  ok(await p.evaluate(() => !!todoList.querySelector('.dayhead.warn .dayhead-btn')), '期限切れ: red, with きょうに移す while one is left');
  await check('請求書を送る'); await check('部屋の掃除'); await p.waitForTimeout(2100);
  r = await rows();
  ok(head(r, '期限切れ') < 0 && !(await p.evaluate(() => !!todoList.querySelector('.dayhead.warn'))), '期限切れ all done: its heading gone, nothing red', r.slice(0, 4));
  // ---- 完了: the last ten done, the newest first (those of today, then the day before), the rest a press away
  await part('done');
  r = await rows();
  const hd = head(r, '完了');
  ok(hd === 0 && r[hd] === '#完了|18 件' && r[hd + 1] === '✓部屋の掃除' && r[hd + 2] === '✓請求書を送る' && r[hd + 6] === '✓きのうやったこと' && r.slice(hd + 1).filter((x) => x.startsWith('✓')).length === 10, '完了: all 18, the newest first, ten showing', r.slice(hd, hd + 7));
  ok(/ほか 8 件を見る/.test(r[r.length - 1]), 'ほか 8 件を見る', r[r.length - 1]);
  await p.screenshot({ path: `${out}/done_2.png`, fullPage: true });
  // the rest, from the keyboard: focus on the first of them, in 完了
  await p.evaluate(() => todoList.querySelector('.more-done button').click()); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.activeElement?.closest('li')?.querySelector('.row-link')?.textContent === '前にやったこと4'), 'ほか…を見る from the keyboard: focus on the eleventh in 完了', await p.evaluate(() => document.activeElement?.closest('li')?.textContent));
  // ---- unchecked in 完了: gone to すべて (said, with 元に戻す), to do again in its place, with its 期限 and memo
  await check('歯医者の予約'); await p.waitForTimeout(400);
  r = await rows();
  ok(!r.some((x) => x.includes('歯医者の予約')) && /「歯医者の予約」を未完了に戻しました/.test(await p.evaluate(() => document.getElementById('status').textContent)), 'unchecked in 完了: gone from it, said so', r.slice(0, 3));
  await part('open');
  r = await rows();
  ok(r[head(r, 'きょう')] === '#きょう|1 件' && r[head(r, 'きょう') + 1] === '歯医者の予約', 'unchecked: to do again in きょう', r.slice(head(r, 'きょう'), head(r, 'きょう') + 2));
  s = await rowOf('歯医者の予約');
  ok(s.sub && !/\bdone\b/.test(s.cls), 'with its 期限 and memo again', s);
  // ---- the same day, opened again: in 完了 (the page opens on すべて)
  await p.reload(); await p.waitForTimeout(800);
  r = await rows();
  ok(!r.some((x) => x.includes('牛乳を買う')) && await p.evaluate(() => document.querySelector('#todoParts [aria-pressed="true"]')?.dataset.part === 'open'), 'opened again: すべて, the done ones not in it');
  await part('done');
  r = await rows();
  ok(r.indexOf('✓牛乳を買う') > head(r, '完了') && !r.some((x) => x.endsWith('(kept)')), 'opened again the same day: in 完了');
  // ---- × on a done one: deleted with 元に戻す, back in 完了
  // (a two-press ×, as before)
  const del = () => p.evaluate(() => [...todoList.querySelectorAll('li')].find((li) => li.querySelector('.row-link')?.textContent === '牛乳を買う').querySelector('.del').click());
  await del(); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !!todoList.querySelector('li.done .del.armed')), 'the first press arms it');
  await del(); await p.waitForTimeout(400);
  ok(!(await rows()).some((x) => x.includes('牛乳を買う')), '× on a done one: gone');
  await p.evaluate(() => document.querySelector('#status .toast-undo')?.click()); await p.waitForTimeout(400);
  r = await rows();
  ok(r.indexOf('✓牛乳を買う') > head(r, '完了'), '元に戻す: back in 完了');
  // ---- the next day: still in 完了
  await p.evaluate((pre) => { const T = JSON.parse(localStorage.getItem(pre + 'todos')); const m = new Date(); m.setHours(0, 0, 0, 0); for (const t of T) if (t.done && t.doneAt >= m.getTime()) t.doneAt = m.getTime() - 7200e3; localStorage.setItem(pre + 'todos', JSON.stringify(T)); }, pre);
  await p.reload(); await p.waitForTimeout(800);
  await part('done');
  r = await rows();
  ok(!r.some((x) => x.endsWith('(kept)')) && r.slice(head(r, '完了')).some((x) => x.startsWith('✓牛乳を買う')), 'done the day before: in 完了', r.slice(0, 4));
  // ---- きょう's tile: one checked there fades and the next comes up
  await p.evaluate((pre) => { const T = JSON.parse(localStorage.getItem(pre + 'todos')); for (const t of T) if (['b1', 'c1', 'c2'].includes(t.id)) { t.done = false; delete t.doneAt; } localStorage.setItem(pre + 'todos', JSON.stringify(T)); }, pre);
  await p.goto(base + '#home'); await p.reload(); await p.waitForTimeout(900);
  const tile = () => p.evaluate(() => [...document.querySelectorAll('#homeTiles .td-tile li:not(.td-add)')].map((li) => (li.classList.contains('done') ? '✓' : '') + li.querySelector('.rt-label').textContent));
  const tl = await tile();
  await p.evaluate(() => document.querySelector('#homeTiles .td-tile .rt-row').click()); await p.waitForTimeout(200);
  const tdone = await p.evaluate(() => { const l = document.querySelector('#homeTiles .td-tile li.done .rt-label'); const cs = l && getComputedStyle(l); return cs && { color: cs.color, line: cs.textDecorationLine, lineColor: cs.textDecorationColor }; });
  ok(tdone && tdone.color === 'rgb(142, 142, 147)' && tdone.line.includes('line-through') && tdone.lineColor === tdone.color, 'the tile: the same grey and line', tdone);
  await p.waitForTimeout(2000);
  const tl2 = await tile();
  ok(tl2[0] !== tl[0] && !tl2.some((x) => x.startsWith('✓')), 'the tile: it went and the next came up', [tl, tl2]);
  console.log('errors', JSON.stringify(errors));
  console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await b.close();
})();
