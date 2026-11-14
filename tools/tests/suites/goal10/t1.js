// 目標 その10 ①〜⑩, through the hook build at 8830 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8830/";
const { chromium } = require("playwright");
const fs = require("fs");
const { P, phone, seed } = require("./lib");
const { all, settings } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const goal = async (p, id) => (await ls(p, "goals")).find((g) => g.id === id);
const status = (p) => p.evaluate(() => [document.getElementById("status").textContent, document.getElementById("sheetStatus").textContent].join("｜"));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__g10[f](...a), { f, a });
const open = async (p, name) => { await p.locator(".goal-open", { hasText: name }).first().click(); await p.waitForTimeout(900); };
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
const menuOf = (p, k) => p.evaluate((k) => document.querySelector(`.m-cell[data-k="${k}"]`).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), k);
const nows = (p) => p.evaluate(() => Date.now());
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-11T20:30:00+09:00"), { deviceScaleFactor: 1, acceptDownloads: true });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, { goals: all(), settings }, "goal"); await p.waitForTimeout(1000);

  // ③ 月ごとの進み
  const mo = await W(p, "monthSum", "2026-11");
  let t = await txt(p, "#goalMonths");
  ok(t.startsWith("月ごとの進み") && t.includes(`今月 ${mo}マス`) && (await p.$$eval("#goalMonths .mv-bar", (x) => x.length)) === 12, "③ 12 months, this one's", t);
  // ⑧ 中間目標の前日: 部屋を片づける's 11/20 60% (33% now), the day before at 9:00
  let al = (await W(p, "alarms", await nows(p))).find((a) => a.tag === "goal-ms:g3:ms2");
  ok(al && new Date(al.at).toISOString() === "2026-11-19T00:00:00.000Z" && al.body === "あした 11/20 までに 60% の中間目標です（いま 33%、あと 27%）。" && al.url === "./#goal:g3", "⑧ the day before, 9:00", al);
  ok(!(await W(p, "alarms", await nows(p))).some((a) => a.tag === "goal-ms:g3:ms1"), "⑧ none for one already past");
  // ② やりたいこと: one added, then made a goal
  await p.fill("#goalWish input", "フルマラソンを走る"); await p.press("#goalWish input", "Enter"); await p.waitForTimeout(500);
  ok((await ls(p, "settings")).find((x) => x.id === "goalWish")?.items?.[0]?.t === "フルマラソンを走る", "② kept");
  await p.locator("#goalWish .gwish-list button", { hasText: "目標にする" }).click(); await p.waitForTimeout(800);
  ok((await p.inputValue("#goalTitle")) === "フルマラソンを走る", "② a new goal with its words");
  await p.fill("#goalCriterion", "完走"); await p.fill("#goalDeadline", "2027-12-31"); await p.waitForTimeout(200);
  await p.click("#goalSave"); await p.waitForTimeout(900);
  ok((await ls(p, "goals")).some((g) => g.title === "フルマラソンを走る") && !(await ls(p, "settings")).find((x) => x.id === "goalWish").items.length, "② added: off the list");
  await done(p);
  // ④ 文字の大きさ: 大きく
  await p.click("#goalSettings"); await p.waitForTimeout(600);
  await p.click('#goalFont button[data-font="l"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => localStorage.getItem("tsumikasane:goalFont") === "l" && document.querySelector('#goalFont [data-font="l"]').getAttribute("aria-pressed") === "true"), "④ 大きく, on this device");
  // ⑧ off
  await p.click("#goalMsOn"); await p.waitForTimeout(400);
  ok((await ls(p, "settings")).find((x) => x.id === "goalMsRemind")?.on === false && !(await W(p, "alarms", await nows(p))).some((a) => a.tag.startsWith("goal-ms:")), "⑧ turned off");
  await done(p);

  // TOEIC
  await open(p, "TOEIC");
  ok(await p.evaluate(() => document.getElementById("mandalaView").classList.contains("mfont-l") && [...document.querySelectorAll(".m-cell .m-text")].some((x) => x.textContent === "長文" && getComputedStyle(x).fontSize === "20px")), "④ the chart's words larger");
  // ⑤ 時間の目標: 10時間
  await p.selectOption("#mTimeGoal select", "10"); await p.waitForTimeout(400);
  t = (await txt(p, "#mTimeGoal")).replace(/\s/g, "");
  ok((await goal(p, "g1")).timeGoal === 600 && t.includes("1時間35分/10時間・あと8時間25分。期限まで1日あたり約7分") && t.includes("15%"), "⑤ against the time spent", t);
  // ⑥ メモの一覧
  ok((await txt(p, "#mMemos")) === "単語 › 単語帳2周 公式の単語帳", "⑥ the memos", await txt(p, "#mMemos"));
  await p.locator("#mMemos .gmemo-row").click(); await p.waitForTimeout(700);
  ok(JSON.stringify(await W(p, "path")) === "[0]" && !(await p.evaluate(() => document.getElementById("mNote").hidden)) && (await p.inputValue("#mNoteText")) === "公式の単語帳", "⑥ its memo opened where it is");
  // ⑨ 連続日数: 単語帳2周, 11/9・10・11
  ok((await txt(p, '.m-cell[data-k="1"] .m-streak')) === "🔥3日", "⑨ 3 days in a row", await txt(p, '.m-cell[data-k="1"] .m-top'));
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  // ⑦ 模試's cells still to do into ToDo (1週間後), and back
  await menuOf(p, 2); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "中のまだのマスをToDoに（2マス）" }).click(); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "1週間後" }).click(); await p.waitForTimeout(700);
  let g = await goal(p, "g1"), td = await ls(p, "todos");
  const ids = [g.mandala[2].c[1].todo, g.mandala[2].c[2].todo];
  ok(ids.every(Boolean) && ids.every((id) => td.some((x) => x.id === id && x.due === "2026-11-18" && x.goal === "g1")) && !g.mandala[2].c[0].todo, "⑦ two ToDos, each joined to its cell", ids);
  ok((await status(p)).includes("「模試」の 2マスをToDoに入れました"), "⑦ said", await status(p));
  await p.locator("#sheetStatus button").click(); await p.waitForTimeout(600);
  g = await goal(p, "g1"); td = await ls(p, "todos");
  ok(!g.mandala[2].c[1].todo && !g.mandala[2].c[2].todo && !td.some((x) => ids.includes(x.id)), "⑦ 元に戻す");
  // ⑩ CSV
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }).catch(() => null), p.click("#mCsv")]);
  const csv = dl ? fs.readFileSync(await dl.path(), "utf8") : "";
  ok(dl && dl.suggestedFilename() === "tsumikasane-goal-2026-11-11.csv" && csv.startsWith("﻿段,要素,マス,上のマス,達成") && csv.includes("2,単語,単語帳2周,単語,,,,120,300,ページ") && csv.includes("1,単語,単語,TOEIC 800点"), "⑩ written out as a table", csv.slice(0, 300));
  // ① 見直し
  await p.click("#mReviewOpen"); await p.waitForTimeout(500);
  t = await txt(p, "#mReview");
  ok(t.replace(/\s/g, "").startsWith("この1週間進めたマス5達成したマス2取り組んだ時間1時間35分"), "① the week's figures", t);
  await p.fill("#mReviewText", "よかったこと：毎日続いた\n課題：\n次にやること：模試"); await p.waitForTimeout(100);
  const picks = p.locator("#mReview .rv-picks .chip-btn");
  const n1 = (await picks.nth(0).textContent()).trim(), n2 = (await picks.nth(1).textContent()).trim();
  await picks.nth(0).click(); await picks.nth(1).click(); await p.waitForTimeout(200);
  await p.click("#mReviewDone"); await p.waitForTimeout(600);
  g = await goal(p, "g1");
  const nowNames = []; (function walk(cs) { for (const c of cs || []) { if (!c) continue; if (c.now) nowNames.push(c.t); walk(c.c); } })(g.mandala);
  ok(num(g.reviewedAt) > 0 && g.notes.some((n) => n.text === "よかったこと：毎日続いた\n課題：\n次にやること：模試") && nowNames.includes(n1) && nowNames.includes(n2), "① kept: when, the ふりかえり, next week's cells in いまやる", { nowNames, n1, n2 });
  ok((await status(p)).includes("見直しをしました（ふりかえりに書きました）。2マスをいまやるに入れました"), "① said", await status(p));
  await p.locator("#sheetStatus button").click(); await p.waitForTimeout(500);
  g = await goal(p, "g1");
  ok(!g.reviewedAt && g.notes.length === 1, "① 元に戻す");
  await done(p);

  ok(!p.errs.length, "no errors", p.errs);
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  await b.close();
})();
function num(v) { return typeof v === "number" ? v : Number(v) || 0; }
