// ダイエット その7 ①〜⑩, through the hook build at 8850 (the alarms) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8850/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__dt7[f](...a), { f, a });
const WHEN = new Date("2026-11-14T12:00:00+09:00");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGP438AARwzEcQB+ohfxXaFgBQAAAABJRU5ErkJggg==", "base64");
const base = () => ({ weights: D.weights(), meals: D.meals(), workouts: D.workouts(), settings: D.settings() });
async function part(p, k) { await p.evaluate(({ P, k }) => localStorage.setItem(P + "dietPart", k), { P, k }); await p.reload(); await p.waitForTimeout(1000); }
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1, permissions: ["clipboard-read", "clipboard-write"] });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.goto(process.env.URL0);
  await seed(p, base(), "diet");
  await part(p, "meal");

  // ③ 食事の予定: one for tomorrow (its kcal from the common dishes), one for today, then 食べた
  ok(await p.isVisible("#dt7Plan"), "③ the card");
  await p.fill("#dt7PlanText", "おにぎり（鮭）"); await p.selectOption("#dt7PlanDay", "2026-11-15"); await p.selectOption("#dt7PlanSlot", "朝食");
  await p.click('#dt7Plan button[type="submit"]'); await p.waitForTimeout(500);
  let plans = (await setting(p, "mealPlans"))?.list || [];
  ok(plans.length === 1 && plans[0].date === "2026-11-15" && plans[0].kcal === 180 && plans[0].slot === "朝食", "③ tomorrow's, kcal guessed", plans);
  ok(/あした/.test(await txt(p, "#dt7Plan")) && !(await p.isVisible('#dt7Plan button:has-text("食べた")')), "③ tomorrow's: no 食べた yet", await txt(p, "#dt7Plan"));
  await p.fill("#dt7PlanText", "バナナ"); await p.selectOption("#dt7PlanDay", "2026-11-14"); await p.selectOption("#dt7PlanSlot", "間食"); await p.fill("#dt7PlanKcal", "90");
  await p.click('#dt7Plan button[type="submit"]'); await p.waitForTimeout(500);
  let r = await txt(p, "#dt7Plan");
  ok(/予定をぜんぶ食べると きょうは 2,390 kcal/.test(r) && /目安を 390 kcal 超えます/.test(r), "③ what today comes to", r);
  await p.click('#dt7Plan button:has-text("食べた")'); await p.waitForTimeout(600);
  const ban = (await ls(p, "meals")).find((m) => m.text === "バナナ");
  plans = (await setting(p, "mealPlans"))?.list || [];
  ok(ban && ban.date === D.DAY && ban.slot === "間食" && ban.kcal === 90 && plans.length === 1, "③ 食べた: put in, the plan off", { ban, plans });

  // ① 食事カレンダー: November, within and over the 目安; a day pressed shows it
  const cal = await p.evaluate(() => ({ ym: document.querySelector("#dt7MealCal .bd2-cal-ym")?.textContent, ins: document.querySelectorAll("#dt7MealCal .dt7-cal-day.in").length, overs: document.querySelectorAll("#dt7MealCal .dt7-cal-day.over").length, today: document.querySelector('#dt7MealCal .dt7-cal-day.today')?.className }));
  ok(cal.ym === "2026年11月" && cal.ins >= 5 && cal.overs >= 2 && /over/.test(cal.today || ""), "① the month, in and over", cal);
  ok(/目安以内 \d+ \/ 14 日/.test(await txt(p, "#dt7MealCal")), "① the month's words", await txt(p, "#dt7MealCal"));
  await p.click('#dt7MealCal .dt7-cal-day[aria-label^="11/10"]'); await p.waitForTimeout(500);
  ok(/11月10日/.test(await txt(p, "#mealGoalCard .card-head")), "① a day pressed", await txt(p, "#mealGoalCard .card-head"));
  await p.click('#dt7MealCal .dt7-cal-day[aria-label^="11/14"]'); await p.waitForTimeout(500);

  // ② ラーメン: the next morning up; サラダ: down
  r = await txt(p, "#dt7Food");
  ok(/次の朝に増えやすいもの ラーメン \+0\.6\d kg/.test(r) && /次の朝に減っていたもの サラダ −0\.\d\d kg/.test(r), "② up and down", r);

  // ④ 写真: none, then a meal with one; the photo pressed opens large
  ok(!(await p.isVisible("#dt7Gallery")), "④ none yet");
  await p.setInputFiles("#dt4PhotoFile", { name: "a.png", mimeType: "image/png", buffer: PNG }); await p.waitForTimeout(800);
  await p.fill("#mealText", "カレー"); await p.fill("#mealKcal", "700"); await p.click('#mealForm button[type="submit"]'); await p.waitForTimeout(1200);
  ok(await p.isVisible("#dt7Gallery") && (await p.locator("#dt7Gallery .dt7-gal-cell").count()) === 1, "④ the photo there", await txt(p, "#dt7Gallery"));
  await p.click("#dt7Gallery .dt7-gal-cell"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById("dt4PhotoView")?.open === true) && /カレー/.test(await txt(p, "#dt4PhotoCap")), "④ large");
  await p.click("#dt4PhotoClose"); await p.waitForTimeout(200);

  await part(p, "workout");
  // ⑤⑥ ベンチプレス 60 kg: warm-ups and plates; 62.5 and 61; a machine's: no plates
  await p.selectOption("#woType", "筋トレ"); await p.fill("#woExercise", "ベンチプレス"); await p.fill("#woWeight", "60"); await p.waitForTimeout(200);
  r = await txt(p, "#dt7Lift");
  ok(/ウォームアップ 20 kg×10・25 kg×8・35 kg×5・47.5 kg×3/.test(r) && /プレート 片側 20 kg/.test(r), "⑤⑥ 60 kg", r);
  await p.fill("#woWeight", "62.5"); await p.waitForTimeout(150);
  ok(/片側 20 \+ 1.25 kg/.test(await txt(p, "#dt7Lift")), "⑥ 62.5 kg", await txt(p, "#dt7Lift"));
  await p.fill("#woWeight", "61"); await p.waitForTimeout(150);
  ok(/ちょうどには作れません/.test(await txt(p, "#dt7Lift")), "⑥ 61 kg can't be made", await txt(p, "#dt7Lift"));
  await p.fill("#woExercise", "レッグプレス"); await p.fill("#woWeight", ""); await p.waitForTimeout(150);
  r = await txt(p, "#dt7Lift");
  ok(/40 kg×8・60 kg×5・80 kg×3/.test(r) && /100 kg の前に/.test(r) && !/プレート/.test(r), "⑤ a machine's, from the last time", r);
  // ⑦ the day's 運動 copied
  await p.click("#dt7WoCopy button"); await p.waitForTimeout(300);
  const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  ok(clip.startsWith("11月14日（土）の運動") && clip.includes("筋トレ ベンチプレス 60 kg × 5 回 × 3 セット") && clip.includes("ランニング 5 km・30 分・6:00/km") && /合計 .*消費 約/.test(clip), "⑦ the words", clip);
  // ⑧ お知らせ: on, Sunday taken off; today (with 運動) none; ⑥ a bar of 15 kg
  await p.click("#wtSettings"); await p.waitForTimeout(500);
  await p.check("#dt7RemindOn"); await p.waitForTimeout(400);
  await p.click('#dt7RemindDays button[aria-label="日曜"]'); await p.waitForTimeout(400);
  const rm = await setting(p, "woRemind");
  ok(rm?.on === true && rm.at === "18:00" && JSON.stringify(rm.days) === "[1,2,3,4,5,6]", "⑧ kept", rm);
  const al = await W(p, "alarms", WHEN.getTime());
  ok(al.length === 5 && al.every((a) => a.title === "運動の時間です" && a.url === "./#workout") && !al.some((a) => a.tag === "dt7-wo:2026-11-14" || a.tag === "dt7-wo:2026-11-15"), "⑧ Monday to Friday", al.map((a) => a.tag));
  ok((await W(p, "push"))[0]?.[0] === "woRemind", "⑧ in what the alarms are made from");
  await p.selectOption("#dt7Bar", "15"); await p.waitForTimeout(300);
  ok((await setting(p, "barKg"))?.kg === 15, "⑥ the bar kept");
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  await p.fill("#woExercise", "ベンチプレス"); await p.fill("#woWeight", "60"); await p.waitForTimeout(150);
  ok(/片側 20 \+ 2.5 kg/.test(await txt(p, "#dt7Lift")), "⑥ with a bar of 15 kg", await txt(p, "#dt7Lift"));

  await part(p, "weight");
  // ⑨ 内訳: はじめから, both down; 30日
  const sp = await W(p, "split", "start", D.DAY);
  ok(sp && sp.dKg < -4.5 && sp.dFat < -2.5 && sp.dLean < 0, "⑨ worked out", sp);
  r = await txt(p, "#dt7Split");
  ok(/減った体重の内訳/.test(r) && /体脂肪量 −3\.\d kg 減ったうちの \d+%/.test(r), "⑨ said", r);
  await p.click('#dt7Split button:has-text("30日")'); await p.waitForTimeout(200);
  ok(/体重 −1\.\d kg/.test(await txt(p, "#dt7Split")), "⑨ 30 days", await txt(p, "#dt7Split"));
  // ⑩ 目標の理由: written, shown; on 食事 too, today being over its 目安
  await p.click('#dt7Why button:has-text("理由を書く")'); await p.waitForTimeout(200);
  await p.fill("#dt7WhyIn", "夏までにジーンズをはく"); await p.click('#dt7Why button:has-text("保存")'); await p.waitForTimeout(400);
  ok((await setting(p, "dietWhy"))?.text === "夏までにジーンズをはく" && /夏までにジーンズをはく/.test(await txt(p, "#dt7Why")), "⑩ kept and shown");
  await part(p, "meal");
  ok(/目標の理由 夏までにジーンズをはく/.test(await txt(p, "#mealGoalCard .dt7-why-meal") || ""), "⑩ on 食事, over the 目安", await txt(p, "#mealGoalCard"));

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
