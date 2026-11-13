// ToDo その2 ①〜⑩ (on the hooked copy at 8770)
process.env.URL0 = process.env.URL0 || "http://localhost:8770/";
const { chromium } = require("playwright");
const { phone, seed, at, P, URL0 } = require("./lib");
const { make, T, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const todo = async (p, id) => (await ls(p, "todos")).find((t) => t.id === id);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id) || null;
const sheetOpen = (p) => p.evaluate(() => document.getElementById("daySheet").open);
const closeSheet = async (p) => { for (let i = 0; i < 3 && await sheetOpen(p); i++) { if (await p.isVisible("#sheetDone")) await p.click("#sheetDone"); else await p.keyboard.press("Escape"); await p.waitForTimeout(600); } };
const check = (p, id) => p.click(`#todoList button.check[data-check="${id}"]`);
const more = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(250); await p.locator("#todoMenuGroup .ask-btn", { hasText: words }).click(); await p.waitForTimeout(600); };
const order = (p) => p.evaluate(() => [...document.querySelectorAll("#todoList > li .row-link")].map((x) => x.textContent));
async function open(data = make(), when = "10:00", hash = "todo") { const p = await phone(b, at(when, today), { deviceScaleFactor: 1 }); await seed(p, data, hash); await p.waitForTimeout(900); return p; }
let b;

