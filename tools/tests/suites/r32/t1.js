// 目標 その4 ①〜⑩, through the hook build at 8775 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8775/";
const { chromium } = require("playwright");
const fs = require("fs");
const { P, phone, seed } = require("./lib");
const { T, all } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const goal = async (p, id) => (await ls(p, "goals")).find((g) => g.id === id);
const status = (p) => p.evaluate(() => [document.getElementById("status").textContent, document.getElementById("sheetStatus").textContent].join("｜"));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__g4[f](...a), { f, a });
const open = async (p, name) => { await p.locator(".goal-open", { hasText: name }).first().click(); await p.waitForTimeout(900); };
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
const menuOf = (p, k) => p.evaluate((k) => document.querySelector(`.m-cell[data-k="${k}"]`).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), k);
const PIC = fs.readFileSync(__dirname + "/pic.png");
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-11T20:30:00+09:00"), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, { goals: all(), subjects: [{ id: "s1", name: "英語", createdAt: T("2026-09-01") }] }, "goal"); await p.waitForTimeout(1000);

  // ⑥ 重点: its own section first; ⑧ weights in its %
  const heads = await p.evaluate(() => [...document.querySelectorAll("#goalList .goal-head span:first-child")].map((x) => x.textContent));
  ok(heads[0] === "重点" && heads.includes("進行中") && !heads.includes("保留") && !heads.includes("やめた"), "⑥ 重点 first; ⑦ the one given up not under 進行中", heads);
  ok((await W(p, "pct", "g1")) === 40, "⑧ the weights count (模試 大, 語彙アプリ 小): 40%, not 46%", await W(p, "pct", "g1"));
  ok(await p.evaluate(() => [...document.querySelectorAll(".goal")].find((x) => x.textContent.includes("TOEIC"))?.querySelector(".goal-metric")?.textContent === "模試の点数 720点 / 800点"), "① its number on its block");
  ok(await p.evaluate(() => { const x = [...document.querySelectorAll(".goal")].find((x) => x.textContent.includes("TOEIC"))?.querySelector(".goal-metric .phrase"); return x?.textContent === "720点 / 800点" && x.getClientRects().length === 1; }), "① its number kept on one line");

  // ⑨ つみねこ
  const neko = await W(p, "neko");
  ok(neko.includes("「TOEIC 800点」、あと 10% で半分だよ") && neko.includes("「TOEIC 800点」、3日連続だね！") && neko[neko.length - 1] === "ゴロゴロ…", "⑨ つみねこ speaks of the goal put first", neko);

  // ⑤ 取り組む時間のお知らせ: 月・水・金 21:00, today (水) first, with the next step and why
  let al = (await W(p, "alarms", Date.now())).filter((a) => a.tag.startsWith("goal-time:g1:"));
  ok(al[0]?.tag === "goal-time:g1:2026-11-11" && new Date(al[0].at).toISOString() === "2026-11-11T12:00:00.000Z" && al[1]?.tag === "goal-time:g1:2026-11-13", "⑤ 21:00 today, then Friday", al.slice(0, 2).map((a) => a.tag));
  ok(al[0].body.startsWith("取り組む時間です。次の一歩は「") && al[0].body.endsWith("（英語で仕事をしたいから）") && al[0].url === "./#goal:g1", "⑤ its words: the next step and why", al[0].body);

  // ③ why: over the chart at its own level, not inside an element
  await open(p, "TOEIC");
  ok((await txt(p, "#mWhyLine")) === "なぜ：英語で仕事をしたいから 達成したら：海外のチームと英語で話せている", "③ over the chart", await txt(p, "#mWhyLine"));
  await p.click('.m-cell[data-k="0"] [data-role="open"]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById("mWhyLine").hidden), "③ not inside an element");
  // ② the time spent: put in by hand on 単語帳2周 (in 単語)
  await menuOf(p, 1); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "時間・写真・重み" }).click(); await p.waitForTimeout(300);
  ok((await p.evaluate(() => [...document.querySelectorAll("#mMenu button[role=menuitem]")].map((x) => x.textContent.replace(/\s/g, "")))).includes("取り組んだ時間を足す（いま1時間35分）"), "② its time in the menu");
  await p.locator("#mMenu button", { hasText: "取り組んだ時間を足す" }).click(); await p.waitForTimeout(300);
  await p.locator("#mMenu .chip-btn", { hasText: /^30\s?分$/ }).click(); await p.waitForTimeout(500);
  let c = (await goal(p, "g1")).mandala[0].c[1];
  ok(c.mins === 125 && c.tlog["2026-11-11"] === 75, "② 30分 put in: 2時間5分 on it, 75 today", [c.mins, c.tlog]);
  ok((await status(p)).replace(/\s/g, "").includes("「単語帳2周」に30分を記録しました") && (await txt(p, '.m-cell[data-k="1"] .m-top')).replace(/\s/g, "").includes("2時間5分"), "② said, and over its words", await status(p));
  await p.locator("#sheetStatus button").click(); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).mandala[0].c[1].mins === 95, "② 元に戻す");
  // the focus timer from the cell: its end puts its minutes on the cell
  await menuOf(p, 1); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "時間・写真・重み" }).click(); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "集中タイマーを始める" }).click(); await p.waitForTimeout(400);
  const fv = await W(p, "focus"); await p.waitForTimeout(500);
  ok(fv?.kind === "work" && fv.cell?.g === "g1" && JSON.stringify(fv.cell.p) === "[0,1]" && (await txt(p, "#focusName")) === "単語帳2周", "② the timer on the cell", fv);
  ok(!(await p.evaluate(() => document.getElementById("daySheet").open)) && (await p.isVisible("#focusBar")) && (await txt(p, "#status")).includes("集中タイマーを始めました（25分）：「単語帳2周」"), "② the sheet put away: the bar shows, what it says on the page", await txt(p, "#status"));
  await p.evaluate(({ P }) => { const v = JSON.parse(localStorage.getItem(P + "focus")); v.end = Date.now() - 1000; localStorage.setItem(P + "focus", JSON.stringify(v)); }, { P });
  await W(p, "tick"); await p.waitForTimeout(600);
  c = (await goal(p, "g1")).mandala[0].c[1];
  ok(c.mins === 95 + fv.len && (await W(p, "focus"))?.kind === "rest" && (await W(p, "focus"))?.cell?.g === "g1", "② its time put on the cell at the end, the rest keeps the cell", [c.mins, fv.len]);
  await p.click("#focusStop"); await p.waitForTimeout(300);
  ok(!(await p.isVisible("#focusBar")), "② the timer ended from its bar");
  await open(p, "TOEIC"); await p.click('.m-cell[data-k="0"] [data-role="open"]'); await p.waitForTimeout(500);
  // ④ a photo on it
  await menuOf(p, 1); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "時間・写真・重み" }).click(); await p.waitForTimeout(300);
  await p.setInputFiles('#mMenu input[type="file"]', { name: "mock.png", mimeType: "image/png", buffer: PIC }); await p.waitForTimeout(1500);
  c = (await goal(p, "g1")).mandala[0].c[1];
  ok(!!c.pid && (await W(p, "photos")) === 1 && !!(await p.$('.m-cell[data-k="1"] .m-photo-btn')), "④ a photo on it, its mark over its words", c.pid);
  await p.click('.m-cell[data-k="1"] .m-photo-btn'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById("mCellPhotoView").open && document.getElementById("mCellPhotoImg").naturalWidth > 0), "④ pressed: the photo");
  await p.click("#mCellPhotoDel"); await p.waitForTimeout(200); await p.click("#mCellPhotoDel"); await p.waitForTimeout(500);
  ok(!(await p.evaluate(() => document.getElementById("mCellPhotoView").open)) && (await W(p, "photos")) === 0 && !(await p.$('.m-cell[data-k="1"] .m-photo-btn')), "④ deleted (pressed twice)");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  // ⑧ the weight from the menu: 模試 大 → 中
  await menuOf(p, 2); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "時間・写真・重み" }).click(); await p.waitForTimeout(300);
  await p.locator("#mMenu .m-menu-wt button", { hasText: "中" }).click(); await p.waitForTimeout(500);
  ok((await goal(p, "g1")).mandala[2].wt === undefined && (await status(p)).includes("「模試」の重みを「中」にしました"), "⑧ 中: its weight gone", await status(p));
  await p.locator("#sheetStatus button").click(); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).mandala[2].wt === 2, "⑧ 元に戻す: 大 again");
  // ① a number: 760 today; then 800 reached
  await p.evaluate(() => document.getElementById("mMetric").scrollIntoView({ block: "center" }));
  await p.fill('#mMetric input[aria-label="模試の点数の値"]', "760"); await p.click("#mMetric .m-metric-add button[type=submit]"); await p.waitForTimeout(500);
  let g1 = await goal(p, "g1");
  ok(g1.metric.log.length === 4 && g1.metric.log[3].v === 760 && g1.metric.log[3].day === "2026-11-11", "① 760 today, kept", g1.metric.log[3]);
  ok((await txt(p, "#mMetric .m-metric-read")) === "いま 760点（目標 800点まで、あと 40点）・前回より +40点", "① said: how far, the change", await txt(p, "#mMetric .m-metric-read"));
  await p.fill('#mMetric input[aria-label="模試の点数の値"]', "805"); await p.click("#mMetric .m-metric-add button[type=submit]"); await p.waitForTimeout(500);
  ok((await status(p)).includes("目標の値に届きました！") && await p.evaluate(() => !!document.querySelector("canvas.confetti")), "① reached: said with 紙ふぶき", await status(p));
  ok(await p.evaluate(() => document.querySelectorAll("#mMetric circle.tr-now").length === 5 && !!document.querySelector("#mMetric .tr-ideal")), "① its chart: five points, the number aimed at");
  // ③ why written
  await p.evaluate(() => document.getElementById("mWhy").scrollIntoView({ block: "center" }));
  await p.fill("#mWhy", "TOEICで就職に有利にしたい"); await p.press("#mWhy", "Tab"); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).why === "TOEICで就職に有利にしたい", "③ why kept");
  // ⑩ the check: 測れる missing (達成基準 the same as its name)
  const chk = await txt(p, "#mCheck");
  ok(chk.startsWith("6つ中 5つ OK") && chk.includes("測れる：まだ"), "⑩ 5 of 6, 測れる to look at", chk);
  // ⑥ put first: taken off and on
  await p.evaluate(() => document.getElementById("mFocus").scrollIntoView({ block: "center" }));
  ok((await p.evaluate(() => document.getElementById("mFocus").textContent)) === "★ 重点目標をはずす", "⑥ its button says so");
  await p.click("#mFocus"); await p.waitForTimeout(400);
  ok(!(await goal(p, "g1")).focus, "⑥ taken off");
  await p.click("#mFocus"); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).focus === true, "⑥ put on again");
  // ② 勉強の記録にも: on, then time put in goes there too
  await p.evaluate(() => document.getElementById("mTime").scrollIntoView({ block: "center" }));
  await p.click("#mStudyOn"); await p.waitForTimeout(300);
  await p.selectOption("#mStudySub", "s1"); await p.waitForTimeout(300);
  ok(JSON.stringify((await goal(p, "g1")).study) === '{"on":true,"sub":"s1"}', "② 勉強 joined", (await goal(p, "g1")).study);
  await done(p);

  // ⑦ やめる: 体重, with why; under 達成 in its own section; 再開する
  await open(p, "社会人");
  await p.evaluate(() => document.getElementById("mQuitCard").scrollIntoView({ block: "center" }));
  await p.locator("#mQuitCard button", { hasText: "この目標をやめる" }).click(); await p.waitForTimeout(300);
  await p.fill("#mQuitWhy", "ほかの目標にしぼるため"); await p.locator("#mQuitCard button", { hasText: "やめる" }).first().click(); await p.waitForTimeout(500);
  let g2 = await goal(p, "g2");
  ok(g2.quit?.why === "ほかの目標にしぼるため" && g2.pausedAt === g2.quit.at, "⑦ given up, why kept", g2.quit);
  ok(!(await p.evaluate(() => document.getElementById("mQuitInfo").hidden)) && (await txt(p, "#mQuitInfo")).includes("にやめた目標です") && await p.evaluate(() => document.getElementById("mPause").parentElement.hidden), "⑦ its sheet says so, no 保留");
  ok((await txt(p, "#mDeadlineNote")) === "11/11（水）にやめた", "⑦ under its 期限: やめた, not 保留中", await txt(p, "#mDeadlineNote"));
  await done(p);
  ok(!(await p.evaluate(() => [...document.querySelectorAll(".goal")].some((x) => x.textContent.includes("社会人")))), "⑦ off 進行中");
  await p.click('#goalFilters button[data-filter="done"]'); await p.waitForTimeout(500);
  const dh = await p.evaluate(() => [...document.querySelectorAll("#goalList .goal-head span:first-child")].map((x) => x.textContent));
  ok(dh[0] === "達成" && dh.includes("やめた") && (await txt(p, "#goalStats")).includes("やめた目標：2個"), "⑦ under 達成, its own section after 達成's; the record says so", [dh, await txt(p, "#goalStats")]);
  await open(p, "社会人");
  await p.locator("#mQuitInfo button", { hasText: "再開する" }).click(); await p.waitForTimeout(500);
  g2 = await goal(p, "g2");
  ok(!g2.quit && !g2.pausedAt, "⑦ 再開する: under way again");
  await done(p);
  await p.click('#goalFilters button[data-filter="active"]'); await p.waitForTimeout(400);

  // ⑩ the new goal's form: what is missing, once a field is left, then as it is typed; gone with the form
  await p.click("#goalAdd"); await p.waitForTimeout(600);
  await p.fill("#goalTitle", "英語をがんばる"); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById("goalCheckNew").hidden), "⑩ nothing said while the name is typed");
  await p.press("#goalTitle", "Tab"); await p.fill("#goalCriterion", "毎日やる"); await p.press("#goalCriterion", "Tab"); await p.waitForTimeout(200);
  const nc = await txt(p, "#goalCheckNew");
  ok(nc.includes("「がんばる」より") && nc.includes("達成基準に数字を入れると"), "⑩ in the new goal's sheet, once the fields are left", nc);
  await p.fill("#goalCriterion", "毎日30分やる"); await p.waitForTimeout(200);
  ok(!(await txt(p, "#goalCheckNew")).includes("達成基準に数字を入れると"), "⑩ put right as it is typed: gone", await txt(p, "#goalCheckNew"));
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  await p.click("#goalAdd"); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.getElementById("goalCheckNew").hidden), "⑩ a new form: nothing said");
  await p.evaluate(() => document.getElementById("daySheet").close()); await p.waitForTimeout(400);

  // ⑥ きょう's tile: the goal put first, and its next step
  await p.goto(process.env.URL0 + "#home"); await p.reload(); await p.waitForTimeout(1300);
  const tile = await txt(p, '.tile[data-tile="goal"]');
  ok(tile.includes("「TOEIC 800点」の期限まで") && tile.includes("次の一歩・TOEIC"), "⑥ the tile: TOEIC, its next step", tile);
  // ⑦ きょう's tile with only a goal given up (and one achieved, then none): neither 保留中 nor, with none achieved, すべて達成
  const quitOnly = all().filter((g) => g.id === "g3");
  await seed(p, { goals: [...quitOnly, ...all().filter((g) => g.done).slice(0, 1)] }, "home"); await p.waitForTimeout(800);
  const t2 = await txt(p, '.tile[data-tile="goal"]');
  await seed(p, { goals: quitOnly }, "home"); await p.waitForTimeout(800);
  const t3 = await txt(p, '.tile[data-tile="goal"]');
  ok(t2.includes("すべて達成") && !t2.includes("保留中") && t3.includes("まだ") && !t3.includes("保留中") && !t3.includes("すべて達成"), "⑦ the tile: すべて達成 / まだ, never 保留中", [t2, t3]);
  ok(p.errs.length === 0, "no errors on the page", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
