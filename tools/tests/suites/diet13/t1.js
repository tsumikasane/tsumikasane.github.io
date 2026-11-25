// ダイエット その13 ①〜⑩, through the hook build at 8891 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8891/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__dt13[f](...a), { f, a });
const WHEN = new Date("2026-11-15T12:00:00+09:00"), DAY = D.DAY;
const base = () => ({ weights: D.weights(), meals: D.meals(), expenses: D.expenses(), workouts: D.workouts(), bodyDays: D.bodyDays(), settings: D.settings() });
async function part(p, k) { await p.evaluate(({ P, k }) => localStorage.setItem(P + "dietPart", k), { P, k }); await p.reload(); await p.waitForTimeout(1000); }
const N = new Intl.NumberFormat("ja-JP");
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.goto(process.env.URL0);
  await seed(p, base(), "diet");
  await part(p, "meal");

  // ② 1週間の食事の表: 11/9〜11/15 by 区分; 4 days over 1,800; a day's head goes to it
  let r = await txt(p, "#dt13Table");
  ok(/朝食 400 400 400 400 400 400 400 昼食 800 800 800 800 800 800 1200 夕食 500 500 500 500 500 1000 間食 115 115 115\+ 合計 1815 1700 1815 1700 1815\+ 2200 1600/.test(r), "② the table", r);
  ok((await p.locator("#dt13Table tfoot td.over").count()) === 4, "② over the 目安 marked");
  await p.click('#dt13Table button[aria-label="11/14（土）の食事を見る"]'); await p.waitForTimeout(400);
  ok(/11月14日（土）の食事/.test(await txt(p, "#mealGoalCard")), "② to that day", await txt(p, "#mealGoalCard"));
  await part(p, "meal");
  // ③ たんぱく質のもと
  r = await txt(p, "#dt13ProtSrc");
  ok(/たんぱく質のもと この30日 2,524 g 鶏むね肉のソテー 29 回・100 kcal あたり 7 g 1,015 g（40%） 定食 29 回・100 kcal あたり 3\.1 g 725 g（29%） 納豆ごはん 30 回・100 kcal あたり 3\.8 g 450 g（18%） プロテイン（1杯 30g）高たんぱく 14 回・100 kcal あたり 18\.3 g 294 g（12%） 焼肉定食/.test(r), "③ the most first", r);
  // ① 食費とカロリー
  r = await txt(p, "#dt13Cost");
  ok(/食費とカロリー 11月 値段を入れた食事 14,100 円（15 食） 1食あたり 940 円 100 kcal あたり 114 円 いちばん高かった食事 1,500 円 焼肉定食（11\/15（日）） 先月 4,250 円 先月より \+9,850 円/.test(r), "① this month's", r);

  // ④ 痛み・つかれ: taken out at the user's call (2026-11-22, tools/REMOVED.md); a day's pains (bodyDays pain) stay
  await part(p, "workout");
  ok(!(await p.$("#dt13Pain")), "④ gone");
  const pains = (xs) => xs.filter((x) => x.pain).map((x) => `${x.id}:${x.pain.join("+")}`).sort().join();
  ok(pains(await ls(p, "bodyDays")) === pains(D.bodyDays()), "④ the pains kept as they were", pains(await ls(p, "bodyDays")));

  // ⑤ 伸び悩みの種目: ベンチプレス, not スクワット
  r = await txt(p, "#dt13Stall");
  ok(/伸び悩みの種目 1 \/ 2 ベンチプレス 推定1RM 66\.5 → 66\.5 kg・ここ4週 3 回/.test(r) && !/スクワット/.test(r), "⑤ the one that stopped", r);
  // ⑦ 曜日のくせ: runs on 火・木; 歩数 least on 日
  r = await txt(p, "#dt13Wd");
  ok(/日 0\/8 3,000 歩 月 0\/8 8,000 歩 火 8\/8 8,000 歩 水 0\/8 8,000 歩 木 8\/8 8,000 歩 金 5\/8 8,000 歩 土 0\/8 6,000 歩/.test(r) && /運動しやすいのは火・木曜・少ないのは日・月・水・土曜・歩数がいちばん少ないのは日曜（平均 3,000 歩）/.test(r), "⑦ the weekdays", r);
  // ⑥ すきま運動: スクワット twice, one taken back; プランク (秒) and 階段 (その他, 分)
  await p.click('#dt13Quick button[aria-label="スクワット 20回を記録する"]'); await p.waitForTimeout(300);
  await p.click('#dt13Quick button[aria-label="スクワット 20回を記録する"]'); await p.waitForTimeout(300);
  ok(/きょうのすきま運動：スクワット 40回/.test(await txt(p, "#dt13Quick")), "⑥ counted", await txt(p, "#dt13Quick"));
  await p.click(".toast-undo >> visible=true"); await p.waitForTimeout(400);
  ok((await ls(p, "workouts")).filter((w) => w.date === DAY && w.exercise === "スクワット" && w.reps === 20 && w.sets === 1).length === 1, "⑥ one taken back");
  await p.click('#dt13Quick button[aria-label="プランク 30秒を記録する"]'); await p.waitForTimeout(300);
  await p.click('#dt13Quick button[aria-label="階段 3分を記録する"]'); await p.waitForTimeout(300);
  const ws = (await ls(p, "workouts")).filter((w) => w.date === DAY);
  ok(ws.some((w) => w.exercise === "プランク" && w.per === "sec" && w.reps === 30) && ws.some((w) => w.type === "その他" && w.minutes === 3 && w.note === "階段"), "⑥ 秒 and 分 kept so", ws);
  ok(/きょうのすきま運動：スクワット 20回・プランク 30秒・階段 3分/.test(await txt(p, "#dt13Quick")), "⑥ said", await txt(p, "#dt13Quick"));

  // ⑧ もし1日 ○ kcal なら taken out at the user's call (2026-11-25, tools/REMOVED.md): no card; the 目安 as it was
  await part(p, "weight");
  ok(!(await p.$("#dt13Sim")) && !(await p.evaluate(() => [...document.querySelectorAll("#part-weight .card")].some((c) => c.innerText.includes("もし1日")))), "⑧ もし1日 ○ kcal なら: gone");
  ok((await setting(p, "kcalGoal"))?.target === 1800, "⑧ the 目安 as it was");
  // ⑨ 睡眠負債: 5 時間
  r = await txt(p, "#dt13Debt");
  ok(/睡眠負債（この7日） 5 時間/.test(r) && /平均 6 時間 17 分・6時間未満 2 日 週末の寝だめでは取り戻しきれません/.test(r) && (await p.locator("#dt13Debt .dt13-debt-bar i.short").count()) === 2, "⑨ the debt", r);
  // ⑩ 写真をパラパラ見る: 3 photos, played to the end
  ok(await p.isHidden("#dt13Flip"), "⑩ none yet: hidden");
  for (const [d, c] of [[D.addDays(DAY, -20), "#c33"], [D.addDays(DAY, -10), "#3c3"], [DAY, "#33c"]]) await W(p, "addPhoto", d, c);
  await p.waitForTimeout(600);
  r = await txt(p, "#dt13Flip");
  ok(/写真をパラパラ見る 3 枚 10\/26（月） 70\.0 kg（1 \/ 3）/.test(r), "⑩ the first", r);
  await p.selectOption("#dt13Flip select", "350"); await p.click("#dt13Flip .dt13-flip-play"); await p.waitForTimeout(1400);
  r = await txt(p, "#dt13Flip");
  ok(/11\/15（日） 69\.0 kg（3 \/ 3）/.test(r) && (await p.textContent("#dt13Flip .dt13-flip-play")) === "再生", "⑩ played to the end", r);

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
