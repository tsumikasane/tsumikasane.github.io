// 目標 その8 ①〜⑩, through the hook build at 8838 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8838/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const { all, settings } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const goal = async (p, id) => (await ls(p, "goals")).find((g) => g.id === id);
const status = (p) => p.evaluate(() => [document.getElementById("status").textContent, document.getElementById("sheetStatus").textContent].join("｜"));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__g8[f](...a), { f, a });
const open = async (p, name) => { await p.locator(".goal-open", { hasText: name }).first().click(); await p.waitForTimeout(900); };
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
const menuOf = (p, k) => p.evaluate((k) => document.querySelector(`.m-cell[data-k="${k}"]`).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), k);
const item = (p, words) => p.locator("#mMenu button", { hasText: words }).first().click().then(() => p.waitForTimeout(400));
const expenses = async (p) => p.evaluate(async ({ P }) => { const v = localStorage.getItem(P + "expenses"); if (v) return JSON.parse(v); return null; }, { P });
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-11T20:30:00+09:00"), { deviceScaleFactor: 1, acceptDownloads: true });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, { goals: all(), settings }, "goal"); await p.waitForTimeout(1000);

  // ① きょう（水曜日）のマス
  let t = await txt(p, "#goalToday");
  ok(t.startsWith("きょう（水曜日）のマス 2 マス") && t.includes("シャドーイング 水・TOEIC 800点") && t.includes("単語帳2周 月水金・TOEIC 800点・120/300ページ"), "① today's cells", t);
  await p.locator("#goalToday li", { hasText: "単語帳2周" }).locator(".check").click(); await p.waitForTimeout(500);
  let c = (await goal(p, "g1")).mandala[0].c[1];
  ok(c.v === 121 && c.log["2026-11-11"] === 1 && (await txt(p, "#goalToday")).includes("121/300ページ・きょうはやりました"), "① a counted one, one more, and said done today", c.v);
  // ⑤ 今週の時間の配分 (from Sunday 11/8): TOEIC 95分, 部屋 30分; last week 20分
  t = (await txt(p, "#goalTimeShare")).replace(/\s/g, "");
  ok(t.includes("合計2時間5分（先週20分）") && t.indexOf("TOEIC800点") < t.indexOf("部屋を片づける") && t.includes("76%1時間35分"), "⑤ the time across the goals", t);
  // ⑧ the page's keys
  await p.keyboard.press("j"); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.activeElement?.classList.contains("goal-open")), "⑧ J: on the first goal");
  const first = await p.evaluate(() => document.activeElement.dataset.goal);
  await p.keyboard.press("ArrowRight"); await p.waitForTimeout(200);
  ok(await p.evaluate((f) => document.activeElement?.classList.contains("goal-open") && document.activeElement.dataset.goal !== f, first), "⑧ → the next");
  await p.keyboard.press("?"); await p.waitForTimeout(400);
  ok((await txt(p, "#todoMenuGroup")).includes("キーボードの操作（目標）") && (await txt(p, "#todoMenuGroup")).includes("新しい目標"), "⑧ ? the list of them");
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  await p.evaluate(() => document.activeElement?.blur());
  await p.keyboard.press("]"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('#goalFilters [data-filter="done"]').getAttribute("aria-pressed") === "true"), "⑧ ] 達成");
  await p.keyboard.press("["); await p.waitForTimeout(300);

  // the chart: TOEIC
  await open(p, "TOEIC");
  // ⑦ 絵文字
  await p.locator('#mEmo .emo-btn[aria-label="絵文字 📚"]').click(); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).emo === "📚", "⑦ picked");
  // ③ お金: a budget, one spent (家計簿にも), deleted and back
  await p.fill("#mMoney input[aria-label='予算（円）']", "10000"); await p.dispatchEvent("#mMoney input[aria-label='予算（円）']", "change"); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).budget === 10000, "③ the budget");
  await p.fill("#mMoney input[aria-label='使った金額（円）']", "2980"); await p.fill("#mMoney input[aria-label='何に使ったか']", "問題集");
  await p.click("#mMoney input[aria-label='家計簿にも記録する']");
  await p.locator("#mMoney button[type=submit]").click(); await p.waitForTimeout(600);
  let g = await goal(p, "g1"), ex = await expenses(p);
  ok(g.spend?.length === 1 && g.spend[0].amt === 2980 && g.spend[0].memo === "問題集" && g.spend[0].ex, "③ kept on the goal", g.spend);
  ok(Array.isArray(ex) && ex.some((e) => e.id === g.spend[0].ex && e.amount === 2980 && e.category === "教育費" && e.kind === "out" && e.date === "2026-11-11"), "③ and in 家計簿 (教育費)", ex);
  t = (await txt(p, "#mMoney")).replace(/\s/g, "");
  ok(t.includes("使ったお金2,980円（1件）") && t.includes("予算10,000円まで、あと7,020円"), "③ against its budget", t);
  await p.locator("#mMoney .money-list button", { hasText: "削除" }).click(); await p.waitForTimeout(500);
  ok(!(await goal(p, "g1")).spend && !(await expenses(p)).some((e) => e.amount === 2980), "③ deleted, from 家計簿 too");
  await p.locator("#sheetStatus button").click(); await p.waitForTimeout(500);
  ok((await goal(p, "g1")).spend?.length === 1 && (await expenses(p)).some((e) => e.amount === 2980), "③ 元に戻す");
  // ④ 要素のロードマップ: 単語 (毎日30語 11/12) and 模試 (模試2回目 11/9, past)
  ok((await p.$$eval("#mRoad .gl-row", (x) => x.map((r) => r.querySelector(".gl-name").textContent))).join() === "模試,単語" && (await p.evaluate(() => !!document.querySelector("#mRoad .gl-bar.late"))) && (await txt(p, "#mRoad")).includes("期限のない要素："), "④ the elements with 期限, the one past in red", await txt(p, "#mRoad"));
  // ⑥ 宣言カード
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }).catch(() => null), p.click("#mCard")]);
  ok(dl && dl.suggestedFilename() === "tsumikasane-goal-card-2026-11-11.png", "⑥ saved as a picture", dl && dl.suggestedFilename());
  // ① 曜日 from the menu; ② 手ごたえ; ⑧ the chart's keys
  await p.click('.m-cell[data-k="0"] [data-role="open"]'); await p.waitForTimeout(500);
  await menuOf(p, 2); await p.waitForTimeout(300);
  await item(p, "曜日を決める");
  await p.locator('#mMenu .m-wd-pick .chip-btn[aria-label="月曜日"]').click(); await p.locator('#mMenu .m-wd-pick .chip-btn[aria-label="金曜日"]').click();
  await p.locator("#mMenu button", { hasText: "決める" }).last().click(); await p.waitForTimeout(400);
  ok(JSON.stringify((await goal(p, "g1")).mandala[0].c[2].wd) === "[1,5]" && (await txt(p, '.m-cell[data-k="2"] .m-wd')) === "月金", "① 月金 from the menu", (await goal(p, "g1")).mandala[0].c[2].wd);
  await menuOf(p, 0); await p.waitForTimeout(300);
  await p.locator("#mMenu .m-menu-feel button", { hasText: "むずかしい" }).click(); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).mandala[0].c[0].feel === 3 && (await txt(p, '.m-cell[data-k="0"] .m-feel')) === "難", "② むずかしい on 単語帳1周");
  await p.focus('textarea[data-k="0"]');
  await p.keyboard.press("Alt+ArrowRight"); await p.waitForTimeout(150);
  ok((await W(p, "focusK")) === "1", "⑧ Alt+→ the cell beside", await W(p, "focusK"));
  await p.keyboard.press("Alt+ArrowDown"); await p.waitForTimeout(150);
  ok((await W(p, "focusK")) === "6", "⑧ Alt+↓ past the middle", await W(p, "focusK"));
  await p.focus('textarea[data-k="2"]');
  await p.keyboard.press("Control+Enter"); await p.waitForTimeout(500);
  ok((await goal(p, "g1")).mandala[0].c[2].d === true, "⑧ Ctrl+Enter: 達成");
  await p.keyboard.press("Control+Enter"); await p.waitForTimeout(500);
  ok(!(await goal(p, "g1")).mandala[0].c[2].d, "⑧ and back");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  t = await txt(p, "#mFeel");
  ok(t.includes("1 むずかしい") && t.includes("むずかしいが多いのは「単語」（1/1マス）"), "② counted up under the goal", t);
  await done(p);
  ok((await p.evaluate(() => [...document.querySelectorAll("#goalList .goal .title")].find((x) => x.textContent.includes("TOEIC"))?.textContent)) === "📚TOEIC 800点", "⑦ before its name");

  // ⑨ しまう: 簿記3級 under 達成
  await p.click('#goalFilters [data-filter="done"]'); await p.waitForTimeout(400);
  await open(p, "簿記3級");
  await p.click("#mShelf"); await p.waitForTimeout(400);
  ok(num((await goal(p, "g4")).shelf) > 0, "⑨ put away");
  await done(p);
  ok(!(await p.evaluate(() => [...document.querySelectorAll("#goalList .goal .title")].some((x) => x.textContent.includes("簿記3級")))) && (await txt(p, "#goalShelf")) === "しまった目標（1件）を表示", "⑨ out of 達成's list", await txt(p, "#goalShelf"));
  await p.click("#goalShelf button"); await p.waitForTimeout(400);
  ok(await p.evaluate(() => [...document.querySelectorAll(".goal")].some((x) => x.textContent.includes("簿記3級") && x.querySelector(".goal-tag")?.textContent === "しまった目標")), "⑨ shown again when asked");
  await p.click('#goalFilters [data-filter="active"]'); await p.waitForTimeout(300);

  // ⑩ 月末のふりかえり: turned on in 目標's 設定; 11/30 20:00
  await p.click("#goalSettings"); await p.waitForTimeout(600);
  ok((await txt(p, "#goalKeys")).includes("Ctrl＋Enter"), "⑧ the keys in 設定");
  await p.click("#goalMonthOn"); await p.waitForTimeout(400);
  ok((await ls(p, "settings")).find((x) => x.id === "goalMonthEnd")?.on === true, "⑩ on");
  const n = await W(p, "month", "g1", "2026-11");
  const al = (await W(p, "alarms", await p.evaluate(() => Date.now()))) /* (the page's clock, not the real one) */.find((a) => a.tag === "goal-month:2026-11");
  ok(al && new Date(al.at).toISOString() === "2026-11-30T11:00:00.000Z" && al.title === "今月の目標のふりかえり（11月）" && al.body.includes(`TOEIC 800点 ${n}マス`) && al.url === "./#goal", "⑩ the month's last day, 20:00", al);
  await done(p);

  ok(!p.errs.length, "no errors", p.errs);
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  await b.close();
})();
function num(v) { return typeof v === "number" ? v : Number(v) || 0; }
