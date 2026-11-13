// からだ ①〜⑩: the edges (no records, few records, no 身長, a goal reached, a 期限 past, a goal above, a pace too fast)
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10";
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const T = (d, h = 7) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const W = (i, kg, extra = {}) => { const d = addDays(today, -i); return { id: d, date: d, kg, createdAt: T(d), ...extra }; };
// a line of weights: from kg0, step a day, every day for n days up to today
const line = (n, kg0, step) => Array.from({ length: n }, (_, k) => W(n - 1 - k, Math.round((kg0 + step * k) * 10) / 10));
const S = (id, v) => ({ id, ...v, updatedAt: T("2026-11-01") });
async function open(b, data) {
  const p = await phone(b, at("12:30", today), { deviceScaleFactor: 1 });
  await seed(p, data, "diet"); await p.evaluate((P) => localStorage.setItem(P + "dietPart", "weight"), P); await p.reload(); await p.waitForTimeout(800);
  return p;
}
(async () => {
  const b = await chromium.launch();
  // none
  let p = await open(b, {});
  ok(await p.isHidden("#wtPlan") && await p.isHidden("#wtReview") && await p.isHidden("#wtLegend") && await p.isHidden("#sizePlot") && await p.isVisible("#wtPhotos") && await txt(p, "#wtStats") === "", "no records: the cards wait, 写真 there");
  ok(!p.errs.length, "no records: no errors " + p.errs.join("|"));
  // two: no 7日平均 line, no pace
  p = await open(b, { weights: [W(3, 60), W(0, 59.5)], settings: [S("body", { height: 170, age: 30, sex: "m" })] });
  ok(await p.locator("#wtChart path.avg-line").count() === 0 && await p.isHidden("#wtLegend"), "two records: no 7日平均 line, no legend");
  ok((await txt(p, "#wtStats")).includes("ペース — 1週間に4回ほど記録すると出ます"), "two records: the pace waits", await txt(p, "#wtStats"));
  ok((await txt(p, "#wtPlan")).includes("目標体重を決める") && (await txt(p, "#wtPlan")).includes("いまは 0 日・2 回"), "no goal: asks for one; ⑦ says what it needs", await txt(p, "#wtPlan"));
  // no 身長: no BMI; a goal and a 期限 but nothing to start a day's kcal from
  p = await open(b, { weights: line(20, 70, -0.1), settings: [S("weight", { target: 66 }), S("weightBy", { date: "2027-02-01" })] });
  ok(!(await txt(p, "#wtStats")).includes("BMI") && await p.locator("#wtChart rect.band").count() === 0, "no 身長: no BMI, no band");
  ok((await txt(p, "#wtPlan")).includes("1日の摂取カロリー — メンテナンスカロリーを記録するか、身長・年齢・性別を入れると出ます。"), "no 身長 and no メンテナンスカロリー: what it needs", await txt(p, "#wtPlan"));
  // the typed メンテナンスカロリー used then
  const typed = line(20, 70, -0.1); typed[18].maint = 2400;
  p = await open(b, { weights: typed, settings: [S("weight", { target: 66 }), S("weightBy", { date: "2027-02-01" })] });
  ok((await txt(p, "#wtPlan")).includes("記録したメンテナンスカロリー 2,400 kcal から"), "a typed メンテナンスカロリー used", await txt(p, "#wtPlan"));
  // reached
  p = await open(b, { weights: line(10, 66.3, -0.03), settings: [S("weight", { target: 66 }), S("weightBy", { date: "2027-02-01" })] });
  ok((await txt(p, "#wtPlan")).includes("目標 66.0 kg 達成 目標を達成しています。") && !(await txt(p, "#wtPlan")).includes("1日の摂取カロリー"), "reached: said, no plan", await txt(p, "#wtPlan"));
  // the 期限 past
  p = await open(b, { weights: line(20, 70, -0.1), settings: [S("weight", { target: 60 }), S("weightBy", { date: "2026-11-01" })] });
  ok((await txt(p, "#wtPlan")).includes("期限（11/1（日））を過ぎています。"), "期限 past: said", await txt(p, "#wtPlan"));
  // a goal above, going up: when, and a day's kcal more than the メンテナンス
  p = await open(b, { weights: line(21, 58, 0.05), settings: [S("body", { height: 170, age: 25, sex: "m" }), S("weight", { target: 60 }), S("weightBy", { date: "2027-03-01" })] });
  let plan = await txt(p, "#wtPlan");
  ok(/今のペース（\+0\.\d kg\/週）なら .+ごろに届きます。/.test(plan) && plan.includes("増やした量です。") && plan.includes("+0."), "a goal above: when, and more kcal", plan);
  // too fast, and under 基礎代謝
  p = await open(b, { weights: line(21, 80, -0.1), settings: [S("body", { height: 170, age: 30, sex: "m" }), S("weight", { target: 70 }), S("weightBy", { date: "2026-12-10" })] });
  plan = await txt(p, "#wtPlan");
  ok(plan.includes("注意：1週間に体重の1%（0.8 kg）を超えるペースです。") && plan.includes("注意：基礎代謝（") && !plan.includes("食事の目安にする"), "too fast and under 基礎代謝: said, no button", plan);
  // moving away from the goal
  p = await open(b, { weights: line(21, 60, 0.05), settings: [S("weight", { target: 55 })] });
  ok((await txt(p, "#wtPlan")).includes("では、目標に近づいていません。") && !(await txt(p, "#wtStats")).includes("ごろ"), "moving away: said, no day", await txt(p, "#wtPlan"));
  ok(!p.errs.length, "no errors: " + p.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
