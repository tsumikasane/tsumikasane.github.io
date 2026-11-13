const { chromium } = require('playwright');
const path = require('path');
const seed = require(path.join(__dirname, '..', 'todoseed.js'));
let fails = 0;
const ok = (c, m, x) => { if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + m + (x !== undefined ? ': ' + (typeof x === 'string' ? x : JSON.stringify(x)) : '')); };
(async () => {
  const out = process.argv[2], base = process.argv[3] || 'http://localhost:8765/', pre = process.argv[4] || 'tsumikasane:';
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
  const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(base); await p.evaluate(() => localStorage.clear()); await seed(p);
  await p.evaluate((pre) => {
    const T = JSON.parse(localStorage.getItem('tsumikasane:todos'));
    localStorage.removeItem('tsumikasane:todos');
    localStorage.setItem(pre + 'todoLabels', JSON.stringify([{ id: 'a', name: 'やること', color: 'blue', createdAt: 1 }, { id: 'b', name: '買い物', color: 'yellow', createdAt: 2 }, { id: 'c', name: '大学', color: 'pink', createdAt: 3 }]));
    T[0].labelId = 'a'; T[2].labelId = 'b'; T[3].labelId = 'c'; T[7].labelId = 'b'; T[10].labelId = 'b'; // (T[10]: a done one)
    localStorage.setItem(pre + 'todos', JSON.stringify(T));
  }, pre);
  await p.goto(base + '#todo'); await p.reload(); await p.waitForTimeout(800);
  const tabs = () => p.evaluate(() => [...todoTabs.querySelectorAll('.td-tab:not(.add)')].map((x) => [x.querySelector('.td-tab-name').textContent, x.querySelector('.td-tab-n').textContent, x.getAttribute('aria-pressed')]));
  const rows = () => p.evaluate(() => [...todoList.querySelectorAll('li:has(> .check)')].map((li) => li.querySelector('.text, .row-link')?.textContent));
  let t = await tabs();
  ok(JSON.stringify(t) === JSON.stringify([['すべて', '10', 'true'], ['やること', '1', 'false'], ['買い物', '2', 'false'], ['大学', '1', 'false']]), 'tabs: すべて and each label with how many are to do', t);
  ok(await p.evaluate(() => !!todoTabs.querySelector('.td-tab.add[aria-label="リストを追加"]')), 'a ＋ tab at the end');
  ok(await p.evaluate(() => !document.getElementById('clearDone') && !document.getElementById('todoTrashCard') && !document.querySelector('#sec-todo .title-row #todoSettings')), 'the foot\'s buttons and the gear by ＋ gone');
  ok(await p.evaluate(() => todoSettings.textContent.trim() === '編集' && todoMore.textContent.trim() === 'その他'), '編集 and その他 under the tabs');
  // rows: × only on done ones; tints on labelled ones still to do; a calendar's mark before a 期限
  const r = await p.evaluate(() => [...todoList.querySelectorAll('li:has(> .check)')].map((li) => ({ done: li.classList.contains('done'), del: !!li.querySelector(':scope > .del'), tint: li.classList.contains('tinted'), cal: !!li.querySelector('.td-cal'), t: li.querySelector('.row-link')?.textContent })));
  ok(r.filter((x) => !x.done).every((x) => !x.del) && r.filter((x) => x.done).every((x) => x.del), '× on the done rows only', r.map((x) => [x.t, x.done, x.del]).slice(0, 3));
  ok(r.filter((x) => x.tint).map((x) => x.t).join() === '請求書を送る,歯医者の予約をする,ゴミ出し（燃えるゴミ）,本を返す,洗濯', 'labelled rows in their colour, a done one too', r.filter((x) => x.tint).map((x) => x.t));
  ok(r.find((x) => x.t === '請求書を送る').cal && r.find((x) => x.t === '家賃の振り込み').cal && !r.find((x) => x.t === '本を返す').cal, 'a calendar\'s mark before a 期限 (none without one)');
  await p.screenshot({ path: `${out}/td_all.png` });
  // a tab: its ToDos only, and kept
  await p.evaluate(() => [...todoTabs.querySelectorAll('.td-tab')].find((x) => x.textContent.startsWith('買い物')).click()); await p.waitForTimeout(300);
  t = await tabs();
  let rs = await rows();
  ok(t[2][2] === 'true' && t[0][2] === 'false', '買い物 pressed', t);
  ok(rs.join() === '歯医者の予約をする,本を返す,洗濯' || rs.join() === '歯医者の予約をする,本を返す,' + rs[2], '買い物: its own ToDos only (a done one too)', rs);
  await p.screenshot({ path: `${out}/td_tab.png` });
  await p.reload(); await p.waitForTimeout(700);
  ok((await tabs())[2][2] === 'true' && (await rows()).length === rs.length, 'kept as the page opens again');
  // その他 in a tab: 最近削除したToDo, and the tab's done ones deleted
  await p.tap('#todoMore'); await p.waitForTimeout(300);
  let menu = await p.evaluate(() => ({ open: todoMenu.open, msg: todoMenuMsg.textContent, items: [...todoMenuGroup.querySelectorAll('button')].map((x) => x.textContent) }));
  ok(menu.open && menu.msg === 'ToDo（買い物）' && menu.items.join() === '最近削除したToDo,完了した 1 件を削除', 'その他 under 買い物: its done one only', menu);
  await p.screenshot({ path: `${out}/td_more.png` });
  await p.tap('#todoMenuGroup .ask-btn.danger'); await p.waitForTimeout(500);
  const left = await p.evaluate((pre) => JSON.parse(localStorage.getItem(pre + 'todos')).filter((x) => x.done).length, pre);
  ok(left === 13 && /完了したToDoを 1 件削除しました/.test(await p.evaluate(() => document.getElementById('status').textContent)), 'deleted: that one alone, said with 元に戻す', left);
  // すべて: その他 counts them all; 最近削除したToDo opens its page
  await p.evaluate(() => todoTabs.querySelector('.td-tab').click()); await p.waitForTimeout(300);
  await p.tap('#todoMore'); await p.waitForTimeout(300);
  menu = await p.evaluate(() => [...todoMenuGroup.querySelectorAll('button')].map((x) => x.textContent));
  ok(menu.join() === '最近削除したToDo（1 件）,完了した 13 件を削除', 'その他 under すべて', menu);
  await p.evaluate(() => todoMenuGroup.querySelector('.ask-btn').click()); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.documentElement.dataset.tab === 'trash'), '最近削除したToDo: its page');
  await p.goto(base + '#todo'); await p.reload(); await p.waitForTimeout(700);
  // 編集: the labels' settings
  await p.tap('#todoSettings'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => daySheet.open && !todoLabelsGroup.hidden), '編集: ToDo\'s labels in the sheet');
  await p.tap('#sheetDone'); await p.waitForTimeout(500);
  // ＋: a new label, its name ready to type
  await p.evaluate(() => todoTabs.querySelector('.td-tab.add').click()); await p.waitForTimeout(600);
  const nl = await p.evaluate(() => ({ open: daySheet.open, focus: document.activeElement?.value, n: document.querySelectorAll('#todoListRows li').length }));
  ok(nl.open && nl.focus === '新しいリスト' && nl.n === 4, '＋: a new list in the settings, its name ready', nl);
  await p.keyboard.type('バイト'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  await p.tap('#sheetDone'); await p.waitForTimeout(500);
  t = await tabs();
  ok(t.length === 5 && t[4][0] === 'バイト' && t[4][1] === '0', 'its tab, after the others', t);
  // a tab whose list is deleted: すべて again
  await p.evaluate(() => [...todoTabs.querySelectorAll('.td-tab')].find((x) => x.textContent.startsWith('大学')).click()); await p.waitForTimeout(200);
  await p.evaluate((pre) => { const L = JSON.parse(localStorage.getItem(pre + 'todoLists')).filter((l) => l.id !== 'c'); localStorage.setItem(pre + 'todoLists', JSON.stringify(L)); }, pre);
  await p.reload(); await p.waitForTimeout(700);
  ok((await tabs())[0][2] === 'true' && !(await tabs()).some((x) => x[0] === '大学'), 'its list gone: すべて', await tabs());
  // looking for words: within the tab
  await p.evaluate(() => [...todoTabs.querySelectorAll('.td-tab')].find((x) => x.textContent.startsWith('買い物')).click()); await p.waitForTimeout(200);
  await p.fill('#todoSearch', '歯医者'); await p.waitForTimeout(300);
  ok((await rows()).join() === '歯医者の予約をする', 'words looked for, within the tab');
  await p.fill('#todoSearch', '家賃'); await p.waitForTimeout(300);
  ok(/合うToDoはありません/.test(await p.evaluate(() => todoList.textContent)), 'not in the tab: none');
  await p.fill('#todoSearch', ''); await p.waitForTimeout(200);
  // one still to do goes from its menu (held down)
  await p.evaluate(() => todoTabs.querySelector('.td-tab').click()); await p.waitForTimeout(200);
  await p.evaluate(() => { const li = [...todoList.querySelectorAll('li')].find((x) => x.textContent.includes('写真の整理')); li.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => todoMenu.open && [...todoMenuGroup.querySelectorAll('button')].some((x) => x.textContent === '削除')), 'one still to do: 削除 in its menu, held down');
  await p.evaluate(() => [...todoMenuGroup.querySelectorAll('button')].find((x) => x.textContent === '削除').click()); await p.waitForTimeout(500);
  ok(!(await rows()).includes('写真の整理'), 'and it goes');
  // a repeat still to do: この回を削除 from its menu too (the next turn stays)
  await p.evaluate(() => { const li = [...todoList.querySelectorAll('li')].find((x) => x.textContent.includes('ゴミ出し')); li.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); }); await p.waitForTimeout(300);
  const before = await p.evaluate((pre) => JSON.parse(localStorage.getItem(pre + 'todos')).find((x) => x.text.startsWith('ゴミ出し') && !x.done)?.due, pre);
  ok(await p.evaluate(() => [...todoMenuGroup.querySelectorAll('button')].some((x) => x.textContent.startsWith('この回を削除'))), 'a repeat: この回を削除 in its menu');
  await p.evaluate(() => [...todoMenuGroup.querySelectorAll('button')].find((x) => x.textContent.startsWith('この回を削除')).click()); await p.waitForTimeout(500);
  const after = await p.evaluate((pre) => JSON.parse(localStorage.getItem(pre + 'todos')).find((x) => x.text.startsWith('ゴミ出し') && !x.done)?.due, pre);
  ok(before && after && after > before, 'この回を削除: on to its next turn', { before, after });
  console.log('errors', JSON.stringify(errors));
  console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await b.close();
})();
