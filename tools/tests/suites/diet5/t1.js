// ダイエット その5 ①〜⑩, as a user would see and use them
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const status = (p) => p.evaluate(() => document.getElementById("status")?.textContent || "");
const WHEN = new Date("2026-11-14T08:00:00+09:00");
const base = () => ({ weights: D.weights(), meals: D.meals(), workouts: D.workouts(), bodyDays: D.bodyDays(), settings: D.settings() });
async function part(p, k) { await p.evaluate(({ P, k }) => localStorage.setItem(P + "dietPart", k), { P, k }); await p.reload(); await p.waitForTimeout(900); }
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1, permissions: ["clipboard-read", "clipboard-write"] });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.goto(process.env.URL0 || "http://localhost:8765/"); await p.evaluate((P) => localStorage.setItem(P + "dietPart", "meal"), P);
  await seed(p, base(), "diet");
  await part(p, "meal");

  // ① よく食べたもの: by 回数 トースト・ごはん (30 each) first; by カロリー 牛丼 or 定食 first
  let r = await txt(p, "#dt5Rank");
  ok(/よく食べたもの/.test(r) && /1 (トースト|ごはん)/.test(r) && /30 回/.test(r), "① by 回数", r);
  await p.locator("#dt5Rank button", { hasText: "kcal" }).click(); await p.waitForTimeout(200);
  r = await txt(p, "#dt5Rank .dt5-rank-list li");
  ok(/定食/.test(r) && /12,000 kcal/.test(r), "① by カロリー: 定食 15 × 800", r);
  // ② 区分ごとのカロリー: 朝 200 / 昼 725 / 夕 250 / 間食 400÷3 a day
  r = await txt(p, "#dt5Slots");
  ok(/朝食 15%/.test(r) && /昼食 55%/.test(r) && /間食 10%/.test(r), "② the shares", r);
  ok(/間食/.test(r) && /1日 平均 725 kcal/.test(r), "② 昼食 725 a day", r);
  // ③ the day's 食事, copied
  ok(await p.isVisible("#dt5Copy"), "③ the button");
  await p.click("#dt5Copy button"); await p.waitForTimeout(300);
  const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  ok(clip.startsWith("11月14日（土）の食事") && clip.includes("朝食：トースト 200kcal") && clip.includes("合計 1,650 kcal（P 6g・F 3g・C 36g）"), "③ the words", clip);
  ok((await status(p)).includes("コピーしました"), "③ said");

  // ④〜⑦ 運動
  await part(p, "workout");
  // ⑤ no goal yet: a link; a goal of 3 days set
  ok(/今週の運動/.test(await txt(p, "#dt5WoGoal")) && /目標を決める/.test(await txt(p, "#dt5WoGoal")), "⑤ without a goal", await txt(p, "#dt5WoGoal"));
  await p.evaluate((P) => { const s = JSON.parse(localStorage.getItem(P + "settings")); s.push({ id: "woDaysGoal", days: 3, updatedAt: Date.now() }); localStorage.setItem(P + "settings", JSON.stringify(s)); }, P);
  await p.reload(); await p.waitForTimeout(900);
  r = await txt(p, "#dt5WoGoal");
  ok(/3 \/ 3 日/.test(r) && /今週の目標に届きました/.test(r) && /2 週続けて達成/.test(r), "⑤ 3 / 3, two weeks before too", r);
  // ④ 推定1RM: 60 kg × 5 → 70 kg; under 種目 as it is typed
  r = await txt(p, "#dt5RmCard");
  ok(/ベンチプレス/.test(r) && /70 kg/.test(r) && !/プランク/.test(r), "④ the card", r);
  await p.selectOption("#woType", "筋トレ"); await p.fill("#woExercise", "ベンチプレス"); await p.waitForTimeout(200);
  r = await txt(p, "#dt5RmLine");
  ok(/推定1RM 70 kg/.test(r) && /10回 52.5 kg/.test(r), "④ under 種目", r);
  // ⑥ the best run in 90 days (5 km in 30, 10 km in 65): 5 km 30:00; the one from September left out
  r = await txt(p, "#dt5Race");
  ok(/5 km 6:00\/km 30:00/.test(r) && /ハーフ/.test(r) && /フル/.test(r), "⑥ the times", r);
  // ⑦ interval: 20 × 8 with 10 rest = 3:50; run on the clock to its end, then put in
  r = await txt(p, "#dt5Hiit");
  ok(/全部で 3:50/.test(r), "⑦ the length", r);
  await p.selectOption('#dt5Hiit select[aria-label="回数"]', "4"); await p.waitForTimeout(400);
  ok(/全部で 1:50/.test(await txt(p, "#dt5Hiit")), "⑦ 回数 changed and kept", await txt(p, "#dt5Hiit"));
  await p.click("#dt5Hiit .btn"); await p.waitForTimeout(300);
  ok(/よーい/.test(await txt(p, "#dt5Hiit")), "⑦ ready", await txt(p, "#dt5Hiit"));
  await p.clock.setFixedTime(new Date(WHEN.getTime() + 8000)); await p.waitForTimeout(500);
  ok(/運動/.test(await txt(p, ".dt5-hi-phase")) && /1 \/ 4 回/.test(await txt(p, "#dt5Hiit")), "⑦ 運動 1 of 4", await txt(p, "#dt5Hiit"));
  await p.clock.setFixedTime(new Date(WHEN.getTime() + 27000)); await p.waitForTimeout(500);
  ok(/休み/.test(await txt(p, ".dt5-hi-phase")), "⑦ 休み", await txt(p, "#dt5Hiit"));
  await p.clock.setFixedTime(new Date(WHEN.getTime() + 120000)); await p.waitForTimeout(600);
  ok(/できました/.test(await txt(p, "#dt5Hiit")), "⑦ done", await txt(p, "#dt5Hiit"));
  await p.locator("#dt5Hiit button", { hasText: "運動に記録する" }).click(); await p.waitForTimeout(500);
  const hi = (await ls(p, "workouts")).find((x) => /インターバル/.test(x.note || ""));
  ok(hi && hi.type === "その他" && hi.minutes === 2 && hi.date === "2026-11-14", "⑦ put in", hi);

  // ⑧〜⑩ からだ
  await part(p, "weight");
  // ⑧ 血圧: the 13th's in the week; today's put in, 高め said
  r = await txt(p, "#dt5Vital");
  ok(/血圧・脈拍/.test(r), "⑧ the card", r);
  await p.fill("#dt5Sys", "140"); await p.press("#dt5Sys", "Tab"); await p.fill("#dt5Dia", "88"); await p.press("#dt5Dia", "Tab"); await p.fill("#dt5Pulse", "70"); await p.press("#dt5Pulse", "Tab"); await p.waitForTimeout(600);
  const bd = (await ls(p, "bodyDays")).find((x) => x.id === "2026-11-14");
  ok(bd && bd.sys === 140 && bd.dia === 88 && bd.pulse === 70, "⑧ kept in bodyDays", bd);
  await p.click("#wtInput"); await p.waitForTimeout(300);
  ok(/高めの目安/.test(await txt(p, "#dt5Vital")) && /140\/88/.test(await txt(p, "#dt5Vital")), "⑧ 高め", await txt(p, "#dt5Vital"));
  // ⑨ Mondays heavier
  r = await txt(p, "#dt5Wd");
  ok(/月曜がいちばん重め/.test(r), "⑨ Monday", r);
  // ⑩ against a week, a month, 3 months and a year
  r = await txt(p, "#dt5Ago");
  ok(/1週間前/.test(r) && /1か月前/.test(r) && /3か月前/.test(r) && /1年前/.test(r), "⑩ the rows", r);
  ok(/1年前 −3\.\d kg/.test(r), "⑩ a year: about 3.6 kg down", r);

  // no errors, and nothing wider than the phone
  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
