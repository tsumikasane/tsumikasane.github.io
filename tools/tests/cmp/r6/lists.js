// ToDo's lists (the tabs) apart from its labels: the one-time copy, making and deleting each on its own, the forms
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
  // as it was before: three labels, the tabs made of them, 買い物's tab pressed
  await p.evaluate((pre) => {
    const T = JSON.parse(localStorage.getItem('tsumikasane:todos'));
    localStorage.removeItem('tsumikasane:todos');
    localStorage.setItem(pre + 'todoLabels', JSON.stringify([{ id: 'a', name: 'やること', color: 'blue', createdAt: 1 }, { id: 'b', name: '買い物', color: 'yellow', createdAt: 2 }, { id: 'c', name: '大学', color: 'pink', createdAt: 3 }]));
    T[0].labelId = 'a'; T[2].labelId = 'b'; T[3].labelId = 'c'; T[7].labelId = 'b'; T[10].labelId = 'b';
    localStorage.setItem(pre + 'todos', JSON.stringify(T));
    localStorage.setItem(pre + 'todoTab', 'b');
  }, pre);
  await p.goto(base + '#todo'); await p.reload(); await p.waitForTimeout(900);
  const store = (n) => p.evaluate(([pre, n]) => JSON.parse(localStorage.getItem(pre + n) || '[]'), [pre, n]);
  const tabs = () => p.evaluate(() => [...todoTabs.querySelectorAll('.td-tab:not(.add)')].map((x) => [x.querySelector('.td-tab-name').textContent, x.querySelector('.td-tab-n').textContent, x.getAttribute('aria-pressed')]));
  const rows = () => p.evaluate(() => [...todoList.querySelectorAll('li:has(> .check)')].map((li) => li.querySelector('.row-link')?.textContent));
  const status = () => p.evaluate(() => [document.getElementById('sheetStatus'), document.getElementById('status')].find((x) => x.classList.contains('show'))?.textContent || '');
  const tapTab = (name) => p.evaluate((name) => [...todoTabs.querySelectorAll('.td-tab')].find((x) => x.querySelector('.td-tab-name')?.textContent === name).click(), name);

  // ---- the copy, once
  let L = await store('todoLists'), T = await store('todos'), S = await store('settings');
  ok(JSON.stringify(L) === JSON.stringify([{ id: 'a', name: 'やること', createdAt: 1 }, { id: 'b', name: '買い物', createdAt: 2 }, { id: 'c', name: '大学', createdAt: 3 }]), 'the labels copied to lists, same ids and order, no colour', L);
  ok(T.filter((t) => t.listId).map((t) => `${t.id}:${t.listId}`).join() === 't1:a,t3:b,t4:c,t8:b,d0:b', 'each ToDo with a label in that list', T.filter((t) => t.listId).map((t) => `${t.id}:${t.listId}`));
  ok(T.filter((t) => t.labelId).length === 5, 'their labels kept');
  ok(S.some((x) => x.id === 'todoListSplit'), 'a setting says it was done');
  let t = await tabs();
  ok(JSON.stringify(t) === JSON.stringify([['すべて', '10', 'false'], ['やること', '1', 'false'], ['買い物', '2', 'true'], ['大学', '1', 'false']]), 'the tabs as they were, 買い物 still pressed', t);
  ok(await p.evaluate(() => todoTabs.getAttribute('aria-label') === 'リストで分ける' && !!todoTabs.querySelector('.td-tab.add[aria-label="リストを追加"]') && todoSettings.getAttribute('aria-label') === 'リストとラベルを編集'), 'named for lists');
  ok(await p.evaluate(() => [...todoTabs.querySelectorAll('.td-tab')].every((x) => !x.getAttribute('style'))), 'the tabs have no label colour');
  // not again: a label made since with a ToDo on it doesn't become a list
  await p.evaluate((pre) => {
    const Lb = JSON.parse(localStorage.getItem(pre + 'todoLabels')); Lb.push({ id: 'x', name: '生活', color: 'green', createdAt: 9 }); localStorage.setItem(pre + 'todoLabels', JSON.stringify(Lb));
    const T = JSON.parse(localStorage.getItem(pre + 'todos')); T.find((t) => t.id === 't10').labelId = 'x'; localStorage.setItem(pre + 'todos', JSON.stringify(T));
  }, pre);
  await p.reload(); await p.waitForTimeout(800);
  L = await store('todoLists'); T = await store('todos');
  ok(L.length === 3 && !T.find((t) => t.id === 't10').listId, 'done once only: a new label stays a label', L.map((l) => l.name));
  t = await tabs();
  ok(t.length === 4 && !t.some((x) => x[0] === '生活'), 'no tab for the label 生活', t);
  await tapTab('すべて'); await p.waitForTimeout(200);
  ok((await rows()).includes('写真の整理'), '生活\'s ToDo under すべて');
  await p.screenshot({ path: `${out}/ls_tabs.png` });

  // ---- 編集: リスト over ラベル, each its own
  await p.tap('#todoSettings'); await p.waitForTimeout(500);
  let ed = await p.evaluate(() => ({ heads: [...todoLabelsGroup.querySelectorAll('.group-head')].map((x) => x.textContent), lists: [...todoListRows.querySelectorAll('li')].map((li) => [li.querySelector('input').value, !!li.querySelector('select'), !!li.querySelector('.dot')]), labels: [...todoLabelList.querySelectorAll('li input')].map((x) => x.value) }));
  ok(ed.heads.join() === 'リスト,ラベル', '編集: リスト then ラベル', ed.heads);
  ok(JSON.stringify(ed.lists) === JSON.stringify([['やること', false, false], ['買い物', false, false], ['大学', false, false]]), 'the lists: a name each, no colour', ed.lists);
  ok(ed.labels.join() === 'やること,買い物,大学,生活', 'the labels as they were', ed.labels);
  await p.screenshot({ path: `${out}/ls_edit.png`, fullPage: false });
  // a list renamed: the tab follows, the label of that name doesn't
  await p.evaluate(() => { const i = todoListRows.querySelector('li[data-id="a"] input'); i.focus(); i.value = '就活'; i.dispatchEvent(new Event('change', { bubbles: true })); i.blur(); }); await p.waitForTimeout(300);
  ok((await store('todoLists')).find((l) => l.id === 'a').name === '就活' && (await store('todoLabels')).find((l) => l.id === 'a').name === 'やること', 'a list renamed: its label as it was');
  // a label added: no list
  await p.tap('#todoLabelAdd'); await p.waitForTimeout(400);
  await p.keyboard.type('趣味'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  ok((await store('todoLabels')).length === 5 && (await store('todoLists')).length === 3, 'ラベルを追加: a label only');
  // a list added: no label
  await p.tap('#todoListAdd'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.activeElement?.value === '新しいリスト'), 'リストを追加: its name ready to type');
  await p.keyboard.type('勉強'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  L = await store('todoLists');
  ok(L.length === 4 && L[3].name === '勉強' && !('color' in L[3]) && (await store('todoLabels')).length === 5, 'リストを追加: a list only, without a colour', L[3]);
  await p.tap('#sheetDone'); await p.waitForTimeout(500);
  t = await tabs();
  ok(t.map((x) => x[0]).join() === 'すべて,就活,買い物,大学,勉強', 'the tabs: the new list last, the label 趣味 not there', t.map((x) => x[0]));
  // ＋ on the tabs: a new list, not a label
  await p.evaluate(() => todoTabs.querySelector('.td-tab.add').click()); await p.waitForTimeout(600);
  ok(await p.evaluate(() => daySheet.open && document.activeElement?.value === '新しいリスト' && todoListRows.contains(document.activeElement)), '＋: a new list, its name ready');
  await p.keyboard.type('バイト'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  await p.tap('#sheetDone'); await p.waitForTimeout(500);
  ok((await store('todoLists')).length === 5 && (await store('todoLabels')).length === 5, '＋ made a list and no label');

  // ---- the new ToDo's form: リスト over ラベル, the tab's list picked
  await tapTab('買い物'); await p.waitForTimeout(200);
  await p.tap('#todoAdd'); await p.waitForTimeout(600);
  let f = await p.evaluate(() => ({ labels: [...document.querySelectorAll('#todoForm .flabel')].map((x) => x.textContent.trim()), lists: [...todoListPick.querySelectorAll('label')].map((x) => [x.textContent, x.querySelector('input').checked]), dot: getComputedStyle(todoListPick.querySelector('label:not(.none) span'), '::before').display, pickedBg: getComputedStyle(todoListPick.querySelector('input:checked + span')).backgroundColor, todoBg: (() => { const d = document.createElement('div'); d.style.background = 'var(--f-todo)'; document.body.append(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; })() }));
  ok(f.labels.indexOf('リスト') >= 0 && f.labels.indexOf('リスト') + 1 === f.labels.indexOf('ラベル'), 'the form: リスト just over ラベル', f.labels);
  ok(JSON.stringify(f.lists.find((x) => x[1])) === JSON.stringify(['買い物', true]), 'the tab showing is the list picked', f.lists);
  ok(f.dot === 'none' && f.pickedBg === f.todoBg, 'a list\'s chip: no dot, ToDo\'s colour when picked', f);
  await p.screenshot({ path: `${out}/ls_form.png` });
  await p.fill('#todoText', '卵を買う'); await p.tap('#todoSave'); await p.waitForTimeout(500);
  T = await store('todos');
  let nt = T.find((x) => x.text === '卵を買う');
  ok(nt && nt.listId === 'b' && !nt.labelId, 'added in 買い物, with no label', nt);
  ok(/「卵を買う」を追加しました/.test(await status()), 'said as before (it shows in the tab)', await status());
  // another list picked in the same sheet: said where it went
  await p.evaluate(() => [...todoListPick.querySelectorAll('label')].find((x) => x.textContent === '大学').querySelector('input').click());
  await p.fill('#todoText', 'レポートを出す'); await p.tap('#todoSave'); await p.waitForTimeout(500);
  nt = (await store('todos')).find((x) => x.text === 'レポートを出す');
  ok(nt && nt.listId === 'c' && /「レポートを出す」を「大学」に追加しました/.test(await status()), 'another list: said where it went', [nt?.listId, await status()]);
  await p.evaluate(() => [...todoListPick.querySelectorAll('label')].find((x) => x.textContent === 'なし').querySelector('input').click());
  await p.fill('#todoText', 'メモを整理'); await p.tap('#todoSave'); await p.waitForTimeout(500);
  nt = (await store('todos')).find((x) => x.text === 'メモを整理');
  ok(nt && !nt.listId && /「すべて」に出ます/.test(await status()), 'no list from a tab: said it is under すべて', [nt?.listId, await status()]);
  await p.tap('#sheetCancel'); await p.waitForTimeout(500);
  ok((await rows()).includes('卵を買う') && !(await rows()).includes('レポートを出す'), '買い物 shows its new one only');
  // under すべて the form starts with no list
  await tapTab('すべて'); await p.waitForTimeout(200);
  await p.tap('#todoAdd'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => todoListPick.querySelector('input:checked')?.value === ''), 'under すべて: なし picked');
  await p.tap('#sheetCancel'); await p.waitForTimeout(500);

  // ---- the edit form: its list, apart from its label
  await p.evaluate(() => [...todoList.querySelectorAll('.row-link')].find((x) => x.textContent === '請求書を送る').click()); await p.waitForTimeout(600);
  f = await p.evaluate(() => ({ list: reLists.querySelector('input:checked')?.value, label: reLabels.querySelector('input:checked')?.value, heads: [...recForm.querySelectorAll('.flabel')].map((x) => x.textContent.trim()) }));
  ok(f.list === 'a' && f.label === 'a' && f.heads.indexOf('リスト') + 1 === f.heads.indexOf('ラベル'), 'edit: its list and its label', f);
  await p.screenshot({ path: `${out}/ls_rec.png` });
  await p.evaluate(() => [...reLists.querySelectorAll('label')].find((x) => x.textContent === '勉強').querySelector('input').click());
  await p.tap('#recSave'); await p.waitForTimeout(500);
  nt = (await store('todos')).find((x) => x.id === 't1');
  ok(nt.listId === (await store('todoLists')).find((l) => l.name === '勉強').id && nt.labelId === 'a', 'saved: in 勉強, its label やること still', nt);
  // and its list taken off: なし
  await p.evaluate(() => [...todoList.querySelectorAll('.row-link')].find((x) => x.textContent === '請求書を送る').click()); await p.waitForTimeout(600);
  await p.evaluate(() => [...reLists.querySelectorAll('label')].find((x) => x.textContent === 'なし').querySelector('input').click());
  await p.tap('#recSave'); await p.waitForTimeout(500);
  nt = (await store('todos')).find((x) => x.id === 't1');
  ok(!nt.listId && nt.labelId === 'a', 'its list taken off, its label kept', nt);

  // ---- a repeat's next turn stays in its list
  await p.evaluate(() => [...todoList.querySelectorAll('li')].find((x) => x.textContent.includes('ゴミ出し')).querySelector('.check').click()); await p.waitForTimeout(1600);
  T = await store('todos');
  const turn = T.find((x) => x.text.startsWith('ゴミ出し') && !x.done);
  ok(turn && turn.listId === 'c', 'a repeat\'s next turn in the same list', turn);
  // a copy keeps it
  await p.evaluate(() => [...todoList.querySelectorAll('.row-link')].find((x) => x.textContent === '本を返す').click()); await p.waitForTimeout(600);
  await p.tap('#recCopy'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => todoListPick.querySelector('input:checked')?.value === 'b'), 'このToDoを複製: its list picked');
  await p.tap('#sheetCancel'); await p.waitForTimeout(500);
  if (await p.evaluate(() => daySheet.open)) { await p.tap('#sheetCancel'); await p.waitForTimeout(500); }

  // ---- a list deleted: its tab goes, its ToDos stay (under すべて), labels untouched, 元に戻す brings it back
  await tapTab('大学'); await p.waitForTimeout(200);
  await p.tap('#todoSettings'); await p.waitForTimeout(500);
  await p.evaluate(() => todoListRows.querySelector('li[data-id="c"] .del').click()); await p.waitForTimeout(300);
  ok(/「大学」はToDo 3 件で使っています。もう一度押すと削除し、そのToDoはリストなしになります/.test(await status()), 'the first press says what it holds', await status());
  await p.evaluate(() => todoListRows.querySelector('li[data-id="c"] .del').click()); await p.waitForTimeout(400);
  ok(/リスト「大学」を削除しました。ToDo 3 件はリストなしになりました/.test(await status()), 'deleted, said so', await status());
  ok(!(await store('todoLists')).some((l) => l.id === 'c') && (await store('todoLabels')).some((l) => l.id === 'c'), 'the list gone, the label 大学 still there');
  await p.tap('#sheetDone'); await p.waitForTimeout(500);
  t = await tabs();
  ok(t[0][2] === 'true' && !t.some((x) => x[0] === '大学'), 'its tab gone: すべて', t);
  ok((await rows()).includes('レポートを出す'), 'its ToDos under すべて');
  // the label deleted: the tabs as they are
  await p.tap('#todoSettings'); await p.waitForTimeout(500);
  await p.evaluate(() => { todoLabelList.querySelector('li[data-id="b"] .del').click(); todoLabelList.querySelector('li[data-id="b"] .del').click(); }); await p.waitForTimeout(400);
  await p.tap('#sheetDone'); await p.waitForTimeout(500);
  t = await tabs();
  ok(t.some((x) => x[0] === '買い物') && !(await store('todoLabels')).some((l) => l.id === 'b'), 'the label 買い物 deleted: its tab stays', t.map((x) => x[0]));
  await tapTab('買い物'); await p.waitForTimeout(200);
  ok((await rows()).includes('歯医者の予約をする'), 'and its ToDos with it');
  // その他 names the list
  await p.tap('#todoMore'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => todoMenuMsg.textContent === 'ToDo（買い物）'), 'その他: the list\'s name');
  await p.evaluate(() => todoMenuNo.click()); await p.waitForTimeout(300);
  // a list with nothing in it
  await tapTab('バイト'); await p.waitForTimeout(200);
  ok(/「バイト」のToDoは\s*まだありません/.test(await p.evaluate(() => todoList.textContent)), 'an empty list says so', await p.evaluate(() => todoList.textContent));
  await p.screenshot({ path: `${out}/ls_empty.png` });
  // from きょう's tile, a tab pressed on ToDo's page: no list, and nothing said of tabs
  await tapTab('買い物'); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('nav button[data-tab="home"], [data-tab="home"]')?.click()); await p.waitForTimeout(700);
  const tile = await p.evaluate(() => !!document.querySelector('#homeTiles .td-add button'));
  ok(tile, 'きょう has the ToDo tile\'s ToDoを追加');
  if (tile) {
    await p.evaluate(() => document.querySelector('#homeTiles .td-add button').click()); await p.waitForTimeout(600);
    ok(await p.evaluate(() => todoListPick.querySelector('input:checked')?.value === ''), 'from きょう: no list picked');
    await p.fill('#todoText', 'タイルから'); await p.tap('#todoSave'); await p.waitForTimeout(500);
    const st = await status();
    ok(/「タイルから」を追加しました/.test(st) && !/すべて|「/.test(st.replace('「タイルから」', '')), 'from きょう: said plainly', st);
    nt = (await store('todos')).find((x) => x.text === 'タイルから');
    ok(nt && !nt.listId, 'from きょう: in no list', nt);
  }
  console.log('errors', JSON.stringify(errors));
  console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await b.close();
})();
