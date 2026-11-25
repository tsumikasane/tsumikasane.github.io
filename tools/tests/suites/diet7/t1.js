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
// (食事の記録画面, 2026-11-18) a 区分's screen opened (the one picked when none is given), and a tile's panel; closed
async function rec(p, slot, panel) {
  if (!(await p.evaluate(() => document.getElementById("mealRec").open))) { const s = slot || (await p.evaluate(() => document.querySelector('input[name="mealSlot"]:checked')?.value || "朝食")); await p.click(`#mealSlots button[data-slot="${s}"]`); await p.waitForTimeout(300); }
  else if (slot) { await p.click(`#mealRecSlots button:has-text("${slot}")`); await p.waitForTimeout(200); }
  if (panel && !(await p.evaluate((k) => document.getElementById({ often: "mealOften", sets: "dt4Sets", recipe: "dt18Recipe", label: "dt18Label", bulk: "dt8Bulk" }[k])?.classList.contains("mr-on"), panel))) { await p.click(panel === "bulk" ? "#mealRecBulk" : `#mealRecTiles button[data-tile="${panel}"]`); await p.waitForTimeout(250); }
}
async function unrec(p) { if (await p.evaluate(() => document.getElementById("mealRec").open)) { await p.click("#mealRecClose"); await p.waitForTimeout(200); } }
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1, permissions: ["clipboard-read", "clipboard-write"] });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.goto(process.env.URL0);
  await seed(p, base(), "diet");
  await part(p, "meal");

  // ③ 食事の予定: the card taken off at the user's call (2026-11-24, tools/REMOVED.md): no card, nor its もくじ's line (its plans, in
  // きょうの記録: mealplan)
  ok(!(await p.$("#dt7Plan")) && !(await p.$("#dt7PlanText")) && !(await p.evaluate(() => [...document.querySelectorAll("#dt16Toc-meal .dt16-toc-go")].some((b) => b.dataset.id === "dt7Plan"))), "③ gone");
  let r;

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
  await rec(p);
  await p.setInputFiles("#dt4PhotoFile", { name: "a.png", mimeType: "image/png", buffer: PNG }); await p.waitForTimeout(800);
  await p.fill("#mealText", "カレー"); await p.fill("#mealKcal", "700"); await p.click("#mealRecAdd"); await p.waitForTimeout(1200);
  await unrec(p);
  ok(await p.isVisible("#dt7Gallery") && (await p.locator("#dt7Gallery .dt7-gal-cell").count()) === 1, "④ the photo there", await txt(p, "#dt7Gallery"));
  await p.click("#dt7Gallery .dt7-gal-cell"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById("dt4PhotoView")?.open === true) && /カレー/.test(await txt(p, "#dt4PhotoCap")), "④ large");
  await p.click("#dt4PhotoClose"); await p.waitForTimeout(200);

  await part(p, "workout");
  // ⑤ ベンチプレス 60 kg: warm-ups, the bar alone first; a machine's: from the last time. ⑥ プレート: taken out at the
  // user's call (2026-11-22, tools/REMOVED.md), with its setting (バーベル); settings barKg stays, ⑤ reading it
  await p.selectOption("#woType", "筋トレ"); await p.fill("#woExercise", "ベンチプレス"); await p.fill("#woWeight", "60"); await p.waitForTimeout(200);
  r = await txt(p, "#dt7Lift");
  ok(/ウォームアップ 20 kg×10・25 kg×8・35 kg×5・47.5 kg×3/.test(r) && !/プレート|片側/.test(r), "⑤ 60 kg, ⑥ no plates", r);
  await p.fill("#woWeight", "62.5"); await p.waitForTimeout(150);
  ok(!/プレート|片側/.test(await txt(p, "#dt7Lift")), "⑥ 62.5 kg: no plates", await txt(p, "#dt7Lift"));
  await p.fill("#woWeight", "20"); await p.waitForTimeout(150);
  ok(await p.isHidden("#dt7Lift"), "⑥ 20 kg, the bar alone (no warm-ups): nothing shown", await txt(p, "#dt7Lift"));
  await p.fill("#woExercise", "レッグプレス"); await p.fill("#woWeight", ""); await p.waitForTimeout(150);
  r = await txt(p, "#dt7Lift");
  ok(/40 kg×8・60 kg×5・80 kg×3/.test(r) && /100 kg の前に/.test(r) && !/プレート/.test(r), "⑤ a machine's, from the last time", r);
  // ⑦ the day's 運動 copied
  await p.click("#dt7WoCopy button"); await p.waitForTimeout(300);
  const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  ok(clip.startsWith("11月14日（土）の運動") && clip.includes("筋トレ ベンチプレス 60 kg × 5 回 × 3 セット") && clip.includes("ランニング 5 km・30 分・6:00/km") && /合計 .*消費 約/.test(clip), "⑦ the words", clip);
  // ⑧ お知らせ: on, Sunday taken off; today (with 運動) none; ⑥ バーベル (the bar's weight): gone from the settings
  await p.click("#wtSettings"); await p.waitForTimeout(500);
  await p.check("#dt7RemindOn"); await p.waitForTimeout(400);
  await p.click('#dt7RemindDays button[aria-label="日曜"]'); await p.waitForTimeout(400);
  const rm = await setting(p, "woRemind");
  ok(rm?.on === true && rm.at === "18:00" && JSON.stringify(rm.days) === "[1,2,3,4,5,6]", "⑧ kept", rm);
  const al = await W(p, "alarms", WHEN.getTime());
  ok(al.length === 5 && al.every((a) => a.title === "運動の時間です" && a.url === "./#workout") && !al.some((a) => a.tag === "dt7-wo:2026-11-14" || a.tag === "dt7-wo:2026-11-15"), "⑧ Monday to Friday", al.map((a) => a.tag));
  ok((await W(p, "push"))[0]?.[0] === "woRemind", "⑧ in what the alarms are made from");
  ok(!(await p.$("#dt7Bar")) && !/バーベル|バーの重さ/.test(await txt(p, "#woSetGroup")), "⑥ the bar's setting gone", await txt(p, "#woSetGroup"));
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  // a bar of 15 kg set before (settings barKg): kept as it was, ⑤ starting from it
  const bar = { id: "barKg", kg: 15, updatedAt: D.T("2026-10-01") };
  await p.evaluate(({ P, bar }) => localStorage.setItem(P + "settings", JSON.stringify([...JSON.parse(localStorage.getItem(P + "settings") || "[]"), bar])), { P, bar });
  await part(p, "workout");
  await p.selectOption("#woType", "筋トレ"); await p.fill("#woExercise", "ベンチプレス"); await p.fill("#woWeight", "60"); await p.waitForTimeout(150);
  r = await txt(p, "#dt7Lift");
  ok(/ウォームアップ 15 kg×10・25 kg×8・35 kg×5・47.5 kg×3/.test(r) && !/プレート|片側/.test(r), "⑤ from a bar of 15 kg kept", r);
  ok(JSON.stringify(await setting(p, "barKg")) === JSON.stringify(bar), "⑥ barKg kept as it was", await setting(p, "barKg"));

  await part(p, "weight");
  // ⑨ 内訳: はじめから, both down; 30日
  const sp = await W(p, "split", "start", D.DAY);
  ok(sp && sp.dKg < -4.5 && sp.dFat < -2.5 && sp.dLean < 0, "⑨ worked out", sp);
  r = await txt(p, "#dt7Split");
  ok(/減った体重の内訳/.test(r) && /体脂肪量 −3\.\d kg 減ったうちの \d+%/.test(r), "⑨ said", r);
  await p.click('#dt7Split button:has-text("30日")'); await p.waitForTimeout(200);
  ok(/体重 −1\.\d kg/.test(await txt(p, "#dt7Split")), "⑨ 30 days", await txt(p, "#dt7Split"));
  // ⑩ 目標の理由 taken out at the user's call (2026-11-25, tools/REMOVED.md): no card, and no line on 食事 though today is over
  // its 目安 and a reason was written before (kept as it was)
  ok(!(await p.$("#dt7Why")) && !(await p.evaluate(() => [...document.querySelectorAll("#part-weight .card")].some((c) => c.innerText.includes("目標の理由")))), "⑩ 目標の理由: gone");
  await p.evaluate((P) => { const l = JSON.parse(localStorage.getItem(P + "settings") || "[]"); l.push({ id: "dietWhy", text: "夏までにジーンズをはく", updatedAt: 1 }); localStorage.setItem(P + "settings", JSON.stringify(l)); }, P);
  await part(p, "meal");
  ok(!(await p.$("#mealGoalCard .dt7-why-meal")) && !(await txt(p, "#mealGoalCard")).includes("夏までにジーンズをはく"), "⑩ not on 食事 either", await txt(p, "#mealGoalCard"));
  ok((await setting(p, "dietWhy"))?.text === "夏までにジーンズをはく", "⑩ what was written stays");

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
