// ToDo その12 ①〜⑩, through the hook build at 8823 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8823/";
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
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td15[f](...a), { f, a });
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
  await seed(p, D.all(), "todo"); await p.waitForTimeout(1200);
  return p;
}
const sheetTitle = (p) => p.evaluate(() => document.getElementById("sheetTitle").textContent);
const closeSheet = async (p) => { await p.evaluate(() => { const b = ["sheetDone", "sheetCancel"].map((id) => document.getElementById(id)).find((x) => x && !x.hidden); b?.click(); }); await p.waitForTimeout(700); await p.evaluate(() => { if (document.getElementById("discardAsk").open) document.getElementById("discardYes").click(); }); await p.waitForTimeout(300); };
const T = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-11T08:30:00+09:00");
  const NOW = T("2026-11-11", "08:30");

  // ---- ① お知らせを止める
  const before = await W(p, "alarms", NOW);
  ok(before.some(([tag]) => tag.startsWith("todo:h:")), "① 薬を飲む's お知らせ there at first", before.slice(0, 5));
  await menu(p, "ToDoのお知らせを止める");
  await press(p, "1週間");
  ok((await W(p, "set")).mute.until === "2026-11-17", "① until 11/17", await W(p, "set"));
  const muted = await W(p, "alarms", NOW);
  ok(muted.every(([, at]) => at >= T("2026-11-18", "00:00")), "① none of ToDo's before 11/18", muted.slice(0, 3));
  ok(await p.isVisible("#td15MuteBar") && (await txt(p, "#td15MuteBar")).includes("11/17（火）まで止めています"), "① said over the list", await txt(p, "#td15MuteBar"));
  await p.click("#td15MuteBar .link-btn"); await p.waitForTimeout(400);
  ok(!(await W(p, "set")).mute.until && !(await p.isVisible("#td15MuteBar")) && (await W(p, "alarms", NOW)).some(([tag]) => tag.startsWith("todo:h:")), "① 再開する: back");

  // ---- ② 祝日はとばす (11/23 is 勤労感謝の日)
  await W(p, "add", { id: "mon", text: "月曜のゴミ", due: "2026-11-16", repeat: "weekly", createdAt: T("2026-11-01", "09:00") }); await p.waitForTimeout(300);
  const monId = (await byText(p, "月曜のゴミ"))[0].id;
  ok((await W(p, "next", monId)) === "2026-11-23", "② without it: 11/23", await W(p, "next", monId));
  await p.click(`#todoList [data-edit="${monId}"]`); await p.waitForTimeout(800);
  ok(await p.isVisible("#reHol15"), "② under 繰り返し in its sheet");
  await p.locator("#reHol15").click({ force: true }); await p.waitForTimeout(200);
  await p.click("#recSave"); await p.waitForTimeout(700);
  ok((await todo(p, monId)).noHol === true && (await W(p, "next", monId)) === "2026-11-30", "② kept: its next turn 11/30", [await todo(p, monId), await W(p, "next", monId)]);
  await W(p, "update", monId, { due: "2026-11-16" }); await p.waitForTimeout(200);
  await p.click(`#todoList [data-check="${monId}"]`); await p.waitForTimeout(2200);
  const nextTurn = (await byText(p, "月曜のゴミ")).find((t) => !t.done);
  ok(nextTurn && nextTurn.due === "2026-11-30" && nextTurn.noHol === true, "② done: the next turn on 11/30, still skipping", nextTurn);
  // the new form: shown while it repeats
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  ok(!(await p.isVisible("#td15Hol")), "② hidden with no repeat");
  await p.fill("#todoText", "週の振り返り"); await p.dispatchEvent("#todoText", "input");
  await p.fill("#todoDue", "2026-11-16"); await p.dispatchEvent("#todoDue", "change");
  await p.selectOption("#todoRepeat", "weekly"); await p.waitForTimeout(200);
  ok(await p.isVisible("#td15Hol"), "② shown once it repeats");
  await p.locator("#td15Hol").click({ force: true });
  await p.click("#todoSave"); await p.waitForTimeout(700);
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  const wk = (await byText(p, "週の振り返り"))[0];
  ok(wk && wk.noHol === true && (await W(p, "next", wk.id)) === "2026-11-30", "② from the new form", wk);

  // ---- ③ 予定と重なる (薬を飲む 20:00 in バイト 13:00〜21:50)
  ok((await rowSub(p, "h")).includes("予定と重なる（バイト）"), "③ on its row", await rowSub(p, "h"));
  await p.click('#todoList [data-edit="h"]'); await p.waitForTimeout(800);
  ok((await txt(p, "#reClash15")).includes("「バイト」（13:00〜21:50）と重なっています"), "③ under its time", await txt(p, "#reClash15"));
  await p.fill("#reTime", "22:30"); await p.dispatchEvent("#reTime", "change"); await p.waitForTimeout(200);
  ok(!(await p.isVisible("#reClash15")), "③ a time clear of it: nothing said");
  await closeSheet(p);
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.fill("#todoText", "質問をまとめる"); await p.dispatchEvent("#todoText", "input");
  await p.fill("#todoDue", "2026-11-12"); await p.dispatchEvent("#todoDue", "change");
  await p.fill("#todoTime", "11:00"); await p.dispatchEvent("#todoTime", "change"); await p.waitForTimeout(200);
  ok((await txt(p, "#td15Clash")).includes("「英語」（10:40〜12:10）"), "③ the new form: 英語 on Thursday", await txt(p, "#td15Clash"));
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  await p.evaluate(() => { if (document.getElementById("discardAsk")?.open) document.getElementById("discardYes").click(); }); await p.waitForTimeout(300);

  // ---- ④ 混んでいる日をならす: three of 2 hours on 11/16, brought forward
  for (const [i, n] of [["l1", "発表の練習"], ["l2", "論文を読む"], ["l3", "資料を作る"]]) await W(p, "add", { id: i, text: n, due: "2026-11-16", mins: 120, createdAt: T("2026-11-05", "09:00") });
  await p.waitForTimeout(300);
  const plan = await W(p, "plan");
  ok(plan.length >= 1 && plan.every((m) => m.from === "2026-11-16" && m.to < "2026-11-16" && m.to >= "2026-11-11"), "④ brought forward from 11/16", plan);
  await menu(p, "混んでいる日をならす");
  ok((await sheetTitle(p)) === "混んでいる日をならす" && (await p.evaluate(() => document.querySelectorAll(".td15-move").length)) === plan.length, "④ the plan shown");
  if (plan.length > 1) { await p.locator(".td15-move input").last().uncheck(); await p.waitForTimeout(100); }
  await p.locator("#tdPanelBody .td-plan-go button").click(); await p.waitForTimeout(500);
  const movedTo = (await ls(p, "todos")).filter((t) => ["発表の練習", "論文を読む", "資料を作る"].includes(t.text) && t.due !== "2026-11-16").length;
  ok(movedTo === Math.max(1, plan.length - 1) && (await status(p)).includes("前に動かして"), "④ the ticked ones moved", [movedTo, await status(p)]);
  await undo(p);
  ok((await ls(p, "todos")).filter((t) => ["発表の練習", "論文を読む", "資料を作る"].includes(t.text)).every((t) => t.due === "2026-11-16"), "④ 元に戻す");
  await closeSheet(p);

  // ---- ⑤ リストをまとめる (バイト into 大学)
  await p.locator("#todoTabs button", { hasText: "バイト" }).click(); await p.waitForTimeout(400);
  await menu(p, "「バイト」をほかのリストにまとめる");
  ok((await items(p)).includes("大学") && !(await items(p)).includes("バイト"), "⑤ the other lists offered", await items(p));
  await press(p, "大学");
  ok((await todo(p, "j1")).listId === "l-uni" && !(await W(p, "lists")).some((l) => l.id === "l-job"), "⑤ its ToDos in 大学, the list gone");
  ok((await p.evaluate(() => document.querySelector('#todoTabs [aria-pressed="true"]')?.textContent || "")).includes("大学"), "⑤ 大学 shown");
  await undo(p);
  ok((await todo(p, "j1")).listId === "l-job" && (await W(p, "lists")).some((l) => l.id === "l-job" && l.name === "バイト"), "⑤ 元に戻す: as it was");
  await p.locator("#todoTabs button", { hasText: "すべて" }).click(); await p.waitForTimeout(400);

  // ---- ⑥ おすすめ順
  await W(p, "view", { sort: "rec" }); await p.waitForTimeout(400);
  const first = await p.evaluate(() => [...document.querySelectorAll("#todoList li:not(.done) [data-check]")].slice(0, 3).map((x) => x.dataset.check));
  ok(JSON.stringify(first) === '["e","g","a"]', "⑥ 期限切れの重要, then the ones begun and due tomorrow", first);
  ok((await heads(p)).some((h) => h.startsWith("おすすめ順")), "⑥ its heading", await heads(p));
  await W(p, "view", { sort: "" }); await p.waitForTimeout(300);

  // ---- ⑦ 時間を決めて集中する
  await hold(p, "c"); await press(p, "時間を決めて集中する");
  await p.locator("#todoMenuGroup button").filter({ hasText: /^45\s*分$/ }).click(); await p.waitForTimeout(400);
  const fc = await W(p, "focus");
  ok(fc && fc.todoId === "c" && fc.len === 45 && fc.kind === "work", "⑦ 45 minutes on it", fc);
  ok((await status(p)).includes("45分"), "⑦ said", await status(p));
  await p.evaluate(() => document.getElementById("focusStop")?.click()); await p.waitForTimeout(300);

  // ---- ⑧ 見積もりのくせ (three done taking 1.5 times as long)
  for (const [i, m, f] of [["x1", 30, 45], ["x2", 60, 90], ["x3", 20, 30]]) await W(p, "add", { id: i, text: `前の${i}`, done: true, doneAt: T("2026-11-09", "20:00"), mins: m, focus: f, createdAt: T("2026-11-08", "09:00") });
  await p.waitForTimeout(300);
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.selectOption("#todoMins", "60"); await p.waitForTimeout(200);
  ok((await txt(p, "#td15Habit")).includes("これまでの4件では、見積もりの1.3倍") && (await txt(p, "#td15Habit")).includes("1時間15分ほど"), "⑧ the hint under かかる時間 (with the one done before)", await txt(p, "#td15Habit"));
  await p.locator("#td15Habit .link-btn").click(); await p.waitForTimeout(200);
  ok((await p.inputValue("#todoMins")) === "90", "⑧ a press: 1時間30分", await p.inputValue("#todoMins"));
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  await p.evaluate(() => { if (document.getElementById("discardAsk")?.open) document.getElementById("discardYes").click(); }); await p.waitForTimeout(300);

  // ---- ⑨ 残りの推移
  await p.locator("#todoTabs button", { hasText: "大学" }).click(); await p.waitForTimeout(400);
  await menu(p, "「大学」の残りの推移");
  const left = await W(p, "trend");
  const uniLeft = (await ls(p, "todos")).filter((t) => t.listId === "l-uni" && !t.done && !t.cancelled).length;
  ok((await sheetTitle(p)) === "残りの推移" && left.length === 30 && left[29] === uniLeft, "⑨ 30 days, today's as many as are left", [left.slice(-3), uniLeft]);
  ok((await p.evaluate(() => document.querySelector(".td15-line")?.getAttribute("points").split(" ").length)) === 30 && !!(await p.$(".td15-ideal")), "⑨ its line, and the dashed one to the list's 期限");
  ok((await txt(p, ".td15-trend-head")).startsWith(`いま${uniLeft}件`), "⑨ said", await txt(p, ".td15-trend-head"));
  const box = await p.locator(".td15-chart").boundingBox();
  await p.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2); await p.waitForTimeout(150);
  ok(await p.isVisible(".td15-tip") && /件$/.test(await txt(p, ".td15-tip")), "⑨ a day's number at the pointer", await txt(p, ".td15-tip"));
  ok((await p.evaluate(() => document.querySelectorAll(".td15-table tbody tr").length)) === 30, "⑨ as a table too");
  await closeSheet(p);
  await p.locator("#todoTabs button", { hasText: "すべて" }).click(); await p.waitForTimeout(400);

  // ---- ⑩ つづきを追加
  ok((await W(p, "nextName", "単語帳 1章")) === "単語帳 2章" && (await W(p, "nextName", "課題(2/5)")) === "課題(3/5)" && (await W(p, "nextName", "第９話を見る")) === "第１０話を見る"
    && (await W(p, "nextName", "p.05まで読む")) === "p.06まで読む" && (await W(p, "nextName", "2026年度のまとめ")) === "" && (await W(p, "nextName", "レポートを書く")) === "", "⑩ the next number");
  await W(p, "add", { id: "ch", text: "テキスト 第3回", due: "2026-11-11", listId: "l-uni", createdAt: T("2026-11-10", "09:00") }); await p.waitForTimeout(300);
  const chId = (await byText(p, "テキスト 第3回"))[0].id;
  await hold(p, chId);
  ok((await items(p)).includes("つづきを追加（「テキスト 第4回」）"), "⑩ in its menu", await items(p));
  await press(p, "つづきを追加"); await press(p, "あした");
  const nx = (await byText(p, "テキスト 第4回"))[0];
  ok(nx && nx.due === "2026-11-12" && nx.listId === "l-uni" && !nx.done, "⑩ added for tomorrow, in its list", nx);
  await undo(p);
  ok(!(await byText(p, "テキスト 第4回")).length, "⑩ 元に戻す");
  await hold(p, "c");
  ok(!(await items(p)).some((x) => x.startsWith("つづき")), "⑩ not for a name with no number");
  await p.click("#todoMenuNo"); await p.waitForTimeout(300);

  ok((await W(p, "guide")).includes("祝日はとばす") && (await W(p, "guide")).includes("残りの推移"), "the guide says them");
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
