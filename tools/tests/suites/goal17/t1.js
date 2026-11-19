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

  // ① 予定のあとで and ② できなかった理由: taken out (the user's call, 2026-11-20). What ① put in the cells, put in as it left
  // them for what comes after: 単語帳2周 +30ページ on 11/14 (its plan's day), 長文 checked at its plan's end
  ok(!(await p.$("#goalAfter")), "① (taken out) no 予定のあとで card");
  await p.evaluate(({ P, vt, at }) => {
    const gs = JSON.parse(localStorage.getItem(P + "goals")), g = gs.find((x) => x.id === "g1"), c = g.mandala[0].c[1];
    c.v = 150; c.log = { ...(c.log || {}), "2026-11-14": 30 }; c.vt = vt;
    g.mandala[4].d = true; g.mandala[4].at = at;
    localStorage.setItem(P + "goals", JSON.stringify(gs));
  }, { P, vt: J("2026-11-14", "20:00"), at: J("2026-11-15", "10:00") });
  await p.reload(); await p.waitForTimeout(1000);
  let g1 = await goal(p, "g1"), g3 = await goal(p, "g3");
  ok(g1.mandala[0].c[1].v === 150 && g1.mandala[4].d === true, "(the cells as ① left them)", [g1.mandala[0].c[1].v, g1.mandala[4].d]);

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
  ok(!(await p.$("#mMiss")), "② (taken out with ①) no できなかった理由 under the goal");
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

  // ①'s notification and its switch: taken out (the user's call, 2026-11-20)
  await p.click("#goalSettings"); await p.waitForTimeout(600);
  ok(!(await p.$("#goalAfterOn")) && !(await W(p, "alarms", await p.evaluate(() => Date.now()))).some((a) => a.tag.startsWith("goal-after:")), "① (taken out) no switch, no notification");
  await done(p);

  ok(!p.errs.length, "no errors", p.errs);
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  await b.close();
})();
