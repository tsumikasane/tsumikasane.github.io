// ToDo's すべて・完了 in the page's own bar at the foot (the user's call, 2026-11-22, with screenshots of 目標's 進行中・達成
// and ToDo's すべて・完了 tabs): すべて has those to do, split by 種類 (the lists as tabs over them, ぜんぶ first); 完了 has
// the done ones of every list, alone. A list named 完了 (made for these before) is no tab
process.env.URL0 = process.env.URL0 || "http://localhost:8765/";
const { chromium } = require("playwright");
const { URL0, P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const T0 = Date.parse("2026-11-01T09:00:00+09:00");
const lists = () => [{ id: "lw", name: "仕事", createdAt: T0 }, { id: "ld", name: "完了", createdAt: T0 + 1 }, { id: "lc", name: "持ち物", check: true, createdAt: T0 + 2 }];
const todos = () => [
  { id: "a1", text: "つみかさねアプリ整理", done: false, due: "", createdAt: T0 + 10 },
  { id: "a2", text: "Vポイント獲得", done: false, due: "", createdAt: T0 + 11 },
  { id: "a3", text: "請求書を送る", done: false, due: "", listId: "lw", createdAt: T0 + 12 },
  { id: "d1", text: "資料を印刷", done: true, doneAt: Date.parse("2026-11-20T10:00:00+09:00"), due: "", listId: "lw", createdAt: T0 + 13 },
  { id: "c1", text: "傘", done: true, doneAt: Date.parse("2026-11-21T10:00:00+09:00"), due: "", listId: "lc", createdAt: T0 + 14 },
  { id: "c2", text: "財布", done: false, due: "", listId: "lc", createdAt: T0 + 15 },
];
const tabs = (p) => p.$$eval("#todoTabs .td-tab", (l) => l.map((b) => b.getAttribute("aria-label")));
const rows = (p) => p.evaluate(() => [...document.querySelectorAll("#todoList > li")].map((li) => li.classList.contains("dayhead") ? "#" + (li.querySelector("[role=heading]")?.textContent || "") : (li.classList.contains("done") ? "✓" : "") + (li.querySelector(".row-link")?.textContent || li.textContent.trim())));
const check = (p, name) => p.evaluate((name) => [...document.querySelectorAll("#todoList li")].find((li) => li.querySelector(".row-link")?.textContent === name).querySelector(".check").click(), name);
const tab = async (p, label) => { await p.evaluate((label) => [...document.querySelectorAll("#todoTabs .td-tab")].find((b) => b.getAttribute("aria-label").startsWith(label + "、")).click(), label); await p.waitForTimeout(400); };
const part = async (p, n) => { await p.click(`#todoParts button[data-part="${n}"]`); await p.waitForTimeout(400); };
const bar = (p) => p.evaluate(() => { const b = document.getElementById("todoParts"); return { shown: getComputedStyle(b).display !== "none", pressed: [...b.querySelectorAll("button")].filter((x) => x.getAttribute("aria-pressed") === "true").map((x) => x.textContent), names: [...b.querySelectorAll("button")].map((x) => x.textContent) }; });
const shown = (p, sel) => p.evaluate((sel) => { const x = document.querySelector(sel); return !!x && getComputedStyle(x).display !== "none" && !x.hidden; }, sel);
async function open(b, data) {
  const p = await phone(b, new Date("2026-11-22T22:17:00+09:00"));
  await seed(p, data, "todo");
  await p.evaluate((P) => localStorage.setItem(P + "todoTab", ""), P); await p.reload(); await p.waitForTimeout(900);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, { todos: todos(), todoLists: lists() });
  // the bar at the foot: すべて・完了, すべて pressed; over the list, すべて's 種類 (ぜんぶ first, no tab for the list 完了)
  let w = await bar(p), t = await tabs(p), r = await rows(p);
  ok(w.shown && w.names.join() === "すべて,完了" && w.pressed.join() === "すべて", "the bar: すべて・完了, すべて pressed", w);
  ok(t[0] === "ぜんぶ、4 件" && t.includes("仕事、1 件") && t.some((x) => x.startsWith("持ち物、")) && !t.some((x) => x.startsWith("完了、")), "the tabs: ぜんぶ, 仕事, 持ち物 (none for the list 完了)", t);
  ok(await p.evaluate(() => { const b = document.getElementById("todoParts").getBoundingClientRect(), m = document.querySelector(".menu").getBoundingClientRect(); return b.bottom <= m.top && b.height > 40; }), "the bar just over the tab bar, as 目標's");
  ok(!r.some((x) => x.includes("資料を印刷")) && !r.includes("#完了") && r.includes("✓傘"), "すべて: no done one (a checklist's checked one kept in its place), no 完了 heading", r);
  // checked in すべて: a moment where it was, then gone to 完了
  await check(p, "Vポイント獲得"); await p.waitForTimeout(300);
  r = await rows(p);
  ok(r.includes("✓Vポイント獲得"), "checked: for a moment where it was", r);
  await p.waitForTimeout(1900);
  r = await rows(p); t = await tabs(p);
  ok(!r.some((x) => x.includes("Vポイント獲得")) && t[0] === "ぜんぶ、3 件", "then gone from すべて, ぜんぶ 3", [r, t]);
  // 完了: the done ones of every list, newest first, alone (no tabs, no theme for the day); not a checklist's
  await part(p, "done");
  w = await bar(p); r = await rows(p);
  ok(w.pressed.join() === "完了", "完了 pressed", w);
  const at = r.indexOf("✓Vポイント獲得");
  ok(r[0] === "#完了" && at >= 0 && at < r.indexOf("✓資料を印刷") && !r.some((x) => x === "つみかさねアプリ整理" || x.includes("傘")), "完了: the done ones of every list, newest first (a checklist's not)", r);
  ok(!(await shown(p, "#todoTabs")) && !(await shown(p, "#td13Theme")) && await shown(p, "#todoSearchBox"), "完了: the tabs and the day's theme put away, the search kept");
  // unchecked in 完了: gone from it, said with 元に戻す, back in すべて
  await check(p, "Vポイント獲得"); await p.waitForTimeout(500);
  r = await rows(p);
  ok(!r.some((x) => x.includes("Vポイント獲得")) && /「Vポイント獲得」を未完了に戻しました/.test(await p.evaluate(() => document.getElementById("status").textContent)), "unchecked in 完了: gone from it, said so", r);
  await part(p, "open");
  r = await rows(p); t = await tabs(p);
  ok(r.includes("Vポイント獲得") && t[0] === "ぜんぶ、4 件", "…and back in すべて", [r, t]);
  // 仕事 (a 種類): its own to do; its done one is in 完了. The tab is kept across 完了 and back
  await tab(p, "仕事");
  r = await rows(p);
  ok(r.includes("請求書を送る") && !r.some((x) => x.includes("資料を印刷")) && !r.includes("つみかさねアプリ整理"), "仕事: its own to do only", r);
  await part(p, "done");
  r = await rows(p);
  ok(r.includes("✓資料を印刷") && r.includes("✓傘") === false, "完了 from 仕事: every list's done ones", r);
  await p.click("#todoMore"); await p.waitForTimeout(300);
  const items = await p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent));
  ok(items.includes("完了した 1 件を削除") && !items.some((x) => x.includes("「仕事」")) && await p.evaluate(() => document.getElementById("todoMenuMsg").textContent === "ToDo"), "完了's その他: its done ones, nothing for 仕事 (no list showing)", items.filter((x) => /完了した|「仕事」/.test(x)));
  await p.evaluate(() => document.getElementById("todoMenuNo").click()); await p.waitForTimeout(300);
  await part(p, "open");
  ok((await tabs(p)).find((x) => x.startsWith("仕事、")) && await p.evaluate(() => document.querySelector('#todoTabs [aria-pressed="true"]')?.getAttribute("aria-label").startsWith("仕事、")), "back in すべて: 仕事 still pressed");
  // looked for in すべて: the done one found
  await tab(p, "ぜんぶ");
  await p.fill("#todoSearch", "資料"); await p.waitForTimeout(500);
  r = await rows(p);
  ok(r.includes("✓資料を印刷"), "looked for in すべて: found", r);
  await p.fill("#todoSearch", ""); await p.waitForTimeout(400);
  // a new one from 完了: すべて, where it is
  await part(p, "done");
  await p.click("#todoAdd"); await p.waitForTimeout(600);
  await p.fill("#todoText", "牛乳を買う"); await p.click("#todoSave"); await p.waitForTimeout(600);
  if (await p.evaluate(() => document.getElementById("daySheet")?.open)) { await p.click("#sheetCancel"); await p.waitForTimeout(500); }
  w = await bar(p); r = await rows(p);
  ok(w.pressed.join() === "すべて" && r.includes("牛乳を買う"), "added from 完了: すべて, the new one in it", [w, r]);
  // all done: すべて says so
  for (const n of ["つみかさねアプリ整理", "Vポイント獲得", "牛乳を買う"]) { await check(p, n); await p.waitForTimeout(200); }
  await p.waitForTimeout(2000);
  r = await rows(p);
  ok(r.includes("✓傘") && r.includes("財布") && !r.includes("つみかさねアプリ整理"), "ぜんぶ: the checklist's as they were", r);
  await tab(p, "仕事");
  await check(p, "請求書を送る"); await p.waitForTimeout(2200);
  r = await rows(p);
  ok(r.length === 1 && r[0].includes("すべて完了しました"), "仕事 all done: すべて完了しました", r);
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  // none done yet: 完了 says so; きょうやるだけ puts the bar away with the tools
  p = await open(b, { todos: [{ id: "n1", text: "本を返す", done: false, due: "", today: "2026-11-22", createdAt: T0 }, { id: "n2", text: "写真の整理", done: false, due: "", createdAt: T0 + 1 }], todoLists: [] });
  await part(p, "done");
  r = await rows(p);
  ok(r.length === 1 && r[0].includes("完了したToDoは、まだありません。"), "完了 with none: said so", r);
  await part(p, "open");
  const only = await p.evaluate(() => { const x = [...document.querySelectorAll("#tdFocusCard button")].find((y) => /だけ/.test(y.textContent)); if (x) x.click(); return !!x; });
  await p.waitForTimeout(500);
  w = await bar(p);
  ok(only && !w.shown, "きょうやるだけ: the bar put away", w);
  const back = await p.evaluate(() => { const x = [...document.querySelectorAll("#tdFocusCard button")].find((y) => /戻る/.test(y.textContent)); if (x) x.click(); return !!x; });
  await p.waitForTimeout(500);
  w = await bar(p);
  ok(back && w.shown && w.pressed.join() === "すべて", "すべてのToDoに戻る: the bar back", w);
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
