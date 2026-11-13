// ToDo その8: the edges, through the hook build at 8783
process.env.URL0 = process.env.URL0 || "http://localhost:8783/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const todo = async (p, id) => (await ls(p, "todos")).find((t) => t.id === id);
const flat = (s) => (s ?? "").replace(/[\s   ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const status = (p) => p.evaluate(() => [document.getElementById("status")?.textContent || "", document.getElementById("sheetStatus").textContent].join("｜")).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td8[f](...a), { f, a });
const E = (p, fn, arg) => p.evaluate(fn, arg);
const hold = async (p, id) => { await p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).closest("li").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), id); await p.waitForTimeout(300); };
const items = (p) => p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent));
const press = async (p, words) => { await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(500); };
const rowSub = (p, id) => p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`)?.closest("li")?.querySelector(".sub.due")?.innerText ?? null, id).then(flat);
const shown = (p, id) => p.evaluate((id) => !!document.querySelector(`#todoList [data-check="${id}"]`), id);
const at = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
async function open(b, when, data = D.all(), o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, ...o });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, data, "todo"); await p.waitForTimeout(1200);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, "2026-11-11T08:30:00+09:00");

  // ---- ① the turns
  const nx = (t) => W(p, "nextOf", t);
  ok(await nx({ text: "x", due: "2026-11-30", repeat: "every3m", repeatFrom: "2026-08-31" }) === "2027-02-28", "① 3か月ごと from the 31st: 2/28", await nx({ text: "x", due: "2026-11-30", repeat: "every3m", repeatFrom: "2026-08-31" }));
  ok(await nx({ text: "x", due: "2027-02-28", repeat: "every3m", repeatFrom: "2026-08-31" }) === "2027-05-31", "① and back to the 31st (5/31)");
  ok(await nx({ text: "x", due: "2026-11-11", repeat: "every2y" }) === "2028-11-11", "① 2年ごと");
  ok(await nx({ text: "x", due: "2026-11-11", repeat: "every10d", repeatUntil: "2026-11-20" }) === null && await nx({ text: "x", due: "2026-11-11", repeat: "every9d", repeatUntil: "2026-11-20" }) === "2026-11-20", "① いつまで kept");
  ok(await nx({ text: "x", due: "2026-11-01", repeat: "every3d" }) === "2026-11-13", "① one late: the next turn after today, on its days (11/13)", await nx({ text: "x", due: "2026-11-01", repeat: "every3d" }));
  ok(await nx({ text: "x", due: "2026-11-11", repeat: "after2m" }) === "2027-01-11", "① 完了から2か月後");
  ok([await W(p, "keyOf", "every", 1, "d"), await W(p, "keyOf", "every", 7, "d"), await W(p, "keyOf", "every", 2, "w"), await W(p, "keyOf", "every", 12, "m"), await W(p, "keyOf", "after", 7, "d"), await W(p, "keyOf", "after", 3, "d"), await W(p, "keyOf", "every", 0, "d"), await W(p, "keyOf", "every", 25, "m")].join()
    === "daily,weekly,biweekly,yearly,after1w,after3d,,", "① the same as one there is that one; out of range none");
  ok((await W(p, "parse", "ゴミ出し 毎週月・木")).repeat === "weekly" && (await W(p, "parse", "掃除 毎日")).repeat === "daily", "① the words there were still read");
  ok(!(await W(p, "parse", "3日にレポート")).repeat, "① 3日 alone is a day, not 3日ごと", await W(p, "parse", "3日にレポート"));
  // rested (その6 ④): the first of its turns after
  await hold(p, "rp3"); await press(p, "繰り返しを休む"); await press(p, "1週間");
  const rp = await todo(p, "rp3");
  ok(["2026-11-20", "2026-11-17"].includes(rp.due) && rp.repeat === "every3d", "① 繰り返しを休む: on one of its turns", rp);
  ok(await p.evaluate(() => !document.querySelector('#todoList [data-check="rp3"]')), "① rested: out of the way (under あとで)");
  await hold(p, "r1");
  ok(!(await items(p)).some((x) => x.startsWith("いつかやるに移す")), "② not a repeat into いつかやる", await items(p));
  await p.click("#todoMenuNo"); await p.waitForTimeout(300);

  // ---- ② found when looked for; out of いまやるなら and the board
  await p.fill("#todoSearch", "ギター"); await p.dispatchEvent("#todoSearch", "input"); await p.waitForTimeout(400);
  ok(await shown(p, "sd1"), "② found when looked for (open)");
  await p.fill("#todoSearch", ""); await p.dispatchEvent("#todoSearch", "input"); await p.waitForTimeout(300);
  ok(!(await W(p, "nowList")).some((id) => id === "sd1" || id === "sd2"), "② not in いまやるなら");
  ok(!(await W(p, "board")).some((id) => id === "sd1" || id === "sd2"), "② not on the board");

  // ---- ③ a 期限 with a time: up to it
  await W(p, "add", { text: "企画書を出す", due: "2026-11-11", time: "13:00", mins: 60, createdAt: Date.now() });
  await p.waitForTimeout(600);
  const kk = (await ls(p, "todos")).find((t) => t.text === "企画書を出す");
  const s1 = (await W(p, "starts"))[kk.id];
  ok(s1 && s1.at === at("2026-11-11", "12:00"), "③ up to its time (13:00): 12:00", s1 && new Date(s1.at).toISOString());
  await W(p, "update", kk.id, { pct: 50 }); await p.waitForTimeout(500);
  const s2 = (await W(p, "starts"))[kk.id];
  ok(!s2, "③ half done: 30 minutes left, not counted (under an hour)", s2);
  ok(!(await W(p, "starts")).e && !(await W(p, "starts")).sd1, "③ none for one overdue or with no 期限");

  // ---- ④ on a list's tab, none; 決めない
  await W(p, "setting", "td8Goal", { n: 5, updatedAt: Date.now() }); await W(p, "render"); await p.waitForTimeout(400);
  ok(!(await p.isHidden("#td8GoalCard")), "④ on すべて");
  await p.locator("#todoTabs button", { hasText: "大学" }).click(); await p.waitForTimeout(400);
  ok(await p.isHidden("#td8GoalCard"), "④ not on a list's tab");
  await p.locator("#todoTabs button", { hasText: "すべて" }).click(); await p.waitForTimeout(400);

  // ---- ⑤ stopped part way: the minutes so far kept
  await hold(p, "c"); await press(p, "5分だけやってみる");
  await p.context().clock.setFixedTime(new Date("2026-11-11T08:33:10+09:00")); await p.waitForTimeout(500);
  await p.click("#focusStop"); await p.waitForTimeout(400);
  ok(Number((await todo(p, "c")).focus) === 3 && await p.isHidden("#td8FiveCard"), "⑤ stopped at 3 minutes: kept, no card", (await todo(p, "c")).focus);
  await p.context().clock.setFixedTime(new Date("2026-11-11T08:40:00+09:00"));

  // ---- ⑦⑧ a list added goes last; the tab showing put away goes to すべて
  await p.click("#todoSettings"); await p.waitForTimeout(800);
  await p.click('#todoListRows li[data-id="l-pack"] .td8-up'); await p.waitForTimeout(500);
  ok((await W(p, "lists")).map((l) => l.name).join() === "持ち物,大学,バイト,前期の授業" && await p.evaluate(() => document.querySelector('#todoListRows li[data-id="l-pack"] .td8-up').disabled), "⑦ ↑ to the top: its ↑ off");
  await p.click("#todoListAdd"); await p.waitForTimeout(600);
  ok((await W(p, "lists")).filter((l) => !l.archived).map((l) => l.name).pop() === "新しいリスト" && await p.evaluate(() => document.activeElement?.closest("li")?.querySelector("input") === document.activeElement), "⑦ a new one last, its name ready to type", (await W(p, "lists")).map((l) => l.name));
  await p.click("#sheetDone"); await p.waitForTimeout(500);
  await p.locator("#todoTabs button", { hasText: "バイト" }).click(); await p.waitForTimeout(400);
  await p.click("#todoSettings"); await p.waitForTimeout(800);
  await p.click('#todoListRows li[data-id="l-job"] .td8-shelve'); await p.waitForTimeout(500);
  await p.click("#sheetDone"); await p.waitForTimeout(500);
  ok((await W(p, "tab")) === "" && await p.evaluate(() => document.querySelector('#todoTabs [aria-pressed="true"]')?.textContent.startsWith("すべて")), "⑧ the tab showing put away: すべて");
  const al = await W(p, "alarms", at("2026-11-11", "08:40"));
  ok(!al.some((a) => /old2/.test(a.tag)) && (await W(p, "dueCount")) >= 0, "⑧ no お知らせ for one put away (前期の授業)");
  ok(!(await W(p, "nowList")).some((id) => id === "j1" || id === "old2"), "⑧ not in いまやるなら");

  // ---- ⑨ a list gone: none fit, said
  await W(p, "setting", "td8Views", { list: [{ id: "v1", name: "消えたリスト", listId: "l-gone" }, { id: "v2", name: "すぐ終わる", mins: 15 }], updatedAt: Date.now() });
  await W(p, "view", { filter: "c:v1" }); await p.waitForTimeout(400);
  ok((await txt(p, "#todoList .empty")) === "「消えたリスト」に合うToDoはありません。", "⑨ none fit: said", await txt(p, "#todoList"));
  await W(p, "view", { filter: "c:v2" }); await p.waitForTimeout(400);
  const ids = await p.evaluate(() => [...document.querySelectorAll("#todoList [data-check]")].map((x) => x.dataset.check));
  ok(ids.join() === "c", "⑨ 15分以内: メールに返信 alone", ids);
  await W(p, "setting", "td8Views", { list: [], updatedAt: Date.now() }); await W(p, "render"); await p.waitForTimeout(400);
  ok((await W(p, "viewNow")) === "" && !(await p.$("#todoList .empty")), "⑨ gone: the list back to all");
  ok(!p.errs.length, "no errors (phone)", p.errs);
  await p.context().close();

  // ---- ⑩ the keys not while a menu is open, nor while picking
  p = await open(b, "2026-11-11T08:30:00+09:00", D.all(), { viewport: { width: 1280, height: 860 }, isMobile: false, hasTouch: false });
  await p.click("#todoMore"); await p.waitForTimeout(300);
  await p.keyboard.press("n"); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => document.getElementById("daySheet").open)), "⑩ not with a menu open");
  await p.click("#todoMenuNo"); await p.waitForTimeout(300);
  await W(p, "selStart", "c"); await p.waitForTimeout(300);
  await p.keyboard.press("j"); await p.waitForTimeout(150);
  await p.keyboard.press("t"); await p.waitForTimeout(400);
  ok((await todo(p, "e")).due === "2026-11-10", "⑩ picking: rows only, no moves", (await todo(p, "e")).due);
  await W(p, "selEnd"); await p.waitForTimeout(300);
  ok(!p.errs.length, "no errors (computer)", p.errs);
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  await b.close();
})();
