// ダイエット その6 ①〜⑩, as a user would see and use them
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const day = async (p, d) => (await ls(p, "bodyDays")).find((x) => x.id === d);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const WHEN = new Date("2026-11-14T15:00:00+09:00");
const base = () => ({ weights: D.weights(), meals: D.meals(), workouts: D.workouts(), bodyDays: D.bodyDays(), settings: D.settings() });
async function part(p, k) { await p.evaluate(({ P, k }) => localStorage.setItem(P + "dietPart", k), { P, k }); await p.reload(); await p.waitForTimeout(900); }
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.goto(process.env.URL0 || "http://localhost:8765/");
  await seed(p, base(), "diet");
  await part(p, "meal");

  // ① 野菜: taken out at the user's call (2026-11-23, tools/REMOVED.md): no card, nor its もくじ's line; the 皿 put in kept
  const toc6 = await p.evaluate(() => document.getElementById("dt16Toc-meal")?.textContent || "");
  ok(!(await p.$("#dt6Veg")) && !(await p.$('button[aria-label="食べた野菜を1皿ふやす"]')) && !/野菜/.test(toc6) && (await day(p, D.DAY))?.veg === 2, "① 野菜 gone, the 2 皿 kept", [await day(p, D.DAY), toc6]);
  // ② お酒 2, コーヒー 5: 休肝日 6 of the 7 days, カフェイン 多め
  await p.click('#dt6Drink button[aria-label="お酒を1杯ふやす"]'); await p.waitForTimeout(300);
  await p.click('#dt6Drink button[aria-label="お酒を1杯ふやす"]'); await p.waitForTimeout(300);
  for (let i = 0; i < 5; i++) { await p.click('#dt6Drink button[aria-label="コーヒー・お茶を1杯ふやす"]'); await p.waitForTimeout(200); }
  let x = await day(p, D.DAY);
  ok(x?.alc === 2 && x?.caf === 5, "② kept", x);
  let r = await txt(p, "#dt6Drink");
  ok(/休肝日 6 日/.test(r) && /カフェインが多め/.test(r), "② 休肝日 and カフェイン", r);
  await p.click('#dt6Drink button[aria-label="お酒を1杯へらす"]'); await p.waitForTimeout(400);
  ok((await day(p, D.DAY))?.alc === 1, "② − kept");
  // ③ 2,000 − 1,200 = 800 left: dishes that fit; one pressed goes in
  r = await txt(p, "#mealGoalCard .dt6-fit");
  ok(/あと 800 kcal で食べられるもの/.test(r || ""), "③ offered", r);
  const n0 = (await ls(p, "meals")).length;
  await p.click("#mealGoalCard .dt6-fit button"); await p.waitForTimeout(600);
  const ms = await ls(p, "meals");
  ok(ms.length === n0 + 1 && ms[ms.length - 1].kcal <= 800, "③ put in", ms[ms.length - 1]);

  await part(p, "workout");
  // ④ 心拍ゾーン: taken out at the user's call (2026-11-19, tools/REMOVED.md)
  ok(!(await p.$("#dt6Zone")), "④ gone");
  // ⑤ the year: 2026's 運動 days 6, ラン 590 km
  r = await txt(p, "#dt6Year");
  ok(/2026年/.test(r) && /6 日/.test(r) && /590 km/.test(r) && /3 セット/.test(r), "⑤ the year", r);
  await p.click('#dt6Year [aria-label="前の年"]').catch(() => {}); await p.waitForTimeout(200);
  ok(/2026年/.test(await txt(p, "#dt6Year")), "⑤ no year before the first");
  // ⑥ 10,000 歩 × 76.5 cm = 7.7 km
  r = await txt(p, "#dt6Walk");
  ok(/約 7.7 km/.test(r) && /歩幅 77 cm/.test(r), "⑥ km", r);
  // ⑦ シューズの距離: taken out at the user's call (2026-11-22, tools/REMOVED.md), with its setting (ランニングシューズ); settings runShoes stays
  ok(!(await p.$("#dt6Shoes")), "⑦ gone");
  await p.click("#wtSettings"); await p.waitForTimeout(500);
  ok(await p.isVisible("#woSetGroup") && !(await p.$("#dt6ShoeForm")) && !(await p.$("#dt6ShoeList")) && !/ランニングシューズ/.test(await txt(p, "#woSetGroup")), "⑦ its setting gone", await txt(p, "#woSetGroup"));
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  ok(JSON.stringify(await setting(p, "runShoes")) === JSON.stringify(D.settings().find((x) => x.id === "runShoes")), "⑦ the pairs kept as they were", await setting(p, "runShoes"));

  await part(p, "weight");
  // ⑧ スコア: 睡眠 7.5h 20, 水分 20, 歩数 20, 食事 (1,200+ ≤ 2,000) 20, 運動 20
  r = await txt(p, "#dt6Score");
  ok(/きょうのからだスコア 100 点/.test(r), "⑧ 100", r);
  // ⑨ short nights' mornings up 0.4, the others down 0.2
  r = await txt(p, "#dt6Sleep");
  ok(/6時間未満の次の朝 \+0\.40 kg/.test(r) && /7時間以上の次の朝 −0\.(19|20|21) kg/.test(r), "⑨", r);
  // ⑩ ごほうび: taken out at the user's call (2026-11-24, tools/REMOVED.md): no card, nor its もくじ's line, nor its place in
  // からだ's settings; those set (settings dietRewards) kept
  await p.evaluate(({ P }) => { const k = P + "settings", l = JSON.parse(localStorage.getItem(k) || "[]").filter((x) => x.id !== "dietRewards"); l.push({ id: "dietRewards", list: [{ id: "r1", kg: 60, text: "服を買う" }], updatedAt: 1 }); localStorage.setItem(k, JSON.stringify(l)); }, { P });
  await part(p, "weight");
  const toc10 = await p.evaluate(() => document.getElementById("dt16Toc-weight")?.textContent || "");
  ok(!(await p.$("#dt6Reward")) && !/ごほうび/.test(toc10) && toc10.length > 0 && ((await setting(p, "dietRewards"))?.list || []).length === 1, "⑩ ごほうび gone, those set kept", toc10);
  await p.click("#wtSettings"); await p.waitForTimeout(500);
  ok(!(await p.$("#dt6RewardForm")) && !(await p.$("#dt6RewardKg")), "⑩ nor in からだ's settings");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
