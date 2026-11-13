// 目標 その6 ①〜⑩, through the hook build at 8836 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8836/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const { all } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const goal = async (p, id) => (await ls(p, "goals")).find((g) => g.id === id);
const status = (p) => p.evaluate(() => [document.getElementById("status").textContent, document.getElementById("sheetStatus").textContent].join("｜"));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__g6[f](...a), { f, a });
const open = async (p, name) => { await p.locator(".goal-open", { hasText: name }).first().click(); await p.waitForTimeout(900); };
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
const undo = async (p) => { await p.locator("#sheetStatus button").click(); await p.waitForTimeout(400); };
const menuOf = (p, k) => p.evaluate((k) => document.querySelector(`.m-cell[data-k="${k}"]`).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), k);
const titles = (p) => p.evaluate(() => [...document.querySelectorAll("#goalList .goal .title")].map((x) => x.textContent));
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-11T20:30:00+09:00"), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, { goals: all() }, "goal"); await p.waitForTimeout(1000);

  // ⑧ 今週: the cells moved on this week (from Sunday 11/8) across the goals
  ok(JSON.stringify(await W(p, "week")) === JSON.stringify({ now: 3, last: 0, days: 3 }), "⑧ this week: 3 cells on 3 days, none last week", await W(p, "week"));
  const wk = await txt(p, "#goalWeek");
  ok(wk.includes("今週") && wk.includes("進めたマス 3（先週 0）・進めた日 3日") && wk.includes("TOEIC 800点"), "⑧ over the list", wk);
  // ① the next 中間目標 on the block: 11/1 90% is past and not reached
  ok(await p.evaluate(() => [...document.querySelectorAll(".goal")].find((x) => x.textContent.includes("部屋を片づける"))?.querySelector(".goal-ms.warn")?.textContent === "区切り 11/1 90%"), "① the next one on its block, red once past");

  // ⑦ 並べ方 and ⑥ 分類 (none yet: no row of kinds)
  ok(!(await p.evaluate(() => document.querySelector("#goalSixBar .goal-tag-row"))) && !(await p.evaluate(() => document.getElementById("goalSixBar").hidden)), "⑥⑦ the bar, with no kinds yet");
  const before = await titles(p);
  await p.selectOption("#goalSort", "low"); await p.waitForTimeout(400);
  const low = await titles(p);
  ok(await p.evaluate(() => localStorage.getItem("tsumikasane:goalSort")) === "low", "⑦ kept on this device");
  const pp = {}; for (const id of ["g1", "g2", "g3"]) pp[id] = await W(p, "pct", id);
  const want = [["g1", "TOEIC 800点"], ["g2", "社会人になるまでに"], ["g3", "部屋を片づける"]].sort((a, b) => pp[a[0]] - pp[b[0]]).map((x) => x[1]);
  ok(JSON.stringify(low.slice(0, 3)) === JSON.stringify(want), "⑦ 進み具合が低い順", { low, pp });
  ok(await W(p, "noDrag"), "⑦ not moved by a hold while in another order");
  ok((await txt(p, "#goalSixBar")).includes("長押しで順番を変えられません"), "⑦ said so");
  await p.selectOption("#goalSort", "name"); await p.waitForTimeout(300);
  await p.selectOption("#goalSort", ""); await p.waitForTimeout(300);
  ok(JSON.stringify(await titles(p)) === JSON.stringify(before) && !(await W(p, "noDrag")), "⑦ いつもの順 again");

  // the goal sheet: TOEIC
  await open(p, "TOEIC");
  // ⑩ 埋まり具合
  const f = await W(p, "fill", "g1");
  ok(f.all === 56 && f.put === 17 && JSON.stringify(f.first) === JSON.stringify({ path: [], k: 6 }), "⑩ 17 of 56 written; the first empty one around the goal", f);
  ok((await txt(p, "#mFill")).includes("書いたマス 17 / 56") && (await txt(p, "#mFill")).includes("要素 6/8・行動 11/48"), "⑩ said, a level at a time", await txt(p, "#mFill"));
  await p.click("#mFillGo"); await p.waitForTimeout(700);
  ok(JSON.stringify(await W(p, "path")) === "[]" && (await p.evaluate(() => document.activeElement?.dataset?.k)) === "6", "⑩ that cell taken up to write in", await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)));
  await p.evaluate(() => document.activeElement.blur());

  // ⑤ 見積もり時間: on 毎日30語 (in 単語)
  await p.click('.m-cell[data-k="0"] [data-role="open"]'); await p.waitForTimeout(500);
  await menuOf(p, 2); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "見積もり時間" }).click(); await p.waitForTimeout(300);
  await p.locator("#mMenu .chip-btn", { hasText: /^1\s?時間$/ }).click(); await p.waitForTimeout(500);
  ok((await goal(p, "g1")).mandala[0].c[2].est === 60, "⑤ 1時間 kept on the cell");
  ok((await txt(p, '.m-cell[data-k="2"] .m-top')).replace(/\s/g, "") === "約1時間" && (await status(p)).replace(/\s/g, "").includes("「毎日30語」の見積もりを1時間にしました"), "⑤ over its words, and said", await txt(p, '.m-cell[data-k="2"] .m-top'));
  await menuOf(p, 2); await p.waitForTimeout(300);
  ok((await p.evaluate(() => [...document.querySelectorAll("#mMenu button[role=menuitem]")].map((x) => x.textContent.replace(/\s/g, "")))).includes("見積もり時間（いま1時間）"), "⑤ in its menu with what it is");
  await p.mouse.click(5, 300); await p.waitForTimeout(200);
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  ok((await W(p, "path")).length === 0, "(back at the goal's own level)", await W(p, "path"));
  const est = (await txt(p, "#mEst")).replace(/\s/g, "");
  ok(est.includes("まだのマス1時間（1マス・見積もりなし6マス）") && est.includes("期限まで82日：1日あたり約1分"), "⑤ what is left, per day", est);

  // ② もし〜なら, ③ やらないこと
  await p.fill("#mIfs input >> nth=0", "疲れて帰ってきたら"); await p.fill("#mIfs input >> nth=1", "単語を5個だけやる");
  await p.locator("#mIfs button[type=submit]").click(); await p.waitForTimeout(500);
  let g = await goal(p, "g1");
  ok(g.ifs?.length === 1 && g.ifs[0].a === "疲れて帰ってきたら" && g.ifs[0].b === "単語を5個だけやる", "② kept", g.ifs);
  ok((await txt(p, "#mIfs")).includes("もし 疲れて帰ってきたら なら 単語を5個だけやる"), "② shown", await txt(p, "#mIfs"));
  await p.locator("#mIfs .six-list button", { hasText: "削除" }).click(); await p.waitForTimeout(400);
  ok(!(await goal(p, "g1")).ifs, "② deleted");
  await undo(p);
  ok((await goal(p, "g1")).ifs?.length === 1, "② 元に戻す");
  await p.fill("#mNots input", "寝る前にスマホを見ない"); await p.press("#mNots input", "Enter"); await p.waitForTimeout(500);
  ok((await goal(p, "g1")).nots?.[0]?.t === "寝る前にスマホを見ない" && (await txt(p, "#mNots")).includes("× 寝る前にスマホを見ない"), "③ kept and shown");

  // ④ やる気
  await p.click('#mMood .mood-face[aria-label^="やる気 4"]'); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).mood?.["2026-11-11"] === 4 && (await p.getAttribute('#mMood .mood-face[aria-label^="やる気 4"]', "aria-pressed")) === "true", "④ today's 4");
  ok((await txt(p, "#mMood")).includes("この7日の平均 4.0"), "④ its average", await txt(p, "#mMood"));
  await p.click('#mMood .mood-face[aria-label^="やる気 4"]'); await p.waitForTimeout(400);
  ok(!(await goal(p, "g1")).mood, "④ pressed again, taken off");

  // ⑥ 分類
  await p.locator("#mTag .chip-btn", { hasText: "学び" }).click(); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).tag === "study", "⑥ 学び");

  // ⑨ チャートの記録
  await p.click("#mSnapTake"); await p.waitForTimeout(500);
  g = await goal(p, "g1");
  const pc = await W(p, "pct", "g1");
  ok(g.snaps?.length === 1 && g.snaps[0].p === pc && g.snaps[0].e.length === 6 && g.snaps[0].e[0][0] === "単語", "⑨ kept, with its elements", g.snaps);
  ok((await txt(p, "#mSnaps")).includes(`${pc}% いまと同じ`), "⑨ against now", await txt(p, "#mSnaps"));
  await p.click("#mSnapTake"); await p.waitForTimeout(500);
  ok((await goal(p, "g1")).snaps.length === 1, "⑨ the day's taken again, not twice");
  await p.locator("#mSnaps .snap-row").first().click(); await p.waitForTimeout(300);
  ok((await txt(p, "#mSnaps .snap-els")).includes("単語"), "⑨ opened to its elements");
  await done(p);

  // ⑥ the row of kinds over the list, narrowing it
  ok((await txt(p, "#goalSixBar .goal-tag-row")) === "すべて 学び", "⑥ the kinds in use", await txt(p, "#goalSixBar .goal-tag-row"));
  ok(await p.evaluate(() => [...document.querySelectorAll(".goal")].find((x) => x.textContent.includes("TOEIC"))?.querySelector(".goal-tag")?.textContent === "学び"), "⑥ on its block");
  await p.locator("#goalSixBar .chip-btn", { hasText: "学び" }).click(); await p.waitForTimeout(400);
  ok(JSON.stringify(await titles(p)) === JSON.stringify(["TOEIC 800点"]), "⑥ narrowed to 学び", await titles(p));
  await p.locator("#goalSixBar .chip-btn", { hasText: "すべて" }).click(); await p.waitForTimeout(400);
  ok((await titles(p)).length > 1, "⑥ すべて again");

  // ① 中間目標: 部屋を片づける (1 of 3: 33%): 11/1 90% past, 11/20 60% to come; one added; one reached with a check
  await open(p, "部屋を片づける");
  let ms = await txt(p, "#mMs");
  ok(ms.includes("11月1日（日）までに 90%") && ms.includes("10 日過ぎています（いま 33%）") && ms.includes("あと 9 日・あと 27%"), "① each as it stands", ms);
  await p.fill("#mMs input[type=date]", "2026-12-15"); await p.selectOption("#mMs select", "100");
  await p.locator("#mMs button[type=submit]").click(); await p.waitForTimeout(500);
  g = await goal(p, "g3");
  ok(g.ms.length === 3 && g.ms[2].d === "2026-12-15" && g.ms[2].p === 100, "① added", g.ms);
  await p.locator('.m-cell[data-k="1"] [data-role="check"]').click(); await p.waitForTimeout(600);
  g = await goal(p, "g3");
  ok(num(g.ms.find((m) => m.id === "ms2").hit) > 0 && !g.ms.find((m) => m.id === "ms1").hit, "① 60% reached and marked; 90% not", g.ms);
  ok((await status(p)).includes("中間目標「11/20までに 60%」に届きました"), "① said", await status(p));
  ok((await txt(p, "#mMs")).includes("11/11に届きました"), "① shown as reached", await txt(p, "#mMs"));
  await done(p);

  ok(!p.errs.length, "no errors", p.errs);
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  await b.close();
})();
function num(v) { return typeof v === "number" ? v : Number(v) || 0; }
