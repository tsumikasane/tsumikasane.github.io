// 目標 その9 ①〜⑩, through the hook build at 8839 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8839/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const { all, settings } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const goal = async (p, id) => (await ls(p, "goals")).find((g) => g.id === id);
const status = (p) => p.evaluate(() => [document.getElementById("status").textContent, document.getElementById("sheetStatus").textContent].join("｜"));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__g9[f](...a), { f, a });
const open = async (p, name) => { await p.locator(".goal-open", { hasText: name }).first().click(); await p.waitForTimeout(900); };
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
const menuOf = (p, k) => p.evaluate((k) => document.querySelector(`.m-cell[data-k="${k}"]`).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), k);
const shown = (p, id) => p.evaluate((id) => { const x = document.getElementById(id); return !!x && !x.hidden && getComputedStyle(x).display !== "none"; }, id);
const block = (p, name) => p.evaluate((name) => [...document.querySelectorAll(".goal")].find((x) => x.querySelector(".title")?.textContent.includes(name))?.innerText.replace(/\s+/g, " ") ?? "", name);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-11T20:30:00+09:00"), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, { goals: all(), settings }, "goal"); await p.waitForTimeout(1000);

  // ⑤ 今週できたこと, under 今週
  await p.locator("#goalWeek .gw-done .link-btn").click(); await p.waitForTimeout(300);
  let t = await txt(p, "#goalWeek .gw-done");
  ok(t.startsWith("できたことを隠す") && t.indexOf("苦手まとめ") > 0 && t.indexOf("苦手まとめ") < t.indexOf("単語帳1周") && (await p.$$eval("#goalWeek .gw-done-list li", (x) => x.length)) === 2, "⑤ this week's cells done, the newest first", t);
  // ④ 今年の目標: 部屋 (12/31), 簿記 (achieved 10/30), 5km (achieved 6/20)
  t = await txt(p, "#goalYear");
  ok(t.startsWith("2026年の目標 2 / 3 達成") && t.includes("67%") && t.includes("部屋を片づける"), "④ this year's goals", t);
  await p.fill("#goalYear input", "挑戦の年"); await p.dispatchEvent("#goalYear input", "change"); await p.waitForTimeout(400);
  ok((await ls(p, "settings")).find((x) => x.id === "goalYear")?.themes?.["2026"] === "挑戦の年", "④ its theme kept");
  // ⑨ 最近のふりかえり
  t = await txt(p, "#goalNotesAll");
  ok(t.startsWith("最近のふりかえり 2 件 11月11日（水）・部屋を片づける 机は片づいた 11月10日（火）・TOEIC 800点 単語を毎日続けられた"), "⑨ every goal's, the newest first", t);
  // ① 出すもの: いまやる off
  ok(await shown(p, "goalNow"), "① いまやる shows at first");
  await p.click("#goalSettings"); await p.waitForTimeout(600);
  await p.click('#goalShowList input[aria-label="いまやるを目標のページに出す"]'); await p.waitForTimeout(300);
  await done(p);
  ok(!(await shown(p, "goalNow")) && (await p.evaluate(() => JSON.parse(localStorage.getItem("tsumikasane:goalShow")).off.includes("now"))), "① off: not on the page (this device's)");
  await p.reload(); await p.waitForTimeout(900);
  ok(!(await shown(p, "goalNow")) && (await shown(p, "goalToday")), "① still off after a reload; the rest as before");

  // ⑧ 文字から目標を作る
  await p.click("#goalAdd"); await p.waitForTimeout(700);
  await p.click("#goalFromTextOpen"); await p.waitForTimeout(200);
  await p.fill("#goalFromTextIn", "【目標】英検2級に合格する\n達成基準：二次試験まで合格\n期限：2027年1月25日（月）・あと 75 日\n進み具合：20%\n\n✅ 単語（1/2）\n　✅ でる順パス単\n　⬜ 熟語（10/50ページ）\n⬜ リスニング\n⬜ 面接");
  await p.waitForTimeout(200);
  ok((await txt(p, "#goalFromTextSay")) === "「英検2級に合格する」・マス 5・期限 1/25", "⑧ what it reads", await txt(p, "#goalFromTextSay"));
  await p.click("#goalFromTextGo"); await p.waitForTimeout(900);
  const ng = (await ls(p, "goals")).find((g) => g.title === "英検2級に合格する");
  ok(ng && ng.criterion === "二次試験まで合格" && ng.deadline === "2027-01-25" && ng.depth === 2 && ng.mandala[0].t === "単語" && ng.mandala[0].c[0].t === "でる順パス単" && !ng.mandala[0].c[0].d && ng.mandala[0].c[1].t === "熟語" && ng.mandala[0].c[1].n === 50 && ng.mandala[0].c[1].u === "ページ" && ng.mandala[1].t === "リスニング" && ng.mandala[2].t === "面接" && ng.mandala.length === 8, "⑧ made, its cells unchecked", ng);
  ok((await W(p, "open")) === ng.id && (await status(p)).includes("文字から「英検2級に合格する」を作りました（マス 5）"), "⑧ its chart opened, and said");
  await done(p);

  // TOEIC: ② 目次, ⑩ 複製, ⑥ ロック, ⑦ 達成基準
  await open(p, "TOEIC");
  const opts = await p.$$eval("#mToc option", (x) => x.map((o) => o.textContent));
  ok(opts[0] === "項目へ移動…" && opts.includes("ふりかえり") && opts.includes("お金") && opts.includes("達成基準のチェックリスト"), "② the headings", opts.length);
  await p.selectOption("#mToc", { label: "ふりかえり" });
  const at = () => p.evaluate(() => { const h = [...document.querySelectorAll("#mRoot h3")].find((x) => x.textContent === "ふりかえり"); return [h.getBoundingClientRect().top, document.getElementById("daySheet").scrollTop]; });
  let pos = await at();
  for (let i = 0; i < 30; i++) { await p.waitForTimeout(150); const n = await at(); if (n[1] === pos[1] && i > 2) break; pos = n; } // (until the smooth scroll has stopped)
  ok(pos[1] > 300 && pos[0] > 0 && pos[0] < 200, "② gone to it", pos);
  await p.evaluate(() => document.getElementById("daySheet").scrollTo(0, 0));
  // ⑩ 複製: 文法書1周 (done) in 文法
  await p.click('.m-cell[data-k="1"] [data-role="open"]'); await p.waitForTimeout(500);
  await menuOf(p, 0); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "このマスを複製" }).click(); await p.waitForTimeout(500);
  let c = (await goal(p, "g1")).mandala[1].c[3];
  ok(c?.t === "文法書1周（2）" && !c.d && !c.at, "⑩ copied into the first empty place, unchecked", c);
  await p.locator("#sheetStatus button").click(); await p.waitForTimeout(400);
  ok(!(await goal(p, "g1")).mandala[1].c[3], "⑩ 元に戻す");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  // ⑥ ロック
  await p.click("#mLock"); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).lock === true && (await shown(p, "mLockLine")), "⑥ locked, said over the chart");
  await p.evaluate(() => document.getElementById("daySheet").scrollTo(0, 0));
  await p.click('.m-cell[data-k="5"] [data-role="check"]', { force: true }); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).mandala[5].d === true, "⑥ a check does nothing");
  await menuOf(p, 2); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById("mMenu").hidden), "⑥ no 長押し menu");
  ok(await p.evaluate(() => document.querySelector('textarea[data-k="2"]').readOnly), "⑥ nothing written");
  await p.click('.m-cell[data-k="0"] [data-role="open"]'); await p.waitForTimeout(500);
  ok(JSON.stringify(await W(p, "path")) === "[0]", "⑥ › still opens");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  await p.click("#mLockOff"); await p.waitForTimeout(400);
  ok(!(await goal(p, "g1")).lock && !(await shown(p, "mLockLine")), "⑥ はずす");
  // ⑦ 達成基準のチェックリスト: two, both met, then 達成
  for (const v of ["模試で750点以上", "公式問題集を3周"]) { await p.fill("#mCrits input", v); await p.press("#mCrits input", "Enter"); await p.waitForTimeout(400); }
  let g = await goal(p, "g1");
  ok(g.crits?.length === 2 && g.crits[0].t === "模試で750点以上", "⑦ two put in", g.crits);
  await p.locator("#mCrits .crit-list .check").first().click(); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).crits[0].d === true && (await txt(p, "#mCrits")).startsWith("満たした基準 1 / 2"), "⑦ one met", await txt(p, "#mCrits"));
  await p.locator("#mCrits .crit-list .check").nth(1).click(); await p.waitForTimeout(400);
  ok(await shown(p, "mCritsAchieve"), "⑦ all met: 達成 offered");
  await p.click("#mCritsAchieve"); await p.waitForTimeout(600);
  ok((await goal(p, "g1")).done === true, "⑦ achieved from there");
  await done(p);

  // ③ 次の目標: 部屋を片づける, then ハーフマラソン (to start 12/1)
  await p.click('#goalFilters [data-filter="active"]'); await p.waitForTimeout(300);
  await open(p, "部屋を片づける");
  await p.selectOption("#mNextGoal", "g7"); await p.waitForTimeout(400);
  ok((await goal(p, "g3")).nextGoal === "g7", "③ picked");
  await done(p);
  ok((await block(p, "部屋を片づける")).includes("次は「ハーフマラソンを走る」") && (await block(p, "ハーフマラソン")).includes("「部屋を片づける」のあと"), "③ on both blocks", [await block(p, "部屋を片づける"), await block(p, "ハーフマラソン")]);
  await open(p, "部屋を片づける");
  await p.locator('.m-cell[data-k="1"] [data-role="check"]').click(); await p.waitForTimeout(500);
  await p.locator('.m-cell[data-k="2"] [data-role="check"]').click(); await p.waitForTimeout(600);
  ok((await goal(p, "g3")).done === true && !(await goal(p, "g7")).startOn, "③ achieved: the next one started");
  ok((await status(p)).includes("次の目標「ハーフマラソンを走る」を始めます"), "③ said", await status(p));
  await done(p);

  ok(!p.errs.length, "no errors", p.errs);
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  await b.close();
})();
