// ダイエット その12 ①〜⑩, through the hook build at 8890 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8890/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__dt12[f](...a), { f, a });
const WHEN = new Date("2026-11-15T12:00:00+09:00");
const base = () => ({ weights: D.weights(), meals: D.meals(), workouts: D.workouts(), bodyDays: D.bodyDays(), settings: D.settings() });
async function part(p, k) { await p.evaluate(({ P, k }) => localStorage.setItem(P + "dietPart", k), { P, k }); await p.reload(); await p.waitForTimeout(1000); }
// (食事の記録画面, 2026-11-18) a 区分's screen opened (the one picked when none is given), and a tile's panel; closed
async function rec(p, slot, panel) {
  if (!(await p.evaluate(() => document.getElementById("mealRec").open))) { const s = slot || (await p.evaluate(() => document.querySelector('input[name="mealSlot"]:checked')?.value || "朝食")); await p.click(`#mealSlots button[data-slot="${s}"]`); await p.waitForTimeout(300); }
  else if (slot) { await p.click(`#mealRecSlots button:has-text("${slot}")`); await p.waitForTimeout(200); }
  if (panel && !(await p.evaluate((k) => document.getElementById({ often: "mealOften", sets: "dt4Sets", recipe: "dt18Recipe", label: "dt18Label", bulk: "dt8Bulk" }[k])?.classList.contains("mr-on"), panel))) { await p.click(panel === "bulk" ? "#mealRecBulk" : `#mealRecTiles button[data-tile="${panel}"]`); await p.waitForTimeout(250); }
}
async function unrec(p) { if (await p.evaluate(() => document.getElementById("mealRec").open)) { await p.click("#mealRecClose"); await p.waitForTimeout(200); } }
const meal = async (p, text) => (await ls(p, "meals")).find((m) => m.text === text);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.goto(process.env.URL0);
  await seed(p, base(), "diet");
  await part(p, "meal");

  // ① カロリーの目安: 昼食 by the clock; its records (定食 700 mostly) much the same, so 70%・the middle・130%
  await rec(p, "昼食"); await p.fill("#mealText", "テスト"); await p.waitForTimeout(150);
  let r = await txt(p, "#dt12Est");
  ok(/わからないときは 軽め 490 kcal ふつう 700 kcal 多め 910 kcal （これまでの記録から）/.test(r), "① 昼食 from the records", r);
  await p.click('#dt12Est button:has-text("多め")'); await p.waitForTimeout(100);
  ok(await p.inputValue("#mealKcal") === "910", "① pressed: in the field", await p.inputValue("#mealKcal"));
  await rec(p, "間食"); await p.waitForTimeout(100);
  r = await txt(p, "#dt12Est");
  ok(/軽め 100 kcal ふつう 200 kcal 多め 400 kcal （よくある量の目安）/.test(r), "① 間食: too few records, the common 目安", r);
  const e = await W(p, "est", "朝食");
  ok(e.own && e.v.join() === "210,300,390", "① 朝食 (トースト 300 every day)", e);
  await p.fill("#mealKcal", ""); await p.fill("#mealText", ""); await unrec(p);

  // ② カロリーを入れ忘れた食事: 3, folded; the おにぎり's 目安 from the common dishes put in with nothing typed, then taken back
  r = await txt(p, "#dt12NoKcal summary");
  ok(r === "カロリーを入れ忘れた食事（3 件）", "② counted", r);
  await p.click("#dt12NoKcal summary"); await p.waitForTimeout(200);
  r = await txt(p, "#dt12NoKcal");
  ok(/手作りスープ きょう・朝食/.test(r) && /おにぎり（鮭） 11\/13（金）・昼食/.test(r) && /サラダ 11\/12（木）・夕食/.test(r), "② listed, newest first", r);
  ok(await p.getAttribute('#dt12NoKcal input[aria-label="「おにぎり（鮭）」のカロリー（kcal）"]', "placeholder") === "180", "② the 目安 shown");
  await p.click('#dt12NoKcal button[aria-label="「おにぎり（鮭）」にカロリーを入れる"]'); await p.waitForTimeout(400);
  let m = await meal(p, "おにぎり（鮭）");
  ok(m?.kcal === 180 && m.p > 0, "② the 目安 put in, its PFC too", m);
  ok(/カロリーを入れ忘れた食事（2 件）/.test(await txt(p, "#dt12NoKcal summary")), "② one fewer");
  await p.click(".toast-undo >> visible=true"); await p.waitForTimeout(400);
  m = await meal(p, "おにぎり（鮭）");
  ok(m && m.kcal === undefined && m.p === undefined, "② taken back", m);
  await p.fill('#dt12NoKcal input[aria-label="「サラダ」のカロリー（kcal）"]', "120"); await p.press('#dt12NoKcal input[aria-label="「サラダ」のカロリー（kcal）"]', "Enter"); await p.waitForTimeout(400);
  ok((await meal(p, "サラダ"))?.kcal === 120, "② typed and Enter");
  ok(await p.getAttribute("#dt12NoKcal", "open") !== null, "② stays open");

  // ③ 置きかえるなら: カツカレー 4 times, カフェラテ 6 times
  r = await txt(p, "#dt12Swap");
  ok(/カツカレー → を カレーライス にすると 30日で 4 回・1,000 → 750 kcal・1回 −250 kcal −1,000 kcal/.test(r) && /カフェラテ（M） → を コーヒー（ブラック） にすると 30日で 6 回・150 → 8 kcal・1回 −142 kcal −852 kcal/.test(r)
    && /ぜんぶ置きかえると、30日で −1,852 kcal（体脂肪 約 0\.3 kg）/.test(r), "③ the swaps", r);
  const sw = await W(p, "swaps");
  ok(sw.length === 2 && sw[0].text === "カツカレー" && sw[1].text === "カフェラテ（M）", "③ most saved first", sw);

  // ④ たんぱく質を1食ずつ: 朝食 9 g under 20 g
  r = await txt(p, "#dt12Prot");
  ok(/朝食 9 g \/ 20 g 昼食 25 g \/ 20 g 夕食 [\d.]+ g \/ 20 g/.test(r) && /朝食が少なめです。卵1個/.test(r), "④ each 食事", r);

  // ⑤ 代わりの種目: ベンチプレス typed; ダンベルフライ (done before) first; pressed, it takes its place
  await part(p, "workout");
  await p.selectOption("#woType", "筋トレ"); await p.fill("#woExercise", "ベンチプレス"); await p.waitForTimeout(300);
  r = await txt(p, "#dt12Alt");
  ok(/^同じ部位（胸）のほかの種目 ダンベルフライ 前回 12kg×12 /.test(r) && !/ベンチプレス 前回/.test(r), "⑤ the others of 胸", r);
  await p.click('#dt12Alt button[aria-label^="ダンベルフライにかえる"]'); await p.waitForTimeout(300);
  ok(await p.inputValue("#woExercise") === "ダンベルフライ", "⑤ put in its place");
  r = await txt(p, "#dt12Alt");
  ok(/ベンチプレス 前回 50kg×10/.test(r) && !/ダンベルフライ/.test(r), "⑤ the list made again", r);
  const al = await W(p, "alts", "ワイドスクワット");
  ok(al?.part === "脚" && al.list.length >= 1 && al.list[0].name === "スクワット", "⑤ a name with more to it: the list's within it", al);
  ok((await W(p, "alts", "なにか")) === null, "⑤ unknown: none");
  await p.selectOption("#woType", "ランニング"); await p.waitForTimeout(200);
  ok(await p.isHidden("#dt12Alt"), "⑤ only for 筋トレ");

  // ⑥ ランの距離: 12, 14, 15, 16 km before, 10 km this week; at most 17.6
  r = await txt(p, "#dt12Run");
  ok(/ランの距離の増やし方 10 \/ 17\.6 km まで 10\/18〜 12 km 10\/25〜 14 km 11\/1〜 15 km 11\/8〜 16 km 今週 10 km 今週は 17\.6 km までが目安・あと 7\.6 km/.test(r), "⑥ the weeks", r);
  // ⑦ 休養日: 8 days in a row
  r = await txt(p, "#dt12Rest");
  ok(/休養日 8 日続けて運動 8 日続けて運動しています。週に1〜2日は休むと/.test(r) && (await p.locator("#dt12Rest .dt12-rest-days i.wo").count()) === 8 + 2, "⑦ said", r);
  ok(JSON.stringify(await W(p, "rest")).includes('"run":8'), "⑦ worked out");
  // another run of 9 km today: over the 目安
  await p.selectOption("#woType", "ランニング"); await p.fill("#woDist", "9"); await p.fill("#woMin", "54"); await p.click('#workoutForm button[type="submit"]'); await p.waitForTimeout(500);
  r = await txt(p, "#dt12Run");
  ok(/19 \/ 17\.6 km まで/.test(r) && /目安の 17\.6 km を超えています/.test(r), "⑥ over it", r);

  // ⑧ 目標体重のキープ: reached 10/20; ±1 kg; then ±0.5 kept
  await part(p, "weight");
  r = await txt(p, "#dt12Keep");
  ok(/目標体重のキープ 27 日目 10\/20（火）に、7日平均が目標の 66\.0 kg に届きました。 範囲（65\.0〜67\.0 kg）に入った日 27 \/ 27 日 7日平均 66\.0 kg。範囲の中でキープできています。/.test(r), "⑧ kept", r);
  await p.selectOption("#dt12Keep select", "0.5"); await p.waitForTimeout(400);
  ok((await setting(p, "keepRange"))?.kg === 0.5, "⑧ the range kept");
  r = await txt(p, "#dt12Keep");
  ok(/範囲（65\.5〜66\.5 kg）に入った日 \d+ \/ 27 日/.test(r) && !/27 \/ 27/.test(r), "⑧ against the new range", r);
  // ⑨ 体重が増えたとき: +0.8; the night's sleep, the day before's kcal, late, お酒, tags, 筋トレ
  r = await txt(p, "#dt12Gain");
  ok(/体重が増えたときのヒント \+0\.8 kg 前の記録（11\/14（土））より 0\.8 kg 増えました。/.test(r) && /睡眠が 5 時間と短め 前の日は摂取カロリーが目安より 800 kcal 多め 前の日は21時以降に食べた 前の日はお酒 3 杯 前の日は「塩分多め」 前の日は「外食」 前の日は筋トレ/.test(r)
    && /7日平均で見ると \+0\.1 kg/.test(r), "⑨ the reasons", r);
  // ⑩ 体重を測る時刻: 7:10, 12 in the evening and heavier
  r = await txt(p, "#dt12When");
  ok(/体重を測る時刻 7:10 ごろ/.test(r) && /この60日 60 回・朝 48 回・夜 12 回/.test(r) && /夜に測った日は、朝より 0\.\d kg ほど重めに出ています（12 回）/.test(r), "⑩ the times", r);
  ok((await p.locator("#dt12When .dt12-when-axis i").count()) === 60, "⑩ the dots");
  // an earlier day: no gain, and the cards hold
  await p.locator('.navbtn:has-text("前日") >> visible=true').first().click(); await p.waitForTimeout(500);
  ok(await p.isHidden("#dt12Gain"), "⑨ a day without a gain: hidden");

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
