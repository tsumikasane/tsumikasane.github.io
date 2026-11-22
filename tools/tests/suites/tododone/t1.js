// the ToDos checked off in すべて go to the tab 完了 (the user's call, 2026-11-22, with screenshots of すべて 5・完了 0):
// a list named 完了 gathers the done ones of every list; すべて keeps those to do
process.env.URL0 = process.env.URL0 || "http://localhost:8765/";
const { chromium } = require("playwright");
const { URL0, P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const T0 = Date.parse("2026-11-01T09:00:00+09:00");
const lists = (name = "完了") => [{ id: "lw", name: "仕事", createdAt: T0 }, { id: "ld", name, createdAt: T0 + 1 }, { id: "lc", name: "持ち物", check: true, createdAt: T0 + 2 }];
const todos = () => [
  { id: "a1", text: "つみかさねアプリ整理", done: false, due: "", createdAt: T0 + 10 },
  { id: "a2", text: "Vポイント獲得", done: false, due: "", createdAt: T0 + 11 },
  { id: "a3", text: "請求書を送る", done: false, due: "", listId: "lw", createdAt: T0 + 12 },
  { id: "d1", text: "資料を印刷", done: true, doneAt: Date.parse("2026-11-20T10:00:00+09:00"), due: "", listId: "lw", createdAt: T0 + 13 },
];
const tabs = (p) => p.$$eval("#todoTabs .td-tab", (l) => l.map((b) => b.getAttribute("aria-label")));
const rows = (p) => p.evaluate(() => [...document.querySelectorAll("#todoList > li")].map((li) => li.classList.contains("dayhead") ? "#" + (li.querySelector("[role=heading]")?.textContent || "") : (li.classList.contains("done") ? "✓" : "") + (li.querySelector(".row-link")?.textContent || li.textContent.trim())));
const check = (p, name) => p.evaluate((name) => [...document.querySelectorAll("#todoList li")].find((li) => li.querySelector(".row-link")?.textContent === name).querySelector(".check").click(), name);
const tab = async (p, label) => { await p.evaluate((label) => [...document.querySelectorAll("#todoTabs .td-tab")].find((b) => b.getAttribute("aria-label").startsWith(label + "、")).click(), label); await p.waitForTimeout(400); };
async function open(b, data) {
  const p = await phone(b, new Date("2026-11-22T22:17:00+09:00"));
  await seed(p, data, "todo");
  await p.evaluate((P) => localStorage.setItem(P + "todoTab", ""), P); await p.reload(); await p.waitForTimeout(900);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, { todos: todos(), todoLists: lists() });
  // すべて: those to do; 完了: the done one of 仕事 (every list's)
  let t = await tabs(p), r = await rows(p);
  ok(t[0] === "すべて、3 件" && t.includes("完了、1 件") && t.includes("仕事、1 件"), "the tabs: すべて 3, 完了 1 (the done ones)", t);
  ok(!r.some((x) => x.includes("資料を印刷")) && !r.includes("#完了"), "すべて: no done one, no 完了 heading", r);
  // checked in すべて: a moment where it was, then gone to 完了
  await check(p, "Vポイント獲得"); await p.waitForTimeout(300);
  r = await rows(p);
  ok(r.includes("✓Vポイント獲得"), "checked: for a moment where it was", r);
  await p.waitForTimeout(1900);
  r = await rows(p); t = await tabs(p);
  ok(!r.some((x) => x.includes("Vポイント獲得")) && t[0] === "すべて、2 件" && t.includes("完了、2 件"), "then gone from すべて, 完了 2", [r, t]);
  // the 完了 tab: both, the newest first; unchecked there, it is back in すべて
  await tab(p, "完了");
  r = await rows(p);
  const at = r.indexOf("✓Vポイント獲得");
  ok(at >= 0 && at < r.indexOf("✓資料を印刷") && !r.some((x) => x === "つみかさねアプリ整理"), "完了: the done ones of every list, newest first", r);
  await check(p, "Vポイント獲得"); await p.waitForTimeout(600);
  r = await rows(p); t = await tabs(p);
  ok(!r.some((x) => x.includes("Vポイント獲得")) && t[0] === "すべて、3 件" && t.includes("完了、1 件"), "unchecked in 完了: gone from it, to do again", [r, t]);
  await tab(p, "すべて");
  r = await rows(p);
  ok(r.includes("Vポイント獲得"), "…and back in すべて", r);
  // 仕事's tab: its done one under its own 完了, as before
  await tab(p, "仕事");
  r = await rows(p);
  ok(r.includes("✓資料を印刷") && r.includes("請求書を送る"), "仕事: its done one there too", r);
  // looked for in すべて: the done one found
  await tab(p, "すべて");
  await p.fill("#todoSearch", "資料"); await p.waitForTimeout(500);
  r = await rows(p);
  ok(r.includes("✓資料を印刷"), "looked for in すべて: found", r);
  await p.fill("#todoSearch", ""); await p.waitForTimeout(400);
  // all done: すべて says so
  for (const n of ["つみかさねアプリ整理", "Vポイント獲得", "請求書を送る"]) { await check(p, n); await p.waitForTimeout(200); }
  await p.waitForTimeout(2000);
  r = await rows(p); t = await tabs(p);
  ok(r.length === 1 && r[0].includes("すべて完了しました") && t[0] === "すべて、0 件" && t.includes("完了、4 件"), "all done: すべて完了しました, 完了 4", [r, t]);
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  // no list named 完了: すべて keeps its own 完了 as before
  p = await open(b, { todos: todos(), todoLists: lists("済み") });
  r = await rows(p);
  ok(r.includes("#完了") && r.includes("✓資料を印刷"), "no list named 完了: すべて's own 完了, as before", r);
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
