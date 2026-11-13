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

  // ① 野菜: 2 → 3 with ＋
  ok(/2 \/ 5 皿/.test(await txt(p, "#dt6Veg")), "① today's 2", await txt(p, "#dt6Veg"));
  await p.click('#dt6Veg button[aria-label="食べた野菜を1皿ふやす"]'); await p.waitForTimeout(500);
  ok((await day(p, D.DAY))?.veg === 3 && /3 \/ 5 皿/.test(await txt(p, "#dt6Veg")), "① ＋ kept", await day(p, D.DAY));
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
  // ④ 心拍ゾーン: 199, rest 60 → ゾーン2 60〜70% 143〜157
  r = await txt(p, "#dt6Zone");
  ok(/ゾーン2・脂肪燃焼/.test(r) && /143〜157 拍/.test(r) && /最大心拍 199/.test(r), "④ zones", r);
  // ⑤ the year: 2026's 運動 days 6, ラン 590 km
  r = await txt(p, "#dt6Year");
  ok(/2026年/.test(r) && /6 日/.test(r) && /590 km/.test(r) && /3 セット/.test(r), "⑤ the year", r);
  await p.click('#dt6Year [aria-label="前の年"]').catch(() => {}); await p.waitForTimeout(200);
  ok(/2026年/.test(await txt(p, "#dt6Year")), "⑤ no year before the first");
  // ⑥ 10,000 歩 × 76.5 cm = 7.7 km
  r = await txt(p, "#dt6Walk");
  ok(/約 7.7 km/.test(r) && /歩幅 77 cm/.test(r), "⑥ km", r);
  // ⑦ 新しいシューズ: 250 + 20 + 10 = 280 km (the 300 before it the old pair's)
  r = await txt(p, "#dt6Shoes");
  ok(/新しいシューズ/.test(r) && /280 \/ 600 km/.test(r) && /あと 320 km/.test(r), "⑦ the pair now", r);
  await p.click("#wtSettings"); await p.waitForTimeout(500);
  await p.fill("#dt6ShoeName", "3足目"); await p.fill("#dt6ShoeFrom", "2026-11-11"); await p.click('#dt6ShoeForm button[type="submit"]'); await p.waitForTimeout(500);
  ok((await setting(p, "runShoes"))?.list.length === 3, "⑦ a pair added");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  ok(/3足目/.test(await txt(p, "#dt6Shoes")) && /10 \/ 600 km/.test(await txt(p, "#dt6Shoes")), "⑦ from its day", await txt(p, "#dt6Shoes"));

  await part(p, "weight");
  // ⑧ スコア: 睡眠 7.5h 20, 水分 20, 歩数 20, 食事 (1,200+ ≤ 2,000) 20, 運動 20
  r = await txt(p, "#dt6Score");
  ok(/きょうのからだスコア 100 点/.test(r), "⑧ 100", r);
  // ⑨ short nights' mornings up 0.4, the others down 0.2
  r = await txt(p, "#dt6Sleep");
  ok(/6時間未満の次の朝 \+0\.40 kg/.test(r) && /7時間以上の次の朝 −0\.(19|20|21) kg/.test(r), "⑨", r);
  // ⑩ no ごほうび yet; one set at a weight under now
  ok(/ごほうびを決める/.test(await txt(p, "#dt6Reward")), "⑩ none yet", await txt(p, "#dt6Reward"));
  await p.click("#wtSettings"); await p.waitForTimeout(500);
  await p.fill("#dt6RewardKg", "60"); await p.fill("#dt6RewardText", "服を買う"); await p.click('#dt6RewardForm button[type="submit"]'); await p.waitForTimeout(400);
  await p.fill("#dt6RewardKg", "80"); await p.fill("#dt6RewardText", "映画"); await p.click('#dt6RewardForm button[type="submit"]'); await p.waitForTimeout(400);
  ok((await setting(p, "dietRewards"))?.list.length === 2, "⑩ kept");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  r = await txt(p, "#dt6Reward");
  ok(/1 \/ 2/.test(r) && /服を買う/.test(r) && /あと/.test(r) && /80.0 kg・映画/.test(r), "⑩ next and reached", r);

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
