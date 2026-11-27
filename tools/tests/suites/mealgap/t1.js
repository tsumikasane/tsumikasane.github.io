// 食事の間隔 (ダイエット その4 ③): its 夜のあいだの目標 taken off at the user's call (2026-11-23: 食事の設定で、食事のあいだの
// 目標機能を削除), then the card itself (2026-11-27: 食事ページの「食事の間隔」機能を削除). No card on 食事's page, nor its
// words, today or another day; the 食事 and their times kept; no field in 食事's settings; the aim kept (mealFast) stays, unused
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
    { id: "m1", date: "2026-11-22", slot: "朝食", text: "パン", kcal: 300, at: "07:30", createdAt: T },
    { id: "m2", date: "2026-11-22", slot: "夕食", text: "カレー", kcal: 700, at: "19:00", createdAt: T + 1 },
    { id: "m3", date: "2026-11-23", slot: "朝食", text: "おにぎり", kcal: 250, at: "08:00", createdAt: T + 2 },
  ];
  await seed(p, { meals, settings: [{ id: "mealFast", hours: 12, updatedAt: 1 }] }, "diet");
  await p.evaluate(() => document.querySelector('#dietParts button[data-part="meal"]')?.click()); await p.waitForTimeout(700);
  // the card: none, nor its words (the meals with times there were before: 最後に食べてから, the night before, the week's)
  const page = () => p.evaluate(() => document.getElementById("part-meal")?.innerText || "");
  const gone = (t) => !/食事の間隔|最後に食べてから|食べた時間帯|夜のあいだ/.test(t);
  ok(!(await p.$("#dt4Fast, .dt4-fast")) && gone(await page()) && (await page()).includes("おにぎり"), "no 食事の間隔 card today (the 食事 listed as before)", (await page()).slice(0, 300));
  // another day (the one before, its 夕食 there)
  await p.locator("#sec-diet .datenav button.navbtn:visible", { hasText: "前日" }).first().click(); await p.waitForTimeout(600);
  ok(!(await p.$("#dt4Fast")) && gone(await page()) && (await page()).includes("カレー"), "nor on another day (11/22, its 夕食 there)", (await page()).slice(0, 200));
  // the 食事 and their times kept as they were
  const kept = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "meals") || "[]").map((m) => `${m.id}:${m.at}`).sort().join(","), P);
  ok(kept === "m1:07:30,m2:19:00,m3:08:00", "the 食事 and their times kept", kept);
  // 食事's settings: no 食事の間隔, its 夜のあいだの目標 gone; the one kept stays
  await p.click("#wtSettings"); await p.waitForTimeout(800);
  const heads = await p.evaluate(() => [...document.querySelectorAll("#mealSetGroup .group-head")].map((x) => x.textContent.trim()));
  ok(!heads.includes("食事の間隔") && !(await p.$("#dt4FastGoal")) && !(await txt(p, "#mealSetGroup")).includes("夜のあいだの目標"), "settings: no 食事の間隔 nor 夜のあいだの目標", heads);
  ok(heads.includes("目安") && heads.includes("いつもの組み合わせ"), "settings: the rest as it was", heads);
  const aim = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "settings") || "[]").find((x) => x.id === "mealFast") || null, P);
  ok(aim && aim.hours === 12, "the aim kept stays, unused", aim);
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
