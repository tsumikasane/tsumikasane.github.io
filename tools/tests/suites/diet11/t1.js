// ダイエット その11 ①〜⑩, through the hook build at 8854 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8854/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__dt11[f](...a), { f, a });
const WHEN = new Date("2026-11-14T12:00:00+09:00");
const base = () => ({ weights: D.weights(), meals: D.meals(), workouts: D.workouts(), bodyDays: D.bodyDays(), settings: D.settings() });
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
  const p = await phone(b, WHEN, { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.goto(process.env.URL0);
  await seed(p, base(), "diet");
  await part(p, "meal");

  // ① 間食の目標: 3 this week, a goal of 3 a week; the weeks before kept to it
  ok(/今週の間食 3 回/.test(await txt(p, "#dt11Snack")), "① this week's", await txt(p, "#dt11Snack"));
  await p.selectOption("#dt11SnackGoal", "3"); await p.waitForTimeout(400);
  ok((await setting(p, "snackGoal"))?.perWeek === 3, "① kept");
  let r = await txt(p, "#dt11Snack");
  ok(/今週の間食 3 \/ 3 回/.test(r) && /あと 0 回まで・\d+ 週続けて目標どおり/.test(r), "① against it", r);
  // ② ちょい足し: マヨネーズ, under the 区分 picked
  await rec(p, "昼食", "often");
  await p.click('#dt11Add button:has-text("マヨネーズ（大さじ1）")'); await p.waitForTimeout(500);
  const mayo = (await ls(p, "meals")).find((m) => m.text === "マヨネーズ（大さじ1）");
  ok(mayo && mayo.kcal === 84 && mayo.slot === "昼食" && mayo.date === D.DAY, "② put in", mayo);

  await part(p, "workout");
  // ⑤ ガイドライン: 840 分 (ラン counted twice) and 筋トレ 2 days
  r = await txt(p, "#dt11Guide");
  ok(/有酸素（中くらいの強さで） 840 \/ 150 分/.test(r) && /筋トレ 2 \/ 2 日/.test(r) && /今週はガイドラインに届いています（ランは1分を2分として数えています）/.test(r), "⑤ the week", r);
  // ④ トレーニングの負荷: this week far over the 4 weeks' usual
  const ac = await W(p, "acwr");
  ok(ac.enough && ac.ratio > 1.5, "④ worked out", ac);
  r = await txt(p, "#dt11Load");
  ok(/トレーニングの負荷 \d\.\d\d 倍/.test(r) && /急に増えています/.test(r), "④ said", r);
  // ③ 運動を文でまとめて入れる: taken out at the user's call (2026-11-19, tools/REMOVED.md); 食事's (その8 ①) stays
  ok(!(await p.$("#dt11Bulk")), "③ gone");

  await part(p, "weight");
  // ⑩ 目標の一覧: the goals, set and not; 決める opens where it is set
  r = await txt(p, "#dt11Goals");
  ok(/目標体重 いま \d\d\.\d kg（7日平均） 65\.0 kg 変える/.test(r) && /間食 今週 3 回 週 3 回まで 変える/.test(r) && /たんぱく質 きょう [\d.]+ g 未設定 決める/.test(r), "⑩ the list", r);
  await p.click('#dt11Goals button[aria-label="たんぱく質を決める"]'); await p.waitForTimeout(700);
  ok(await p.isVisible("#proteinGoal"), "⑩ 決める opens its setting");
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  // ⑥ 減った体重を物にすると
  r = await txt(p, "#dt11Things");
  ok(/減った体重を物にすると −3\.\d kg/.test(r) && /本 2L のペットボトル/.test(r) && /箱 バター（200g）/.test(r), "⑥ as things", r);
  // ⑧ 睡眠のリズム: weekends 2.5 hours later
  const sl = await W(p, "sleep");
  ok(sl && sl.lag === 150 && sl.n === 30, "⑧ worked out", sl);
  r = await txt(p, "#dt11Sleep");
  ok(/週末と平日のずれ 2 時間 30 分 週末は遅く寝て起きています/.test(r), "⑧ said", r);
  // ⑨ 体重の記録の1年
  r = await txt(p, "#dt11Year");
  ok(/体重の記録の1年 120 日/.test(r) && (await p.locator("#dt11Year .dt11-y-col i").count()) === 371 && (await p.locator("#dt11Year .dt11-y-col i.down, #dt11Year .dt11-y-col i.up, #dt11Year .dt11-y-col i.same").count()) === 120, "⑨ the squares", r);
  // ⑦ サイズと体型写真のお知らせ: on, the 15th; the next two months
  await p.click("#wtSettings"); await p.waitForTimeout(500);
  await p.check("#dt11SizeOn"); await p.waitForTimeout(300);
  await p.selectOption("#dt11SizeDay", "15"); await p.waitForTimeout(300);
  const rm = await setting(p, "sizeRemind");
  ok(rm?.on === true && rm.day === 15 && rm.at === "08:00", "⑦ kept", rm);
  const al = await W(p, "alarms", WHEN.getTime());
  ok(al.length === 2 && al[0].tag === "dt11-size:2026-11" && al[1].tag === "dt11-size:2026-12" && new Date(al[0].at).toISOString() === "2026-11-14T23:00:00.000Z" && /前回のウエスト/.test(al[0].body), "⑦ the next two", al);
  ok((await W(p, "push"))[0]?.[0] === "sizeRemind", "⑦ in what the alarms are made from");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
