// 記録のボタン その2 (the user's call, 2026-11-27: 「記録ボタンのアニメーションを ToDo・予定の追加と日記にも」): ToDo's 追加
// in its sheet (which stays for the next) fills and bursts as the others, no block; a 予定 lands on its day once its sheet
// is down (a ring and blocks bursting there, in the calendar's colour); the day's 日記 first kept lands at its 保存済み, a
// block flying to つみかさね, and a later save of it none. With Reduce Motion and in a test program's browser: none
const { chromium } = require("playwright");
const { URL0, P, phone } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const NOW = new Date("2026-11-27T10:00:00+09:00");
async function open(b, hash, o = {}) {
  const p = await phone(b, NOW, { deviceScaleFactor: 1, ...(o.reduce ? { reducedMotion: "reduce" } : {}) });
  if (!o.plain) await p.context().addInitScript(() => { window.__moForce = true; });
  await p.goto(URL0);
  await p.evaluate(() => localStorage.clear());
  await p.goto(URL0 + "#" + hash); await p.reload(); await p.waitForTimeout(1600);
  return p;
}
const fx = (p) => p.evaluate(() => [...document.querySelectorAll(".rfx")].map((n) => (n.closest("dialog") ? "dialog " : "") + n.className.replace(/^rfx /, "")));
const count = (l, k) => l.filter((x) => x === k).length;
async function tap(p, sel) {
  const l = p.locator(sel).first();
  await l.scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
  const r = await l.boundingBox();
  await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
}
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
(async () => {
  const b = await chromium.launch();

  // ---- ToDo's 追加: in its sheet, as the others; no block (a ToDo is one once done) ----
  let p = await open(b, "todo");
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.fill("#todoText", "牛乳を買う"); await p.dispatchEvent("#todoText", "input"); await p.waitForTimeout(200);
  await tap(p, "#todoSave"); await p.waitForTimeout(200);
  let f = await fx(p);
  ok(count(f, "dialog rfx-box rfx-done") === 1 && count(f, "dialog rfx-ring") === 1 && count(f, "dialog rfx-bit") === 14 && !f.some((x) => /rfx-fly|rfx-plus/.test(x)), "ToDo's 追加: filled, a ring, the blocks bursting in its sheet; no block made", f);
  const ink = await p.evaluate(() => getComputedStyle(document.querySelector(".rfx-done .rfx-fill")).backgroundColor);
  ok(ink !== "rgb(197, 83, 0)" && /^rgb/.test(ink), "its colour: ToDo's, not 食事's", ink);
  ok((await ls(p, "todos")).length === 1 && await p.isVisible("#todoText"), "the ToDo kept, the sheet there for the next");
  await p.waitForTimeout(2400);
  ok((await fx(p)).length === 0 && !p.errs.length, "gone, no errors", p.errs);
  await p.close();

  // ---- 予定: lands on its day, the sheet gone down ----
  p = await open(b, "calendar");
  await p.click("#calAdd"); await p.waitForTimeout(700);
  await p.fill("#planTitle", "歯医者"); await p.waitForTimeout(200);
  await p.click("#planSave"); await p.waitForTimeout(520);
  f = await fx(p);
  const spot = await p.evaluate(() => {
    const ring = document.querySelector(".rfx-ring"), cell = document.querySelector("#calGrid .cal-day.sel");
    if (!ring || !cell) return null;
    const a = ring.getBoundingClientRect(), c = cell.getBoundingClientRect();
    return { dx: Math.round(a.left + a.width / 2 - (c.left + c.width / 2)), dy: Math.round(a.top + a.height / 2 - (c.top + c.height / 2)), inDialog: !!ring.closest("dialog"), ink: ring.closest("dialog") ? null : document.querySelector(".rfx-bit").style.background };
  });
  ok(count(f, "rfx-ring") === 1 && count(f, "rfx-bit") === 14 && !f.some((x) => /rfx-done|rfx-fly/.test(x)) && spot && Math.abs(spot.dx) <= 2 && Math.abs(spot.dy) <= 2 && !spot.inDialog, "予定: a ring and blocks on its day in the calendar, the sheet down", { f, spot });
  ok((await ls(p, "events")).length === 1, "the plan kept");
  await p.waitForTimeout(2200);
  ok((await fx(p)).length === 0 && !p.errs.length, "gone, no errors", p.errs);
  await p.close();

  // ---- 日記: the day's first kept lands at 保存済み, a block flying to つみかさね; a later save, none ----
  p = await open(b, "journal");
  await p.click("#journalText"); await p.keyboard.type("きょうは晴れ"); await p.waitForTimeout(1500);
  f = await fx(p);
  const js = await p.evaluate(() => { const ring = document.querySelector(".rfx-ring"), st = document.getElementById("journalState"); if (!ring) return null; const a = ring.getBoundingClientRect(), c = st.getBoundingClientRect(); return { said: st.textContent, dx: Math.round(a.left - c.left), w: Math.round(a.width - c.width) }; });
  ok(count(f, "rfx-ring") === 1 && count(f, "rfx-bit") === 14 && count(f, "rfx-fly") === 1 && js && js.said === "保存済み" && Math.abs(js.dx + 5) <= 3 && Math.abs(js.w - 10) <= 3, "日記's first: at 保存済み, a block to つみかさね", { f, js });
  await p.waitForTimeout(2600);
  await p.keyboard.type("。散歩した"); await p.waitForTimeout(1600);
  ok((await fx(p)).length === 0 && (await p.textContent("#journalState")) === "保存済み" && (await ls(p, "journal"))[0]?.text === "きょうは晴れ。散歩した", "a later save: kept, none laid over", await fx(p));
  ok(!p.errs.length && (await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)), "no errors, no sideways scroll", p.errs);
  await p.close();

  // ---- Reduce Motion, and a test program's browser: none, all kept ----
  for (const [o, name] of [[{ reduce: true }, "Reduce Motion"], [{ plain: true }, "a test program's browser (no __moForce)"]]) {
    p = await open(b, "todo", o);
    await p.click("#todoAdd"); await p.waitForTimeout(700);
    await p.fill("#todoText", "宿題"); await p.dispatchEvent("#todoText", "input"); await p.waitForTimeout(200);
    await tap(p, "#todoSave"); await p.waitForTimeout(200);
    ok((await fx(p)).length === 0 && (await ls(p, "todos")).length === 1 && !p.errs.length, `${name}: ToDo kept, nothing laid over`, await fx(p));
    await p.close();
  }
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