(async () => {
  b = await chromium.launch();
  let p = await open();
  ok(!p.errs.length, "the page opens, no error", p.errs);
  // ④⑤⑥ on the rows, ⑥ 待ち
  const list = await txt(p, "#todoList");
  ok(list.includes("数学の課題 30 分・ 数学") || /数学の課題 30 分.*数学/.test(list), "④ a 科目 on its row", list);
  ok(list.includes("電気代を払う 5,000 円"), "⑤ a 金額 on its row");
  ok(/待ち 1 件 先生にメール あしたまで・? ?待ち 3日目・先生の返事/.test(list) || (list.includes("待ち 1 件 先生にメール") && list.includes("待ち 3日目・先生の返事")), "⑥ 待ち: its heading, how long", list);
  // ⑥ from the row's menu: set and let go, with 元に戻す
  await p.locator("#todoList > li", { hasText: "レポートを出す" }).dispatchEvent("contextmenu"); await p.waitForTimeout(250);
  await p.locator("#todoMenuGroup .ask-btn", { hasText: "返事待ちにする" }).click(); await p.waitForTimeout(400);
  let r = await todo(p, "c");
  ok(r.wait?.since === today && r.wait.days === 3 && (await toast(p)).includes("返事待ちにしました。3日後に確認のお知らせ"), "⑥ 返事待ちにする: since today, 3 days", r.wait);
  ok((await txt(p, "#todoList")).includes("待ち 2 件"), "⑥ it is under 待ち");
  await p.locator("#todoList > li", { hasText: "レポートを出す" }).dispatchEvent("contextmenu"); await p.waitForTimeout(250);
  await p.locator("#todoMenuGroup .ask-btn", { hasText: "返事待ちをやめる" }).click(); await p.waitForTimeout(400);
  ok(!(await todo(p, "c")).wait, "⑥ 返事待ちをやめる");
  // ⑥ the edit form: what is waited for, and when
  await p.locator("#todoList .row-link", { hasText: "先生にメール" }).click(); await p.waitForTimeout(600);
  ok(await p.isChecked("#reWait") && await p.inputValue("#reWaitWho") === "先生の返事" && await p.inputValue("#reWaitDays") === "3", "⑥ its form");
  await p.fill("#reWaitWho", "教授の返事"); await p.selectOption("#reWaitDays", "2");
  await p.click("#recSave"); await p.waitForTimeout(500);
  r = await todo(p, "d");
  ok(r.wait.who === "教授の返事" && r.wait.days === 2 && r.wait.since === "2026-11-09", "⑥ kept, since as it was", r.wait);
  let al = await p.evaluate(() => window.__td.alarms(Date.now()).filter((a) => a.tag.startsWith("td-wait:")));
  ok(al.length === 3 && al[0].tag === "td-wait:d:2026-11-13" && al[1].tag === "td-wait:d:2026-11-15" && al[0].body === "教授の返事を待って 4 日です。確認してみましょう" && al[0].title === "返事待ち：先生にメール", "⑥ told to look again every 2 days from 11/9 (the next three; 11/11 9:00 gone by)", al.map((a) => a.tag + " " + a.body));
  // ① 朝のまとめのお知らせ
  await p.click("#todoSettings"); await p.waitForTimeout(600);
  ok(await p.isVisible("#tdMorningForm") && !(await p.isChecked("#tdMorningOn")) && (await txt(p, "#tdMorningFoot")).includes("毎朝、その日までの期限のToDo"), "① in 編集, off at first");
  await p.click("#tdMorningOn"); await p.waitForTimeout(200);
  await p.fill("#tdMorningAt", "07:00"); await p.dispatchEvent("#tdMorningAt", "change"); await p.waitForTimeout(200);
  ok((await setting(p, "tdMorning"))?.on === true && (await setting(p, "tdMorning")).at === "07:00", "① kept");
  await closeSheet(p);
  al = await p.evaluate(() => window.__td.alarms(Date.now()));
  const mo = al.filter((a) => a.tag.startsWith("td-morning:"));
  ok(mo.length >= 5 && mo[0].tag === "td-morning:2026-11-12" && mo[0].title === "きょうのToDo 5件（期限切れ 4件）" && mo[0].body.startsWith("ESを書く、レポートを出す、数学の課題、電気代を払う") && mo[0].url === "./#todo:pick", // (2026-11-11 きょうやるを朝に選ぶ: the morning's opens the sheet to pick)
    "① the next morning (today's 7:00 has gone): what is due by then, those past their 期限 said, the waiting one left out", mo[0]);
  const sig0 = await p.evaluate(() => window.__td.sig());
  // ⑤ 家計簿: done, in 家計簿; checked back on, taken back
  await check(p, "b"); await p.waitForTimeout(300);
  let ex = await ls(p, "expenses");
  r = await todo(p, "b");
  ok(ex.length === 1 && ex[0].amount === 5000 && ex[0].category === "水道光熱費" && ex[0].kind === "out" && ex[0].date === today && ex[0].memo === "電気代を払う" && r.exMade === ex[0].id, "⑤ done: 5,000 円 in 家計簿", ex);
  ok((await toast(p)).includes("「電気代を払う」を完了しました。家計簿に 5,000 円（水道光熱費）を記録しました"), "⑤ said", await toast(p));
  ok(await p.evaluate(() => window.__td.sig()) !== sig0, "① sent again as one is done");
  await check(p, "b"); await p.waitForTimeout(300);
  ok((await ls(p, "expenses")).length === 0 && !(await todo(p, "b")).exMade && !(await todo(p, "b")).done, "⑤ checked back on: taken back");
  // ④⑦ 勉強: the focus timer's time in 勉強, then done: no more (it is there already), the time against the guess
  await p.evaluate(() => window.__td.credit("a", 25)); await p.waitForTimeout(400);
  let st = await ls(p, "study");
  ok(st.length === 1 && st[0].minutes === 25 && st[0].subjectId === "sb1" && st[0].date === today && (await todo(p, "a")).studied === 25 && (await todo(p, "a")).focus === 25, "④ the focus timer's 25 minutes in 勉強 (数学)", st);
  ok((await toast(p)).includes("勉強（数学）に 25 分を記録しました"), "④ said", await toast(p));
  await p.evaluate(() => window.__td.credit("a", 20)); await p.waitForTimeout(300);
  await check(p, "a"); await p.waitForTimeout(300);
  st = await ls(p, "study");
  ok(st.length === 2 && (await todo(p, "a")).studied === 45 && !(await todo(p, "a")).studyMade, "④ done after the timer: nothing more in 勉強");
  ok((await toast(p)).includes("見積もり 30 分 → 実際 45 分"), "⑦ done: the time thought against the time it took", await toast(p));
  // ④ done with no timer: its かかる時間 in 勉強; back on, taken back
  await check(p, "a"); await p.waitForTimeout(300);
  const F = make(); F.todos.find((t) => t.id === "f").due = today;
  await p.close();
  p = await open(F);
  await check(p, "f"); await p.waitForTimeout(300);
  st = await ls(p, "study");
  ok(st.length === 1 && st[0].minutes === 20 && st[0].subjectId === "sb2" && (await todo(p, "f")).studyMade === st[0].id && (await toast(p)).includes("勉強（英語）に 20 分を記録しました"), "④ done: its かかる時間 in 勉強 (英語)", [st, await toast(p)]);
  await check(p, "f"); await p.waitForTimeout(300);
  ok((await ls(p, "study")).length === 0, "④ checked back on: taken back");
  // ② everything due by today done: 紙ふぶき and its word, once
  for (const id of ["h", "c", "a", "b"]) { await check(p, id); await p.waitForTimeout(150); }
  ok(!(await toast(p)).includes("ぜんぶ終えました"), "② not yet (英単語 due today too)", await toast(p));
  await check(p, "f"); await p.waitForTimeout(400);
  ok((await toast(p)).includes("きょうまでのToDoを、ぜんぶ終えました！") && await p.evaluate(() => !!document.querySelector("canvas.confetti")), "② the last one: 紙ふぶき and its word", await toast(p));
  await check(p, "f"); await p.waitForTimeout(300); await check(p, "f"); await p.waitForTimeout(300);
  ok(!(await toast(p)).includes("ぜんぶ終えました"), "② once a day");
  await p.close();

  // ③ 並べ替え: keys, then a drag; the order kept (rank), before 重要 and the 期限
  p = await open();
  await more(p, "並べ替える");
  ok(await p.evaluate(() => window.__td.sort()) && await p.isVisible("#tdSortHead") && !(await p.isVisible("#todoWeek")) && await p.locator(".td-grip").count() === 9 && await p.isDisabled('#todoList button.check[data-check="a"]') && await p.isDisabled("#todoSearch"), "③ 並べ替え: ≡ on each to do, the checks and 探す put by", await p.locator(".td-grip").count());
  let o = await order(p);
  ok(o.slice(0, 2).join() === "ESを書く,レポートを出す", "③ (as it was)", o);
  await p.focus('[data-grip="h"]'); await p.keyboard.press("ArrowDown"); await p.waitForTimeout(300);
  o = await order(p);
  ok(o.slice(0, 2).join() === "レポートを出す,ESを書く" && (await todo(p, "c")).rank === 1 && (await todo(p, "h")).rank === 2 && (await toast(p)).includes("順番を変えました") && await p.evaluate(() => document.activeElement?.dataset?.grip) === "h", "③ ↓ on ESを書く: moved, ranks kept, focus kept", o);
  // a drag within きょう: 電気代を払う above 数学の課題
  const g = await p.locator('[data-grip="b"]').boundingBox(), g2 = await p.locator('[data-grip="a"]').boundingBox();
  await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await p.mouse.down();
  for (let k = 1; k <= 8; k++) { await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2 - ((g.y - g2.y) * k) / 8); await p.waitForTimeout(30); }
  await p.mouse.up(); await p.waitForTimeout(400);
  o = await order(p);
  ok(o.indexOf("電気代を払う") < o.indexOf("数学の課題") && (await todo(p, "b")).rank === 1 && (await todo(p, "a")).rank === 2, "③ dragged: 電気代を払う first in きょう", o);
  await p.click("#tdSortDone"); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => window.__td.sort())) && await p.isVisible("#todoWeek") && await p.locator(".td-grip").count() === 0 && !(await p.isDisabled("#todoSearch")), "③ 終わる");
  o = await order(p);
  ok(o.indexOf("電気代を払う") < o.indexOf("数学の課題") && o.indexOf("レポートを出す") < o.indexOf("ESを書く"), "③ the order stays", o);
  // ⑨ 週の見通し
  await p.click("#todoWeek"); await p.waitForTimeout(600);
  const wk = await txt(p, "#tdPanelBody");
  ok((await txt(p, "#sheetTitle")) === "週の見通し" && wk.includes("きょう 11月11日（水） 4 件・30 分") && wk.includes("期限切れ 2 件をふくむ") && wk.includes("あした 11月12日（木） 2 件") && wk.includes("11月13日（金） 1 件・20 分") && wk.includes("11月14日（土） なし") && wk.includes("期限なし 1 件"), "⑨ the 7 days", wk);
  await p.locator("#tdPanelBody .chip-btn", { hasText: "英単語" }).click(); await p.waitForTimeout(800);
  ok(await sheetOpen(p) && (await txt(p, "#sheetTitle")) === "ToDoを編集" && await p.inputValue("#reText") === "英単語", "⑨ a ToDo pressed: its own sheet");
  await closeSheet(p);
  // ⑧ 手つかずのToDo
  await more(p, "手つかずのToDoを見直す（3 件）");
  const stl = await txt(p, "#tdPanelBody");
  ok((await txt(p, "#sheetTitle")) === "手つかずのToDo" && /部屋の片づけ 追加して 45 日.*ジムに行く 4回先送り.*ESを書く 期限から 22 日/.test(stl), "⑧ the three, the longest first", stl);
  await p.locator("#tdPanelBody li", { hasText: "ESを書く" }).locator(".chip-btn", { hasText: "来週" }).click(); await p.waitForTimeout(300);
  ok((await todo(p, "h")).due === "2026-11-18" && (await toast(p)).includes("「ESを書く」を来週に移しました") && !(await txt(p, "#tdPanelBody")).includes("ESを書く"), "⑧ 来週: moved, gone from the list");
  await p.locator("#tdPanelBody li", { hasText: "部屋の片づけ" }).locator(".chip-btn", { hasText: "あとで" }).click(); await p.waitForTimeout(300);
  ok((await todo(p, "e")).start === "2026-11-18" && !(await todo(p, "e")).due, "⑧ あとで: until next week", await todo(p, "e"));
  await p.locator("#tdPanelBody li", { hasText: "ジムに行く" }).locator(".chip-btn", { hasText: "削除" }).click(); await p.waitForTimeout(300);
  ok(!(await todo(p, "i")) && (await txt(p, "#tdPanelBody")).includes("見直すToDoはありません"), "⑧ 削除: none left");
  await closeSheet(p);
  // ⑦ 完了のふりかえり: the time thought against the time taken
  await p.evaluate(() => window.__td.credit("a", 45)); await p.waitForTimeout(200);
  await check(p, "a"); await p.waitForTimeout(300);
  await more(p, "完了のふりかえり");
  ok((await txt(p, "#tdRevBody")).includes("見積もりと実際 見積もりの 1.5 倍（多くかかりがち）・1 件"), "⑦ in 完了のふりかえり", await txt(p, "#tdRevBody"));
  await closeSheet(p);
  // ⑩ the list as words
  await p.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: URL0.replace(/\/$/, "") });
  const sh = await p.evaluate(() => window.__td.share());
  ok(sh.text.startsWith("ToDo\n□ レポートを出す（11/9まで）") && sh.text.includes("□ 買い物（あしたまで）\n　・牛乳\n　・パン") && !sh.text.includes("卵") && !sh.text.includes("数学の課題"), "⑩ the words: □ a line, 期限, steps still to do", sh.text);
  await more(p, "ToDoを文字で送る");
  const clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => ""));
  ok(clip === sh.text && (await toast(p)).includes("を文字でコピーしました"), "⑩ no share sheet here: copied", [clip.slice(0, 40), await toast(p)]);
  ok(!p.errs.length, "no error", p.errs);
  await p.close();

  // ④⑤ the new ToDo's form, a copy, and a repeat's next turn
  p = await open();
  await p.click("#todoAdd"); await p.waitForTimeout(600);
  ok(!(await p.isHidden("#todoSubjectRow")) && await p.isHidden("#todoCatRow"), "④ 科目 there (there are 科目), 費目 only once a 金額 is in");
  await p.fill("#todoText", "参考書を買う"); await p.selectOption("#todoSubject", "sb2"); await p.fill("#todoAmount", "1800"); await p.waitForTimeout(100);
  ok(!(await p.isHidden("#todoCatRow")), "⑤ 費目 shown");
  await p.selectOption("#todoCat", "教育費");
  await p.click("#todoSave"); await p.waitForTimeout(500);
  let nt = (await ls(p, "todos")).find((t) => t.text === "参考書を買う");
  ok(nt && nt.subject === "sb2" && nt.amount === 1800 && nt.cat === "教育費", "④⑤ added with them", nt);
  ok(await p.inputValue("#todoAmount") === "" && await p.inputValue("#todoSubject") === "" && await p.isHidden("#todoCatRow"), "the form emptied for the next");
  await closeSheet(p);
  await p.locator("#todoList > li", { hasText: "参考書を買う" }).dispatchEvent("contextmenu"); await p.waitForTimeout(250);
  await p.locator("#todoMenuGroup .ask-btn", { hasText: "複製" }).click(); await p.waitForTimeout(700);
  ok(await p.inputValue("#todoSubject") === "sb2" && await p.inputValue("#todoAmount") === "1800" && await p.inputValue("#todoCat") === "教育費", "④⑤ a copy keeps them");
  await closeSheet(p);
  // a repeat's next turn takes them (and its place)
  const R = make(); R.todos.push({ id: "r", text: "家賃を払う", done: false, due: today, repeat: "monthly", amount: 60000, cat: "雑費", subject: "", rank: 3, createdAt: T("2026-10-01") });
  await p.close(); p = await open(R);
  await check(p, "r"); await p.waitForTimeout(400);
  nt = (await ls(p, "todos")).find((t) => t.text === "家賃を払う" && !t.done);
  ok(nt && nt.due === "2026-12-11" && nt.amount === 60000 && nt.cat === "雑費" && nt.rank === 3 && (await ls(p, "expenses")).length === 1, "⑤ a repeat: its next turn keeps its 金額, 費目 and place; this turn's in 家計簿", nt);
  ok((await toast(p)).includes("の次は") && (await toast(p)).includes("家計簿に 60,000 円（雑費）を記録しました"), "⑤ said with its next", await toast(p));
  await check(p, "r"); await p.waitForTimeout(400);
  ok((await ls(p, "expenses")).length === 0 && !(await ls(p, "todos")).some((t) => t.text === "家賃を払う" && t.due === "2026-12-11"), "⑤ checked back on: the next turn and the spending taken back");
  ok(!p.errs.length, "no error", p.errs);
  await p.close();

  // ① with 朝のまとめ on, the morning's of those with お知らせ and no time is in it
  const M = make(); M.todos.push({ id: "m", text: "薬を飲む", done: false, due: "2026-11-12", remind: true, createdAt: 1 });
  p = await open(M);
  let day = await p.evaluate(() => window.__td.alarms(Date.now()).filter((a) => a.tag.startsWith("todo-day:")).length);
  ok(day === 1, "① off: those with お知らせ and no time have their own morning");
  await p.evaluate(({ P }) => { const s = JSON.parse(localStorage.getItem(P + "settings") || "[]"); s.push({ id: "tdMorning", on: true, at: "07:30", updatedAt: 1 }); localStorage.setItem(P + "settings", JSON.stringify(s)); }, { P });
  await p.reload(); await p.waitForTimeout(900);
  al = await p.evaluate(() => window.__td.alarms(Date.now()));
  ok(!al.some((a) => a.tag.startsWith("todo-day:")) && al.find((a) => a.tag === "td-morning:2026-11-12")?.body.includes("薬を飲む"), "① on: they are in 朝のまとめ");
  ok(!p.errs.length, "no error", p.errs);
  await p.close();
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
