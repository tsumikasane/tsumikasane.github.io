// 記録を入れるとページの上に飛ぶ (the user's call, 2026-11-22), as a user would on an iPhone: Safari's own moves of the page
// under a dialog played here (the page put at its top while it is open, and as it closes, the focus handed to the page's
// first field and the page to the top), the place put back as it closes: a record through きょう's 記録 buttons (the
// sheet), a 区分 of 食事 (its 記録画面); none put back when this app moved the page itself (つみかさね's ＋, 日記を書く); and
// 家計簿's form after a record, the cursor back in 金額 where it is in sight, the page left where it is where it isn't
process.env.URL0 = process.env.URL0 || "http://localhost:8765/";
const { chromium } = require("playwright");
const { URL0, P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";
const DAY = "2026-11-21", WHEN = new Date(`${DAY}T19:30:00+09:00`);
const T = (d, h, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const add = (d, n) => { const x = new Date(d + "T12:00:00+09:00"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
// two weeks of 食事 (朝・昼・夕), 勉強, 体重 and ラン before today, and a month of 家計簿 (3 a day): pages long enough to be
// scrolled down
function data() {
  const meals = [], study = [], weights = [], workouts = [], expenses = [];
  for (let i = 1; i <= 14; i++) {
    const d = add(DAY, -i);
    meals.push({ id: `m${i}a`, date: d, slot: "朝食", text: "トースト", kcal: 300, createdAt: T(d, 7) }, { id: `m${i}b`, date: d, slot: "昼食", text: "定食", kcal: 700, createdAt: T(d, 12) },
      { id: `m${i}c`, date: d, slot: "夕食", text: i % 2 ? "カレー" : "ごはん", kcal: 650, createdAt: T(d, 19) });
    study.push({ id: `s${i}`, date: d, subjectId: "en", minutes: 40, createdAt: T(d, 21) });
    weights.push({ id: d, date: d, kg: 65 - i * 0.05, createdAt: T(d, 7) });
    if (i % 3 === 0) workouts.push({ id: `w${i}`, date: d, type: "ランニング", km: 5, minutes: 30, createdAt: T(d, 8) });
  }
  for (let i = 0; i < 30; i++) { const d = add(DAY, -i); for (let j = 0; j < 3; j++) expenses.push({ id: `e${i}-${j}`, date: d, kind: "out", category: ["食費", "日用品", "交通費"][j], amount: 300 + j * 200, createdAt: T(d, 12) + j }); }
  return { meals, study, weights, workouts, expenses, subjects: [{ id: "en", name: "英語", createdAt: T("2026-10-01", 9) }], settings: [] };
}
const ys = (p) => p.evaluate(() => Math.round(scrollY));
// where what a selector picks is on the screen (its top), drawn anew or not
const onScreen = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return e && e.getClientRects().length ? Math.round(e.getBoundingClientRect().top) : null; }, sel);
// what a selector picks put at the middle of the screen (the page scrolled as a finger would)
const mid = (p, sel) => p.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); window.scrollTo(0, Math.max(0, scrollY + r.top - innerHeight / 2)); return Math.round(scrollY); }, sel);
// a tap where it is on the screen, as a finger: no scrolling it into sight first (as Playwright's click does)
const tap = async (p, sel) => {
  const r = await p.evaluate((sel) => { const e = [...document.querySelectorAll(sel)].find((x) => x.getClientRects().length); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
  if (!r) throw new Error("no " + sel);
  await p.touchscreen.tap(r.x, r.y);
};
// Safari's moves played: the page put at its top (the root scrolled, not through this app's own calls)
const safariTop = (p) => p.evaluate(() => { document.scrollingElement.scrollTop = 0; return Math.round(scrollY); });

(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1, userAgent: IPHONE });
  await p.context().addInitScript(() => { window.__rawFocus = HTMLElement.prototype.focus; }); // (focus as Safari gives it, uncounted)
  await p.goto(URL0);
  await seed(p, data(), "home");
  ok(await p.evaluate(() => /iPhone/.test(navigator.userAgent)), "an iPhone");

  // ① きょうの記録's 勉強 button, far down the page (つみかさね's, since 2026-11-26: it was きょう's): the sheet, the page moved
  // to its top under it; 30 分 saved, and as the sheet goes, the page where it was
  await p.goto(URL0 + "#tsumi"); await p.reload(); await p.waitForTimeout(1200);
  let y0 = await mid(p, '.h3-rec[data-k="study"]'); await p.waitForTimeout(300);
  let at0 = await onScreen(p, '.h3-rec[data-k="study"]');
  ok(y0 > 300, "① the button down the page", y0);
  await tap(p, '.h3-rec[data-k="study"]'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.getElementById("daySheet").open), "① the sheet");
  ok((await safariTop(p)) === 0, "① the page moved to its top under it");
  await p.fill("#reMin", "30"); await p.click("#recSave"); await p.waitForTimeout(1200);
  let st = (await ls(p, "study")).filter((s) => s.date === DAY);
  ok(st.length === 1 && st[0].minutes === 30, "① 30 分 saved", st);
  let at1 = await onScreen(p, '.h3-rec[data-k="study"]');
  ok(!(await p.evaluate(() => document.getElementById("daySheet").open)) && (await ys(p)) > 300 && at1 !== null && Math.abs(at1 - at0) <= 40, "① the sheet gone, the page where it was (the button where it was on the screen)", [y0, await ys(p), at0, at1]);

  // ② 食事's 夕食, down the page: its 記録画面, one from the history put in, the page moved under it; as the screen goes, the
  // focus handed to the page's first field (the date at the top) and the page to its top: the page where it was, the
  // field let go
  await p.evaluate((P) => localStorage.setItem(P + "dietPart", "meal"), P);
  await p.goto(URL0 + "#diet"); await p.reload(); await p.waitForTimeout(1200);
  y0 = await mid(p, '#mealSlots button[data-slot="夕食"]'); await p.waitForTimeout(300);
  at0 = await onScreen(p, '#mealSlots button[data-slot="夕食"]');
  ok(y0 > 300, "② 夕食 down the page", y0);
  await tap(p, '#mealSlots button[data-slot="夕食"]'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.getElementById("mealRec").open), "② its 記録画面");
  await p.click("#mealRecHistList .mr-h-add >> nth=0"); await p.waitForTimeout(500);
  ok((await ls(p, "meals")).some((m) => m.date === DAY && m.slot === "夕食"), "② one put in");
  await safariTop(p);
  await p.evaluate(() => document.getElementById("mealRec").addEventListener("close", () => {
    const f = [...document.querySelectorAll("#sec-diet input")].find((x) => x.getClientRects().length);
    window.__first = f; window.__rawFocus.call(f); document.scrollingElement.scrollTop = 0;
  }, { once: true }));
  await p.click("#mealRecFoot button >> nth=-1"); await p.waitForTimeout(1200);
  const after = await p.evaluate(() => ({ open: document.getElementById("mealRec").open, first: window.__first?.type, focused: document.activeElement === window.__first, y: Math.round(scrollY) }));
  at1 = await onScreen(p, '#mealSlots button[data-slot="夕食"]');
  // (the card above, the day's kcal, grew with the one put in: 夕食 stays where it was on the screen, as the page goes down by as much)
  ok(!after.open && after.first === "date" && after.y > 300 && at1 !== null && Math.abs(at1 - at0) <= 2, "② the screen gone, the page where it was (夕食 where it was on the screen)", [y0, after, at0, at1]);
  ok(!after.focused, "② the field the focus was handed to let go of it", after);

  // ③ つみかさね's ＋, 日記を書く: the page this app opened is at its top, not put back to つみかさね's place
  await p.goto(URL0 + "#tsumi"); await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => window.scrollTo(0, 200)); await p.waitForTimeout(300);
  await tap(p, "#tsumiAdd"); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById("tsumiAddMenu").open), "③ ＋'s menu");
  await p.click('#tsumiAddGroup button:has-text("日記を書く")'); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => document.documentElement.dataset.tab) === "journal" && (await ys(p)) === 0, "③ 日記 at its top", await ys(p));

  // ④ 家計簿's form: the page as it is, 金額 in sight: 500 円 put in, the cursor back in 金額, the page not moved
  await p.goto(URL0 + "#money"); await p.reload(); await p.waitForTimeout(1200);
  const put = (v) => p.evaluate((v) => { const f = document.getElementById("exAmount"); f.value = v; f.dispatchEvent(new Event("input", { bubbles: true })); }, v);
  await p.evaluate(() => { const g = document.getElementById("exGo").getBoundingClientRect(); window.scrollTo(0, scrollY + g.bottom - innerHeight * 0.7); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => { const a = document.getElementById("exAmount").getBoundingClientRect(); return a.top > 60 && a.bottom < innerHeight; }), "④ 金額 and the button in sight");
  const n500 = (await ls(p, "expenses")).filter((e) => e.date === DAY && e.amount === 500).length;
  await put("500"); y0 = await ys(p);
  await tap(p, "#exGo"); await p.waitForTimeout(700);
  let ex = (await ls(p, "expenses")).filter((e) => e.date === DAY && e.amount === 500);
  ok(ex.length === n500 + 1, "④ 500 円 put in", ex.length);
  ok((await p.evaluate(() => document.activeElement?.id)) === "exAmount" && Math.abs((await ys(p)) - y0) <= 2, "④ the cursor back in 金額, the page not moved", [y0, await ys(p)]);
  // 金額 above the screen (as with the keyboard up), the button in sight: 800 円 put in, the page left where it is
  await p.evaluate(() => { document.activeElement?.blur(); const r = document.getElementById("exAmount").getBoundingClientRect(); window.scrollTo(0, scrollY + r.bottom + 10); }); await p.waitForTimeout(300);
  await put("800"); y0 = await ys(p);
  const seen = await p.evaluate(() => { const a = document.getElementById("exAmount").getBoundingClientRect(), g = document.getElementById("exGo").getBoundingClientRect(); return { amount: Math.round(a.bottom), go: Math.round(g.top), h: innerHeight }; });
  ok(seen.amount < 0 && seen.go > 0 && seen.go < seen.h - 100, "④ 金額 above the screen, the button in sight", seen);
  await tap(p, "#exGo"); await p.waitForTimeout(700);
  ex = (await ls(p, "expenses")).filter((e) => e.date === DAY && e.amount === 800);
  ok(ex.length === 1 && Math.abs((await ys(p)) - y0) <= 2 && (await p.evaluate(() => document.activeElement?.id)) !== "exAmount", "④ 800 円 put in, the page left where it is", [ex.length, y0, await ys(p)]);

  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
