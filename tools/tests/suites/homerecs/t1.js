// きょう's きょうの記録 as a checklist of 毎日記録するもの (the user's call, 2026-11-23: as からだ's はじめにやること has them,
// an empty circle till it is in, then a check). Those picked in つみかさね's settings, in their order; with none picked,
// as before (the kinds kept in the last 14 days, as chips)
const { chromium } = require("playwright");
const { URL0, P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const day = "2026-11-23", T = Date.parse(`${day}T08:00:00+09:00`);
const ALL = ["journal", "weight", "meal", "workout", "study", "routine", "money"];
const rows = (p) => p.evaluate(() => [...document.querySelectorAll('[data-tile="h3recs"] .h3-checks li')].map((li) => ({
  k: li.dataset.k, ok: li.classList.contains("ok"), name: li.querySelector(".h3-check-w")?.firstChild?.textContent,
  note: li.querySelector(".h3-check-note")?.textContent || null, go: !!li.querySelector(".h3-check-go"), mark: !!li.querySelector(".h3-check-mark svg") })));
const big = (p) => p.evaluate(() => document.querySelector('[data-tile="h3recs"] .big')?.textContent.replace(/\s+/g, "") ?? null);
const put = (p, k, v) => p.evaluate(({ P, k, v }) => localStorage.setItem(P + k, JSON.stringify(v)), { P, k, v });
const reload = async (p) => { await p.reload(); await p.waitForTimeout(800); };
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date(`${day}T13:00:00+09:00`), { deviceScaleFactor: 1 });
  const R = (id, name) => ({ id, name, createdAt: T - 30 * 864e5 });
  await seed(p, {
    settings: [{ id: "recRemind", on: true, kinds: ALL, times: ["21:00"], updatedAt: 1 }],
    weights: [{ id: day, date: day, kg: 89.2, createdAt: T }], meals: [{ id: "m1", date: day, slot: "朝食", text: "パン", kcal: 300, createdAt: T }],
    routines: [R("r1", "ストレッチ"), R("r2", "読書")], routineDays: [{ id: day, date: day, done: ["r1"], at: { r1: T }, updatedAt: T }],
  }, "home");
  await p.waitForTimeout(400);
  let r = await rows(p);
  ok(r.map((x) => x.name).join("・") === "日記・からだ・食事・運動・勉強・ルーティーン・家計簿", "毎日記録するもの, in their order", r.map((x) => x.name));
  ok(r.filter((x) => x.ok).map((x) => x.k).join() === "weight,meal" && r.filter((x) => x.ok).every((x) => x.note === "記録しました" && x.mark && !x.go), "in: からだ and 食事, checked, 記録しました", r);
  ok(r.filter((x) => !x.ok).every((x) => x.go && !x.mark && !x.note), "not yet: an empty circle and 記録する (ルーティーン: one of two not done)", r);
  ok((await big(p)) === "2/7" && await p.evaluate(() => document.querySelector('[data-tile="h3recs"] .h3-checks-bar')?.getAttribute("aria-label")) === "7 のうち 2 記録しました", "2 / 7 and the bar", await big(p));
  ok(!(await p.$('[data-tile="h3recs"] .h3-rec')), "not the chips of before");
  // 記録する: 勉強's sheet; 日記 opens its page
  await p.click('.h3-check-go[data-k="study"]'); await p.waitForTimeout(700);
  ok((await p.evaluate(() => document.getElementById("sheetTitle")?.textContent)) === "勉強を記録", "勉強's 記録する: its sheet");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  await p.click('.h3-check-go[data-k="journal"]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => location.hash) === "#journal", "日記's 記録する: 日記");
  // recorded elsewhere: checked; ルーティーン all done; 家計簿 said to be きょうは使っていない
  await put(p, "journal", [{ id: day, date: day, text: "きょうは晴れ", createdAt: T }]);
  await put(p, "study", [{ id: "s1", date: day, minutes: 30, createdAt: T }]);
  await put(p, "workouts", [{ id: "w1", date: day, type: "ラン", minutes: 20, createdAt: T }]);
  await put(p, "routineDays", [{ id: day, date: day, done: ["r1", "r2"], at: { r1: T, r2: T }, updatedAt: T }]);
  await p.evaluate(({ P, day }) => { const s = JSON.parse(localStorage.getItem(P + "settings")); s.push({ id: "moZero", days: [day], updatedAt: 1 }); localStorage.setItem(P + "settings", JSON.stringify(s)); }, { P, day });
  await p.goto(URL0 + "#home"); await reload(p);
  r = await rows(p);
  ok(r.every((x) => x.ok) && r.find((x) => x.k === "routine").note === "ぜんぶできました" && r.find((x) => x.k === "money").note === "使っていない日" && (await big(p)) === "7/7", "all in: ぜんぶできました, 使っていない日, 7 / 7", r);
  ok((await p.evaluate(() => document.querySelector('[data-tile="h3recs"] .sub')?.textContent)) === "きょうの記録はぜんぶ済みました", "all in: said");
  // no ルーティーン asked of today: きょうはありません
  await put(p, "routines", []); await put(p, "routineDays", []);
  await reload(p);
  ok((await rows(p)).find((x) => x.k === "routine")?.note === "きょうはありません", "no ルーティーン today: きょうはありません");
  ok(!p.errs.length, "no page errors (1)", p.errs);

  // 毎日記録するものを変える: つみかさね's settings at the kinds; one off, gone from the tile
  await p.click('[data-tile="h3recs"] .h3-recs-set'); await p.waitForTimeout(900);
  ok(await p.evaluate(() => { const h = document.getElementById("recRemindKindsHead"), r = h?.getBoundingClientRect(); return !!h && r.top > 0 && r.top < 320; }), "毎日記録するものを変える: the settings, at 毎日記録するもの");
  await p.click("label[for=recKind_money]"); await p.waitForTimeout(300);
  await p.click("#sheetDone"); await p.waitForTimeout(600);
  r = await rows(p);
  ok(r.length === 6 && !r.some((x) => x.k === "money"), "家計簿 off there: 6 here", r.map((x) => x.k));

  // none picked: as before (the kinds kept lately, as chips) and 毎日記録するものを選ぶ
  await seed(p, { settings: [{ id: "recRemind", on: false, kinds: [], times: ["21:00"], updatedAt: 1 }], weights: [{ id: day, date: day, kg: 89.2, createdAt: T }], study: [{ id: "s0", date: "2026-11-20", minutes: 30, createdAt: T }] }, "home");
  ok(!(await p.$('[data-tile="h3recs"] .h3-checks')) && JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('[data-tile="h3recs"] .h3-rec')].map((x) => x.dataset.k + (x.classList.contains("done") ? "+" : "")))) === '["weight+","study"]'
    && (await p.evaluate(() => document.querySelector('[data-tile="h3recs"] .h3-recs-set')?.textContent)) === "毎日記録するものを選ぶ", "none picked: as before, and 毎日記録するものを選ぶ");
  // not set yet, the 日記 お知らせ of before on: started from it (日記)
  await seed(p, { settings: [{ id: "jnRemind", on: true, at: "21:30", updatedAt: 1 }] }, "home");
  r = await rows(p);
  ok(r.length === 1 && r[0].k === "journal" && !r[0].ok, "not set yet: from the お知らせ of before (日記)", r);
  ok(!p.errs.length, "no page errors (2)", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
