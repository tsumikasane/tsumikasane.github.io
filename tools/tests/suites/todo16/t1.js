// ToDo その12 ①〜⑩, through the hook build at 8824 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8824/";
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
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td16[f](...a), { f, a });
const menu = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(300); await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(600); };
const hold = async (p, id) => { await p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).closest("li").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), id); await p.waitForTimeout(300); };
const items = (p) => p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent));
const press = async (p, words) => { await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(500); };
const undo = async (p) => { await p.locator("#sheetStatus button:visible, #status button:visible").first().click(); await p.waitForTimeout(500); };
const heads = (p) => p.evaluate(() => [...document.querySelectorAll("#todoList .dayhead [role=heading]")].map((x) => x.textContent));
const rowSub = (p, id) => p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`)?.closest("li")?.querySelector(".sub.due")?.innerText ?? null, id).then(flat);
const firstRows = (p, n) => p.evaluate((n) => [...document.querySelectorAll("#todoList [data-check]")].slice(0, n).map((x) => x.dataset.check), n);
async function open(b, when, o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, ...o });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  const data = D.all();
  data.shifts = [{ id: "sh1", date: "2026-11-13", start: "17:00", end: "22:00", createdAt: 1 }, { id: "sh2", date: "2026-11-15", start: "10:00", end: "15:00", createdAt: 2 }];
  data.settings = [...data.settings, { id: "focusLog", days: { "2026-11-10": 50, "2026-11-11": 25 }, updatedAt: 1 }];
  data.wxPlace = { lat: 35.68, lon: 139.76, name: "東京" };
  data.wxData = { daily: { time: ["2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14"], weather_code: [1, 3, 63, 1], precipitation_probability_max: [10, 30, 80, 0] } };
  await seed(p, data, "todo"); await p.waitForTimeout(1200);
  return p;
}
const sheetTitle = (p) => p.evaluate(() => document.getElementById("sheetTitle").textContent);
const closeSheet = async (p) => { await p.evaluate(() => { const b = ["sheetDone", "sheetCancel"].map((id) => document.getElementById(id)).find((x) => x && !x.hidden); b?.click(); }); await p.waitForTimeout(700); await p.evaluate(() => { if (document.getElementById("discardAsk").open) document.getElementById("discardYes").click(); }); await p.waitForTimeout(300); };
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-11T08:30:00+09:00");

  // ---- ① 期限の記録
  await hold(p, "f"); await press(p, "あしたに移す");
  let f = await todo(p, "f");
  ok(f.due === "2026-11-12" && f.dueLog?.length === 1 && f.dueLog[0].from === "2026-11-13" && f.dueLog[0].to === "2026-11-12", "① a move kept with when", f.dueLog);
  await p.click('#todoList [data-edit="f"]'); await p.waitForTimeout(800);
  ok((await txt(p, "#reLog16")).includes("期限を1回動かしました：11/13→11/12（きょうに）"), "① said under the 期限", await txt(p, "#reLog16"));
  await p.fill("#reDue", "2026-11-20"); await p.dispatchEvent("#reDue", "change");
  await p.click("#recSave"); await p.waitForTimeout(700);
  f = await todo(p, "f");
  ok(f.dueLog.length === 2 && f.dueLog[1].from === "2026-11-12" && f.dueLog[1].to === "2026-11-20", "① its sheet's change kept too", f.dueLog);
  await undo(p);
  ok((await todo(p, "f")).dueLog.length === 1, "① 元に戻す takes it back with it");

  // ---- ② まとめてサブタスク
  await p.click('#todoList [data-edit="a"]'); await p.waitForTimeout(800);
  await p.click("#recForm .td16-bulk-open"); await p.waitForTimeout(200);
  await p.fill("#recForm .td16-bulk-in", "資料を集める\n構成を決める\n・書く"); 
  await p.locator("#recForm .td16-bulk button", { hasText: "サブタスクにする" }).click(); await p.waitForTimeout(300);
  ok(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll("#reSteps .td-step-name")].map((x) => x.value))) === '["資料を集める","構成を決める","書く"]', "② the lines its steps", await p.evaluate(() => [...document.querySelectorAll("#reSteps .td-step-name")].map((x) => x.value)));
  ok(!(await p.isVisible("#recForm .td16-memo-steps")), "② one line of memo: not offered");
  await p.fill("#reMemo", "買うもの\n・ノート\n・ペン"); await p.dispatchEvent("#reMemo", "input"); await p.waitForTimeout(100);
  ok(await p.isVisible("#recForm .td16-memo-steps"), "② two lines and more: offered");
  await p.click("#recForm .td16-memo-steps"); await p.waitForTimeout(300);
  ok((await p.inputValue("#reMemo")) === "" && (await p.evaluate(() => document.querySelectorAll("#reSteps .td-step-name").length)) === 6, "② the memo's lines steps, the memo empty");
  await p.click("#recSave"); await p.waitForTimeout(700);
  const a = await todo(p, "a");
  ok(a.steps.length === 6 && a.steps[5].text === "ペン" && !a.memo, "② saved", a.steps?.map((s) => s.text));

  // ---- ③ 次のバイトの前に
  ok((await W(p, "shifts")).length === 2, "③ the next shifts", await W(p, "shifts"));
  await hold(p, "lw"); await press(p, "次のバイトの前にする");
  await p.locator("#todoMenuGroup button", { hasText: "17:00〜22:00" }).click(); await p.waitForTimeout(400);
  const lw = await todo(p, "lw");
  ok(lw.due === "2026-11-13" && lw.time === "17:00" && (await status(p)).includes("バイトの前"), "③ its 期限 the shift's day, its start the time", lw);

  // ---- ④ 左スワイプのボタン
  await p.click("#todoSettings"); await p.waitForTimeout(800);
  await p.selectOption("#td16Swipe0", "some"); await p.waitForTimeout(150);
  await p.selectOption("#td16Swipe2", "del"); await p.waitForTimeout(150);
  ok(JSON.stringify((await W(p, "set")).swipe) === '["some","d1","del"]', "④ kept", await W(p, "set"));
  await p.click("#sheetDone"); await p.waitForTimeout(700);
  const acts = await p.evaluate(() => [...document.querySelector('#todoList [data-check="c"]').closest("li").querySelectorAll(".swipe-acts > button")].map((x) => x.className));
  ok(JSON.stringify(acts) === '["swipe-act td16-act-some","swipe-act td16-act-d1","swipe-act td16-act-del"]', "④ the row's buttons", acts);
  await p.evaluate(() => document.querySelector('#todoList [data-check="c"]').closest("li").querySelector(".td16-act-del").click()); await p.waitForTimeout(400);
  ok(!(await todo(p, "c")), "④ 削除 from the swipe");
  await undo(p);
  ok(!!(await todo(p, "c")), "④ 元に戻す");
  await W(p, "setting", "td16", { swipe: ["d0", "d1", "d7"], updatedAt: Date.now() }); await p.waitForTimeout(300);

  // ---- ⑤ 集中した時間（14日）
  await menu(p, "ToDoの記録");
  ok((await p.evaluate(() => document.querySelectorAll(".td16-chart .td16-bar").length)) === 2 && (await txt(p, ".td16-focus .td15-trend-head")).startsWith("1時間15分"), "⑤ two days' columns, and the total", await txt(p, ".td16-focus .td15-trend-head"));
  ok((await p.evaluate(() => document.querySelectorAll(".td16-focus + .td15-table tbody tr").length)) === 14, "⑤ as a table too");
  await closeSheet(p);

  // ---- ⑥ 期限を文字で決める
  ok(JSON.stringify(await W(p, "words", "金曜")) === '{"due":"2026-11-13","time":""}' && JSON.stringify(await W(p, "words", "あした15時")) === '{"due":"2026-11-12","time":"15:00"}' && (await W(p, "words", "なにか")) === null, "⑥ the words read");
  await hold(p, "k8"); await press(p, "期限を文字で決める");
  await p.fill(".td16-words-in", "あした15時"); await p.dispatchEvent(".td16-words-in", "input"); await p.waitForTimeout(100);
  ok((await txt(p, ".td16-words-say")).includes("11月12日（木）15:00にします"), "⑥ said as it is typed", await txt(p, ".td16-words-say"));
  await p.click(".td16-words .ask-go"); await p.waitForTimeout(400);
  const k8 = await todo(p, "k8");
  ok(k8.due === "2026-11-12" && k8.time === "15:00" && k8.dueLog?.length === 1, "⑥ its 期限 and time (and ① its record)", k8);

  // ---- ⑦ リストをぜんぶ終えたら
  await W(p, "add", { id: "q1x", text: "宿を予約", listId: "l-job", done: true, doneAt: Date.parse("2026-11-10T10:00:00+09:00"), createdAt: 1 });
  await W(p, "add", { id: "q2x", text: "切符を買う", listId: "l-job", done: true, doneAt: Date.parse("2026-11-10T11:00:00+09:00"), createdAt: 2 });
  await p.waitForTimeout(300);
  await p.locator("#todoTabs button", { hasText: "バイト" }).click(); await p.waitForTimeout(400);
  await p.click('#todoList [data-check="j1"]'); await p.waitForTimeout(1400);
  ok((await status(p)).includes("「バイト」のToDoを、ぜんぶ終えました！") && (await status(p)).includes("リストをしまう"), "⑦ said, with しまう", await status(p));
  await p.locator("#status button:visible, #sheetStatus button:visible").first().click(); await p.waitForTimeout(500);
  ok((await W(p, "lists")).find((l) => l.id === "l-job").archived === true, "⑦ put away");
  await p.locator("#todoTabs button", { hasText: "すべて" }).click(); await p.waitForTimeout(400);

  // ---- ⑧ 雨の日 (銀行 on 11/20 now; back to 11/13 with 80%)
  await W(p, "update", "f", { due: "2026-11-13" }); await p.waitForTimeout(300);
  ok((await rowSub(p, "f")).includes("☔80%"), "⑧ ☔ on a rainy 期限 with a place", await rowSub(p, "f"));
  ok(!(await rowSub(p, "c")).includes("☔"), "⑧ not on one with no place");

  // ---- ⑨ ひな形からリスト
  await menu(p, "ひな形からリストを作る");
  await press(p, "旅行の持ち物");
  const tl = (await W(p, "lists")).find((l) => l.name === "旅行の持ち物");
  const tt = (await ls(p, "todos")).filter((t) => tl && t.listId === tl.id);
  ok(tl && tl.check === true && tt.length === 12 && tt.every((t) => !t.due && !t.done), "⑨ a checklist with its twelve", [tl, tt.length]);
  await undo(p);
  ok(!(await W(p, "lists")).some((l) => l.name === "旅行の持ち物") && !(await ls(p, "todos")).some((t) => t.listId === tl.id), "⑨ 元に戻す");

  // ---- ⑩ 頼まれごと
  await hold(p, "c"); await press(p, "頼まれごとにする");
  await p.fill("#todoMenuGroup .ask-field input", "店長"); await p.click("#todoMenuGroup .ask-go"); await p.waitForTimeout(400);
  ok((await todo(p, "c")).from === "店長" && (await rowSub(p, "c")).includes("店長から"), "⑩ who asked, on its row", await rowSub(p, "c"));
  await p.click('#todoList [data-check="c"]'); await p.waitForTimeout(1800);
  await p.evaluate(() => { window.__sent = []; navigator.share = async (x) => { window.__sent.push(x); }; });
  await hold(p, "c"); await press(p, "終わったと伝える（店長）");
  ok((await p.evaluate(() => window.__sent[0]?.text || "")) === "店長さん\n「メールに返信」、終わりました。", "⑩ said done", await p.evaluate(() => window.__sent[0]));
  await hold(p, "g"); await press(p, "頼まれごとにする");
  ok((await items(p)).includes("店長"), "⑩ the name given before offered", await items(p));
  await p.click("#todoMenuNo"); await p.waitForTimeout(300);

  ok((await W(p, "guide")).includes("期限の記録") && (await W(p, "guide")).includes("頼まれごと"), "the guide says them");
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
