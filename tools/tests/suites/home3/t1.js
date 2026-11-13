// きょう その3 ①〜⑩, through the hook build at 8801 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8801/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s  ]+/g, "");
const tileTxt = (p, k) => p.evaluate((k) => document.querySelector(`.tile[data-tile="${k}"]`)?.innerText ?? null, k).then(flat);
const H = (p, f, ...a) => p.evaluate(({ f, a }) => window.__h3[f](...a), { f, a });
const lsSet = (p) => p.evaluate((P) => JSON.parse(localStorage.getItem(P + "settings") || "[]"), P);
const lsOf = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
(async () => {
  const b = await chromium.launch();
  let p = await phone(b, new Date("2026-11-14T13:30:00+09:00"), { deviceScaleFactor: 1 });
  await seed(p, D.all(), "home"); await p.waitForTimeout(1000);
  const keys = await p.$$eval("#homeTiles > .tile", (l) => l.map((t) => t.dataset.tile));
  ok(["h3now", "h3line", "h3recs", "h3theme", "h3water", "h3spend", "h3time", "h3streak", "h3week"].every((k) => keys.includes(k)), "the new tiles on きょう", keys);
  // ① time
  const pr = await H(p, "prog", "2026-11-14T12:00:00+09:00");
  ok(pr.day === 50 && pr.month === 45 && pr.yearLeft === 47, "① the day, the month, the days left in the year", pr);
  ok((await tileTxt(p, "h3time")).includes("きょう") && (await tileTxt(p, "h3time")).includes("ことしはあと47日"), "① its tile", await tileTxt(p, "h3time"));
  // ② water: からだ's own (ml, a cup 200 ml, its aim 2,000 ml at first)
  ok((await tileTxt(p, "h3water")).startsWith("水分0/2,000mlあと2,000ml（コップ10杯）"), "② none yet", await tileTxt(p, "h3water"));
  for (let i = 0; i < 3; i++) { await p.click('.tile[data-tile="h3water"] .h3-plus'); await p.waitForTimeout(300); }
  await p.click('.tile[data-tile="h3water"] .h3-minus'); await p.waitForTimeout(300);
  ok((await tileTxt(p, "h3water")).startsWith("水分400/2,000mlあと1,600ml（コップ8杯）"), "② +3 −1", await tileTxt(p, "h3water"));
  const bdd = (await lsOf(p, "bodyDays")).find((x) => x.id === D.DAY);
  ok(bdd && bdd.water === 400 && bdd.date === D.DAY && !(await lsSet(p)).some((x) => x.id === "h3water"), "② kept as からだ's 水分 (not a count of its own)", bdd);
  // ③ theme
  ok((await tileTxt(p, "h3theme")).includes("まだ"), "③ not set", await tileTxt(p, "h3theme"));
  await p.click('.tile[data-tile="h3theme"] .h3-set'); await p.waitForTimeout(300);
  await p.fill(".h3-theme-in", "  早く寝る  "); await p.press(".h3-theme-in", "Enter"); await p.waitForTimeout(400);
  ok((await tileTxt(p, "h3theme")).includes("「早く寝る」"), "③ set", await tileTxt(p, "h3theme"));
  await p.click('.tile[data-tile="h3theme"] .h3-did'); await p.waitForTimeout(300);
  ok(((await lsSet(p)).find((x) => x.id === "h3theme") || {}).days?.[D.DAY]?.done === true && (await p.$('.tile[data-tile="h3theme"].h2-done')), "③ できた: kept, the tile marked done");
  // ④ streaks
  const st = await H(p, "streaks");
  ok(st.length === 2 && st[0].k === "journal" && st[0].n === 4 && !st[0].today && st[1].k === "weight" && st[1].n === 3 && st[1].today, "④ 日記 4 (today not yet), 体重 3", st);
  ok((await tileTxt(p, "h3streak")).includes("日記4日きょう記録すると5日"), "④ its tile", await tileTxt(p, "h3streak"));
  // ⑤ week (Sunday first, as the app starts): 11/08〜11/14 against 11/01〜11/07
  const wk = await H(p, "week");
  ok(wk.days === 7 && wk.now.study === 90 && wk.was.study === 45 && wk.now.move === 2 && wk.was.move === 1 && wk.now.spend === 800 && wk.was.spend === 20000 && wk.now.done === 1, "⑤ this week and last", wk);
  ok((await tileTxt(p, "h3week")).includes("勉強1時間30分先週45分"), "⑤ its tile", await tileTxt(p, "h3week"));
  // ⑥ timeline
  const ln = await tileTxt(p, "h3line");
  ok(ln.startsWith("きょうのタイムライン3件10:00歯医者予定13:30いま15:00洗濯ToDo18:30友だちとごはん予定"), "⑥ in order, いま among them", ln);
  ok(await p.$eval('.tile[data-tile="h3line"] li', (x) => x.className === "past"), "⑥ the one over faded");
  // ⑦ spend: (60000 − 20000) / 17 days = 2352, less 800 today
  const sp = await H(p, "spend");
  ok(sp.share === 2352 && sp.left === 1552, "⑦ today's share and what's left", sp);
  ok((await tileTxt(p, "h3spend")).startsWith("きょう使えるお金1,552円"), "⑦ its tile", await tileTxt(p, "h3spend"));
  // ⑧ now: the late ToDo first
  ok((await tileTxt(p, "h3now")).includes("請求書を送る期限が過ぎています"), "⑧ the late ToDo", await tileTxt(p, "h3now"));
  // ⑩ records: 日記 not yet, 体重 done, 勉強 done, 運動 not today, 食事 none kept
  const rc = await H(p, "recs");
  ok(JSON.stringify(rc.map((x) => [x.k, x.done])) === JSON.stringify([["journal", false], ["weight", true], ["workout", false], ["study", true]]), "⑩ the kinds kept and done", rc);
  ok((await tileTxt(p, "h3recs")).startsWith("きょうの記録2/4"), "⑩ its tile", await tileTxt(p, "h3recs"));
  await p.click('.h3-rec[data-k="workout"]'); await p.waitForTimeout(700);
  ok((await p.textContent("#sheetTitle")) === "運動を記録", "⑩ a kind not done opens its form", await p.textContent("#sheetTitle"));
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  // ⑨ greeting
  ok(flat(await p.textContent("#h3Greet")) === "こんにちは。予定はあと1件、きょうまでのToDoが2件です。", "⑨ the greeting", await p.textContent("#h3Greet"));
  await p.screenshot({ path: out + "/h3-home.png", fullPage: true });
  // the settings: the greeting off
  await p.click("#homeSettings"); await p.waitForTimeout(600);
  ok(!(await p.$("#h3WaterGoal")), "② no aim of its own in the gear's sheet (からだ's)");
  await p.click("#h3GreetOn"); await p.waitForTimeout(200);
  ok(((await lsSet(p)).find((x) => x.id === "home") || {}).noGreet === true, "⑨ set in the gear's sheet");
  await p.click("#sheetCancel").catch(() => {}); await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  await p.evaluate(() => window.scrollTo(0, 0));
  ok(await p.$eval("#h3Greet", (x) => x.hidden), "⑨ as set");
  // hidden tiles: not in ほかのページ
  ok(!(await p.$('.h2-dock-btn[data-dock^="h3"]')), "not in ほかのページ");
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  // the morning, nothing to do: おはよう, ひと休み; the evening: こんばんは
  p = await phone(b, new Date("2026-11-14T07:00:00+09:00"), { deviceScaleFactor: 1 });
  await seed(p, { journal: D.all().journal, bodyDays: [{ id: D.DAY, date: D.DAY, water: 600, createdAt: D.T(D.DAY, 7) }], settings: [{ id: "bd2Water", goal: 1500 }] }, "home"); await p.waitForTimeout(800);
  ok((await tileTxt(p, "h3water")).startsWith("水分600/1,500mlあと900ml（コップ5杯）"), "② からだ's water and its aim", await tileTxt(p, "h3water"));
  ok(flat(await p.textContent("#h3Greet")) === "おはようございます。きょうは、予定もきょうまでのToDoもありません。", "⑨ morning", await p.textContent("#h3Greet"));
  ok((await tileTxt(p, "h3now")).startsWith("次にすることひと休み"), "⑧ nothing to do", await tileTxt(p, "h3now"));
  ok((await tileTxt(p, "h3line")).includes("なし") && (await tileTxt(p, "h3spend")).includes("まだ"), "⑥⑦ none");
  await p.emulateMedia({ colorScheme: "dark" }); await p.waitForTimeout(200);
  await p.screenshot({ path: out + "/h3-dark.png", fullPage: true });
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "no sideways scroll");
  ok(!p.errs.length, "no page errors (morning)", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
