// ToDo その7: the edges (other days and clocks, odd cases, what else counts them)
process.env.URL0 = process.env.URL0 || "http://localhost:8782/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const todo = async (p, id) => (await ls(p, "todos")).find((t) => t.id === id);
const byText = async (p, text) => (await ls(p, "todos")).filter((t) => t.text === text);
const flat = (s) => (s ?? "").replace(/[\s   ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const status = (p) => p.evaluate(() => [document.getElementById("status")?.textContent || "", document.getElementById("sheetStatus").textContent].join("｜")).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td7[f](...a), { f, a });
const menu = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(300); await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(600); };
const hold = async (p, id) => { await p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).closest("li").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), id); await p.waitForTimeout(300); };
const items = (p) => p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent));
const press = async (p, words) => { await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(500); };
const at = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const T = D.T;
async function open(b, when, more = {}, hash = "todo") {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  const data = D.all();
  if (more.todos) data.todos = more.replace ? more.todos : [...data.todos.filter((t) => !more.todos.some((x) => x.id === t.id)), ...more.todos];
  if (more.lists) data.todoLists = [...data.todoLists.filter((l) => !more.lists.some((x) => x.id === l.id)), ...more.lists];
  if (more.settings) data.settings = [...data.settings, ...more.settings];
  await seed(p, data, hash); await p.waitForTimeout(1200);
  return p;
}
(async () => {
  const b = await chromium.launch();
  const errs = [];

  // ---- ② a list all done (紙ふぶき once), one past its 期限, one with none in it; no notifications for one all done
  {
    const p = await open(b, "2026-11-11T08:30:00+09:00", { lists: [{ id: "l-x", name: "引っ越し", order: 2, due: "2026-11-30", createdAt: T("2026-10-01") }, { id: "l-y", name: "旅行", order: 3, due: "2026-11-05", createdAt: T("2026-10-01") }, { id: "l-z", name: "空", order: 4, due: "2026-12-01", createdAt: T("2026-10-01") }],
      todos: [{ id: "x1", text: "箱を買う", listId: "l-x", done: true, doneAt: T("2026-11-09", 10), createdAt: T("2026-11-01") }, { id: "x2", text: "住所変更", listId: "l-x", done: true, doneAt: T("2026-11-10", 10), createdAt: T("2026-11-01") },
        { id: "y1", text: "宿を予約", listId: "l-y", createdAt: T("2026-10-20") }] });
    await p.locator("#todoTabs button", { hasText: "引っ越し" }).click(); await p.waitForTimeout(600);
    ok((await txt(p, "#td7ListCard .td-fc-text")) === "11/30（月）まで、あと19日。このリストのToDoを、ぜんぶ終えました！" && JSON.stringify(await p.evaluate(({ P }) => JSON.parse(localStorage.getItem(P + "td7ListDone")), { P })) === JSON.stringify({ "l-x": "2026-11-30" }), "② all done: said, 紙ふぶき once (kept so)");
    ok(!(await W(p, "alarms", at("2026-11-11", "08:30"))).some((a) => a.tag.startsWith("td-list:l-x")), "② all done: no notifications");
    await p.locator("#todoTabs button", { hasText: "旅行" }).click(); await p.waitForTimeout(500);
    ok((await txt(p, "#td7ListCard .td-fc-text")) === "期限（11/5（木））を6日過ぎています。のこり1件です。" && (await p.$$("#td7ListCard .td7-warn")).length === 2, "② past its 期限: said, in red", await txt(p, "#td7ListCard .td-fc-text"));
    await p.locator("#todoTabs button", { hasText: "空" }).click(); await p.waitForTimeout(500);
    ok((await txt(p, "#td7ListCard .td-fc-n")) === "0/0" && (await txt(p, "#td7ListCard .td-fc-text")).endsWith("このリストにToDoを足すと、進み具合が出ます。"), "② none in it yet");
    await menu(p, "「空」の期限を変える"); await press(p, "期限をなくす");
    ok(!(await ls(p, "todoLists")).find((l) => l.id === "l-z").due && await p.isHidden("#td7ListCard"), "② 期限をなくす: no card");
    errs.push(...p.errs);
    await p.context().close();
  }

  // ---- ③ not before the evening; from 夜のお知らせ's time when it is on; not on a list's tab; a repeat's この回をとばす
  {
    const p = await open(b, "2026-11-11T18:59:00+09:00");
    ok(await p.isHidden("#td7CloseCard"), "③ not before 19:00");
    await p.context().close();
    const q = await open(b, "2026-11-11T20:30:00+09:00", { settings: [{ id: "tdEvening", on: true, at: "21:00", updatedAt: 1 }], todos: [{ id: "r2", text: "日記を書く", due: "2026-11-11", repeat: "daily", createdAt: T("2026-10-01") }] });
    ok(await q.isHidden("#td7CloseCard"), "③ 夜のお知らせ at 21:00: not at 20:30");
    await q.context().close();
    const r = await open(b, "2026-11-11T21:05:00+09:00", { settings: [{ id: "tdEvening", on: true, at: "21:00", updatedAt: 1 }], todos: [{ id: "r2", text: "日記を書く", due: "2026-11-11", repeat: "daily", createdAt: T("2026-10-01") }] });
    ok(await r.isVisible("#td7CloseCard"), "③ …at 21:05");
    await r.locator("#todoTabs button", { hasText: "大学" }).click(); await r.waitForTimeout(400);
    ok(await r.isHidden("#td7CloseCard"), "③ not on a list's tab");
    await r.locator("#todoTabs button", { hasText: "すべて" }).click(); await r.waitForTimeout(400);
    await r.locator("#td7CloseCard button", { hasText: "1件ずつ見直す" }).click(); await r.waitForTimeout(600);
    ok(!!(await r.$('.td7-close-row button[aria-label="「日記を書く」をこの回をとばす"]')) && !(await r.$('.td7-close-row button[aria-label="「日記を書く」を期限なし"]')), "③ a repeat: この回をとばす, not 期限なし");
    await r.locator('.td7-close-row button[aria-label="「日記を書く」をこの回をとばす"]').click(); await r.waitForTimeout(500);
    ok((await todo(r, "r2")).due === "2026-11-12" && !(await todo(r, "r2")).done, "③ この回をとばす: its next turn");
    errs.push(...r.errs);
    await r.context().close();
  }

  // ---- ④ 7 days: a checklist's old check stays, one taken off goes; once a day; only on ToDo's page
  {
    const p = await open(b, "2026-11-11T08:30:00+09:00", { settings: [{ id: "todoTidy", days: 7, updatedAt: 1 }], todos: [{ id: "p9", text: "傘", listId: "l-pack", done: true, doneAt: T("2026-10-20", 8), createdAt: T("2026-10-02", 9, 5) }] }, "home");
    ok(!!(await todo(p, "old1")), "④ not on another page");
    await p.evaluate(() => document.querySelector('button[data-tab="todo"]').click()); await p.waitForTimeout(1200);
    const tidied = ["old1", "p0", "z0", "z1", "z2", "z4", "z5", "z7", "z8", "z10", "z11"].filter((id) => true);
    const xs = await ls(p, "todos");
    ok(!xs.some((t) => t.id === "old1") && !xs.some((t) => t.id === "p0") && xs.some((t) => t.id === "p9") && xs.some((t) => t.id === "p1") && xs.some((t) => t.id === "z3") && (await status(p)).includes("完了してから7日たったToDoを"), "④ 7 days: old ones and a check taken off go; a checklist's check and the recent stay", xs.filter((t) => t.done).map((t) => t.id));
    const n1 = (await ls(p, "todos")).length;
    await W(p, "render"); await p.waitForTimeout(300);
    ok((await ls(p, "todos")).length === n1, "④ once a day");
    errs.push(...p.errs);
    await p.context().close();
  }

  // ---- ⑤ a repeat's step made a ToDo (no 期限); まとめる with a done one and a repeat
  {
    const p = await open(b, "2026-11-11T08:30:00+09:00", { todos: [{ id: "r3", text: "週報", due: "2026-11-13", repeat: "weekly", steps: [{ id: "q1", text: "数字をまとめる" }], createdAt: T("2026-10-01") }] });
    await hold(p, "r3"); await press(p, "サブタスクをToDoにする"); await press(p, "数字をまとめる");
    const q = (await byText(p, "数字をまとめる"))[0];
    ok(q && q.due === "" && !(await todo(p, "r3")).steps, "⑤ from a repeat: no 期限; its steps empty", q);
    await p.locator("#todoList li.dayhead button", { hasText: "表示する" }).click().catch(() => {});
    await menu(p, "選択して、まとめて変える");
    for (const id of ["r1", "c"]) { await p.click(`#todoList [data-check="${id}"]`); await p.waitForTimeout(120); }
    await p.click("#tdSelMore"); await p.waitForTimeout(300); await press(p, "1つのToDoにまとめる");
    ok((await status(p)).includes("繰り返しのToDoは、まとめられません") && !!(await todo(p, "c")), "⑤ a repeat and one more: not made one, said");
    errs.push(...p.errs);
    await p.context().close();
  }

  // ---- ⑥ another's timer running; a step checked there
  {
    const p = await open(b, "2026-11-11T08:30:00+09:00");
    await p.evaluate(({ P }) => localStorage.setItem(P + "focus", JSON.stringify({ kind: "work", todoId: "e", len: 25, end: Date.now() + 10 * 60e3, left: null, at: Date.now() })), { P });
    await hold(p, "b"); await press(p, "このToDoに集中する");
    ok((await txt(p, ".td7-focus-kind")) === "ほかのToDo「資料を読む」の集中タイマーが動いています" && !!(await p.$('.td7-focus-acts button:has-text("このToDoで始める")')), "⑥ another's timer: said, このToDoで始める");
    await p.locator('.td7-focus-steps .td-step', { hasText: "単語帳 2章" }).click(); await p.waitForTimeout(500);
    ok((await todo(p, "b")).steps.find((s) => s.id === "s2").done === true && (await txt(p, ".td7-focus-sub")).includes("サブタスク2/3"), "⑥ a step checked there");
    await p.locator(".td7-focus-acts button", { hasText: "このToDoで始める" }).click(); await p.waitForTimeout(500);
    ok((await W(p, "focus"))?.todoId === "b" && (await txt(p, ".td7-focus-time")) === "25:00", "⑥ the timer on this one now");
    errs.push(...p.errs);
    await p.context().close();
  }

  // ---- ⑦ fewer to do than 8 weeks ago: 減りました
  {
    const old = Array.from({ length: 6 }, (_, i) => ({ id: "o" + i, text: `昔のToDo${i}`, createdAt: T("2026-09-01"), done: true, doneAt: T("2026-11-0" + (2 + i), 10) }));
    const p = await open(b, "2026-11-11T08:30:00+09:00", { replace: true, todos: old });
    await menu(p, "完了のふりかえり");
    ok((await txt(p, ".td7-flow-say")) === "この8週で、追加0件・完了6件。まだのToDoは6件から0件に減りました（-6）。いいペースです！", "⑦ fewer: 減りました", await txt(p, ".td7-flow-say"));
    errs.push(...p.errs);
    await p.context().close();
  }

  // ---- ⑧ 鳴らしてみる sounds even with 鳴らさない (ポン)
  {
    const p = await open(b, "2026-11-11T08:30:00+09:00");
    await p.evaluate(() => { window.__osc = 0; const A = window.AudioContext || window.webkitAudioContext, o = A.prototype.createOscillator; A.prototype.createOscillator = function () { window.__osc++; return o.call(this); }; });
    await p.click("#todoSettings"); await p.waitForTimeout(800);
    await p.click("#td7SoundTry"); await p.waitForTimeout(200);
    ok((await p.evaluate(() => window.__osc)) === 1 && (await W(p, "sound")) === "", "⑧ 鳴らしてみる: ポン, still 鳴らさない");
    await p.selectOption("#td7Sound", "bell"); await p.waitForTimeout(200);
    ok((await p.evaluate(() => window.__osc)) === 4, "⑧ 鈴: three tones");
    errs.push(...p.errs);
    await p.context().close();
  }

  // ---- ⑨ a repeat moved keeps the day its turns count from; no ここへ on its own day
  {
    const p = await open(b, "2026-11-11T08:30:00+09:00");
    await p.click("#todoWeek"); await p.waitForTimeout(600);
    await p.locator("#tdPanelBody .td7-week-move").click(); await p.waitForTimeout(300);
    await p.click('.td7-piece[data-piece="r1"]'); await p.waitForTimeout(300);
    const heres = await p.evaluate(() => [...document.querySelectorAll(".td7-move-day")].map((li) => !!li.querySelector(".td7-here")));
    ok(JSON.stringify(heres) === JSON.stringify([true, false, true, true, true, true, true]), "⑨ no ここへ on its own day (あした)", heres);
    await p.locator(".td7-move-day", { hasText: "11月13日" }).locator(".td7-here").click(); await p.waitForTimeout(500);
    const r1 = await todo(p, "r1");
    ok(r1.due === "2026-11-13" && r1.repeatFrom === "2026-11-12" && r1.repeat === "weekly", "⑨ a repeat moved: its turns still count from 11/12", r1);
    errs.push(...p.errs);
    await p.context().close();
  }

  // ---- ⑩ too big; a repeat's next turn takes them on
  {
    const p = await open(b, "2026-11-11T08:30:00+09:00");
    await p.click('#todoList [data-edit="r1"]'); await p.waitForTimeout(800);
    await p.setInputFiles("#reFiles input[type=file]", { name: "big.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(21 * 1048576, 1) });
    await p.waitForTimeout(800);
    ok(!(await p.$("#reFiles .td7-file-name")) && (await status(p)).includes("20MBより大きいファイルは付けられません"), "⑩ over 20 MB: not kept, said");
    await p.setInputFiles("#reFiles input[type=file]", { name: "分別表.png", mimeType: "image/png", buffer: Buffer.from("png".repeat(400)) });
    await p.waitForTimeout(800);
    await p.click("#sheetCancel"); await p.waitForTimeout(500);
    await p.click('#todoList [data-check="r1"]'); await p.waitForTimeout(2200);
    const next = (await ls(p, "todos")).find((t) => t.text === "ゴミ出し" && !t.done);
    ok(next && next.id !== "r1" && (await W(p, "files", next.id)).length === 1 && (await W(p, "files", "r1")).length === 0, "⑩ done: its file goes on with the next turn", next);
    await p.click('#todoList [data-check="r1"]'); await p.waitForTimeout(2200);
    ok((await W(p, "files", "r1")).length === 1, "⑩ checked back on: the file comes back with it");
    errs.push(...p.errs);
    await p.context().close();
  }

  ok(!errs.length, "no errors", errs);
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  await b.close();
})();
