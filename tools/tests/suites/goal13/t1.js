// 目標 その13 ①〜⑩, through the hook build at 8833 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8833/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const { all, settings, todos, events } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const goal = async (p, id) => (await ls(p, "goals")).find((g) => g.id === id);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const status = (p) => p.evaluate(() => [document.getElementById("status").textContent, document.getElementById("sheetStatus").textContent].join("｜"));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__g13[f](...a), { f, a });
const block = (p, name) => p.locator(".goal-open").filter({ has: p.locator(".title", { hasText: name }) }).first();
const open = async (p, name) => { await block(p, name).click(); await p.waitForTimeout(900); };
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
const shown = (p, id) => p.evaluate((id) => { const x = document.getElementById(id); return !!x && !x.hidden && getComputedStyle(x).display !== "none"; }, id);
const sheetOpen = (p) => p.evaluate(() => document.getElementById("daySheet").open);
const undo = async (p) => { await p.locator((await sheetOpen(p)) ? "#sheetStatus button" : "#status button").first().click(); await p.waitForTimeout(600); };
const tags = async (p) => (await W(p, "alarms", await p.evaluate(() => Date.now()))).map((a) => a.tag);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-14T20:30:00+09:00"), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, { goals: all(), settings, todos, events }, "goal"); await p.waitForTimeout(1000);

  // ⑦ あと少しの目標
  const near = await p.$$eval("#goalNear li", (xs) => xs.map((x) => x.innerText.replace(/\s+/g, " ").trim()));
  ok(near.length === 2 && near[0] === "朝ランを習慣に あと 1マス 5回目" && near[1] === "社会人になるまでに あと 3マス FP3級 体力 お金", "⑦ the goals a few cells from done, the fewest first", near);
  // ⑥ バッジ
  const badge = (k) => txt(p, `#goalBadges [data-badge="${k}"]`);
  ok((await txt(p, "#goalBadges .goal-head")) === "バッジ 7 / 12", "⑥ seven of twelve", await txt(p, "#goalBadges .goal-head"));
  ok((await badge("run3")).includes("3日つづけて 11/13・NEW") && (await badge("early")).includes("朝のうちに 11/11・NEW") && (await badge("c10")).includes("10マス 10/30") && (await badge("first")).includes("はじめの一歩 2025/7/5") && (await badge("ahead")).includes("余裕をもって 6/20"),
    "⑥ each on the day it was earned, the newest marked", [await badge("run3"), await badge("early"), await badge("c10"), await badge("first"), await badge("ahead")]);
  ok((await badge("c50")).includes("50マス マスを50こ達成する") && (await p.$$eval("#goalBadges .g13-badge.got", (x) => x.length)) === 7, "⑥ one still to earn says how", await badge("c50"));
  // ⑩ 今週の報告を送る
  await p.evaluate(() => { window.__shared = null; Object.defineProperty(navigator, "share", { configurable: true, value: async (d) => { window.__shared = d; } }); });
  await p.click("#goalReport"); await p.waitForTimeout(300);
  const rep = (await p.evaluate(() => window.__shared))?.text || "";
  ok(rep.startsWith("今週の目標（11/8〜11/14）\n") && rep.includes("\n・朝ランを習慣に 80%（今週 4マス）\n　1回目、2回目、3回目、4回目\n") && rep.includes("（今週 2マス・1時間35分）\n　単語帳1周、苦手まとめ") && rep.includes("・部屋を片づける 33%（今週 0マス・30分）") && rep.endsWith("\n\n合計 6マス・取り組んだ時間 2時間5分") && !rep.includes("ハーフマラソン"), "⑩ the week in words", rep);

  // ① まとめて選ぶ: 期限を延ばす for two
  await p.click("#goalPickStart"); await p.waitForTimeout(300);
  await block(p, "朝ランを習慣に").click(); await block(p, "部屋を片づける").click(); await p.waitForTimeout(300);
  await p.selectOption('#goalPickBar select[aria-label="期限を延ばす"]', "1m"); await p.waitForTimeout(600);
  let g8 = await goal(p, "g8"), g3 = await goal(p, "g3");
  ok(g8.deadline === "2026-12-14" && g3.deadline === "2027-01-31" && g8.dlog?.[0]?.from === "2026-11-12" && g3.dlog?.[0]?.to === "2027-01-31" && (await status(p)).includes("2件の期限を1か月延ばしました"), "① both a month on (one past its 期限, from today), each kept", [g8.deadline, g3.deadline, g8.dlog, await status(p)]);
  await undo(p);
  g8 = await goal(p, "g8"); g3 = await goal(p, "g3");
  ok(g8.deadline === "2026-11-12" && g3.deadline === "2026-12-31" && !g8.dlog && !g3.dlog, "① 元に戻す", [g8.deadline, g3.deadline, g8.dlog]);

  // ⑤ お知らせを休む, ⑨ 時間を聞く on
  ok((await tags(p)).includes("goal-review:2026-11-15"), "⑤ before: tomorrow's 見直し");
  await p.click("#goalSettings"); await p.waitForTimeout(600);
  await p.locator("#goalQuiet .chip-btn", { hasText: "1週間" }).click(); await p.waitForTimeout(500);
  let t = await tags(p);
  ok((await setting(p, "goalQuiet"))?.until === "2026-11-20" && !t.includes("goal-review:2026-11-15") && t.includes("goal-review:2026-11-22") && !t.some((x) => /^goal[:-]/.test(x) && x.includes("2026-11-1")), "⑤ none to 11/20, those after it kept", t.filter((x) => x.startsWith("goal")));
  ok((await txt(p, "#goalQuietFoot")).startsWith("2026年11月20日") || (await txt(p, "#goalQuietFoot")).includes("11月20日"), "⑤ said under it", await txt(p, "#goalQuietFoot"));
  await p.click("#goalAskTime"); await p.waitForTimeout(300);
  ok((await p.evaluate(() => localStorage.getItem("tsumikasane:goalAskTime"))) === "on", "⑨ on, this device's");
  await done(p);
  ok((await txt(p, "#goalQuietLine")) === "🔕 目標のお知らせを 11/20 まで休んでいます やめる", "⑤ said over the page", await txt(p, "#goalQuietLine"));
  await p.locator("#goalQuietLine .link-btn").click(); await p.waitForTimeout(500);
  ok(!(await shown(p, "goalQuietLine")) && (await tags(p)).includes("goal-review:2026-11-15"), "⑤ やめる");
  // ③ a new goal's 期限 from the usual spans
  await p.click("#goalAdd"); await p.waitForTimeout(700);
  await p.locator("#goalDeadlinePicks .chip-btn", { hasText: "年度末" }).click(); await p.waitForTimeout(200);
  ok((await p.inputValue("#goalDeadline")) === "2027-03-31" && (await p.getAttribute('#goalDeadlinePicks .chip-btn:has-text("年度末")', "aria-pressed")) === "true", "③ a new goal's 期限 at a press", await p.inputValue("#goalDeadline"));
  await p.click("#sheetCancel"); await p.waitForTimeout(500);

  // the goal past its 期限
  await open(p, "朝ランを習慣に");
  ok((await txt(p, "#mExtend")) === "期限を 2 日過ぎています。延ばすなら： 1週間（11/21） 1か月（12/14） 3か月（2/14）", "① offered for one past its 期限", await txt(p, "#mExtend"));
  await p.click('#mExtend [data-ext="1w"]'); await p.waitForTimeout(600);
  g8 = await goal(p, "g8");
  ok(g8.deadline === "2026-11-21" && g8.dlog?.length === 1 && (await p.inputValue("#mDeadline")) === "2026-11-21" && (await status(p)).includes("期限を1週間延ばして 11/21 にしました"), "① a week on from today", [g8.deadline, await status(p)]);
  // ② the change kept, with why
  ok((await txt(p, "#mDlog li")) === "11/14 11/12 → 11/21（9日のばす）", "② the change kept", await txt(p, "#mDlog"));
  await p.fill("#mDlogWhy", "かぜで休んだ"); await p.press("#mDlogWhy", "Enter"); await p.waitForTimeout(500);
  ok((await goal(p, "g8")).dlog[0].why === "かぜで休んだ" && (await txt(p, "#mDlog li")).endsWith("かぜで休んだ"), "② and why", (await goal(p, "g8")).dlog);
  // ③ in its own fields: 3か月後, kept by ②, and 元に戻す
  await p.locator("#mDeadlinePicks .chip-btn", { hasText: "3か月後" }).click(); await p.waitForTimeout(600);
  g8 = await goal(p, "g8");
  ok(g8.deadline === "2027-02-14" && g8.dlog.length === 2 && g8.dlog[1].from === "2026-11-21" && (await status(p)).includes("期限を書き換えました"), "③ its 期限 at a press, kept by ②", [g8.deadline, g8.dlog]);
  await undo(p);
  g8 = await goal(p, "g8");
  ok(g8.deadline === "2026-11-21" && g8.dlog.length === 1 && (await p.inputValue("#mDeadline")) === "2026-11-21", "③ 元に戻す, its record too", [g8.deadline, g8.dlog]);
  // ⑧ a letter, sealed
  await p.fill("#mLetterText", "ここまで来たね。おめでとう！"); await p.click("#mLetterSeal"); await p.waitForTimeout(600);
  g8 = await goal(p, "g8");
  const lt = await txt(p, "#mLetter");
  ok(g8.letter?.text === "ここまで来たね。おめでとう！" && lt.startsWith("✉️ 封をした手紙があります") && !lt.includes("おめでとう"), "⑧ sealed, not shown", lt);
  // ⑨ 5回目 checked: how long it took
  await p.locator('.m-cell[data-k="4"] [data-role="check"]').click(); await p.waitForTimeout(700);
  ok((await goal(p, "g8")).done === true && (await shown(p, "mAskTime")) && (await txt(p, "#mAskTime .ask-say")) === "「5回目」にかかった時間は？", "⑨ asked as it is checked", await txt(p, "#mAskTime"));
  await p.click('#mAskTime [data-min="30"]'); await p.waitForTimeout(600);
  g8 = await goal(p, "g8");
  ok(g8.mandala[4].tlog?.["2026-11-14"] === 30 && !(await shown(p, "mAskTime")) && (await status(p)).includes("「5回目」に 30 分を記録しました"), "⑨ put in its time", [g8.mandala[4], await status(p)]);
  // ⑧ achieved: the letter come
  ok((await shown(p, "mLetterRow")) && (await txt(p, "#mLetter")).startsWith("✉️ 未来の自分からの手紙が届いています"), "⑧ come once achieved", await txt(p, "#mLetter"));
  // ④ 印刷: the eight
  await p.evaluate(() => { window.print = () => { const x = document.getElementById("goalPrint"); window.__printed = [x?.querySelectorAll(".gp13-c").length, x?.innerText.replace(/\s+/g, " ").trim()]; }; });
  await p.click("#mPrint"); await p.waitForTimeout(300);
  let pr = await p.evaluate(() => window.__printed);
  ok(pr?.[0] === 9 && pr[1].startsWith("朝ランを習慣に達成基準：5回走る 期限：11月21日（土） 進み具合 100%") && pr[1].includes("✓5回目") && pr[1].endsWith("つみかさね 11月14日（土）に印刷"), "④ the eight on paper", pr);
  await done(p);
  // ⑧ on its block, under 達成
  await p.click('#goalFilters button[data-filter="done"]'); await p.waitForTimeout(500);
  ok((await p.locator(".goal", { has: p.locator(".title", { hasText: "朝ランを習慣に" }) }).locator(".g13-letter").count()) === 1, "⑧ on its block");
  await open(p, "朝ランを習慣に");
  await p.click("#mLetterGo"); await p.waitForTimeout(600);
  ok((await goal(p, "g8")).letter.openedAt > 0 && (await txt(p, "#mLetter")).endsWith("ここまで来たね。おめでとう！") && !(await shown(p, "mLetterRow")), "⑧ opened", await txt(p, "#mLetter"));
  await done(p);
  await p.click('#goalFilters button[data-filter="active"]'); await p.waitForTimeout(500);

  // ④ 印刷: 全体 of TOEIC
  await open(p, "TOEIC");
  await p.click("#mPrint"); await p.waitForTimeout(300);
  pr = await p.evaluate(() => window.__printed);
  ok(pr?.[0] === 81 && pr[1].startsWith("TOEIC 800点達成基準：TOEIC 800点 期限：2027年1月31日（日） 進み具合 46%") && pr[1].includes("単語帳2周"), "④ 全体 on paper", pr && [pr[0], pr[1].slice(0, 80)]);
  ok(!(await shown(p, "mExtend")) && !(await shown(p, "mDlog")), "① ② none for one far from its 期限, never moved");
  await done(p);

  ok(!p.errs.length, "no errors", p.errs);
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  await b.close();
})();
