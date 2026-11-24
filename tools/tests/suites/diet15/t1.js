// ダイエット その15 ①〜⑩, through the hook build at 8893 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8893/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__dt15[f](...a), { f, a });
const WHEN = new Date("2026-11-16T12:00:00+09:00"), DAY = D.DAY, N = new Intl.NumberFormat("ja-JP");
const base = () => ({ weights: D.weights(), meals: D.meals(), workouts: D.workouts(), bodyDays: D.bodyDays(), settings: D.settings() });
async function part(p, k) { await p.evaluate(({ P, k }) => localStorage.setItem(P + "dietPart", k), { P, k }); await p.reload(); await p.waitForTimeout(1000); }
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.goto(process.env.URL0);
  await seed(p, base(), "diet");
  await part(p, "meal");

  // ① 食事の推移: 30 days, then 90
  let t = await W(p, "trend", 30), r = await txt(p, "#dt15Trend");
  ok(t.had === 29 && r.includes(`平均 ${N.format(t.mean)} kcal・記録 29 日・目安を超えた日 ${t.over} 日`) && (await p.locator("#dt15Trend svg rect").count()) === 29 && (await p.locator("#dt15Trend svg polyline.avg").count()) === 1, "① 30 days", [t.mean, t.over, r]);
  await p.click('#dt15Trend button:has-text("90日")'); await p.waitForTimeout(300);
  ok((await p.locator("#dt15Trend svg rect").count()) === 29 && (await p.getAttribute('#dt15Trend button:has-text("90日")', "aria-pressed")) === "true" && /10\/18/.test(await txt(p, "#dt15Trend")) === false, "① 90 days (the records as they are)", await txt(p, "#dt15Trend"));
  // ② たんぱく質の目標の提案: taken out at the user's call (2026-11-24, tools/REMOVED.md): no card, nor its もくじ's line; no goal set
  ok(!(await p.$("#dt15Prot")) && !(await p.evaluate(() => [...document.querySelectorAll("#dt16Toc-meal .dt16-toc-go")].some((b) => ["dt15Prot"].includes(b.dataset.id)))) && !(await setting(p, "pfcGoal")), "② gone");
  // ③ 食べたものの種類
  const k = await W(p, "kinds"); r = await txt(p, "#dt15Kinds");
  ok(k.kinds === 9 && k.was === 8 && /9 種類 この7日 22 品・前の7日は 8 種類（\+1） よく続いているもの トースト 7 回・定食 6 回 はじめて食べたもの おにぎり/.test(r), "③ the kinds", [k, r]);

  // ⑦ 休んだ理由: taken out at the user's call (2026-11-22, tools/REMOVED.md); a day's reason (bodyDays skip) stays
  await part(p, "workout");
  ok(!(await p.$("#dt15Skip")), "⑦ gone");
  const skips = (xs) => xs.filter((x) => x.skip).map((x) => `${x.id}:${x.skip}`).sort().join();
  ok(skips(await ls(p, "bodyDays")) === skips(D.bodyDays()), "⑦ the reasons kept as they were", skips(await ls(p, "bodyDays")));
  // ⑤ ロング走の推移
  r = await txt(p, "#dt15Long");
  ok(/いちばん長いのは 14 km（11\/14）・この4週は 14 km まで/.test(r) && /つくばマラソン（ハーフマラソン）に向けて、ロング走は 15〜18 km まで/.test(r) && (await p.locator("#dt15Long .dt15-l-col").count()) === 12, "⑤ the weeks", r);
  // ④ 大会の予定: taken out at the user's call (2026-11-22, tools/REMOVED.md); settings races stays (⑤ above reads it)
  ok(!(await p.$("#dt15Race")), "④ gone");
  ok(JSON.stringify(await setting(p, "races")) === JSON.stringify(D.settings().find((x) => x.id === "races")), "④ the races kept as they were", await setting(p, "races"));
  // ⑥ 運動を探す: taken out at the user's call (2026-11-19, tools/REMOVED.md)
  ok(!(await p.$("#dt15Find")), "⑥ gone");
  // ⑨ 記録のチェック: 5; one left as it is, one gone to
  await part(p, "weight");
  r = await txt(p, "#dt15Check");
  ok(/記録のチェック 5 件 食事「おにぎり」 5,000 kcal 11\/13（金）・1品にしては多め/.test(r) && /ベンチプレス 600 kg × 10 回 × 3 セット/.test(r) && /歩数 80,000 歩/.test(r) && /睡眠 05:00〜06:00 11\/8（日）・2時間より短い/.test(r) && /体重 6\.8 kg 10\/27（火）・前後は 67\.9 kg ほど/.test(r), "⑨ the five", r);
  await p.click('#dt15Check button[aria-label="11/12（木）の歩数をこのままにする"]'); await p.waitForTimeout(400);
  ok(/記録のチェック 4 件/.test(await txt(p, "#dt15Check")) && ((await setting(p, "dt15Ok"))?.ids || []).includes("b:2026-11-12:steps"), "⑨ left as it is");
  await p.click('#dt15Check button[aria-label="11/13（金）の食事「おにぎり」を見る"]'); await p.waitForTimeout(500);
  ok(await p.isVisible("#part-meal") && /11月13日（金）/.test(await txt(p, "#mealGoalCard")), "⑨ gone to its day and part", await txt(p, "#mealGoalCard"));
  // ⑩ 目標体重の見直し: 52 kg is BMI 18.0; made 53.5
  await part(p, "weight");
  r = await txt(p, "#dt15Target");
  ok(/目標体重の見直し BMI 18\.0 目標の 52\.0 kg は「低体重（やせ）」です。健康的な範囲は 53\.5〜71\.9 kg（BMI 18\.5〜25）、標準体重は 63\.6 kg です。 やせすぎの目標です。53\.5 kg 以上にするのがおすすめです。/.test(r), "⑩ too low", r);
  await p.click('#dt15Target button:has-text("53.5 kg にする")'); await p.waitForTimeout(400);
  ok((await setting(p, "weight"))?.target === 53.5 && /BMI 18\.5/.test(await txt(p, "#dt15Target")) && !/やせすぎ/.test(await txt(p, "#dt15Target")), "⑩ made 53.5", await txt(p, "#dt15Target"));
  // ⑧ 寝る時刻の目標: 23:30
  const bd = await W(p, "bed"); r = await txt(p, "#dt15Bed");
  ok(bd.at === "23:30" && bd.had === 14 && bd.kept === 8 && r.includes(`守れた日 8 / 14 日・おそくなった日は平均`) && (await p.locator("#dt15Bed .dt15-bed-dots i.late").count()) === 6, "⑧ the nights", [bd, r]);

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
