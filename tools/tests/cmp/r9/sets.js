// 筋トレ: 重さ・回数が異なるセット (as a gym's app the user showed)
const { chromium } = require('playwright');
let fails = 0;
const ok = (c, m, x) => { if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + m + (x !== undefined ? ': ' + (typeof x === 'string' ? x : JSON.stringify(x)) : '')); };
(async () => {
  const out = process.argv[2], base = process.argv[3] || 'http://localhost:8765/', pre = process.argv[4] || 'tsumikasane:';
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(base); await p.evaluate(() => localStorage.clear());
  await p.goto(base + '#workout'); await p.reload(); await p.waitForTimeout(900);
  const recs = () => p.evaluate((pre) => JSON.parse(localStorage.getItem(pre + 'workouts') || '[]'), pre);
  const vis = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return !!e && !!(e.offsetWidth || e.getClientRects().length); }, sel);
  const sets = () => p.evaluate(() => [...document.querySelectorAll('#woEachBox .wo-set')].map((r) => [r.querySelector('.wo-set-head span').textContent, r.querySelector('.wo-set-kg').value, r.querySelector('.wo-set-reps').value]));
  await p.selectOption('#woType', '筋トレ'); await p.waitForTimeout(200);
  ok(await vis('#woEachAdd') && !(await vis('#woEachBox .wo-set')), 'the link under セット数, no sets yet');
  await p.fill('#woExercise', 'ショルダープレス'); await p.fill('#woWeight', '20'); await p.fill('#woReps', '10'); await p.fill('#woSets', '3');
  await p.screenshot({ path: `${out}/sets_0.png` });
  // ---- the link: the sets one by one, as the fields had them
  await p.tap('#woEachAdd'); await p.waitForTimeout(300);
  let s = await sets();
  ok(JSON.stringify(s) === JSON.stringify([['1セット目', '20', '10'], ['2セット目', '20', '10'], ['3セット目', '20', '10']]), 'three sets as the fields had them', s);
  ok(!(await vis('#woWeight')) && !(await vis('#woSets')) && !(await vis('#woEachAdd')) && await vis('#woEachBox .wo-each-plus'), 'the fields and the link away, ＋ under the sets');
  ok(await p.evaluate(() => document.activeElement === document.querySelector('#woEachBox .wo-set-kg')), 'focus on 1セット目の重さ');
  ok(await p.evaluate(() => document.getElementById('woReps').disabled && document.getElementById('woSets').disabled), 'the hidden fields switched off');
  // ---- each its own
  const setVal = (i, kg, reps) => p.evaluate(([i, kg, reps]) => { const r = document.querySelectorAll('#woEachBox .wo-set')[i]; for (const [c, v] of [['.wo-set-kg', kg], ['.wo-set-reps', reps]]) { const x = r.querySelector(c); x.value = v; x.dispatchEvent(new Event('input', { bubbles: true })); } }, [i, kg, reps]);
  await setVal(1, '25', '8'); await setVal(2, '30', '6');
  await p.tap('#woEachBox .wo-each-plus'); await p.waitForTimeout(200);
  s = await sets();
  ok(s.length === 4 && s[3][0] === '4セット目' && s[3][1] === '30' && s[3][2] === '6', '＋: a fourth, as the third', s[3]);
  ok(await p.evaluate(() => document.activeElement === document.querySelectorAll('#woEachBox .wo-set-kg')[3]), 'focus on its 重さ');
  await p.screenshot({ path: `${out}/sets_1.png` });
  await p.evaluate(() => document.querySelectorAll('#woEachBox .wo-set-del')[3].click()); await p.waitForTimeout(200);
  s = await sets();
  ok(s.length === 3 && s[2][0] === '3セット目', '×: the fourth gone', s);
  // remove the second: renumbered
  await p.evaluate(() => document.querySelectorAll('#woEachBox .wo-set-del')[1].click()); await p.waitForTimeout(200);
  s = await sets();
  ok(JSON.stringify(s) === JSON.stringify([['1セット目', '20', '10'], ['2セット目', '30', '6']]), '× on the second: the rest renumbered', s);
  await p.tap('#woEachBox .wo-each-plus'); await p.waitForTimeout(200);
  await setVal(1, '25', '8'); await setVal(2, '30', '6');
  // ---- added
  await p.tap('#workoutForm button[type="submit"]'); await p.waitForTimeout(500);
  let r = (await recs())[0];
  ok(r && r.exercise === 'ショルダープレス' && r.sets === 3 && r.reps === 10 && r.kg === 20 && JSON.stringify(r.setList) === JSON.stringify([{ kg: 20, reps: 10 }, { kg: 25, reps: 8 }, { kg: 30, reps: 6 }]), 'saved: each set with its own', r);
  const line = await p.evaluate(() => document.querySelector('#workoutList .row-link')?.textContent);
  ok(line === 'ショルダープレス・20 kg × 10 回、25 kg × 8 回、30 kg × 6 回', 'its row says each', line);
  ok(await vis('#woWeight') && await vis('#woEachAdd') && !(await vis('#woEachBox .wo-set')) && await p.evaluate(() => document.getElementById('woEach').value === ''), 'the form back to the fields, empty');
  ok(/筋トレ\s3\sセット/.test(await p.evaluate(() => document.getElementById('workoutTotal').textContent)), 'the day: 筋トレ 3 セット');
  await p.screenshot({ path: `${out}/sets_2.png` });
  // ---- alike in a row said once
  await p.fill('#woExercise', 'ベンチプレス'); await p.fill('#woWeight', '60'); await p.fill('#woReps', '10'); await p.fill('#woSets', '3');
  await p.tap('#woEachAdd'); await p.waitForTimeout(200); await setVal(2, '50', '12');
  await p.tap('#workoutForm button[type="submit"]'); await p.waitForTimeout(500);
  const line2 = await p.evaluate(() => [...document.querySelectorAll('#workoutList .row-link')].map((x) => x.textContent)[1]);
  ok(line2 === 'ベンチプレス・60 kg × 10 回 × 2 セット、50 kg × 12 回', 'two alike said as one', line2);
  // all the same: kept as the fields would
  await p.fill('#woExercise', 'レッグプレス'); await p.fill('#woWeight', '80'); await p.fill('#woReps', '10'); await p.fill('#woSets', '2');
  await p.tap('#woEachAdd'); await p.waitForTimeout(200);
  await p.tap('#workoutForm button[type="submit"]'); await p.waitForTimeout(500);
  r = (await recs()).find((x) => x.exercise === 'レッグプレス');
  ok(r && r.sets === 2 && r.reps === 10 && r.kg === 80 && !('setList' in r), 'the same throughout: no setList', r);
  // 秒, for all at once
  await p.fill('#woExercise', 'プランク'); await p.fill('#woWeight', ''); await p.fill('#woReps', '30'); await p.fill('#woSets', '2');
  await p.tap('#woEachAdd'); await p.waitForTimeout(200);
  await p.selectOption('#woEachBox .wo-set:nth-of-type(2) .wo-set-per', 'sec'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => [...document.querySelectorAll('#woEachBox .wo-set-per')].every((x) => x.value === 'sec') && [...document.querySelectorAll('#woEachBox .wo-set-unit')].every((x) => x.textContent === '秒数')), '秒 for every set');
  await setVal(1, '', '45');
  await p.tap('#workoutForm button[type="submit"]'); await p.waitForTimeout(500);
  r = (await recs()).find((x) => x.exercise === 'プランク');
  ok(r && r.per === 'sec' && JSON.stringify(r.setList) === JSON.stringify([{ reps: 30 }, { reps: 45 }]) && !r.kg, 'saved in 秒, no 重さ', r);
  ok(await p.evaluate(() => document.getElementById('woPer').value === ''), '回 again for the next');
  // an empty 回数 stops it, focused there
  await p.fill('#woExercise', 'ラットプルダウン'); await p.fill('#woReps', '10'); await p.fill('#woSets', '2');
  await p.tap('#woEachAdd'); await p.waitForTimeout(200); await setVal(1, '40', '');
  const n0 = (await recs()).length;
  await p.evaluate(() => document.getElementById('workoutForm').requestSubmit()); await p.waitForTimeout(300);
  ok((await recs()).length === n0, 'a set without its 回数: not added');
  // ---- a draft keeps the sets
  await setVal(1, '40', '9');
  await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await p.reload(); await p.waitForTimeout(1000);
  s = await sets();
  ok(JSON.stringify(s) === JSON.stringify([['1セット目', '', '10'], ['2セット目', '40', '9']]) && !(await vis('#woWeight')), 'opened again: the sets as they were', s);
  await p.evaluate(() => document.querySelectorAll('#woEachBox .wo-set-del')[1].click()); await p.waitForTimeout(150);
  await p.evaluate(() => document.querySelectorAll('#woEachBox .wo-set-del')[0].click()); await p.waitForTimeout(150);
  ok(await vis('#woWeight') && await p.evaluate(() => document.getElementById('woReps').value === '10' && document.getElementById('woSets').value === '1' && !document.getElementById('woReps').disabled), '× on the last one: the fields back, holding it, セット数 1');
  // ---- another kind while the sets are open: not in the way
  await p.tap('#woEachAdd'); await p.waitForTimeout(150); await setVal(0, '', '');
  await p.selectOption('#woType', 'ランニング'); await p.fill('#woMin', '30'); await p.fill('#woDist', '5');
  await p.evaluate(() => document.getElementById('workoutForm').requestSubmit()); await p.waitForTimeout(500);
  ok((await recs()).some((x) => x.type === 'ランニング' && x.minutes === 30), 'ランニング added while 筋トレ\'s sets were open');
  await p.selectOption('#woType', '筋トレ'); await p.waitForTimeout(150);
  // ---- its edit form: the sets, changed there
  await p.evaluate(() => [...document.querySelectorAll('#workoutList .row-link')].find((x) => x.textContent.startsWith('ショルダープレス')).click()); await p.waitForTimeout(600);
  const ed = await p.evaluate(() => [...document.querySelectorAll('#recForm .wo-set')].map((r) => [r.querySelector('.wo-set-kg').value, r.querySelector('.wo-set-reps').value]));
  ok(JSON.stringify(ed) === JSON.stringify([['20', '10'], ['25', '8'], ['30', '6']]) && await p.evaluate(() => document.getElementById('reWeight').disabled), 'edit: its sets one by one', ed);
  await p.screenshot({ path: `${out}/sets_edit.png` });
  await p.evaluate(() => { const x = document.querySelectorAll('#recForm .wo-set-reps')[0]; x.value = '12'; x.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.tap('#recSave'); await p.waitForTimeout(500);
  r = (await recs()).find((x) => x.exercise === 'ショルダープレス');
  ok(JSON.stringify(r.setList) === JSON.stringify([{ kg: 20, reps: 12 }, { kg: 25, reps: 8 }, { kg: 30, reps: 6 }]) && r.reps === 12, 'saved from the edit form', r);
  // down to one there: the fields, then saved without setList
  await p.evaluate(() => [...document.querySelectorAll('#workoutList .row-link')].find((x) => x.textContent.startsWith('ショルダープレス')).click()); await p.waitForTimeout(600);
  for (let i = 0; i < 2; i++) { await p.evaluate(() => document.querySelectorAll('#recForm .wo-set-del')[1].click()); await p.waitForTimeout(150); }
  await p.evaluate(() => document.querySelectorAll('#recForm .wo-set-del')[0].click()); await p.waitForTimeout(150);
  ok(await p.evaluate(() => !document.getElementById('reWeight').disabled && document.getElementById('reWeight').value === '20' && document.getElementById('reReps').value === '12' && document.getElementById('reSets').value === '1'), 'edit: the last set gives the fields back');
  await p.fill('#reSets', '3');
  await p.tap('#recSave'); await p.waitForTimeout(500);
  r = (await recs()).find((x) => x.exercise === 'ショルダープレス');
  ok(r.sets === 3 && r.reps === 12 && r.kg === 20 && !r.setList, 'saved as the fields: setList gone', r);
  // a menu's move put in: the fields, not the sets
  await p.tap('#woEachAdd'); await p.waitForTimeout(150);
  await p.evaluate(() => document.querySelector('#woMenu li .row-btn, #woMenu li button')?.click()); await p.waitForTimeout(300);
  console.log('menu press →', await p.evaluate(() => ({ box: document.getElementById('woEachBox').hidden, ex: document.getElementById('woExercise').value })));
  console.log('errors', JSON.stringify(errors));
  console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await b.close();
})();
