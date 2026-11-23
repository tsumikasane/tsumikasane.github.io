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
  ok(["h3now", "h3line", "h3recs", "h3spend", "h3time", "h3streak", "h3week"].every((k) => keys.includes(k)) && !keys.includes("h3theme") && !keys.includes("h3water"), "the new tiles on きょう (② and ③ taken out)", keys);
  // ① time: the year alone, as a ring (きょう・今週・今月 taken out at the user's call, 2026-11-23, tools/REMOVED.md)
  const pr = await H(p, "prog", "2026-11-14T12:00:00+09:00");
  ok(pr.y === 2026 && pr.year === 86 && pr.yearLeft === 47 && Math.abs(pr.f - 317.5 / 365) < 1e-9 && !("day" in pr) && !("week" in pr) && !("month" in pr), "① the year gone and the days left in it (no day, week or month)", pr);
  const tt = await tileTxt(p, "h3time");
  ok(tt === "時間の進み87%2026年あと47日", "① its tile: the year's ring alone", tt);
  const rg = await p.$eval('.tile[data-tile="h3time"]', (t) => { const r = t.querySelector(".h3-ring"), d = (r?.querySelector(".arc")?.getAttribute("stroke-dasharray") || "0 1").split(" ").map(Number); return { v: r?.getAttribute("aria-valuenow"), l: r?.getAttribute("aria-label"), f: d[0] / d[1], rows: t.querySelectorAll("li, .h3-bar").length }; });
  ok(rg.v === "87" && rg.l === "2026年" && Math.abs(rg.f - 317.5625 / 365) < 1e-4 && rg.rows === 0, "① the ring as far as the year has gone, no bars", rg);
  const ends = [await H(p, "timeTile", "2026-12-31T22:00:00+09:00"), await H(p, "timeTile", "2027-01-01T00:00:00+09:00")];
  ok(ends[0].t === "時間の進み99%2026年きょうが最後の日" && ends[0].arc && ends[1].t === "時間の進み0%2027年あと364日" && !ends[1].arc, "① the year's last day, and its first moment (no arc)", ends);
  // ② 水分 and ③ きょうのテーマ: taken out at the user's call (2026-11-20, tools/REMOVED.md)
  ok(!(await p.$('.tile[data-tile="h3water"]')) && !(await p.$('.tile[data-tile="h3theme"]')) && !(await p.$(".h3-theme-in")) && !(await p.$(".h3-plus")), "②③ gone");
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
  // ⑦ spend: what is left of the month's budget (the user's call, 2026-11-18): 60000 − 20000 − 800 today = 39200
  const sp = await H(p, "spend");
  ok(sp.budget === 60000 && sp.spent === 20800 && sp.left === 39200 && sp.next === null, "⑦ the month's rest", sp);
  ok((await tileTxt(p, "h3spend")).startsWith("使えるお金39,200円今月あと使える"), "⑦ its tile", await tileTxt(p, "h3spend"));
  // ⑧ now: the late ToDo first
  ok((await tileTxt(p, "h3now")).includes("請求書を送る期限が過ぎています"), "⑧ the late ToDo", await tileTxt(p, "h3now"));
  // ⑩ records: 日記 not yet, 体重 done, 勉強 done, 運動 not today, 食事 none kept
  const rc = await H(p, "recs");
  ok(JSON.stringify(rc.map((x) => [x.k, x.done])) === JSON.stringify([["journal", false], ["weight", true], ["workout", false], ["study", true]]), "⑩ the kinds kept and done", rc);
  ok((await tileTxt(p, "h3recs")).startsWith("きょうの記録2/4"), "⑩ its tile", await tileTxt(p, "h3recs"));
  await p.click('.h3-rec[data-k="workout"]'); await p.waitForTimeout(700);
  ok((await p.textContent("#sheetTitle")) === "運動を記録", "⑩ a kind not done opens its form", await p.textContent("#sheetTitle"));
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  // ⑨ the greeting was taken out (the user's call, 2026-11-16): none under the date, nor its switch
  ok(!(await p.$("#h3Greet")), "⑨ no greeting (taken out)");
  await p.screenshot({ path: out + "/h3-home.png", fullPage: true });
  // the settings: no switch for it
  await p.click("#homeSettings"); await p.waitForTimeout(600);
  ok(!(await p.$("#h3WaterGoal")) && !(await p.textContent("#h3Set")).includes("水分"), "② no word on the water tile in the gear's sheet (taken out)");
  ok(!(await p.$("#h3GreetOn")) && !(await p.textContent("#h3Set")).includes("あいさつ"), "⑨ no switch for it (taken out)");
  await p.click("#sheetCancel").catch(() => {}); await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  await p.evaluate(() => window.scrollTo(0, 0));
  // hidden tiles: not in ほかのページ
  ok(!(await p.$('.h2-dock-btn[data-dock^="h3"]')), "not in ほかのページ");
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  // the morning, nothing to do: おはよう, ひと休み; the evening: こんばんは
  p = await phone(b, new Date("2026-11-14T07:00:00+09:00"), { deviceScaleFactor: 1 });
  await seed(p, { journal: D.all().journal, bodyDays: [{ id: D.DAY, date: D.DAY, water: 600, createdAt: D.T(D.DAY, 7) }], settings: [{ id: "bd2Water", goal: 1500 }] }, "home"); await p.waitForTimeout(800);
  ok(!(await p.$('.tile[data-tile="h3water"]')) && !(await p.$('.tile[data-tile="h3theme"]')), "②③ not back, with からだ's water and its aim put in before");
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
