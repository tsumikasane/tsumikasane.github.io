// ToDo その12 ⑤⑥⑦⑨⑩, through the hook build at 8820 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8820/";
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
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td12[f](...a), { f, a });
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
(async () => {
  const b = await chromium.launch();
  let p = await open(b, "2026-11-11T08:30:00+09:00");

  // ---- ⑤ ToDoの記録
  const st = await W(p, "stats");
  ok(st.total > 10 && st.best && st.bestWeek && st.longest >= st.cur && st.today === 1, "⑤ the numbers", st);
  await menu(p, "ToDoの記録");
  ok((await p.evaluate(() => document.getElementById("sheetTitle").textContent)) === "ToDoの記録", "⑤ its panel");
  const rec = await txt(p, "#tdPanelBody");
  ok(rec.includes(`これまでに終えたToDo${st.total}件`) && rec.includes("いちばん多く終えた日") && rec.includes("続けて終えた日") && rec.includes("自己ベスト"), "⑤ shown", rec);
  await p.click("#sheetDone").catch(() => p.click("#sheetCancel")); await p.waitForTimeout(600);

  // ---- ⑥ 最近開いたToDo
  for (const id of ["a", "c"]) { await p.click(`#todoList [data-edit="${id}"]`); await p.waitForTimeout(700); await p.click("#sheetCancel"); await p.waitForTimeout(600); }
  ok(JSON.stringify(await W(p, "recent")) === '["c","a"]', "⑥ noted, newest first", await W(p, "recent"));
  await menu(p, "最近開いたToDo");
  ok((await txt(p, "#tdPanelBody")).includes("メールに返信") && (await p.evaluate(() => document.getElementById("sheetTitle").textContent)) === "最近開いたToDo", "⑥ its panel", await txt(p, "#tdPanelBody"));
  await p.locator("#tdPanelBody [data-edit='a']").click(); await p.waitForTimeout(900);
  ok((await p.inputValue("#reText")) === "レポートを書く", "⑥ pressed: opened");
  await p.click("#sheetCancel"); await p.waitForTimeout(600);

  // ---- ⑦ 印刷
  const pr = await W(p, "printBox");
  ok(pr.includes("ToDo") && pr.includes("期限切れ（1 件）") && pr.includes("資料を読む") && pr.includes("☐") && !pr.includes("洗濯"), "⑦ what is printed", pr.slice(0, 300));
  await p.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
  await menu(p, "ToDoを印刷する"); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__printed)) === 1 && !!(await p.$("#td12Print")) && !(await p.isVisible("#td12Print")), "⑦ printed, its page not on the screen");
  await p.evaluate(() => window.dispatchEvent(new Event("afterprint"))); await p.waitForTimeout(100);
  ok(!(await p.$("#td12Print")), "⑦ gone after printing");
  await p.emulateMedia({ media: "print" });
  await p.evaluate(() => { window.print = () => {}; });
  await menu(p, "ToDoを印刷する"); await p.waitForTimeout(300);
  ok(await p.isVisible("#td12Print") && !(await p.isVisible("#todoList")), "⑦ on paper: only it");
  await p.emulateMedia({ media: "screen" });
  await p.evaluate(() => window.dispatchEvent(new Event("afterprint")));

  // ---- ⑨ 期限切れを1件ずつ片づける
  await W(p, "update", "c", { due: "2026-11-08" }); await W(p, "update", "f", { due: "2026-11-09" }); await p.waitForTimeout(300);
  ok(JSON.stringify((await W(p, "late")).sort()) === '["c","e","f"]', "⑨ three 期限切れ", await W(p, "late"));
  await menu(p, "期限切れを1件ずつ片づける（3 件）");
  ok((await p.evaluate(() => document.getElementById("sheetTitle").textContent)) === "期限切れを片づける" && (await txt(p, "#tdPanelBody")).includes("3件のうち1件目"), "⑨ its panel", await txt(p, "#tdPanelBody"));
  const first = await p.evaluate(() => document.querySelector(".td12-late-name").dataset.edit);
  await p.locator(".td12-late-acts button", { hasText: "あした" }).click(); await p.waitForTimeout(500);
  ok((await todo(p, first)).due === "2026-11-12" && (await txt(p, "#tdPanelBody")).includes("3件のうち2件目"), "⑨ あした, then the next", await todo(p, first));
  const second = await p.evaluate(() => document.querySelector(".td12-late-name").dataset.edit);
  await p.locator(".td12-late-skip button").click(); await p.waitForTimeout(400);
  ok((await todo(p, second)).due < "2026-11-11", "⑨ あとで決める: left as it was");
  const third = await p.evaluate(() => document.querySelector(".td12-late-name").dataset.edit);
  await p.locator(".td12-late-acts button", { hasText: "完了" }).click(); await p.waitForTimeout(500);
  ok((await todo(p, third)).done === true && (await txt(p, "#tdPanelBody")).includes("片づけ終わりました（2件）"), "⑨ 完了, the end", await txt(p, "#tdPanelBody"));
  await undo(p);
  ok(!(await todo(p, third)).done, "⑨ 元に戻す", await todo(p, third));
  await p.click("#sheetDone").catch(() => p.click("#sheetCancel")); await p.waitForTimeout(600);

  // ---- ⑩ 期限切れをきょうに持ち越す
  const late = await W(p, "late");
  ok(late.length === 2, "⑩ 期限切れ before", late);
  await W(p, "setting", "td12", { rules: [], carry: true, updatedAt: Date.now() }); await p.waitForTimeout(1800);
  ok((await W(p, "late")).length === 0 && (await todo(p, late[0])).due === "2026-11-11" && (await status(p)).includes("きょうに持ち越しました"), "⑩ carried to today", [await W(p, "late"), await status(p)]);
  await undo(p); await p.waitForTimeout(1800);
  ok((await W(p, "late")).length === 2, "⑩ 元に戻す: back, and not carried again today", await W(p, "late"));
  // a pinned one stays where it is
  await W(p, "update", late[0], { pin: true }); await p.waitForTimeout(200);
  ok((await W(p, "section", late[0])) === "固定", "⑩ pinned: under 固定");

  // ---- できることの一覧
  ok((await W(p, "guide")).includes("いちばん上に固定") && (await W(p, "guide")).includes("ToDoの記録"), "the guide says them");
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
