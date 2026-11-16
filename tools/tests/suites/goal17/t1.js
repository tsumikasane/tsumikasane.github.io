// 目標 その17 ①〜⑩, through the hook build at 8899 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8899/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const { all, settings, todos, events, journal } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const goal = async (p, id) => (await ls(p, "goals")).find((g) => g.id === id);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const status = (p) => p.evaluate(() => [document.getElementById("status").textContent, document.getElementById("sheetStatus").textContent].join("｜"));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__g17[f](...a), { f, a });
const block = (p, name) => p.locator(".goal-open").filter({ has: p.locator(".title", { hasText: name }) }).first();
const open = async (p, name) => { await block(p, name).click(); await p.waitForTimeout(900); };
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
const shown = (p, id) => p.evaluate((id) => { const x = document.getElementById(id); return !!x && !x.hidden && getComputedStyle(x).display !== "none"; }, id);
const sheetOpen = (p) => p.evaluate(() => document.getElementById("daySheet").open);
const undo = async (p) => { await p.locator((await sheetOpen(p)) ? "#sheetStatus button" : "#status button").first().click(); await p.waitForTimeout(600); };
const menuOf = (p, k) => p.evaluate((k) => document.querySelector(`.m-cell[data-k="${k}"]`).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), k);
const names = (p, sel) => p.$$eval(sel, (xs) => xs.map((x) => x.textContent));
const after = (p, name) => p.locator("#goalAfter li", { has: p.locator(".g16-all-name", { hasText: `「${name}」` }) });
const swipe = (p, dx) => p.evaluate((dx) => { // a finger across the chart
  const g = document.getElementById("mGrid"), r = g.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const t = (cx) => new Touch({ identifier: 1, target: g, clientX: cx, clientY: y });
  g.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [t(x)], changedTouches: [t(x)] }));
  g.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [t(x + dx)] }));
}, dx);
const J = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-15T20:30:00+09:00"), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, { goals: all(), settings, todos, events, journal }, "goal"); await p.waitForTimeout(1000);

  // ① 予定のあとで: the three plans whose times are over, the oldest first
  ok(JSON.stringify(await names(p, "#goalAfter .g16-all-name")) === '["「クローゼット」はできましたか？","「単語帳2周」はできましたか？","「長文」はできましたか？"]'
    && (await txt(p, "#goalAfter li:nth-child(2) .sub")) === "きのう 19:00〜20:00の予定・TOEIC 800点・いま 120/300ページ", "① the plans over, asked after", await txt(p, "#goalAfter"));
  // ② できなかった: why
  await after(p, "クローゼット").locator(".g17-miss-btn").click(); await p.waitForTimeout(300);
  await after(p, "クローゼット").locator('[data-why="time"]').click(); await p.waitForTimeout(500);
  let g3 = await goal(p, "g3");
  ok(g3.after?.length === 1 && g3.after[0].e === "e9" && g3.after[0].d === "2026-11-13" && g3.after[0].a === 0 && g3.after[0].why === "time" && (await status(p)).includes("「クローゼット」は「時間がなかった」と残しました"), "② できなかった, and why, kept", g3.after);
  // a counted one, by how much on its day
  await after(p, "単語帳2周").locator(".g17-did").click(); await p.waitForTimeout(300);
  ok((await p.inputValue("#goalAfter .g17-amt input")) === "34" && (await p.evaluate(() => document.activeElement?.matches("#goalAfter .g17-amt input"))), "① 単語帳2周: how much (its usual offered)");
  await p.fill("#goalAfter .g17-amt input", "30"); await p.click("#goalAfter .g17-amt button[type=submit]"); await p.waitForTimeout(600);
  let g1 = await goal(p, "g1"), c01 = g1.mandala[0].c[1];
  ok(c01.v === 150 && c01.log["2026-11-14"] === 30 && !c01.d && g1.after?.[0]?.e === "e7" && g1.after[0].a === 1 && (await status(p)).includes("「単語帳2周」きのうの分 +30ページ（150/300ページ）"), "① counted on its day", [c01.v, c01.log, g1.after, await status(p)]);
  // one done, 元に戻す, done again
  await after(p, "長文").locator(".g17-did").click(); await p.waitForTimeout(600);
  g1 = await goal(p, "g1");
  ok(g1.mandala[4].d === true && g1.mandala[4].at === J("2026-11-15", "10:00") && g1.after.length === 2 && (await status(p)).includes("「長文」を達成にしました"), "① 長文 checked, at its plan's end", [g1.mandala[4], await status(p)]);
  await undo(p);
  g1 = await goal(p, "g1");
  ok(!g1.mandala[4].d && g1.after.length === 1 && (await names(p, "#goalAfter .g16-all-name")).includes("「長文」はできましたか？"), "① 元に戻す: asked again", [g1.mandala[4], g1.after]);
  await after(p, "長文").locator(".g17-did").click(); await p.waitForTimeout(600);
  ok(!(await shown(p, "goalAfter")), "① every one answered: gone");

  // ⑦ きょう進めたマス, into 日記
  ok((await txt(p, "#goalTodayDone")) === "きょう進めたマス 1 マス 長文 達成・TOEIC 800点 きょうの日記に書き足す", "⑦ the cells moved on today", await txt(p, "#goalTodayDone"));
  await p.click("#goalMovedJn"); await p.waitForTimeout(800);
  let jn = (await ls(p, "journal")).find((x) => x.id === "2026-11-15");
  ok(jn?.text === "きょう進めた目標のマス\n・長文（達成）" && (await txt(p, "#goalTodayDone")).endsWith("きょうの日記に入っています") && (await status(p)).includes("きょう進めたマス 1 つを日記に書き足しました"), "⑦ written into today's 日記", [jn, await txt(p, "#goalTodayDone")]);
  await undo(p);
  ok(!(await ls(p, "journal")).some((x) => x.id === "2026-11-15") && (await txt(p, "#goalTodayDone")).endsWith("きょうの日記に書き足す"), "⑦ 元に戻す");

  // ④ すきま時間
  await p.locator('#goalGap [data-mins="15"]').click(); await p.waitForTimeout(300);
  ok(JSON.stringify(await names(p, "#goalGap .g16-all-name")) === '["本棚","クローゼット"]' && (await txt(p, "#goalGap li:nth-child(2) .sub")) === "小さな一歩だけ：引き出しを1つ開ける・部屋を片づける" && (await txt(p, "#goalGap li .sub")) === "約15分・部屋を片づける", "④ 15分: what it holds", await txt(p, "#goalGap"));
  await p.locator('#goalGap [data-mins="5"]').click(); await p.waitForTimeout(300);
  ok(JSON.stringify(await names(p, "#goalGap .g16-all-name")) === '["クローゼット"]', "④ 5分: a 小さな一歩 only");
  await p.locator("#goalGap .g16-all-row").first().click(); await p.waitForTimeout(900);
  ok((await W(p, "open")) === "g3" && (await sheetOpen(p)), "④ pressed: its cell");
  // ② under the goal: the reasons
  ok((await shown(p, "mMiss")) && (await txt(p, "#mMiss")) === "予定のあと（この30日）：できた 0回・できなかった 1回 時間がなかった 1回 いちばん多いのは「時間がなかった」。見積もり時間を短くするか、「空き時間に入れる」で先に時間を取っておきましょう。", "② the reasons, and a hint", await txt(p, "#mMiss"));
  await done(p);

  // ⑨ 期限が重なっている日
  ok((await txt(p, "#goalCrowd")).startsWith("期限が重なっている日 11月25日（水）に 4マスの期限が重なっています。 FP3級・体力・お金・本棚"), "⑨ a day four fall due", await txt(p, "#goalCrowd"));
  await p.click("#goalCrowdGo"); await p.waitForTimeout(300);
  ok(JSON.stringify(await p.$$eval("#goalCrowd .g17-crowd-plan li", (xs) => xs.map((x) => x.innerText.replace(/\s+/g, " ").trim()))) === '["お金 11/25 → 11/24（火）","本棚 11/25 → 11/23（月）"]', "⑨ to the days before, an empty one each", await txt(p, "#goalCrowd"));
  await p.locator("#goalCrowd .g17-crowd-plan li", { hasText: "本棚" }).locator("input").uncheck(); await p.click("#goalCrowdApply"); await p.waitForTimeout(600);
  let g2 = await goal(p, "g2"); g3 = await goal(p, "g3");
  ok(g2.mandala[3].due === "2026-11-24" && g3.mandala[2].due === "2026-11-25" && (await status(p)).includes("1マスの期限を前の日に動かしました") && (await txt(p, "#goalCrowd")).includes("11月25日（水）に 3マス"), "⑨ moved, all but the one left", [g2.mandala[3].due, g3.mandala[2].due]);
  await undo(p);
  ok((await goal(p, "g2")).mandala[3].due === "2026-11-25", "⑨ 元に戻す");

  // ⑤ 数えるマスの見込み, ⑥ やる気が出ないとき, ⑩ まとめて空き時間に入れる (TOEIC)
  await open(p, "TOEIC 800点");
  ok((await txt(p, "#mCntAhead .sub")) === "このペース（1日 5.5ページ）なら 12/13（日）ごろに終わります。", "⑤ a counted cell's pace to its end", await txt(p, "#mCntAhead"));
  ok((await p.evaluate(() => document.getElementById("mLowOpen").classList.contains("g17-low-hi"))), "⑥ the day's やる気 low: it stands out");
  await p.click("#mLowOpen"); await p.waitForTimeout(300);
  const low = await txt(p, "#mLow");
  ok(low.includes("なぜこの目標？ 海外で働きたいから") && low.includes("ごほうび 50%で「ケーキを食べる」・達成で「旅行に行く」") && low.includes("最近のふりかえり 単語を毎日続けられた") && /あと少し あと \d+マスで (50|75)%です（いま \d+%）。/.test(low) && low.includes("まずは小さく 模試2回目"), "⑥ what to look at", low);
  ok((await txt(p, "#mLowOpen")) === "閉じる", "⑥ open, closed from its own button");
  // ⑩: the first three, one changed
  await p.click("#mBatchStart"); await p.waitForTimeout(400);
  const row = (name) => p.locator("#mBatch .g17-batch li", { has: p.locator(".g17-batch-name", { hasText: name }) });
  ok((await row("毎日15分").locator(".sub").textContent()) === "きょう 20:30〜21:00" && (await row("模試2回目").locator(".sub").textContent()) === "あした 08:00〜10:00" && (await row("毎日30語").locator(".sub").textContent()) === "きょう 21:00〜21:30", "⑩ the first three, in the free times one after another", await txt(p, "#mBatch"));
  await row("毎日30語").locator("input").uncheck(); await p.waitForTimeout(200);
  await row("シャドーイング").locator("input").check(); await p.waitForTimeout(200);
  ok((await row("シャドーイング").locator(".sub").textContent()) === "きょう 21:00〜21:30" && (await txt(p, "#mBatchGo")) === "この時間で入れる（3マス）", "⑩ another ticked: its time");
  const evs0 = (await ls(p, "events")).length;
  await p.click("#mBatchGo"); await p.waitForTimeout(900);
  let es = await ls(p, "events"), mine = es.slice(evs0);
  g1 = await goal(p, "g1");
  ok(mine.length === 3 && mine.map((e) => `${e.title} ${e.date} ${e.time}-${e.endTime}`).join("|") === "毎日15分 2026-11-15 20:30-21:00|模試2回目 2026-11-16 08:00-10:00|シャドーイング 2026-11-15 21:00-21:30"
    && g1.mandala[3].c[0].ev?.includes(mine[0].id) && g1.mandala[2].c[1].ev?.includes(mine[1].id) && JSON.stringify(g1.mandala[3].c[1].ev) === JSON.stringify(["e1", "e0", mine[2].id]) && (await status(p)).includes("3マスを空き時間の予定に入れました（はじめは きょう 20:30）"), "⑩ in at once, each kept by its cell", [mine, await status(p)]);
  await undo(p);
  g1 = await goal(p, "g1");
  ok((await ls(p, "events")).length === evs0 && !g1.mandala[3].c[0].ev && JSON.stringify(g1.mandala[3].c[1].ev) === '["e1","e0"]', "⑩ 元に戻す: all out", [g1.mandala[3].c[1].ev]);
  // ⑥ the focus timer on the next cell
  await p.click("#mLowFocus"); await p.waitForTimeout(500);
  const fv = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "focus") || "null"), P);
  ok(fv?.kind === "work" && JSON.stringify(fv.cell) === '{"g":"g1","p":[2,1]}' && !(await sheetOpen(p)), "⑥ the focus timer, on 模試2回目", fv);
  await p.evaluate((P) => localStorage.removeItem(P + "focus"), P);

  // ⑧ となりの要素へ, ③ 小さな一歩
  await open(p, "TOEIC 800点");
  ok(!(await shown(p, "mSide")), "⑧ none at the goal's own level");
  await p.click('.m-cell[data-k="0"] [data-role="open"]'); await p.waitForTimeout(500);
  ok((await txt(p, "#mSide")) === "‹ 語彙アプリ 1 / 6 文法 ›", "⑧ inside 単語: the one before and after", await txt(p, "#mSide"));
  await p.click("#mSide .g17-side-next"); await p.waitForTimeout(500);
  ok(JSON.stringify(await W(p, "path")) === "[1]" && (await txt(p, "#sheetTitle")) === "文法", "⑧ ›: 文法");
  await swipe(p, -120); await p.waitForTimeout(500);
  ok(JSON.stringify(await W(p, "path")) === "[2]", "⑧ a swipe to the left: the next (模試)", await W(p, "path"));
  await swipe(p, 120); await p.waitForTimeout(500);
  ok(JSON.stringify(await W(p, "path")) === "[1]", "⑧ to the right: back");
  await swipe(p, -20); await p.waitForTimeout(300);
  ok(JSON.stringify(await W(p, "path")) === "[1]", "⑧ too short: stays");
  await p.click("#mSide .g17-side-next"); await p.waitForTimeout(400); await p.click("#mSide .g17-side-next"); await p.waitForTimeout(400);
  ok(JSON.stringify(await W(p, "path")) === "[3]", "⑧ to リスニング");
  await menuOf(p, 0); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "小さな一歩を決める" }).click(); await p.waitForTimeout(300);
  await p.fill("#mMenu input", "イヤホンをつける"); await p.locator("#mMenu button[type=submit]").click(); await p.waitForTimeout(600);
  g1 = await goal(p, "g1");
  ok(g1.mandala[3].c[0].step === "イヤホンをつける" && (await status(p)).includes("「毎日15分」の小さな一歩を「イヤホンをつける」にしました"), "③ a 小さな一歩, from the cell's menu", g1.mandala[3].c[0]);
  await done(p);
  ok((await txt(p, "#goalNow .g17-step")) === "まずは：イヤホンをつける", "③ under it in いまやる", await txt(p, "#goalNow"));
  ok((await p.getAttribute('#goalGap [data-mins="5"]', "aria-pressed")) === "true" && JSON.stringify(await names(p, "#goalGap .g16-all-name")) === '["毎日15分","クローゼット"]', "③ ④ and so in 5 minutes too", await txt(p, "#goalGap"));

  // ① asked by a notification too, with the setting on
  await p.click("#goalSettings"); await p.waitForTimeout(600);
  await p.click("#goalAfterOn"); await p.waitForTimeout(400);
  const al = (await W(p, "alarms", await p.evaluate(() => Date.now()))).filter((a) => a.tag.startsWith("goal-after:"));
  ok((await setting(p, "goalAfterAsk"))?.on === true && al[0]?.tag === "goal-after:e9@2026-11-20" && new Date(al[0].at).toISOString() === "2026-11-20T10:05:00.000Z" && al[0].body === "「クローゼット」はできましたか？（部屋を片づける）"
    && al[1]?.tag === "goal-after:e1@2026-11-20" && al[1].body === "「シャドーイング」はできましたか？（TOEIC 800点）", "① a notification 5 minutes after", al.slice(0, 2));
  await done(p);

  ok(!p.errs.length, "no errors", p.errs);
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  await b.close();
})();
