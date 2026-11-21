// ToDo その25 ①③⑥〜⑨ (④ 声のメモ taken off 2026-11-18; ② かかった時間を聞く, ⑤ 休憩のすごし方, ⑩ ToDoなしの集中をToDoに and ①'s 編集,
// with ToDo's 集中, 2026-11-21: the user's calls), through the hook build at 8887 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8887/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const todo = async (p, id) => (await ls(p, "todos")).find((t) => t.id === id);
const byText = async (p, text) => (await ls(p, "todos")).filter((t) => t.text === text);
const flat = (s) => (s ?? "").replace(/[\s   ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const status = (p) => p.evaluate(() => [document.getElementById("status")?.textContent || "", document.getElementById("sheetStatus").textContent].join("｜")).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td25[f](...a), { f, a });
const hold = async (p, id) => { await p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).closest("li").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), id); await p.waitForTimeout(300); };
const items = (p) => p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent));
const press = async (p, words) => { await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(500); };
const row = (p, id) => p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`)?.closest("li")?.innerText ?? null, id).then(flat);
const check = async (p, id) => { await p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).click(), id); await p.waitForTimeout(900); };
const { T } = D;
const NOW = Date.parse("2026-11-11T08:30:00+09:00"), MIN = 60e3;
const TIPS = ["水を1杯飲みましょう", "遠くを見て、目を休めましょう", "立ち上がって、伸びをしましょう", "肩をゆっくり回しましょう", "窓を開けて、空気を入れかえましょう", "目を閉じて、30秒じっとしてみましょう"];
async function open(b, when, o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, permissions: ["microphone"], ...o });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  const data = D.all();
  data.todos = data.todos.map((t) => (t.id === "r1" ? { ...t, finish: "袋を2つ出したら" } : t));
  data.todos = [...data.todos,
    // ③ one whose next is asked as it is done; ⑦ a ToDo whose steps say how long they take
    { id: "hc", text: "美容院", due: "2026-11-11", askNext: true, listId: "l-job", memo: "駅前の店", createdAt: T("2026-10-11") },
    { id: "st1", text: "テスト勉強", due: "2026-11-13", steps: [{ id: "t1", text: "教科書を読む 30分", done: true }, { id: "t2", text: "問題を解く（1時間）" }, { id: "t3", text: "見直し20分" }, { id: "t4", text: "先生に質問 10時30分" }], createdAt: T("2026-11-08") }];
  data.settings = [...data.settings, { id: "todoListSplit", at: 1, updatedAt: 1 }];
  await seed(p, data, "todo"); await p.waitForTimeout(1200);
  return p;
}
const sheetTitle = (p) => p.evaluate(() => document.getElementById("sheetTitle").textContent);
const closeSheet = async (p) => { await p.evaluate(() => { const b = ["sheetDone", "sheetCancel"].map((id) => document.getElementById(id)).find((x) => x && !x.hidden); b?.click(); }); await p.waitForTimeout(700); await p.evaluate(() => { if (document.getElementById("discardAsk")?.open) document.querySelector("#discardAsk .danger, #discardAsk button")?.click(); }); await p.waitForTimeout(400); };
const moreItems = async (p) => { await p.click("#todoMore"); await p.waitForTimeout(300); const xs = await items(p); await p.keyboard.press("Escape"); await p.waitForTimeout(300); return xs.map(flat); };
const saveSheet = async (p) => { await p.click("#recSave"); await p.waitForTimeout(800); };
(async () => {
  const b = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const p = await open(b, "2026-11-11T08:30:00+09:00");

  // ---- ③ 終えたら次を決める
  ok((await row(p, "hc")).includes("そのつど"), "③ そのつど on its row", await row(p, "hc"));
  await check(p, "hc");
  ok(await p.isVisible("#td25AgainCard") && (await txt(p, "#td25AgainCard")).startsWith("「美容院」の次は、いつにしますか？"), "③ asked as it is done", await txt(p, "#td25AgainCard"));
  await p.locator("#td25AgainCard button", { hasText: "1か月後" }).click(); await p.waitForTimeout(700);
  const hc2 = (await byText(p, "美容院")).find((t) => !t.done);
  ok(hc2 && hc2.due === "2026-12-11" && hc2.askNext === true && hc2.listId === "l-job" && hc2.memo === "駅前の店" && (await p.isHidden("#td25AgainCard")), "③ the next one a month on, as it was, asked again", hc2);
  ok((await status(p)).includes("「美容院」の次を") && (await status(p)).includes("に入れました"), "③ said", await status(p));
  await p.locator("#status button", { hasText: "元に戻す" }).click(); await p.waitForTimeout(700);
  ok(!(await byText(p, "美容院")).some((t) => !t.done), "③ 元に戻す", await byText(p, "美容院"));
  await hold(p, "k8"); await press(p, "終えたら次の期限を聞く");
  ok((await todo(p, "k8")).askNext === true && (await row(p, "k8")).includes("そのつど"), "③ from its menu", await todo(p, "k8"));
  await check(p, "k8");
  await p.fill("#td25AgainDay", "2026-11-25"); await p.locator("#td25AgainCard button", { hasText: "この日にする" }).click(); await p.waitForTimeout(700);
  ok((await byText(p, "大掃除")).some((t) => !t.done && t.due === "2026-11-25" && t.askNext === true && t.mins === 480), "③ a day picked", await byText(p, "大掃除"));
  await hold(p, "r1");
  ok(!(await items(p)).map(flat).some((w) => w.includes("次の期限を聞く")), "③ not for a repeat");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);

  // ---- ⑨ 完了基準 (終わりの目安 until 2026-11-18, renamed at the user's call)
  await W(p, "edit", "a"); await p.waitForTimeout(900);
  ok(await p.isVisible("#reFin25"), "⑨ in its sheet");
  await p.fill("#reFin25", "3ページ書けたら終わり"); await saveSheet(p);
  ok((await todo(p, "a")).finish === "3ページ書けたら終わり", "⑨ kept", await todo(p, "a"));
  const r1 = await todo(p, "r1");
  await check(p, "r1");
  const next = (await byText(p, "ゴミ出し")).find((t) => !t.done && t.id !== "r1");
  ok(r1 && next && next.finish === "袋を2つ出したら", "⑨ handed on to a repeat's next turn", next);

  // ---- ⑦ サブタスクのかかる時間
  ok((await W(p, "stepMins", "先生に質問 10時30分")) === 0 && (await W(p, "stepMins", "見直し20分")) === 20 && (await W(p, "stepMins", "問題を解く（1時間）")) === 60 && (await W(p, "stepMins", "第2章 1時間半")) === 90 && (await W(p, "stepMins", "半分")) === 0,
    "⑦ a step's minutes read from its name (not a time of day)");
  ok((await row(p, "st1")).includes("のこり1時間20分"), "⑦ what is left on its row", await row(p, "st1"));
  await W(p, "edit", "st1"); await p.waitForTimeout(900);
  ok((await txt(p, "#td25StepsNote")).startsWith("サブタスクの時間：のこり1時間20分（ぜんぶで1時間50分）"), "⑦ in its sheet", await txt(p, "#td25StepsNote"));
  await p.locator("#td25StepsNote .td25-steps-use").click(); await p.waitForTimeout(300);
  ok((await p.inputValue("#reMins")) === "110", "⑦ かかる時間 made their total");
  await saveSheet(p);
  ok((await todo(p, "st1")).mins === 110, "⑦ saved", await todo(p, "st1"));
  await hold(p, "st1");
  ok(!(await items(p)).map(flat).some((w) => w.includes("集中")), "⑦ no サブタスクで集中 in its menu (taken out, 2026-11-21)", await items(p));
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);

  // ---- ⑥ ＋5分 on the bar
  await W(p, "put", { kind: "work", todoId: "a", len: 25, end: NOW + 10 * MIN, left: null, at: NOW - 15 * MIN }); await p.waitForTimeout(400);
  ok(await p.isHidden("#td25More"), "⑥ not yet with 10 minutes left");
  await W(p, "put", { kind: "work", todoId: "a", len: 25, end: NOW + 3 * MIN, left: null, at: NOW - 22 * MIN }); await p.waitForTimeout(400);
  ok(await p.isVisible("#td25More"), "⑥ on the bar in the last 5 minutes");
  await p.click("#td25More"); await p.waitForTimeout(400);
  let w = await W(p, "now");
  ok(w.len === 30 && w.end === NOW + 8 * MIN && (await status(p)).includes("集中を5分のばしました（30分）"), "⑥ the set 5 minutes longer", [w, await status(p)]);
  await W(p, "run22Put", { at: NOW - MIN, n: 2 });
  await W(p, "put", { kind: "rest", todoId: "a", len: 5, end: NOW + 4 * MIN, left: null, at: NOW - MIN, worked: 25 }); await p.waitForTimeout(400);
  ok(await p.isVisible("#td25More"), "⑥ in the 休憩 after a set");
  // ---- ⑤ 休憩のすごし方 (taken out, 2026-11-21)
  ok(!(await p.$("#td25RestCard")) && !(await p.$(".td25-rest-tip")), "⑤ no card over the list in 休憩");
  await p.click("#td25More"); await p.waitForTimeout(400);
  w = await W(p, "now");
  ok(w.kind === "work" && w.len === 5 && w.todoId === "a" && w.more === true && (await W(p, "run22")).n === 1, "⑥ in 休憩: back to 集中 for 5 minutes, as the same set", [w, await W(p, "run22")]);
  await W(p, "stop"); await p.waitForTimeout(300);

  // ---- ① 自動で続ける
  await p.click("#todoSettings"); await p.waitForTimeout(900);
  ok(!(await p.$("#td25AutoOn")) && !(await p.$("#td25AskOn")) && !(await p.$("#focusForm")), "①② not in 編集 (with 集中タイマー, taken out 2026-11-21)");
  await closeSheet(p);
  ok((await W(p, "set")).auto === false, "① off at first", await W(p, "set"));
  await W(p, "set25", { auto: true }); await p.waitForTimeout(300); // (one turned on before: as kept, for 勉強's and 目標's timer)
  await W(p, "put", { kind: "rest", todoId: "a", len: 5, end: NOW - 1000, left: null, at: NOW - 301000, worked: 25 }); await p.waitForTimeout(600);
  w = await W(p, "now");
  ok(w?.kind === "work" && w.todoId === "a" && w.len === 25 && (await status(p)).includes("休憩おわり。次の集中を自動で始めました（25分）"), "① 休憩 over: the next set by itself", [w, await status(p)]);
  await p.locator("#status button", { hasText: "止める" }).click(); await p.waitForTimeout(400);
  ok(!(await W(p, "now")), "① 止める at once");
  await W(p, "put", { kind: "rest", todoId: "a", len: 15, end: NOW - 1000, left: null, at: NOW - 901000, worked: 25, long: true }); await p.waitForTimeout(600);
  ok(!(await W(p, "now")) && (await status(p)).includes("休憩おわり。次の集中をはじめましょう"), "① not after a long 休憩", await status(p));

  // ---- ⑩ ToDoなしの集中をToDoに, ② かかった時間を聞く (taken out, 2026-11-21)
  await W(p, "put", { kind: "work", todoId: null, len: 25, end: NOW - 1000, left: null, at: NOW - 25 * MIN - 1000 }); await p.waitForTimeout(700);
  ok((await status(p)).includes("25分の集中、おつかれさまでした") && !(await p.locator("#status button", { hasText: "ToDoにつける" }).count()), "⑩ a set with no ToDo over: no ToDoにつける", await status(p));
  await W(p, "stop"); await p.waitForTimeout(300);
  await W(p, "put", { kind: "work", todoId: null, len: 25, end: NOW + 13 * MIN, left: null, at: NOW - 12 * MIN }); await p.waitForTimeout(400);
  await p.click("#focusStop"); await p.waitForTimeout(500);
  ok((await status(p)).includes("集中した12分を記録しました") && !(await p.locator("#status button", { hasText: "ToDoにつける" }).count()), "⑩ ended early: none either", await status(p));
  await W(p, "set25", { ask: true }); await p.waitForTimeout(300); // (one turned on before)
  await check(p, "c");
  ok(!(await p.$("#td25TimeCard")) && !(await txt(p, "#todoList")).includes("どれくらいかかりましたか"), "② not asked", await todo(p, "c"));

  // ---- ⑧ 来週やる
  ok((await W(p, "nextKey")) === "2026-11-15", "⑧ next week's first day");
  await hold(p, "j1"); await press(p, "来週やるに入れる");
  ok((await todo(p, "j1")).week === "2026-11-15" && (await row(p, "j1")).includes("来週"), "⑧ from its menu, on its row", [await todo(p, "j1"), await row(p, "j1")]);
  await hold(p, "a");
  ok((await items(p)).map(flat).includes("来週にまわす（来週やる）"), "⑧ one of this week's: put off to next week", await items(p));
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  ok((await moreItems(p)).includes("来週やるを選ぶ（1件）"), "⑧ in その他");
  await p.click("#todoMore"); await p.waitForTimeout(300); await press(p, "来週やるを選ぶ"); await p.waitForTimeout(500);
  ok((await sheetTitle(p)) === "来週やる" && (await txt(p, ".td-pick-count")) === "1件を選んでいます" && (await txt(p, "#tdPanelBody")).includes("来週の空き時間は"), "⑧ its sheet", await txt(p, "#tdPanelBody"));
  await p.locator("#tdPanelBody button", { hasText: "今週やるの残り" }).click(); await p.waitForTimeout(500);
  ok((await todo(p, "a")).week === "2026-11-15" && (await todo(p, "g")).week === "2026-11-15", "⑧ this week's left over, to next week", [await todo(p, "a"), await todo(p, "g")]);
  await p.locator('#tdPanelBody [data-nx="b"]').click(); await p.waitForTimeout(400);
  ok((await todo(p, "b")).week === "2026-11-15" && (await txt(p, ".td-pick-count")) === "4件を選んでいます", "⑧ picked there", await txt(p, ".td-pick-count"));
  await closeSheet(p);
  await p.click("#todoMore"); await p.waitForTimeout(300); await press(p, "週のふりかえり"); await p.waitForTimeout(500);
  ok((await txt(p, "#tdPanelBody")).includes("来週やるを選ぶ4件を選んでいます"), "⑧ a step of 週のふりかえり", await txt(p, "#tdPanelBody"));
  await closeSheet(p);

  // ---- the guide, その23's row picker
  const g = await W(p, "guide");
  ok(["終えたら次を決める", "サブタスクのかかる時間", "来週やる", "完了基準"].every((w) => g.includes(w)) && !["声のメモ", "自動で続ける", "かかった時間を聞く", "休憩のすごし方", "集中をあと5分", "ToDoなしの集中をToDoに", "集中する"].some((w) => g.includes(w)), "the guide", g);
  const rowsOf = JSON.parse(await W(p, "rows"));
  ok(["そのつどの繰り返し", "来週やる", "声のメモ"].every((w) => rowsOf.some(([, x]) => x === w)), "その23 ① 行に出すもの", rowsOf);

  // ---- ⑧ the week after: 今週やる
  const q = await open(b, "2026-11-16T09:00:00+09:00");
  await W(q, "update", "j1", { week: "2026-11-15" }); await q.waitForTimeout(500);
  ok((await row(q, "j1")).includes("今週") && !(await row(q, "j1")).includes("来週"), "⑧ once that week comes: 今週やる", await row(q, "j1"));
  ok(p.errs.length === 0 && q.errs.length === 0, "no errors", [...p.errs, ...q.errs]);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
