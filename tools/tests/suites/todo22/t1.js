// ToDo その22 ①〜⑩, through the hook build at 8848 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8848/";
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
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td22[f](...a), { f, a });
const menu = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(300); await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(600); };
const hold = async (p, id) => { await p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).closest("li").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), id); await p.waitForTimeout(300); };
const items = (p) => p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent));
const press = async (p, words) => { await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(500); };
const undo = async (p) => { await p.locator("#sheetStatus button:visible, #status button:visible").first().click(); await p.waitForTimeout(500); };
const row = (p, id) => p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`)?.closest("li")?.innerText ?? null, id).then(flat);
const { T } = D;
const NOW = Date.parse("2026-11-11T08:30:00+09:00"), MIN = 60e3;
async function open(b, when, o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, ...o });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  // ⑩ the screen's wake lock, as a phone would have it: asked and let go, counted
  await p.addInitScript(() => { window.__wl = { req: 0, rel: 0 }; Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async () => { window.__wl.req++; return { release: async () => { window.__wl.rel++; }, addEventListener: () => {} }; } } }); });
  const data = D.all();
  // ⑤⑥ a 買い物リスト (牛乳 230 円 and パン to buy; bought before at 200 and 180), カレー with three steps, 電池を買う;
  // ⑦ two errands today with places (and 駅前の銀行 on the 13th)
  data.todoLists = [...data.todoLists, { id: "l-shop", name: "買い物", shop: true, order: 5, createdAt: T("2026-10-05") }];
  data.todos = [...data.todos,
    { id: "sh1", text: "牛乳", listId: "l-shop", price: 230, createdAt: T("2026-11-09") }, { id: "sh2", text: "パン", listId: "l-shop", createdAt: T("2026-11-09") },
    { id: "sh0", text: "牛乳", listId: "l-shop", price: 200, done: true, doneAt: T("2026-11-05", 18), paid: true, createdAt: T("2026-11-01") },
    { id: "sh9", text: "パン", listId: "l-shop", price: 180, done: true, doneAt: T("2026-11-04", 18), paid: true, createdAt: T("2026-11-01") },
    { id: "cu", text: "カレーを作る", due: "2026-11-14", steps: [{ id: "k1", text: "にんじん" }, { id: "k2", text: "じゃがいも", done: true }, { id: "k3", text: "カレールー" }], createdAt: T("2026-11-08") },
    { id: "bt", text: "電池を買う", createdAt: T("2026-11-08", 10) },
    { id: "m1", text: "郵便局で荷物を出す", due: "2026-11-11", time: "10:00", place: "中央郵便局", createdAt: T("2026-11-08") },
    { id: "m2", text: "クリーニングを取りに行く", due: "2026-11-11", time: "17:00", place: "駅前クリーニング", createdAt: T("2026-11-08") }];
  await seed(p, data, "todo"); await p.waitForTimeout(1200);
  return p;
}
const sheetTitle = (p) => p.evaluate(() => document.getElementById("sheetTitle").textContent);
const closeSheet = async (p) => { await p.evaluate(() => { const b = ["sheetDone", "sheetCancel"].map((id) => document.getElementById(id)).find((x) => x && !x.hidden); b?.click(); }); await p.waitForTimeout(700); await p.evaluate(() => { if (document.getElementById("discardAsk")?.open) document.querySelector("#discardAsk .danger, #discardAsk button")?.click(); }); await p.waitForTimeout(400); };
const moreItems = async (p) => { await p.click("#todoMore"); await p.waitForTimeout(300); const xs = await items(p); await p.keyboard.press("Escape"); await p.waitForTimeout(300); return xs.map(flat); };
const tab = async (p, name) => { await p.locator("#todoTabs button", { hasText: name }).first().click(); await p.waitForTimeout(400); };
const wl = (p) => p.evaluate(() => window.__wl);
// (the chips as a tap on each would: its check off, change told)
const offMonths = (p, sel, ms) => p.evaluate(({ sel, ms }) => { for (const m of ms) { const x = document.querySelector(`${sel} input[value="${m}"]`); x.checked = false; x.dispatchEvent(new Event("change", { bubbles: true })); } }, { sel, ms });
const saveSheet = async (p) => { await p.click("#recSave"); await p.waitForTimeout(800); };
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-11T08:30:00+09:00");

  // ---- ① 長い休憩: the 4th set in a row over
  await W(p, "run", { at: NOW - 32 * MIN, n: 3 });
  await W(p, "put", { kind: "work", todoId: "c", len: 25, end: NOW - 1000, left: null, at: NOW - 26 * MIN }); await p.waitForTimeout(500);
  let v = await W(p, "now");
  ok(v?.kind === "rest" && v.long === true && v.len === 15, "① the 4th set over: the long 休憩 (15 minutes)", v);
  ok((await txt(p, "#focusKind")) === "長い休憩", "① said on the bar", await txt(p, "#focusKind"));
  ok((await status(p)).includes("4回目の集中、おつかれさまでした。15分、長めに休憩しましょう"), "① and in the message", await status(p));
  ok((await ls(p, "td22Run")).n === 4, "① the set counted", await ls(p, "td22Run"));

  // ---- ② 経過メモを書く with the message, and in 1件に集中する画面 while it rests
  ok(await p.locator("#status button", { hasText: "経過メモを書く" }).isVisible(), "② 経過メモを書く in the message");
  await p.locator("#status button", { hasText: "経過メモを書く" }).click(); await p.waitForTimeout(900);
  ok((await sheetTitle(p)) === "ToDoを編集" && (await p.evaluate(() => document.activeElement?.id)) === "reLogText", "② its sheet, at the 経過メモ's field", [await sheetTitle(p), await p.evaluate(() => document.activeElement?.id)]);
  await closeSheet(p);
  await W(p, "focus7", "c"); await p.waitForTimeout(900);
  ok((await txt(p, ".td7-focus-kind")) === "長い休憩", "① 長い休憩 in 1件に集中する画面 too", await txt(p, ".td7-focus-kind"));
  ok(await p.isVisible("#td22LogIn") && (await txt(p, "#td22LogHead")) === "どこまで進みましたか？", "② while it rests: どこまで進みましたか？");
  await p.fill("#td22LogIn", "3行まで"); await p.locator(".td22-log button", { hasText: "残す" }).click(); await p.waitForTimeout(700);
  ok((await todo(p, "c")).log?.some((x) => x.text === "3行まで"), "② written in its 経過メモ", (await todo(p, "c")).log);
  ok((await txt(p, ".td22-log-said")) === "経過メモに書きました：「3行まで」", "② said so, with the field for more", await txt(p, ".td22-log-said"));
  await closeSheet(p);

  // ---- ① a set going on: which it is, and its notifications
  await W(p, "run", { at: NOW - 20 * MIN, n: 1 });
  await W(p, "put", { kind: "work", todoId: "c", len: 25, end: NOW + 10 * MIN, left: null, at: NOW - 15 * MIN }); await p.waitForTimeout(400);
  ok((await txt(p, "#focusKind")) === "集中" && (await txt(p, "#td22Round")) === "2/4" && (await txt(p, "#focusBar")).startsWith("集中10:002/4"), "① the bar: the 2nd of 4, after the time", await txt(p, "#focusBar"));
  await W(p, "run", { at: NOW - 20 * MIN, n: 3 });
  const al = await W(p, "falarms");
  ok(al.length === 2 && al[0].body.includes("4回目の集中") && al[0].body.includes("15分、長めに休憩") && al[1].at === NOW + 25 * MIN && al[1].body.startsWith("長い休憩おわり"), "① its notifications: the long one", al);
  await p.click("#todoSettings"); await p.waitForTimeout(900);
  ok((await p.inputValue("#td22Long")) === "15" && (await p.inputValue("#td22Every")) === "4", "① in 編集: 15 minutes, every 4 at first");
  await p.selectOption("#td22Long", "0"); await p.waitForTimeout(400);
  ok((await W(p, "set")).long === 0 && (await p.isDisabled("#td22Every")), "① なし: kept, 何回ごと not to pick", await W(p, "set"));
  await closeSheet(p);
  ok((await txt(p, "#focusKind")) === "集中" && (await p.isHidden("#td22Round")), "① なし: no number on the bar", await txt(p, "#focusBar"));
  await W(p, "stop"); await p.waitForTimeout(300);

  // ---- ③ 1日の集中の目標
  await p.click("#todoSettings"); await p.waitForTimeout(900);
  await p.selectOption("#td22GoalSel", "60"); await p.waitForTimeout(400);
  await closeSheet(p);
  ok((await W(p, "set")).goal === 60, "③ kept", await W(p, "set"));
  await W(p, "log", 50); await p.waitForTimeout(600);
  ok((await txt(p, "#td22GoalLine")) === "きょうの集中50分/1時間", "③ on the goal's card", await txt(p, "#td22GoalLine"));
  await W(p, "run", null);
  await W(p, "put", { kind: "work", todoId: "c", len: 25, end: NOW - 1000, left: null, at: NOW - 26 * MIN }); await p.waitForTimeout(800);
  ok((await status(p)).includes("25分の集中、おつかれさまでした。5分休憩しましょう。きょうの集中の目標（1時間）に届きました！"), "③ met: said with the set's message", await status(p));
  ok((await txt(p, "#td22GoalLine")) === "きょうの集中1時間15分/1時間きょうの集中の目標に届きました！", "③ the card says it", await txt(p, "#td22GoalLine"));
  await W(p, "stop"); await p.waitForTimeout(300);
  await menu(p, "ToDoの記録");
  ok((await p.locator(".td16-chart .td22-goal-line").count()) === 1 && (await txt(p, ".td22-goal-days")) === "目標（1時間）に届いた日1日", "③ a line over the 14 days, and the days met", await txt(p, ".td22-goal-days"));
  const ticks = await p.evaluate(() => [...document.querySelectorAll(".td16-chart .td15-tick")].map((x) => x.textContent).filter((w) => /^(0|.*[分間])$/.test(w) && !/^\d+\/\d+$/.test(w)));
  ok(JSON.stringify(ticks.slice(0, 3)) === JSON.stringify(["0", "1時間", "2時間"]), "③ the scale in whole hours (no 1.5時間 cut off)", ticks);
  ok(await p.isHidden("#td10JotBox"), "思いついたこと (1件に集中する画面's) not under the other panels");
  await closeSheet(p);

  // ---- ④ くらべて並べる
  ok((await moreItems(p)).includes("2つずつくらべて並べる"), "④ in その他");
  const g = (await W(p, "groups")).find((x) => x.name === "きょう");
  await menu(p, "2つずつくらべて並べる");
  ok((await sheetTitle(p)) === "くらべて並べる" && (await p.locator(".td22-cmp-group").count()) >= 2, "④ the headings to pick from", await txt(p, "#tdPanelBody"));
  await p.evaluate(() => [...document.querySelectorAll(".td22-cmp-group")].find((x) => x.querySelector(".text").textContent === "きょう").click()); await p.waitForTimeout(400);
  ok((await txt(p, ".td22-cmp-q")) === "どちらを先にやりますか？" && (await p.locator(".td22-cmp-pick").count()) === 2, "④ two at a time");
  const q1 = await txt(p, ".td22-cmp-two");
  await p.locator(".td22-cmp-pick").first().click(); await p.waitForTimeout(300);
  await p.locator(".td22-cmp-acts button", { hasText: "1つ戻る" }).click(); await p.waitForTimeout(300);
  ok((await txt(p, ".td22-cmp-two")) === q1, "④ 1つ戻る: the same question again");
  let n = 0;
  while ((await p.locator(".td22-cmp-go").count()) === 0 && n < 60) { await p.locator(".td22-cmp-pick").first().click(); await p.waitForTimeout(150); n++; }
  const want = [...g.ids].slice(0, 8).reverse();
  const shown = await p.evaluate(() => [...document.querySelectorAll(".td22-cmp-order .text")].map((x) => x.textContent));
  const names = await p.evaluate((ids) => ids.map((id) => window.__td22.get(id).text), want);
  ok(g.ids.length >= 5 && JSON.stringify(shown) === JSON.stringify(names), "④ the new one first each time: their order turned around", { shown, names, n });
  await p.locator(".td22-cmp-go").click(); await p.waitForTimeout(700);
  const ranks = await Promise.all(want.map(async (id) => (await todo(p, id)).rank));
  ok(JSON.stringify(ranks) === JSON.stringify(want.map((_, i) => i + 1)), "④ put as their own order", ranks);
  ok((await status(p)).includes(`「きょう」の${want.length}件を、くらべた順に並べました`), "④ said", await status(p));
  await undo(p);
  ok((await Promise.all(want.map(async (id) => (await todo(p, id)).rank))).every((r) => r === undefined || r === null), "④ 元に戻す");

  // ---- ⑤ サブタスクを買い物リストに
  await hold(p, "cu");
  ok((await items(p)).map(flat).includes("サブタスクを買い物リストに入れる（2件）"), "⑤ in a row's menu, with how many", (await items(p)).map(flat));
  await press(p, "サブタスクを買い物リストに入れる");
  const nin = (await byText(p, "にんじん")).find((t) => t.listId === "l-shop"), roux = (await byText(p, "カレールー")).find((t) => t.listId === "l-shop");
  ok(nin?.fromStep?.id === "cu" && nin.fromStep.sid === "k1" && roux?.fromStep?.sid === "k3" && !(await byText(p, "じゃがいも")).some((t) => t.listId === "l-shop"), "⑤ the steps to do, in the list", [nin, roux]);
  ok((await status(p)).includes("「買い物」に2件入れました。買うと、このサブタスクにもチェックが付きます"), "⑤ said", await status(p));
  await hold(p, "cu"); await press(p, "サブタスクを買い物リストに入れる");
  ok((await status(p)).includes("「買い物」には、もう入っています") && (await byText(p, "にんじん")).length === 1, "⑤ there already: left alone", await status(p));
  await hold(p, "bt"); await press(p, "買い物リストに入れる");
  ok((await byText(p, "電池")).some((t) => t.listId === "l-shop" && !t.fromStep), "⑤ one with no steps: its name, を買う taken off");
  await tab(p, "買い物");
  await hold(p, "sh1");
  ok(!(await items(p)).map(flat).some((x) => x.includes("買い物リストに入れる")), "⑤ not for those in the list");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await p.click(`#todoList [data-check="${nin.id}"]`); await p.waitForTimeout(900);
  const k1 = (await todo(p, "cu")).steps.find((s) => s.id === "k1");
  ok(k1.done === true && k1.at === NOW, "⑤ bought: its step checked too (⑧ with its day)", k1);

  // ---- ⑥ 前回の値段
  ok((await row(p, "sh1")).includes("前回より+30円") && (await row(p, "sh2")).includes("前回180円"), "⑥ on the rows", [await row(p, "sh1"), await row(p, "sh2")]);
  await W(p, "edit", "sh1"); await p.waitForTimeout(900);
  ok((await txt(p, "#reLast22")) === "前回は200円（11/5（木））でした。", "⑥ under 値段 in its sheet", await txt(p, "#reLast22"));
  await closeSheet(p);

  // ---- ⑩ 買い物中は画面を消さない (kept on since ⑤ opened 買い物: let go on すべて, then asked again)
  await tab(p, "すべて"); await p.waitForTimeout(5600);
  const w0 = await wl(p);
  ok(w0.req === w0.rel, "⑩ on すべて: let go", w0);
  await tab(p, "買い物"); await p.waitForTimeout(5600);
  const w1 = await wl(p);
  ok(w1.req === w0.req + 1, "⑩ a 買い物リスト showing: the screen kept on", [w0, w1]);
  await W(p, "idle"); await p.waitForTimeout(5600);
  ok((await wl(p)).rel === w1.rel + 1, "⑩ ten minutes without a touch: let go", await wl(p));
  await tab(p, "すべて"); await p.waitForTimeout(5600);
  const w2 = await wl(p);
  ok(w2.req === w1.req, "⑩ on すべて: not kept on", [w1, w2]);
  await p.click("#todoSettings"); await p.waitForTimeout(900);
  ok(await p.isChecked("#td22ShopWake"), "⑩ in 編集, on at first");
  await p.locator("#td22ShopWake").uncheck(); await p.waitForTimeout(300);
  await closeSheet(p);
  await tab(p, "買い物"); await p.waitForTimeout(5600);
  ok((await wl(p)).req === w2.req, "⑩ off: not kept on", await wl(p));
  await tab(p, "すべて");

  // ---- ⑦ 寄るところを地図で
  ok((await moreItems(p)).includes("寄るところを地図で（3か所）"), "⑦ in その他, with how many places", await moreItems(p));
  await menu(p, "寄るところを地図で");
  const enc = encodeURIComponent, G = "https://www.google.com/maps/dir/?api=1&destination=";
  const href = () => p.getAttribute("#td22MapGo", "href");
  ok((await sheetTitle(p)) === "寄るところを地図で" && (await p.locator(".td22-map li").count()) === 3, "⑦ the places", await txt(p, "#tdPanelBody"));
  ok((await href()) === `${G}${enc("駅前クリーニング")}&waypoints=${enc("中央郵便局")}`, "⑦ today's ticked, in order: through 中央郵便局 to 駅前クリーニング", await href());
  await p.selectOption("#td22MapMode", "walking"); await p.waitForTimeout(200);
  ok((await href()).endsWith("&travelmode=walking"), "⑦ 歩き", await href());
  await p.locator('.td22-map-move[aria-label="「駅前クリーニング」を上へ"]').click(); await p.waitForTimeout(300);
  ok((await href()) === `${G}${enc("中央郵便局")}&waypoints=${enc("駅前クリーニング")}&travelmode=walking`, "⑦ moved up: that order", await href());
  await p.locator(".td22-map li", { hasText: "駅前の銀行" }).locator(".td22-map-check").check(); await p.waitForTimeout(200);
  ok((await href()) === `${G}${enc("駅前の銀行")}&waypoints=${enc("駅前クリーニング")}%7C${enc("中央郵便局")}&travelmode=walking` && (await txt(p, "#td22MapSay")).startsWith("3か所を、上から順に回ります"), "⑦ one more ticked: to it last", await href());
  await closeSheet(p);

  // ---- ⑧ サブタスクを終えた日
  await W(p, "step", "b", "s2"); await p.waitForTimeout(400);
  ok((await todo(p, "b")).steps.find((s) => s.id === "s2").at === NOW, "⑧ checked: its day kept");
  await W(p, "edit", "b"); await p.waitForTimeout(900);
  ok((await txt(p, '#reSteps li[data-step="s2"] .td22-step-at')) === "きょう" && (await p.locator('#reSteps li[data-step="s1"] .td22-step-at').count()) === 0, "⑧ by its check in the sheet (none for one done before)");
  await saveSheet(p);
  const bs = (await todo(p, "b")).steps;
  ok(bs.find((s) => s.id === "s2").at === NOW && bs.find((s) => s.id === "s1").at === undefined, "⑧ kept as the sheet is saved", bs);
  await p.locator('#todoList [data-check="b"]').locator("xpath=ancestor::li[1]").locator(".td-steps-btn").click(); await p.waitForTimeout(400);
  ok((await txt(p, "#todoList .td-steps .td22-step-at")) === "きょうに完了", "⑧ on its row's steps", await txt(p, "#todoList .td-steps .td22-step-at"));
  await hold(p, "b"); await press(p, "このToDoの歩み");
  ok((await txt(p, "#tdPanelBody")).includes("サブタスク「単語帳2章」を完了"), "⑧ in このToDoの歩み", await txt(p, "#tdPanelBody"));
  await closeSheet(p);

  // ---- ⑨ 繰り返す月
  await W(p, "edit", "r1"); await p.waitForTimeout(900);
  ok(await p.isVisible("#reMonths22Row") && (await txt(p, "#reMonths22Say")) === "1年じゅう" && (await p.isHidden("#reMonths22")), "⑨ under 繰り返し: 1年じゅう");
  await p.locator("#reMonths22Row .td22-month-open").click(); await p.waitForTimeout(200);
  await offMonths(p, "#reMonths22", [1, 2, 3, 10, 11, 12]);
  ok((await txt(p, "#reMonths22Say")) === "4〜9月だけ", "⑨ picked: said", await txt(p, "#reMonths22Say"));
  await saveSheet(p); await p.waitForTimeout(300);
  const r1 = await todo(p, "r1");
  ok(JSON.stringify(r1.months) === "[4,5,6,7,8,9]" && r1.due === "2027-04-01", "⑨ kept, its 期限 the first turn in April", r1);
  ok((await status(p)).includes("繰り返す月に合わせて、期限を2027/4/1（木）にしました"), "⑨ said", await status(p));
  ok((await row(p, "r1")).includes("4〜9月だけ"), "⑨ on its row", await row(p, "r1"));
  ok((await W(p, "next", { ...r1, due: "2027-09-30" })) === "2028-04-03" && (await W(p, "next", r1)) === "2027-04-05", "⑨ September's last turn: next April's first", [await W(p, "next", { ...r1, due: "2027-09-30" }), await W(p, "next", r1)]);
  await W(p, "edit", "r1"); await p.waitForTimeout(900);
  ok((await txt(p, "#reMonths22Say")) === "4〜9月だけ" && (await p.isVisible("#reMonths22")), "⑨ opened again: as kept");
  await closeSheet(p);
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.fill("#todoText", "花粉の薬"); await p.dispatchEvent("#todoText", "input"); await p.selectOption("#todoRepeat", "daily"); await p.waitForTimeout(300);
  ok(await p.isVisible("#td22MonthsRow"), "⑨ in the new ToDo's form too");
  await p.locator("#td22MonthsRow .td22-month-open").click(); await p.waitForTimeout(200);
  await offMonths(p, "#td22Months", [1, 5, 6, 7, 8, 9, 10, 11, 12]);
  await p.click("#todoSave"); await p.waitForTimeout(900);
  const kf = (await byText(p, "花粉の薬"))[0];
  ok(JSON.stringify(kf?.months) === "[2,3,4]" && kf.due === "2027-02-01" && kf.repeat === "daily", "⑨ added: its months, its first turn in February", kf);

  // ---- the guide
  const gd = await W(p, "guide");
  ok(["長い休憩", "集中のあとの経過メモ", "1日の集中の目標", "くらべて並べる", "サブタスクを買い物リストに", "前回の値段", "寄るところを地図で", "サブタスクを終えた日", "繰り返す月", "買い物中は画面を消さない"].every((w) => gd.includes(w)), "the guide has them");

  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
