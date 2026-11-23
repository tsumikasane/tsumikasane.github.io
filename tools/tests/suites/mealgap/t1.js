// 食事の間隔 (ダイエット その4 ③): its 夜のあいだの目標 taken off at the user's call (2026-11-23: 食事の設定で、食事のあいだの
// 目標機能を削除). No field in 食事's settings; one kept (mealFast) stays, unused; the card on 食事's page as before
process.env.URL0 = process.env.URL0 || "http://localhost:8765/";
const { chromium } = require("playwright");
const { URL0, P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const T = Date.parse("2026-11-20T09:00:00+09:00");
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-23T10:00:00+09:00"), { deviceScaleFactor: 1 });
  const meals = [
    { id: "m1", date: "2026-11-22", slot: "朝食", name: "パン", kcal: 300, at: "07:30", createdAt: T },
    { id: "m2", date: "2026-11-22", slot: "夕食", name: "カレー", kcal: 700, at: "19:00", createdAt: T + 1 },
    { id: "m3", date: "2026-11-23", slot: "朝食", name: "おにぎり", kcal: 250, at: "08:00", createdAt: T + 2 },
  ];
  await seed(p, { meals, settings: [{ id: "mealFast", hours: 12, updatedAt: 1 }] }, "diet");
  await p.evaluate(() => document.querySelector('#dietParts button[data-part="meal"]')?.click()); await p.waitForTimeout(700);
  // the card: as before, with no aim (a 12 hours kept: the 13 hours of the night not marked as reaching it)
  const card = await txt(p, "#dt4Fast");
  ok(card && card.startsWith("食事の間隔 2時間 最後に食べてから") && card.includes("きょう食べた時間帯 8:00 の1回") && card.includes("その前の夜のあいだ 13時間（19:00 → 8:00）") && card.includes("この7日の夜のあいだ（時間）"),
    "the card: since the last, the day's, the night before, the week's nights", card);
  ok(!card.includes("目標") && !(await p.$("#dt4Fast .bar-track, #dt4Fast .bd3-day.ok")), "no aim on it: no 目標, no bar, no night marked", card);
  // 食事's settings: no 食事の間隔, its 夜のあいだの目標 gone; the one kept stays
  await p.click("#wtSettings"); await p.waitForTimeout(800);
  const heads = await p.evaluate(() => [...document.querySelectorAll("#mealSetGroup .group-head")].map((x) => x.textContent.trim()));
  ok(!heads.includes("食事の間隔") && !(await p.$("#dt4FastGoal")) && !(await txt(p, "#mealSetGroup")).includes("夜のあいだの目標"), "settings: no 食事の間隔 nor 夜のあいだの目標", heads);
  ok(heads.includes("目安") && heads.includes("いつもの組み合わせ"), "settings: the rest as it was", heads);
  const kept = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "settings") || "[]").find((x) => x.id === "mealFast") || null, P);
  ok(kept && kept.hours === 12, "the aim kept stays, unused", kept);
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
