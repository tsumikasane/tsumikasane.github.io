// 目標 その20 ①〜⑩, through the hook build at 8889 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8889/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const { all, settings, todos, events, journal } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const goal = async (p, id) => (await ls(p, "goals")).find((g) => g.id === id);
const status = (p) => p.evaluate(() => [document.getElementById("status").textContent, document.getElementById("sheetStatus").textContent].join("｜"));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__g20[f](...a), { f, a });
const block = (p, name) => p.locator(".goal-open").filter({ has: p.locator(".title", { hasText: name }) }).first();
const blockText = async (p, name) => (await block(p, name).innerText()).replace(/\s+/g, " ").trim();
const open = async (p, name) => { await block(p, name).click(); await p.waitForTimeout(900); };
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
const shown = (p, id) => p.evaluate((id) => { const x = document.getElementById(id); return !!x && !x.hidden && getComputedStyle(x).display !== "none"; }, id);
const sheetOpen = (p) => p.evaluate(() => document.getElementById("daySheet").open);
const undo = async (p) => { await p.locator((await sheetOpen(p)) ? "#sheetStatus button" : "#status button").first().click(); await p.waitForTimeout(600); };
const guard = async (p) => (await W(p, "alarms", await p.evaluate(() => Date.now()))).filter((a) => a.tag.startsWith("goal-guard:"));
// 習慣のチェック表's rows: the name, then each day's mark (● ○ 休 or -), then how many
const habit = (p) => p.$$eval("#goalHabitTable tbody tr", (rs) => rs.map((r) => [...r.children].map((c) => c.textContent.trim() || "-").join(" ")));
const quad = (p) => p.$$eval("#goalQuad .g20-q", (xs) => xs.map((x) => x.innerText.replace(/\s+/g, " ").trim()));
const bulk = (p) => p.$$eval("#mDoBulk .g17-batch li", (xs) => xs.map((x) => (x.querySelector("input").checked ? "✓" : "・") + x.innerText.replace(/\s+/g, " ").trim()));
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-15T17:30:00+09:00"), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, { goals: all(), settings, todos, events, journal }, "goal"); await p.waitForTimeout(1000);

  // ③ 習慣のチェック表: 単語帳2周 (月・水・金) and シャドーイング (水), 11/2 to today
  ok((await txt(p, "#goalHabitTable .goal-head")) === "習慣のチェック表 11/2〜きょう", "③ the last two weeks", await txt(p, "#goalHabitTable .goal-head"));
  let hb = await habit(p);
  ok(hb[0] === "単語帳2周 ○ - ○ - ○ - - ● ● ● - ● ● - 5" && hb[1] === "シャドーイング - - ○ - - - - - - ○ - - - - 0" && hb.length === 2, "③ ● moved on, ○ its day missed", hb);
  // ⑧ 急ぎ × 大事
  let q = await quad(p);
  ok(q[0] === "急ぎで大事 2マス・まずこれ 毎日30語 模試2回目" && q[1] === "大事・急がない 5マス・時間を取っておく 単語帳2周 模試3回目 毎日15分 ほか 2" && q[2] === "急ぎ・大事ではない 1マス・さっと済ませる 本棚"
    && q[3].startsWith("どちらでもない 5マス・あとで "), "⑧ in four", q);
  // ④ ブロックの小さなグラフ
  ok((await blockText(p, "TOEIC 800点")).endsWith("30日で +14%") && (await block(p, "TOEIC 800点").locator(".g20-spark").getAttribute("aria-label")) === "この30日：33% → 47%", "④ the last 30 days, as a line", await blockText(p, "TOEIC 800点"));
  ok(!(await block(p, "ハーフマラソンを走る").locator(".g20-spark").count()), "④ none for a goal that has not moved");

  // ⑥ 量を入れる: 単語帳2周 in いまやる
  const amt = p.locator("#goalNow li", { hasText: "単語帳2周" }).locator(".g20-amt-btn");
  ok((await amt.count()) === 1 && (await p.locator("#goalNow li", { hasText: "毎日15分" }).locator(".g20-amt-btn").count()) === 0, "⑥ ＋量 on the counted cell only");
  await amt.click(); await p.waitForTimeout(400);
  ok((await txt(p, "#todoMenu")).startsWith("「単語帳2周」をきょう進めた量（いま 133/300ページ） +5ページ +10ページ +20ページ"), "⑥ asked how much", await txt(p, "#todoMenu"));
  await p.click('[data-amt="10"]'); await p.waitForTimeout(500);
  let g1 = await goal(p, "g1");
  ok(g1.mandala[0].c[1].v === 143 && g1.mandala[0].c[1].log["2026-11-15"] === 10 && (await status(p)).startsWith("「単語帳2周」+10ページ（143/300ページ）"), "⑥ +10, kept as today's", await status(p));
  await undo(p);
  g1 = await goal(p, "g1");
  ok(g1.mandala[0].c[1].v === 133 && !g1.mandala[0].c[1].log["2026-11-15"], "⑥ 元に戻す");
  await amt.click(); await p.waitForTimeout(400);
  await p.fill("#goalAmtIn", "25"); await p.press("#goalAmtIn", "Enter"); await p.waitForTimeout(500);
  g1 = await goal(p, "g1");
  hb = await habit(p);
  ok(g1.mandala[0].c[1].v === 158 && g1.mandala[0].c[1].log["2026-11-15"] === 25 && hb[0] === "単語帳2周 ○ - ○ - ○ - - ● ● ● - ● ● ● 6", "⑥ 25 typed; ③ today ●", hb);

  // ② シンプル表示: the main cards only, kept on this device
  await p.click("#goalSimpleBtn"); await p.waitForTimeout(400);
  const simple = async () => [await shown(p, "goalNow"), await shown(p, "goalToday"), await shown(p, "goalHabitTable"), await shown(p, "goalQuad"), await shown(p, "goalWeek7"), await txt(p, "#goalSimpleBtn")];
  ok(JSON.stringify(await simple()) === '[true,true,false,false,false,"ふつうの表示にもどす"]', "② the rest hidden", await simple());
  await p.reload(); await p.waitForTimeout(1200);
  ok(JSON.stringify(await simple()) === '[true,true,false,false,false,"ふつうの表示にもどす"]', "② still, opened again", await simple());
  await p.click("#goalSimpleBtn"); await p.waitForTimeout(400);
  ok(JSON.stringify(await simple()) === '[true,true,true,true,true,"シンプル表示"]' && (await p.getAttribute("#goalSimpleBtn", "aria-pressed")) === "false", "② back as it was", await simple());

  // ⑦ 休む曜日: 火 and 木; 部屋を片づける's run goes over them
  ok((await blockText(p, "部屋を片づける")).includes("2日連続・きょうまだ"), "⑦ before: 2 days (11/13, 11/14)");
  await p.click("#goalSettings"); await p.waitForTimeout(600);
  ok((await txt(p, "#goalRestDays")) === "日 月 火 水 木 金 土" && !(await p.$$('#goalRestDays [aria-pressed="true"]')).length, "⑦ none at first");
  await p.click('#goalRestDays [data-rest="2"]'); await p.waitForTimeout(300);
  await p.click('#goalRestDays [data-rest="4"]'); await p.waitForTimeout(300);
  ok(JSON.stringify(await W(p, "rest")) === "[2,4]" && JSON.stringify(await p.$$eval('#goalRestDays [aria-pressed="true"]', (xs) => xs.map((x) => x.textContent))) === '["火","木"]', "⑦ 火・木", await W(p, "rest"));
  let st = await W(p, "streak", "g3");
  ok(st.cur === 4 && st.best === 4 && !st.today, "⑦ 11/9 to 11/14 over 火・木: 4 days", st);
  // 連続を守るお知らせ, on: none on a rest day
  await p.click("#goalGuardOn"); await p.waitForTimeout(400);
  let al = await guard(p);
  ok(al.length === 2 && al[0].tag === "goal-guard:2026-11-15", "⑦ a day not rest: as before", al.map((a) => a.tag));
  await p.click('#goalRestDays [data-rest="0"]'); await p.waitForTimeout(400);
  al = await guard(p);
  ok(al.length === 1 && al[0].tag === "goal-guard:2026-11-16", "⑦ 日 a rest day too: none this evening", al.map((a) => a.tag));
  for (const d of [1, 3, 5]) { await p.click(`#goalRestDays [data-rest="${d}"]`); await p.waitForTimeout(250); }
  await p.click('#goalRestDays [data-rest="6"]'); await p.waitForTimeout(300);
  ok((await W(p, "rest")).length === 6 && (await status(p)).includes("休む曜日は6つまでです"), "⑦ 6 at most", await W(p, "rest"));
  for (const d of [1, 3, 5]) { await p.click(`#goalRestDays [data-rest="${d}"]`); await p.waitForTimeout(250); }
  await done(p);
  ok((await blockText(p, "部屋を片づける")).includes("4日連続・きょうは休み") && JSON.stringify(await W(p, "rest")) === "[0,2,4]", "⑦ today a rest day: 休み, not まだ", await blockText(p, "部屋を片づける"));
  hb = await habit(p);
  ok(hb[1] === "シャドーイング - 休 ○ 休 - - 休 - 休 ○ 休 - - 休 0", "⑦ ③ 休 on them", hb);

  // ⑧ pressed: the cell, in its chart
  await p.locator("#goalQuad .g20-q-cell", { hasText: "本棚" }).click(); await p.waitForTimeout(900);
  ok((await W(p, "open")) === "g3" && JSON.stringify(await W(p, "path")) === "[]", "⑧ 本棚, opened");
  await done(p);

  // TOEIC
  await open(p, "TOEIC 800点");
  // ⑩ すごろく: 13 cells, 6 done; 🎁 at the 7th
  ok((await txt(p, "#mSugo .sub")) === "いま 6マス目・ゴールまで あと 7マス（🎁 7マス目で「ケーキを食べる」）" && (await p.$$("#mSugo .g20-sq.done")).length === 6
    && (await txt(p, "#mSugo .g20-sq.here")) === "7 🙂" && (await txt(p, "#mSugo .g20-sq.goal")) === "13 🏁" && JSON.stringify(await p.$$eval("#mSugo .g20-sq", (xs) => xs.filter((x) => x.textContent.includes("★")).map((x) => x.firstChild.textContent))) === '["3","10"]',
    "⑩ the board", await txt(p, "#mSugo"));
  // ⑤ 見積もりを実績で直す: 1時間 each, 1時間30分 each
  ok((await txt(p, "#mEstFix")) === "終わったマスは、見積もりの 1.5倍かかっています。 のこりの見積もり（2マス）を ×1.5 に直す", "⑤ offered", await txt(p, "#mEstFix"));
  await p.click("#mEstFixGo"); await p.waitForTimeout(600);
  g1 = await goal(p, "g1");
  ok(g1.mandala[2].c[1].est === 180 && g1.mandala[3].c[1].est === 30 && g1.estFixAt > 0 && !(await shown(p, "mEstFix")) && (await status(p)).includes("2マスの見積もりを ×1.5 にしました"), "⑤ 2時間 → 3時間, 20分 → 30分; asked no more", await status(p));
  await undo(p);
  g1 = await goal(p, "g1");
  ok(g1.mandala[2].c[1].est === 120 && g1.mandala[3].c[1].est === 20 && !g1.estFixAt && (await shown(p, "mEstFix")), "⑤ 元に戻す");
  // ① やる日をまとめて決める: 1日に2マス, 火・木 (and 日) left out
  await p.click("#mDoBulkStart"); await p.waitForTimeout(400);
  let bl = await bulk(p);
  ok(JSON.stringify(bl) === JSON.stringify(["✓毎日15分 あしたやる", "✓単語帳2周 11/18（水）にやる", "✓毎日30語 11/20（金）にやる", "✓模試3回目 11/21（土）にやる", "✓長文 11/23（月）にやる"]) && (await txt(p, "#mDoBulk .six-tags")).includes("（日・火・木曜日は休み）"), "① one a day, the rest days left out", bl);
  await p.click('#mDoBulk [data-per="2"]'); await p.waitForTimeout(300);
  bl = await bulk(p);
  ok(JSON.stringify(bl) === JSON.stringify(["✓毎日15分 あしたやる", "✓単語帳2周 あしたやる", "✓毎日30語 11/18（水）にやる", "✓模試3回目 11/18（水）にやる", "✓長文 11/20（金）にやる"]), "① two a day", bl);
  await p.locator("#mDoBulk li", { hasText: "長文" }).locator("input").click(); await p.waitForTimeout(300);
  ok((await txt(p, "#mDoBulkGo")) === "この日で決める（4マス）" && (await p.evaluate(() => document.activeElement?.dataset?.key)) === "4", "① 長文 left out (still in focus)", await txt(p, "#mDoBulkGo"));
  await p.click("#mDoBulkGo"); await p.waitForTimeout(600);
  g1 = await goal(p, "g1");
  ok(g1.mandala[3].c[0].doOn === "2026-11-16" && g1.mandala[0].c[1].doOn === "2026-11-16" && g1.mandala[0].c[2].doOn === "2026-11-18" && g1.mandala[2].c[2].doOn === "2026-11-18" && !g1.mandala[4].doOn
    && (await status(p)).includes("4マスのやる日を決めました（11/16〜11/18）") && !(await shown(p, "mDoBulk")), "① put", await status(p));
  await undo(p);
  g1 = await goal(p, "g1");
  ok(!g1.mandala[3].c[0].doOn && !g1.mandala[0].c[1].doOn && g1.mandala[0].c[2].doOn === "2026-11-14", "① 元に戻す (毎日30語 as it was)");

  // ⑨ マスをまとめて選ぶ: a block cannot be picked
  await p.evaluate(() => document.getElementById("daySheet").scrollTo(0, 0));
  await p.click("#mPickStart"); await p.waitForTimeout(300);
  await p.click('.m-cell[data-k="0"]'); await p.waitForTimeout(300);
  ok((await txt(p, "#mPick20 .one-head strong")) === "変えるマスを押して選んでください" && (await status(p)).includes("中にマスのあるマスは、まとめて変えられません") && JSON.stringify(await W(p, "path")) === "[]", "⑨ 単語 (a block): not picked, not opened");
  await p.click("#mPickEnd"); await p.waitForTimeout(300);
  await p.click('.m-cell[data-k="0"] [data-role="open"]'); await p.waitForTimeout(500);
  await p.click("#mPickStart"); await p.waitForTimeout(300);
  await p.click('.m-cell[data-k="1"]'); await p.waitForTimeout(200);
  await p.click('.m-cell[data-k="2"]'); await p.waitForTimeout(200);
  ok((await txt(p, "#mPick20 .one-head strong")) === "2マス選んでいます" && JSON.stringify(await p.$$eval(".m-cell.g20-picked", (xs) => xs.map((x) => x.dataset.k))) === '["1","2"]' && (await p.evaluate(() => document.activeElement?.tagName)) !== "TEXTAREA", "⑨ two picked (nothing typed in)");
  await p.evaluate(() => document.querySelector('.m-cell[data-k="1"]').dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }))); await p.waitForTimeout(300);
  ok(!(await shown(p, "mMenu")) && (await txt(p, "#mPick20 .one-head strong")) === "2マス選んでいます", "⑨ held while picking: no menu");
  await p.click("#mPickDue7"); await p.waitForTimeout(600);
  g1 = await goal(p, "g1");
  ok(g1.mandala[0].c[1].due === "2026-11-22" && g1.mandala[0].c[2].due === "2026-11-22" && (await status(p)).includes("2マスの期限を11/22にしました") && !(await shown(p, "mPick20")) && !(await p.$$(".m-cell.g20-picked")).length, "⑨ 期限：1週間後, for both", await status(p));
  await undo(p);
  g1 = await goal(p, "g1");
  ok(!g1.mandala[0].c[1].due && g1.mandala[0].c[2].due === "2026-11-12", "⑨ 元に戻す");
  await p.click("#mPickStart"); await p.waitForTimeout(300);
  await p.click('.m-cell[data-k="2"]'); await p.waitForTimeout(200);
  await p.click('.m-cell[data-k="1"]'); await p.waitForTimeout(200);
  await p.click('.m-cell[data-k="1"]'); await p.waitForTimeout(200);
  await p.click("#mPickDone"); await p.waitForTimeout(600);
  g1 = await goal(p, "g1");
  ok(g1.mandala[0].c[2].d === true && !g1.mandala[0].c[1].d && (await status(p)).includes("1マスを達成にしました"), "⑨ pressed twice: off; 毎日30語 達成", await status(p));

  ok(!p.errs.length, "no errors", p.errs);
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  await b.close();
})();
