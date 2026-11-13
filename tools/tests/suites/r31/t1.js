// 目標 その3 ①〜⑩, through the hook build at 8774 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8774/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const { T, all } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const goal = async (p, id) => (await ls(p, "goals")).find((g) => g.id === id);
const status = (p) => p.evaluate(() => [document.getElementById("status").textContent, document.getElementById("sheetStatus").textContent].join("｜"));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const hold = (p, sel, ms = 700) => p.evaluate(async ({ sel, ms }) => {
  const t = document.querySelector(sel), r = t.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const o = { pointerType: "touch", isPrimary: true, pointerId: 3, clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true };
  t.dispatchEvent(new PointerEvent("pointerdown", o)); await new Promise((f) => setTimeout(f, ms)); t.dispatchEvent(new PointerEvent("pointerup", o));
  t.dispatchEvent(new MouseEvent("click", { clientX: x, clientY: y, bubbles: true, cancelable: true, detail: 1 }));
}, { sel, ms });
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__g3[f](...a), { f, a });
const open = async (p, name) => { await p.locator(".goal-open", { hasText: name }).first().click(); await p.waitForTimeout(900); };
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-11T20:30:00+09:00"), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, { goals: all() }, "goal"); await p.waitForTimeout(1000);

  // ① 連続: TOEIC moved on 11/9, 11/10 and today
  const s1 = await W(p, "streak", "g1");
  ok(s1.cur === 3 && s1.today && s1.best === 3, "① TOEIC: 3 days in a row, today among them", s1);
  ok(await p.evaluate(() => [...document.querySelectorAll(".goal")].find((x) => x.textContent.includes("TOEIC"))?.querySelector(".goal-streak.on")?.textContent === "3日連続"), "① on its block: 3日連続");
  // ⑩ none over 進行中
  ok(await p.evaluate(() => document.getElementById("goalStats").hidden), "⑩ no record over 進行中");

  await open(p, "TOEIC");
  let pr = await txt(p, "#mProgress");
  ok(pr.includes("3日続けて進めています（いちばん長い記録です）"), "① in its progress", pr);
  // ② 見込み: the same as worked out; the 5 weeks' sums
  const fc = await W(p, "fc", "g1");
  ok(fc && fc.day && pr.includes(`このペースなら`) && pr.includes("ごろ達成"), "② the forecast said in its progress", [fc, pr]);
  const at = await W(p, "at", "g1", "2026-10-01");
  ok(Math.abs(at - (1 / 3 + 1) / 6) < 1e-9, "② progress at 10/1: 文法書 and 語彙アプリ (2 of 6 elements' worth)", at);
  const at2 = await W(p, "at", "g1", "2026-10-20");
  ok(Math.abs(at2 - ((50 / 300) / 3 + 2 / 3 + 1 / 3 + 1) / 6) < 1e-9, "② progress at 10/20: a count's days counted", at2);
  ok(await p.evaluate(() => !document.getElementById("mTrend").hidden && !!document.querySelector("#mTrend polyline.tr-line") && document.querySelectorAll("#mTrend .tr-key").length === 3), "② its chart: the line and three keys");
  const read0 = await txt(p, "#mTrend .m-trend-read");
  ok(read0.startsWith("このペースなら") && read0.includes("期限の"), "② said under it", read0);
  await p.evaluate(() => document.getElementById("mTrend").scrollIntoView({ block: "center" })); await p.waitForTimeout(200);
  const box = await p.locator("#mTrend svg").boundingBox();
  await p.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.5); await p.waitForTimeout(200);
  const read1 = await txt(p, "#mTrend .m-trend-read");
  ok(/^\d+月\d+日（.）：\d+%（理想のペースなら \d+%）$/.test(read1) && (await p.evaluate(() => document.querySelector("#mTrend .tr-mark").getAttribute("visibility"))) === null, "② a day pressed: its % and the even pace's", read1);
  // ③ the elements: リスニング first and stood out; pressed, it opens
  const bal = await p.evaluate(() => [...document.querySelectorAll("#mBalance .m-bal-row")].map((x) => x.querySelector(".m-bal-name").textContent + ":" + x.querySelector(".m-bal-pct").textContent + (x.classList.contains("low") ? "*" : "")));
  ok(bal.join("|") === "リスニング:0%*|長文:0%|模試:33%|単語:46%|文法:達成|語彙アプリ:達成", "③ by how far, the furthest behind first", bal);
  await p.click("#mBalance .m-bal-row.low"); await p.waitForTimeout(600);
  ok((await p.evaluate(() => document.getElementById("sheetTitle").textContent)) === "リスニング", "③ pressed: リスニング's 8マス");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  // ④ 期限を割り振る: 7 cells from 11/23 to the goal's 期限; put in, then taken back
  const plan = await W(p, "spread", "g1");
  ok(plan.length === 7 && plan[plan.length - 1][1] === "2027-01-31" && plan[0][1] > "2026-11-11", "④ seven cells, the last on the goal's 期限", plan);
  await p.evaluate(() => document.getElementById("mSpread").scrollIntoView({ block: "center" }));
  await p.click("#mSpread button"); await p.waitForTimeout(300);
  ok((await txt(p, "#mSpread")).includes("7 マスに、11/23から1/31まで期限を付けます"), "④ the plan shown first", await txt(p, "#mSpread"));
  await p.locator("#mSpread button", { hasText: "この案で割り振る" }).click(); await p.waitForTimeout(500);
  let g1 = await goal(p, "g1");
  ok(g1.mandala[0].c[1].due === plan[0][1] && g1.mandala[4].due && !g1.mandala[0].c[0].due, "④ put in (not on the done ones)", [g1.mandala[0].c[1].due, g1.mandala[4].due]);
  ok((await status(p)).includes("7 マスに期限を付けました"), "④ said", await status(p));
  await p.locator("#sheetStatus button").click(); await p.waitForTimeout(500);
  g1 = await goal(p, "g1");
  ok(!g1.mandala[0].c[1].due && !g1.mandala[4].due, "④ 元に戻す: taken off again");
  // ⑧ ごほうび: in its progress; 50% reached: said with the 紙ふぶき
  ok(pr.includes("ごほうび：50%で「ケーキを食べる」（あと 4%）・達成で「旅行に行く」"), "⑧ in its progress", pr);
  await p.evaluate(() => document.getElementById("daySheet").scrollTop = 0); await p.waitForTimeout(200);
  await p.click('.m-cell[data-k="2"] [data-role="open"]'); await p.waitForTimeout(500);
  await p.click('.m-cell[data-k="1"] [data-role="check"]'); await p.waitForTimeout(500);
  ok((await status(p)).includes("50% まで来ました") && (await status(p)).includes("50%のごほうびの時間です：ケーキを食べる"), "⑧ 50%: its ごほうび said", await status(p));
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  // ⑨ ふりかえりの型
  await p.evaluate(() => document.getElementById("mReflect").scrollIntoView({ block: "center" }));
  await p.click("#mReflectKpt"); await p.waitForTimeout(200);
  let ta = await p.evaluate(() => ({ v: document.getElementById("mReflect").value, at: document.getElementById("mReflect").selectionStart, add: document.getElementById("mReflectAdd").disabled }));
  ok(ta.v === "よかったこと：\nうまくいかなかったこと：\n次にやること：" && ta.at === "よかったこと：".length && !ta.add, "⑨ the three, the caret after よかったこと：", ta);
  await p.click("#mReflectWeek"); await p.waitForTimeout(200);
  ta = await p.evaluate(() => document.getElementById("mReflect").value);
  ok(ta.includes("【11/5〜11/11のまとめ】") && ta.includes("進めたマス：模試2回目") && /進み具合：5\d%（1週間前から \+\d+%）/.test(ta) && ta.includes("次の一歩："), "⑨ the week's summary added under it", ta);
  await p.click("#mReflectAdd"); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).notes?.[0]?.text.startsWith("よかったこと："), "⑨ written as ふりかえり");
  await done(p);

  // ⑤ 英語 stands for TOEIC: its %; pressed, TOEIC opens, and back
  await open(p, "社会人");
  const eng = await p.evaluate(() => document.querySelector('.m-cell[data-k="0"] .m-tools').textContent);
  const tpct = await W(p, "pct", "g1");
  ok(eng.includes(`${tpct}%`) && !!(await p.$('.m-cell[data-k="0"] .m-link-go')), "⑤ 英語: TOEIC's % with its mark", [eng, tpct]);
  await p.click('.m-cell[data-k="0"] .m-link-go'); await p.waitForTimeout(900);
  ok((await p.evaluate(() => document.getElementById("sheetTitle").textContent)) === "TOEIC 800点" && (await status(p)).includes("を開きました"), "⑤ pressed: TOEIC opens");
  // TOEIC can't be joined to 社会人 (it would lead back)
  await hold(p, '.m-cell[data-k="4"]'); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "ほかの目標とつなぐ" }).click(); await p.waitForTimeout(300);
  const opts = await p.evaluate(() => [...document.querySelectorAll("#mMenu .m-menu-goals button")].map((x) => x.querySelector(".m-menu-goal-name").textContent));
  ok(!opts.includes("社会人になるまでに") && !opts.includes("TOEIC 800点") && opts.includes("部屋を片づける"), "⑤ only goals that don't lead back", opts);
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  await p.locator("#sheetStatus button", { hasText: "もとの目標に戻る" }).click(); await p.waitForTimeout(900);
  ok((await p.evaluate(() => document.getElementById("sheetTitle").textContent)) === "社会人になるまでに", "⑤ もとの目標に戻る");
  // 体力 joined to 部屋を片づける
  await hold(p, '.m-cell[data-k="2"]'); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "ほかの目標とつなぐ" }).click(); await p.waitForTimeout(300);
  await p.locator("#mMenu .m-menu-goals button", { hasText: "部屋を片づける" }).click(); await p.waitForTimeout(500);
  ok((await goal(p, "g2")).mandala[2].g === "g3" && (await status(p)).includes("「体力」を「部屋を片づける」とつなぎました"), "⑤ joined", await status(p));
  await done(p);

  // ⑦ 部屋を片づける, past its 期限: the card; 1週間延ばす
  await open(p, "部屋");
  const od = await txt(p, "#mOverdue");
  ok(od.includes("期限の 11/5（木） を 6日過ぎています") && od.includes("1週間延ばす") && od.includes("達成にする"), "⑦ the card", od);
  await p.locator("#mOverdue button", { hasText: "1週間延ばす" }).click(); await p.waitForTimeout(500);
  let g3 = await goal(p, "g3");
  ok(g3.deadline === "2026-11-18" && g3.extends?.[0]?.from === "2026-11-05" && g3.extends[0].to === "2026-11-18", "⑦ put off a week, kept", g3.extends);
  ok(await p.evaluate(() => document.getElementById("mOverdue").hidden) && (await txt(p, "#mSteps")).includes("期限を 11/5 から 11/18 に延ばしました"), "⑦ the card gone; said in これまでの歩み");
  // ⑤ 部屋を片づける achieved: 社会人's 体力 done with it
  await p.click("#mAchieve"); await p.waitForTimeout(900);
  const g2 = await goal(p, "g2");
  ok((await goal(p, "g3")).done === true && Math.abs(0) === 0, "⑤ achieved");
  await done(p);
  await p.click('#goalFilters button[data-filter="active"]').catch(() => {}); await p.waitForTimeout(300);
  await open(p, "社会人");
  ok((await p.evaluate(() => document.querySelector('.m-cell[data-k="2"]').classList.contains("done") && document.querySelector('.m-cell[data-k="2"] .m-tools').textContent.includes("達成"))), "⑤ 体力 done with it");
  await done(p);

  // ⑤ a goal whose one element stands for another: achieved with it
  await p.evaluate(({ P }) => { const gs = JSON.parse(localStorage.getItem(P + "goals")); gs.push({ id: "g7", title: "親", criterion: "x", deadline: "2027-01-01", depth: 1, done: false, createdAt: Date.now(), mandala: [{ t: "子", g: "g8" }, null, null, null, null, null, null, null] }, { id: "g8", title: "子の目標", criterion: "x", deadline: "2027-01-01", depth: 1, done: false, createdAt: Date.now(), rewards: { done: "映画を見る" }, mandala: [{ t: "ひとつ" }, null, null, null, null, null, null, null] }); localStorage.setItem(P + "goals", JSON.stringify(gs)); }, { P });
  await p.reload(); await p.waitForTimeout(1000);
  await open(p, "子の目標");
  await p.click('.m-cell[data-k="0"] [data-role="check"]'); await p.waitForTimeout(1200);
  ok((await goal(p, "g8")).done && (await goal(p, "g7")).done, "⑤ the other achieved: this one achieved with it", [(await goal(p, "g8")).done, (await goal(p, "g7")).done]);
  ok((await status(p)).includes("「子の目標」を達成しました。ごほうびの時間です：映画を見る。「親」を達成しました"), "⑧⑤ its ごほうび said, and the one it stands in", await status(p));
  await done(p);

  // ⑩ the record over 達成
  await p.click('#goalFilters button[data-filter="done"]'); await p.waitForTimeout(500);
  const st = await txt(p, "#goalStats");
  ok(!(await p.evaluate(() => document.getElementById("goalStats").hidden)) && st.includes("目標の成績表") && st.includes("2026年") && st.includes("2025年 1個・平均 35日・期限内 0/1"), "⑩ the record, by the year", st);
  await p.fill("#goalFind", "簿記"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById("goalStats").hidden), "⑩ away while searching");
  await p.fill("#goalFind", ""); await p.click('#goalFilters button[data-filter="active"]'); await p.waitForTimeout(400);

  // ⑥ きょう's tile: the next step, checked there, with 元に戻す
  await p.goto(process.env.URL0 + "#home"); await p.reload(); await p.waitForTimeout(1200);
  const nx = (await W(p, "next"))[0];
  const tileName = await p.evaluate(() => document.querySelector('.tile[data-tile="goal"] .gl-tile .rt-label')?.textContent);
  ok(!!nx && tileName === nx[1], "⑥ the tile: the first next step", [tileName, nx]);
  await p.click('.tile[data-tile="goal"] .gl-tile .rt-row'); await p.waitForTimeout(600);
  const g = await goal(p, nx[0]);
  const find = (cells) => { for (const c of cells || []) { if (!c) continue; if (c.t === nx[1]) return c; const r = find(c.c); if (r) return r; } return null; };
  const c = find(g.mandala);
  ok(c && (c.d || num(c.v) > 0), "⑥ checked from the tile", c);
  ok((await status(p)).includes(nx[1]), "⑥ said", await status(p));
  await p.locator("#status button").click(); await p.waitForTimeout(500);
  const c2 = find((await goal(p, nx[0])).mandala);
  ok(c2 && !c2.d, "⑥ 元に戻す", c2);
  ok(p.errs.length === 0, "no errors on the page", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
function num(v) { return typeof v === "number" ? v : Number(v) || 0; }
