// ToDo その21 ①〜⑩, through the hook build at 8829 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8829/";
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
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td21[f](...a), { f, a });
const menu = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(300); await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(600); };
const hold = async (p, id) => { await p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).closest("li").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), id); await p.waitForTimeout(300); };
const items = (p) => p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent));
const press = async (p, words) => { await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(500); };
const undo = async (p) => { await p.locator("#sheetStatus button:visible, #status button:visible").first().click(); await p.waitForTimeout(500); };
const heads = (p) => p.evaluate(() => [...document.querySelectorAll("#todoList .dayhead [role=heading]")].map((x) => x.textContent));
const rowSub = (p, id) => p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`)?.closest("li")?.querySelector(".sub.due")?.innerText ?? null, id).then(flat);
const firstRows = (p, n) => p.evaluate((n) => [...document.querySelectorAll("#todoList [data-check]")].slice(0, n).map((x) => x.dataset.check), n);
const { T } = D;
async function open(b, when, o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, ...o });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  // ① the screen's wake lock, as a phone would have it: asked and let go, counted
  await p.addInitScript(() => { window.__wl = { req: 0, rel: 0 }; Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async () => { window.__wl.req++; return { release: async () => { window.__wl.rel++; }, addEventListener: () => {} }; } } }); });
  const data = D.all();
  // ⑤ two done long ago; ⑥ a 買い物リスト; ⑦ one done with steps
  data.todoLists = [...data.todoLists, { id: "l-shop", name: "買い物", shop: true, order: 5, createdAt: T("2026-10-05") }];
  data.todos = [...data.todos, { id: "o1", text: "前期のテスト", done: true, doneAt: T("2026-05-01"), createdAt: T("2026-04-20") }, { id: "o2", text: "去年の課題", done: true, doneAt: T("2025-10-01"), createdAt: T("2025-09-20") },
    { id: "s1", text: "牛乳", listId: "l-shop", price: 200, createdAt: T("2026-11-09") }, { id: "s2", text: "パン", listId: "l-shop", price: 300, done: true, doneAt: T("2026-11-11", 8), createdAt: T("2026-11-09") },
    { id: "tr", text: "旅行の準備", done: true, doneAt: T("2026-11-05", 20), steps: [{ id: "u1", text: "宿を予約", done: true }, { id: "u2", text: "切符を買う", done: true }], createdAt: T("2026-11-01") }];
  await seed(p, data, "todo"); await p.waitForTimeout(1200);
  return p;
}
const sheetTitle = (p) => p.evaluate(() => document.getElementById("sheetTitle").textContent);
const closeSheet = async (p) => { await p.evaluate(() => { const b = ["sheetDone", "sheetCancel"].map((id) => document.getElementById(id)).find((x) => x && !x.hidden); b?.click(); }); await p.waitForTimeout(700); await p.evaluate(() => { if (document.getElementById("discardAsk").open) document.getElementById("discardYes").click(); }); await p.waitForTimeout(300); };
const moreItems = async (p) => { await p.click("#todoMore"); await p.waitForTimeout(300); const xs = await items(p); await p.keyboard.press("Escape"); await p.waitForTimeout(300); return xs.map(flat); };
const tab = async (p, name) => { await p.locator("#todoTabs button", { hasText: name }).first().click(); await p.waitForTimeout(400); };
const wl = (p) => p.evaluate(() => window.__wl);
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-11T08:30:00+09:00");

  // ---- ① 集中中は画面を消さない
  await W(p, "focus", "c"); await p.waitForTimeout(500);
  ok((await wl(p)).req === 1, "① the focus timer started: the screen kept on", await wl(p));
  await W(p, "stop"); await p.waitForTimeout(500);
  ok((await wl(p)).rel === 1, "① it stopped: let go", await wl(p));
  await p.click("#todoSettings"); await p.waitForTimeout(900);
  ok(await p.isChecked("#td21WakeOn"), "① in ToDo's 編集, on at first");
  await p.locator("#td21WakeOn").uncheck(); await p.waitForTimeout(300);
  await closeSheet(p);
  await W(p, "focus", "c"); await p.waitForTimeout(500);
  ok((await wl(p)).req === 1, "① off: not kept on", await wl(p));
  await W(p, "stop"); await p.waitForTimeout(300);
  await p.evaluate((P) => localStorage.removeItem(P + "td21Wake"), P);

  // ---- ② できることを探す
  await menu(p, "できることの一覧");
  ok((await p.locator("#td21GuideFind").count()) === 1, "② a field over できることの一覧");
  const all = await p.locator(".td9-guide li:visible").count();
  await p.fill("#td21GuideFind", "お知らせを止める"); await p.waitForTimeout(300);
  const hit = await p.evaluate(() => [...document.querySelectorAll(".td9-guide li")].filter((li) => !li.hidden).map((li) => li.querySelector("strong").textContent));
  ok(hit.includes("お知らせを止める") && hit.includes("リストのお知らせを止める") && hit.length < all && hit.length <= 4, "② narrowed to the rows with the words", hit);
  await p.fill("#td21GuideFind", "ぜったいにないことば"); await p.waitForTimeout(300);
  ok(await p.isVisible("#td21GuideNone"), "② none: said so");
  await closeSheet(p);

  // ---- ③ 繰り返しのこれからの回
  await W(p, "edit", "r1"); await p.waitForTimeout(900);
  ok((await txt(p, "#reTurns21")) === "これからの回：11/12（木）・11/16（月）・11/19（木）・11/23（月）・11/26（木）", "③ the next five turns", await txt(p, "#reTurns21"));
  await p.selectOption("#reRepeat", "daily"); await p.waitForTimeout(300);
  ok((await txt(p, "#reTurns21")) === "これからの回は、保存すると出ます。", "③ changed there: save first", await txt(p, "#reTurns21"));
  await closeSheet(p);
  await W(p, "edit", "ra10"); await p.waitForTimeout(900);
  ok((await p.$("#reTurns21")) === null, "③ not for one counted from the day it is done");
  await closeSheet(p);

  // ---- ④ リストのお知らせを止める
  await W(p, "update", "j1", { time: "10:00", remind: true }); await p.waitForTimeout(300);
  const j1At = (al) => al.some((a) => a.url === "./#todo:j1");
  ok(j1At(await W(p, "alarms")), "④ told at first");
  await tab(p, "バイト");
  await menu(p, "「バイト」のお知らせを止める");
  ok((await W(p, "lists")).find((l) => l.id === "l-job").mute === true && !j1At(await W(p, "alarms")), "④ stopped: its ToDos' お知らせ not sent");
  ok((await txt(p, '#todoTabs [data-list="l-job"]')).includes("🔕"), "④ a mark on its tab", await txt(p, '#todoTabs [data-list="l-job"]'));
  await menu(p, "「バイト」のお知らせを再開する");
  ok(j1At(await W(p, "alarms")) && !(await txt(p, '#todoTabs [data-list="l-job"]')).includes("🔕"), "④ and again");

  // ---- ⑥ 買い物リストの予算
  await tab(p, "買い物");
  await menu(p, "「買い物」の予算を決める");
  await p.fill("#todoMenuGroup .ask-field input", "1000"); await p.locator("#todoMenuGroup .ask-go").click(); await p.waitForTimeout(500);
  ok((await W(p, "lists")).find((l) => l.id === "l-shop").budget === 1000, "⑥ kept with the list");
  ok((await txt(p, "#td21Budget")) === "予算1,000円・カゴ300円・まだの分200円・のこり500円", "⑥ in its card", await txt(p, "#td21Budget"));
  await menu(p, "「買い物」の予算"); await p.fill("#todoMenuGroup .ask-field input", "400"); await p.locator("#todoMenuGroup .ask-go").click(); await p.waitForTimeout(500);
  ok((await txt(p, "#td21Budget")).endsWith("・100円こえています") && (await p.getAttribute("#td21Budget", "class")).includes("over"), "⑥ over it: said", await txt(p, "#td21Budget"));
  await tab(p, "すべて");

  // ---- ⑤ 古い完了を片づける
  ok((await moreItems(p)).includes("古い完了を片づける（3か月より前2件）"), "⑤ offered, with how many");
  await menu(p, "古い完了を片づける");
  const asks = (await items(p)).map(flat);
  ok(asks.includes("3か月より前に終えたToDo（2件）を削除") && asks.includes("1年より前に終えたToDo（1件）を削除"), "⑤ each span", asks);
  await press(p, "1年より前");
  ok(!(await todo(p, "o2")) && !!(await todo(p, "o1")), "⑤ those before a year ago gone");
  await undo(p);
  ok(!!(await todo(p, "o2")), "⑤ 元に戻す");

  // ---- ⑦ 前回のサブタスクも
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.fill("#todoText", "旅行の"); await p.waitForTimeout(400);
  await p.locator(".td4-sug", { hasText: "旅行の準備" }).click(); await p.waitForTimeout(400);
  ok(JSON.stringify(await W(p, "steps")) === JSON.stringify([["宿を予約", false], ["切符を買う", false]]), "⑦ its steps too, all to do", await W(p, "steps"));
  ok((await txt(p, "#td21StepsNote")) === "前回のサブタスク2件も入れました（サブタスクの欄）", "⑦ said so", await txt(p, "#td21StepsNote"));
  await closeSheet(p);

  // ---- ⑧ このToDoの歩み
  await W(p, "update", "f", { dueLog: [{ at: T("2026-11-08", 10), from: "2026-11-10", to: "2026-11-13" }], log: [{ text: "書類を用意", at: T("2026-11-09", 9) }], moved: 1 }); await p.waitForTimeout(300);
  await hold(p, "f"); await press(p, "このToDoの歩み");
  let body = await txt(p, "#tdPanelBody");
  ok((await sheetTitle(p)) === "このToDoの歩み" && /銀行で振り込み.*先送り1回.*追加しました.*期限を11\/10（火）から11\/13（金）へ.*経過メモ「書類を用意」/.test(body), "⑧ what happened, in order", body);
  await closeSheet(p);

  // ---- ⑨ 終えたときの気分
  await hold(p, "x1"); await press(p, "終えたときの気分");
  await p.locator("#todoMenuGroup .td21-mood", { hasText: "😄" }).click(); await p.waitForTimeout(400);
  ok((await todo(p, "x1")).mood === 1, "⑨ kept", await todo(p, "x1"));
  await W(p, "update", "x1", { doneNote: "3行だけ" }); await p.waitForTimeout(300);
  await menu(p, "ひとことの一覧");
  ok((await txt(p, "#td19NoteList")).includes("😄「3行だけ」"), "⑨ in ひとことの一覧", await txt(p, "#td19NoteList"));
  await closeSheet(p);
  await menu(p, "完了カレンダー"); await p.locator('.td18-cd[aria-label^="11/10、"]').click(); await p.waitForTimeout(400);
  ok((await txt(p, ".td18-day")).includes("日記を書く😄"), "⑨ in 完了カレンダー", await txt(p, ".td18-day"));
  await closeSheet(p);
  await W(p, "ask", true); await p.waitForTimeout(300);
  await p.click('#todoList [data-check="c"]'); await p.waitForTimeout(900);
  ok((await p.locator("#td9AskCard .td21-mood").count()) === 4, "⑨ under 「どうだった？」 too");
  await p.locator("#td9AskCard .td21-mood", { hasText: "🙂" }).click(); await p.waitForTimeout(400);
  ok((await todo(p, "c")).mood === 2, "⑨ kept from there", await todo(p, "c"));

  // ---- ⑩ 1週間の目標
  await p.click("#todoSettings"); await p.waitForTimeout(900);
  await p.selectOption("#td21WeekSel", "10"); await p.waitForTimeout(400);
  await closeSheet(p);
  const st = await W(p, "stat");
  ok(st.n === 10 && st.got >= 1, "⑩ kept, this week's counted", st);
  ok(await p.isVisible("#td21Week") && (await txt(p, "#td21Week")).startsWith(`今週の目標${st.got}/10`), "⑩ on the goal's card", await txt(p, "#td21Week"));

  // ---- the guide
  const g = await W(p, "guide");
  ok(["集中中は画面を消さない", "できることを探す", "繰り返しのこれからの回", "リストのお知らせを止める", "古い完了を片づける", "買い物リストの予算", "前回のサブタスクも入れる", "このToDoの歩み", "終えたときの気分", "1週間の目標"].every((w) => g.includes(`"${w}"`)), "the guide has them");

  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
