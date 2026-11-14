// ダイエット その10 ①〜⑩, through the hook build at 8853 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8853/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__dt10[f](...a), { f, a });
const WHEN = new Date("2026-11-14T12:00:00+09:00");
const base = () => ({ weights: D.weights(), meals: D.meals(), workouts: D.workouts(), bodyDays: D.bodyDays(), settings: D.settings() });
async function part(p, k) { await p.evaluate(({ P, k }) => localStorage.setItem(P + "dietPart", k), { P, k }); await p.reload(); await p.waitForTimeout(1000); }
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.goto(process.env.URL0);
  await seed(p, base(), "diet");
  await part(p, "meal");

  // ① 量を変える: ×1.5, ×2 from what was typed, もとに戻す; added at ×2
  ok(!(await p.isVisible("#dt10Mul")), "① none without kcal");
  await p.fill("#mealText", "ごはん"); await p.fill("#mealKcal", "300"); await p.fill("#mealP", "5"); await p.waitForTimeout(150);
  ok(await p.isVisible("#dt10Mul"), "① shown with kcal");
  await p.click('#dt10Mul button:has-text("×1.5")'); await p.waitForTimeout(100);
  ok((await p.inputValue("#mealKcal")) === "450" && (await p.inputValue("#mealP")) === "7.5" && (await p.inputValue("#mealText")) === "ごはん（×1.5）", "① ×1.5", [await p.inputValue("#mealKcal"), await p.inputValue("#mealText")]);
  await p.click('#dt10Mul button:has-text("×2")'); await p.waitForTimeout(100);
  ok((await p.inputValue("#mealKcal")) === "600" && (await p.inputValue("#mealP")) === "10" && (await p.inputValue("#mealText")) === "ごはん（×2）", "① ×2 from the first", [await p.inputValue("#mealKcal"), await p.inputValue("#mealText")]);
  await p.click('#dt10Mul button:has-text("もとに戻す")'); await p.waitForTimeout(100);
  ok((await p.inputValue("#mealKcal")) === "300" && (await p.inputValue("#mealText")) === "ごはん", "① もとに戻す");
  await p.click('#dt10Mul button:has-text("×2")'); await p.click('#mealForm button[type="submit"]'); await p.waitForTimeout(500);
  const g2 = (await ls(p, "meals")).find((m) => m.text === "ごはん（×2）");
  ok(g2 && g2.kcal === 600 && g2.p === 10, "① added at ×2", g2);
  ok(!(await p.isVisible("#dt10Mul")), "① gone with the form emptied");
  // ② 平日と週末: weekends 500 kcal more, every weekend day late
  const sp = await W(p, "split");
  ok(sp.we.kcal - sp.wd.kcal >= 500 && sp.wd.kcal === 1600 && sp.we.late === 100 && sp.wd.late === 0, "② worked out (today has ① too)", sp);
  let r = await txt(p, "#dt10Split");
  ok(/週末は平日より 1日 5\d\d kcal 多めです/.test(r) && /21時以降に食べた日 0% 100%/.test(r), "② said", r);
  // ③ 食事を探す: ケーキ, its times and average; a day pressed
  await p.fill("#dt10FindIn", "ケーキ"); await p.waitForTimeout(200);
  r = await txt(p, "#dt10Find .dt10-find-sum");
  const cakes = D.meals().filter((m) => m.text === "ケーキ").length;
  ok(new RegExp(`ケーキ ${cakes} 回・平均 500 kcal・最後は`).test(r), "③ the summary", r);
  const second = await p.evaluate(() => document.querySelectorAll("#dt10Find .dt10-find-go")[1]?.getAttribute("aria-label"));
  await p.locator("#dt10Find .dt10-find-go").nth(1).click(); await p.waitForTimeout(500);
  const md = (second || "").match(/^(\d+)\/(\d+)/);
  ok(md && (await txt(p, "#mealGoalCard .card-head")).startsWith(`${md[1]}月${md[2]}日`), "③ the day pressed, shown", [second, await txt(p, "#mealGoalCard .card-head")]);

  await part(p, "workout");
  // ④ 種目の目標: ベンチプレス 90 kg × 1; 推定1RM 79, the pace 2.9 kg a week
  ok((await W(p, "trend", "ベンチプレス")) > 2.5, "④ the pace", await W(p, "trend", "ベンチプレス"));
  await p.fill("#dt10GoalName", "ベンチプレス"); await p.fill("#dt10GoalKg", "90"); await p.fill("#dt10GoalReps", "1"); await p.click('#dt10Goals button[type="submit"]'); await p.waitForTimeout(400);
  ok((await setting(p, "moveGoals"))?.list?.[0]?.kg === 90, "④ kept");
  r = await txt(p, "#dt10Goals .dt10-goal-list");
  ok(/ベンチプレス 90 kg × 1 回/.test(r) && /いまの推定1RM 79 kg（目標は 1RM で 90 kg）・このペースなら 12月ごろ/.test(r), "④ where it stands", r);
  // ⑤ 記録の推移: 運動の時間, 消費カロリー, ランの距離
  const opts = await p.evaluate(() => [...document.querySelectorAll("#woChartPick option")].map((o) => o.value));
  ok(["dt10min", "dt10kcal", "dt10run"].every((v) => opts.includes(v)), "⑤ the three", opts);
  await p.selectOption("#woChartPick", "dt10run"); await p.waitForTimeout(300);
  ok(/この月 \d+ km・前の月 \d+ km/.test(await txt(p, "#woChartNote")) && (await p.locator("#woChart .wo-bar").count()) >= 3, "⑤ ランの距離（月ごと）", await txt(p, "#woChartNote"));
  await p.selectOption("#woChartPick", "dt10min"); await p.waitForTimeout(300);
  ok(/1セット2.5分/.test(await txt(p, "#woChartNote")), "⑤ 運動の時間", await txt(p, "#woChartNote"));
  // ⑥ ストレッチ: 首, then 肩 after 30 s, 次へ to 胸; done and put in
  await p.click('#dt10Stretch button:has-text("スタート")'); await p.waitForTimeout(300);
  ok(/1 \/ 8/.test(await txt(p, "#dt10Stretch")) && (await txt(p, ".dt10-st-name")) === "首", "⑥ 首", await txt(p, "#dt10Stretch"));
  await p.clock.setFixedTime(new Date(WHEN.getTime() + 31000)); await p.waitForTimeout(500);
  ok((await txt(p, ".dt10-st-name")) === "肩", "⑥ 肩 after 30 s", await txt(p, ".dt10-st-name"));
  await p.click('#dt10Stretch button:has-text("次へ")'); await p.waitForTimeout(400);
  ok((await txt(p, ".dt10-st-name")) === "胸" && /3 \/ 8/.test(await txt(p, "#dt10Stretch")), "⑥ 次へ", await txt(p, "#dt10Stretch"));
  await p.clock.setFixedTime(new Date(WHEN.getTime() + 300000)); await p.waitForTimeout(600);
  ok(/できました/.test(await txt(p, "#dt10Stretch")), "⑥ done", await txt(p, "#dt10Stretch"));
  await p.click('#dt10Stretch button:has-text("運動に記録する")'); await p.waitForTimeout(500);
  const st = (await ls(p, "workouts")).find((x) => /ストレッチ/.test(x.note || ""));
  ok(st && st.type === "その他" && st.minutes === 4, "⑥ put in", st);
  await p.clock.setFixedTime(WHEN);

  await part(p, "weight");
  // ⑦ 運動と次の日の体重
  const mk = await W(p, "moveKg");
  ok(mk.did >= 20 && mk.not >= 40 && mk.b - mk.a > 0.15, "⑦ worked out", mk);
  r = await txt(p, "#dt10MoveKg");
  ok(/運動した日の次の朝 −0\.\d\d kg/.test(r) && /運動した日のほうが、次の朝の体重が 0\.\d kg ほど軽めです/.test(r) && /8,000 歩以上の日の次の朝/.test(r), "⑦ said", r);
  // ⑨ 体脂肪率の見通し: −0.35% a week, 20% in about a month
  r = await txt(p, "#dt10Fat");
  ok(/1週間に −0\.35%/.test(r) && /このペースなら 12月\d+日（.）ごろ に 20\.0%（あと 1\.\d%）/.test(r), "⑨ the way", r);
  // ⑩ タイムライン: 起きた, 体重, 朝食… in order, 寝た the night after none (no record for tomorrow)
  r = await txt(p, "#dt10Line .dt10-l-list");
  const times = await p.evaluate(() => [...document.querySelectorAll("#dt10Line .dt10-l-list:not(.loose) .dt10-l-t")].map((x) => x.textContent));
  ok(/^06:30 起きた 睡眠 7 時間 07:00 体重 \d\d\.\d kg 体脂肪率 \d\d\.\d% 07:30 朝食 トースト 300 kcal/.test(r) && /18:00 ランニング 5 km・30 分/.test(r) && /21:30 夕食 ごはん 600 kcal$/.test(r) && times.every((t, i) => !i || times[i - 1] <= t), "⑩ in order", r);
  // ⑧ 30日チャレンジ: 歩数の目標, from 9 days ago: the days at 8,000 met
  await p.click('#dt10Ch button:has-text("歩数の目標")'); await p.waitForTimeout(300);
  ok((await setting(p, "dietChallenge"))?.kind === "steps" && /1 日目/.test(await txt(p, "#dt10Ch")), "⑧ begun", await txt(p, "#dt10Ch"));
  await p.evaluate(({ P, s }) => { const all = JSON.parse(localStorage.getItem(P + "settings")); all.find((x) => x.id === "dietChallenge").start = s; localStorage.setItem(P + "settings", JSON.stringify(all)); }, { P, s: D.addDays(D.DAY, -9) });
  await p.reload(); await p.waitForTimeout(1000);
  const met = Array.from({ length: 10 }, (_, i) => i).filter((i) => D.ran(i)).length;
  r = await txt(p, "#dt10Ch");
  ok(/10 日目/.test(r) && new RegExp(`できた日 ${met} / 30`).test(r) && (await p.locator("#dt10Ch .dt10-ch-grid li").count()) === 30, "⑧ the days met", r);
  await p.click('#dt10Ch button:has-text("やめる")'); await p.waitForTimeout(150); await p.click('#dt10Ch button:has-text("もう一度押すと")'); await p.waitForTimeout(300);
  ok(!(await setting(p, "dietChallenge")), "⑧ やめる");

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
