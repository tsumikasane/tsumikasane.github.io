// ダイエット その14 ①〜⑩, through the hook build at 8892 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8892/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__dt14[f](...a), { f, a });
const WHEN = new Date("2026-11-15T12:00:00+09:00"), DAY = D.DAY;
const base = () => ({ weights: D.weights(), meals: D.meals(), workouts: D.workouts(), bodyDays: D.bodyDays(), settings: D.settings() });
async function part(p, k) { await p.evaluate(({ P, k }) => localStorage.setItem(P + "dietPart", k), { P, k }); await p.reload(); await p.waitForTimeout(1000); }
const goDay = (p, d) => p.evaluate((d) => { const i = [...document.querySelectorAll('.datenav input[type="date"]')].find((x) => x.offsetParent); i.value = d; i.dispatchEvent(new Event("change", { bubbles: true })); }, d);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.goto(process.env.URL0);
  await seed(p, base(), "diet");
  await part(p, "meal");

  // ② 食べすぎのリセットプラン: 11/14 was 800 over; 3 days of 1,730
  let r = await txt(p, "#dt14Reset");
  ok(/食べすぎのリセットプラン 1日 1,730 kcal 11\/14（土）は目安より 800 kcal 多めでした。次の 3 日、1日 270 kcal 少なめにすると戻せます。 11\/15（日） 300 \/ 1,730 11\/16（月） — \/ 1,730 11\/17（火） — \/ 1,730/.test(r), "② the plan", r);
  // ③ 塩分の目安
  r = await txt(p, "#dt14Salt");
  ok(/塩分の目安（この7日） 1日 6\.8 g 目安の 7\.5 g 未満に入っています。 多かったのは 定食（4 g × 6）・ラーメン（6 g × 2）・トースト（0\.8 g × 6）/.test(r) && /目安のわかった食事 14 \/ 21 件/.test(r), "③ the salt", r);
  // ① 食べすぎやすい日: 寝不足 first
  r = await txt(p, "#dt14Over");
  ok(/寝不足の日（6時間未満） 8 日・平均 2,400 kcal（ほかの日 1,846 kcal） \+554 kcal お酒を飲んだ次の日 4 日・平均 2,140 kcal（ほかの日 1,907 kcal） \+233 kcal 運動しなかった日/.test(r) && /寝不足の日は、ほかの日より 1日 554 kcal 多く食べています。/.test(r), "① the days", r);

  // ⑥ メニューの達成率: 29% of the sets and 50% of the km each week before this one
  await part(p, "workout");
  const mw = await W(p, "menu");
  ok(mw.length === 8 && mw.slice(0, 7).every((w) => w.setPct === 29 && w.kmPct === 50) && mw[7].setPct === 0, "⑥ the weeks", mw);
  r = await txt(p, "#dt14Menu");
  ok(/9\/27〜 29% 50%/.test(r) && /今週 0% 0%/.test(r) && /今週の前の7週の平均・筋トレ 29%・ラン 50%/.test(r), "⑥ said", r);
  // ⑦ 歩数の目標の見直し: up to 9,000, then 10,000 asked; taken back
  r = await txt(p, "#dt14Steps");
  ok(/平均 9,321 歩・目標（8,000 歩）に届いた日 93% よく届いています。目標を 9,000 歩に上げてみませんか。/.test(r), "⑦ up", r);
  await p.click('#dt14Steps button:has-text("9,000 歩にする")'); await p.waitForTimeout(400);
  ok((await setting(p, "stepGoal"))?.steps === 9000 && /目標を 10,000 歩に上げてみませんか/.test(await txt(p, "#dt14Steps")), "⑦ made the goal, the next asked", await txt(p, "#dt14Steps"));
  await p.click(".toast-undo >> visible=true"); await p.waitForTimeout(400);
  ok((await setting(p, "stepGoal"))?.steps === 8000, "⑦ taken back");
  // ④ 練習のペースの目安: 25:00 for 5 km
  r = await txt(p, "#dt14Paces");
  ok(/5km 換算 25:00 ゆっくり走 6:15〜6:45\/km/.test(r) && /変化走の「速め」 4:54〜5:09\/km/.test(r) && /ペース走 5:18〜5:30\/km/.test(r) && /この4週のラン 12 回のうち 12 回が、ゆっくり走より速めです/.test(r), "④ the paces", r);
  // ⑤ 体力チェック: taken out at the user's call (2026-11-19, tools/REMOVED.md); settings fitTests stays
  ok(!(await p.$("#dt14Fit")), "⑤ gone");
  // ⑧ 見通しの変化: slower these 4 weeks, so later each week
  await part(p, "weight");
  r = await txt(p, "#dt14Fc");
  ok(/見通しの変化 目標 66\.0 kg いま 2027年3\/14（日）ごろ 22 日遅く 11\/8（日）の時点 2027年2\/20（土）ごろ/.test(r) && /先週の予想より 22 日遅くなりました。/.test(r), "⑧ the moves", r);
  // ⑨ 睡眠の質: the 14 nights; ぐっすり for last night, then off
  r = await txt(p, "#dt14Sq");
  ok(/ぐっすりの日 7 時間 30 分・あまりの日 5 時間/.test(r) && (await p.locator("#dt14Sq .dt14-sq-dots i.q1").count()) === 3 && (await p.locator("#dt14Sq .dt14-sq-dots i.q3").count()) === 10, "⑨ the nights", r);
  await p.click('#dt14Sq button:has-text("ぐっすり")'); await p.waitForTimeout(300);
  ok((await ls(p, "bodyDays")).find((x) => x.id === DAY)?.sleepQ === 3 && (await p.getAttribute('#dt14Sq button:has-text("ぐっすり")', "aria-pressed")) === "true", "⑨ ぐっすり kept");
  await p.click('#dt14Sq button:has-text("ぐっすり")'); await p.waitForTimeout(300);
  const dd = (await ls(p, "bodyDays")).find((x) => x.id === DAY);
  ok(dd && dd.sleepQ === undefined && dd.bed === "23:00", "⑨ off again, the day kept", dd);
  // a day with nothing else: kept with its 睡眠の質, gone with it
  await goDay(p, "2026-08-01"); await p.waitForTimeout(400);
  await p.click('#dt14Sq button:has-text("あまり")'); await p.waitForTimeout(300);
  ok((await ls(p, "bodyDays")).find((x) => x.id === "2026-08-01")?.sleepQ === 1, "⑨ a day with only its 睡眠の質 kept");
  await p.click('#dt14Sq button:has-text("あまり")'); await p.waitForTimeout(300);
  ok(!(await ls(p, "bodyDays")).some((x) => x.id === "2026-08-01"), "⑨ and gone with it");
  await part(p, "weight");
  // ⑩ 体脂肪率の判定: 24% for a man of 30, やや高い
  r = await txt(p, "#dt14Fat");
  ok(/体脂肪率の判定 24%・やや高い/.test(r) && /標準（21\.9% まで）まで、あと 2\.1 ポイントです。/.test(r), "⑩ the class", r);
  const cs = await Promise.all([20, 10, 28].map((f) => W(p, "fat", f)));
  ok(cs.map((c) => c.cls).join() === "標準,低い,高い", "⑩ the ranges", cs);

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
