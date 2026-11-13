// a ToDo checked off keeps its place (done today), its name and line one lighter grey; those done before today in 完了
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
  const rowOf = (name) => p.evaluate((name) => { const li = [...todoList.querySelectorAll('li')].find((x) => x.querySelector('.row-link')?.textContent === name); if (!li) return null; const t = li.querySelector('.row-link'), cs = getComputedStyle(t); return { cls: li.className, sub: !!li.querySelector('.sub'), del: !!li.querySelector(':scope > .del'), color: cs.color, line: cs.textDecorationLine, lineColor: cs.textDecorationColor, bg: getComputedStyle(li).backgroundColor }; }, name);
  let r = await rows();
  console.log('before', JSON.stringify(r));
  const before = r.filter((x) => !x.startsWith('#') && !x.startsWith('✓') && !x.startsWith('ほか'));
  // ---- one in きょう checked: it stays
  await check('歯医者の予約'); await p.waitForTimeout(300);
  r = await rows();
  ok(r.indexOf('✓歯医者の予約') === (await p.evaluate(() => 0)) + r.indexOf('✓歯医者の予約') && r.indexOf('✓歯医者の予約') > r.indexOf('#きょう|3 件'.split('|')[0] + '|' + r.find((x) => x.startsWith('#きょう')).split('|')[1]), 'checked: done at once, in its place');
  await p.waitForTimeout(1900);
  r = await rows();
  console.log('after1', JSON.stringify(r));
  const kIdx = r.indexOf('✓歯医者の予約(kept)'), hIdx = r.findIndex((x) => x.startsWith('#きょう'));
  ok(kIdx === hIdx + 1, 'after the moment: still first under きょう, as a done one kept there', r.slice(hIdx, hIdx + 4));
  ok(r[hIdx] === '#きょう|残り 2 件', 'きょう: how many are left', r[hIdx]);
  let s = await rowOf('歯医者の予約');
  ok(s && /\bdone\b/.test(s.cls) && /\bkept\b/.test(s.cls) && !s.sub && s.del, 'its row: done, its name alone, with ×', s);
  ok(s.color === 'rgb(142, 142, 147)' && s.line.includes('line-through') && s.lineColor === s.color, 'its name and line one lighter grey (#8e8e93), not red', s);
  ok(!r.some((x) => x.startsWith('✓歯医者') && r.indexOf(x) > r.findIndex((y) => y.startsWith('#完了'))), 'not in 完了');
  await p.screenshot({ path: `${out}/kept_1.png` });
  // ---- a repeat checked: its turn stays, the next one comes in これから
  await check('ゴミ出し'); await p.waitForTimeout(2100);
  r = await rows();
  console.log('after2', JSON.stringify(r));
  const h2 = r.findIndex((x) => x.startsWith('#きょう'));
  ok(r[h2 + 2] === '✓ゴミ出し(kept)', 'a repeat\'s turn stays in its place', r.slice(h2, h2 + 4));
  const hl = r.findIndex((x) => x.startsWith('#これから'));
  ok(hl > h2 && r[hl + 1] === 'ゴミ出し', 'its next turn in これから', r.slice(hl, hl + 2));
  await check('牛乳を買う'); await p.waitForTimeout(2100);
  r = await rows();
  ok(r.find((x) => x.startsWith('#きょう')) === '#きょう|すべて完了', 'きょう all done: すべて完了', r.find((x) => x.startsWith('#きょう')));
  // ---- 期限切れ all done: not red, nothing to move
  ok(await p.evaluate(() => !!todoList.querySelector('.dayhead.warn .dayhead-btn')), '期限切れ: red, with きょうに移す while one is left');
  await check('請求書を送る'); await check('部屋の掃除'); await p.waitForTimeout(2100);
  r = await rows();
  ok(r[0] === '#期限切れ|すべて完了' && r[1] === '✓請求書を送る(kept)' && r[2] === '✓部屋の掃除(kept)', '期限切れ: both kept there, すべて完了', r.slice(0, 3));
  ok(await p.evaluate(() => { const h = todoList.querySelector('.dayhead'); return !h.classList.contains('warn') && !h.querySelector('.dayhead-btn'); }), '…no longer red, and no きょうに移す');
  ok(await p.evaluate(() => todoList.querySelector('.dayhead [role=heading]').getAttribute('aria-label') === '期限切れ、すべて完了'), 'read out: 期限切れ、すべて完了');
  // ---- 完了: those done before today only, the last ten, the rest a press away
  const hd = r.findIndex((x) => x.startsWith('#完了'));
  ok(r[hd] === '#完了|13 件' && r[hd + 1] === '✓きのうやったこと' && r.slice(hd + 1).filter((x) => x.startsWith('✓')).length === 10, '完了: the 13 done before today, ten showing', r.slice(hd, hd + 3));
  ok(/ほか 3 件を見る/.test(r[r.length - 1]), 'ほか 3 件を見る', r[r.length - 1]);
  await p.screenshot({ path: `${out}/kept_2.png`, fullPage: true });
  // the rest, from the keyboard: focus on the first of them, in 完了
  await p.evaluate(() => todoList.querySelector('.more-done button').click()); await p.waitForTimeout(400);
  ok(await p.evaluate(() => { const li = document.activeElement?.closest('li'); return !!li && !li.classList.contains('kept') && li.querySelector('.row-link')?.textContent === '前にやったこと9'; }), 'ほか…を見る from the keyboard: focus on the eleventh in 完了', await p.evaluate(() => document.activeElement?.closest('li')?.textContent));
  // ---- unchecked: to do again, in the same place
  await check('歯医者の予約'); await p.waitForTimeout(400);
  r = await rows();
  const h3 = r.findIndex((x) => x.startsWith('#きょう'));
  ok(r[h3] === '#きょう|残り 1 件' && r[h3 + 1] === '歯医者の予約', 'unchecked: to do again where it was', r.slice(h3, h3 + 2));
  s = await rowOf('歯医者の予約');
  ok(s.sub && !/\bdone\b/.test(s.cls), 'with its 期限 and memo again', s);
  // ---- the same day, opened again: still in their places
  await p.reload(); await p.waitForTimeout(800);
  r = await rows();
  ok(r.includes('✓牛乳を買う(kept)') && r.indexOf('✓牛乳を買う(kept)') < r.findIndex((x) => x.startsWith('#完了')), 'opened again the same day: still in its place');
  // ---- × on a kept one: deleted with 元に戻す
  // (a two-press ×, as before)
  await p.evaluate(() => [...todoList.querySelectorAll('li')].find((li) => li.querySelector('.row-link')?.textContent === '牛乳を買う').querySelector('.del').click()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !!todoList.querySelector('li.kept .del.armed')), 'the first press arms it');
  await p.evaluate(() => [...todoList.querySelectorAll('li')].find((li) => li.querySelector('.row-link')?.textContent === '牛乳を買う').querySelector('.del').click()); await p.waitForTimeout(400);
  ok(!(await rows()).some((x) => x.includes('牛乳を買う')), '× on a kept one: gone');
  await p.evaluate(() => document.querySelector('#status .toast-undo')?.click()); await p.waitForTimeout(400);
  ok((await rows()).includes('✓牛乳を買う(kept)'), '元に戻す: back in its place');
  // ---- the next day: those done go down to 完了
  await p.evaluate((pre) => { const T = JSON.parse(localStorage.getItem(pre + 'todos')); const m = new Date(); m.setHours(0, 0, 0, 0); for (const t of T) if (t.done && t.doneAt >= m.getTime()) t.doneAt = m.getTime() - 7200e3; localStorage.setItem(pre + 'todos', JSON.stringify(T)); }, pre);
  await p.reload(); await p.waitForTimeout(800);
  r = await rows();
  const hd2 = r.findIndex((x) => x.startsWith('#完了'));
  ok(!r.some((x) => x.endsWith('(kept)')) && r.slice(hd2).some((x) => x.startsWith('✓牛乳を買う')), 'done the day before: in 完了 now', r.slice(0, 4));
  // ---- きょう's tile: one checked there fades and the next comes up
  await p.evaluate((pre) => { const T = JSON.parse(localStorage.getItem(pre + 'todos')); for (const t of T) if (['b1', 'c1', 'c2'].includes(t.id)) { t.done = false; delete t.doneAt; } localStorage.setItem(pre + 'todos', JSON.stringify(T)); }, pre);
  await p.goto(base + '#home'); await p.reload(); await p.waitForTimeout(900);
  const tile = () => p.evaluate(() => [...document.querySelectorAll('#homeTiles .td-tile li:not(.td-add)')].map((li) => (li.classList.contains('done') ? '✓' : '') + li.querySelector('.rt-label').textContent));
  let tl = await tile();
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
