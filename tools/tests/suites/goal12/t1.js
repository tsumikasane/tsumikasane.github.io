// 目標 その12 ①〜⑩, through the hook build at 8832 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8832/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const { all, settings, todos, events } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const goal = async (p, id) => (await ls(p, "goals")).find((g) => g.id === id);
const status = (p) => p.evaluate(() => [document.getElementById("status").textContent, document.getElementById("sheetStatus").textContent].join("｜"));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__g12[f](...a), { f, a });
const block = (p, name) => p.locator(".goal-open").filter({ has: p.locator(".title", { hasText: name }) }).first(); // (by its name: a block can say another goal's too)
const open = async (p, name) => { await block(p, name).click(); await p.waitForTimeout(900); };
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
const shown = (p, id) => p.evaluate((id) => { const x = document.getElementById(id); return !!x && !x.hidden && getComputedStyle(x).display !== "none"; }, id);
const sheetOpen = (p) => p.evaluate(() => document.getElementById("daySheet").open);
const undo = async (p) => { await p.locator((await sheetOpen(p)) ? "#sheetStatus button" : "#status button").first().click(); await p.waitForTimeout(600); };
const menuOf = (p, k) => p.evaluate((k) => document.querySelector(`.m-cell[data-k="${k}"]`).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), k);
const titles = (g) => g.mandala.map((c) => c?.t || null);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-14T20:30:00+09:00"), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, { goals: all(), settings, todos, events }, "goal"); await p.waitForTimeout(1000);

  // ③ 時間の経過, on the blocks: TOEIC from 9/1 to 1/31, 74 of 152 days; none on one not yet begun (12/1) or achieved
  const el = (name) => p.evaluate((name) => [...document.querySelectorAll(".goal")].find((x) => x.querySelector(".title")?.textContent.includes(name))?.querySelector(".goal-elapsed")?.textContent ?? null, name);
  ok((await el("TOEIC")) === "時間49%" && (await el("部屋を片づける")) === "時間35%" && (await el("ハーフマラソン")) === null, "③ the time gone by, on the blocks", [await el("TOEIC"), await el("部屋を片づける"), await el("ハーフマラソン")]);
  // ⑧ ポイントの内訳
  await p.click("#goalPointsBreak"); await p.waitForTimeout(400);
  const rows = await p.$$eval("#goalPoints .gp-break-list li", (xs) => xs.map((x) => x.innerText.replace(/\s+/g, " ").trim()));
  const earned = Number((await txt(p, "#goalPoints .goal-head")).match(/これまで (\d+)pt/)?.[1]);
  const sum = rows.reduce((s, r) => s + Number(r.match(/(\d+)pt$/)?.[1] || 0), 0);
  ok(rows[0] === "簿記3級に合格する マス 2・達成 10 12pt" && rows.some((r) => r === "TOEIC 800点 マス 6 6pt") && sum === earned && !rows.some((r) => r.includes("ハーフマラソン")), "⑧ the points goal by goal, adding up", { rows, earned });
  ok((await p.getAttribute("#goalPointsBreak", "aria-expanded")) === "true" && (await p.evaluate(() => document.activeElement?.id)) === "goalPointsBreak", "⑧ open, the button kept in focus");
  await p.click("#goalPointsBreak"); await p.waitForTimeout(300);
  ok(!(await p.$("#goalPoints .gp-break-list")), "⑧ closed again");

  // ④ まとめて選ぶ: 保留にする for two, with 元に戻す
  await p.click("#goalPickStart"); await p.waitForTimeout(400);
  ok((await txt(p, "#goalPickBar .gpk-head strong")) === "目標を押して選んでください", "④ picking");
  await block(p, "TOEIC").click(); await p.waitForTimeout(300);
  await block(p, "部屋を片づける").click(); await p.waitForTimeout(300);
  ok(!(await sheetOpen(p)) && (await txt(p, "#goalPickBar .gpk-head strong")) === "2件を選んでいます" && (await p.$$eval(".goal.picked", (x) => x.length)) === 2, "④ a press picks it, no chart opens", await txt(p, "#goalPickBar"));
  await block(p, "部屋を片づける").click(); await p.waitForTimeout(300);
  await block(p, "部屋を片づける").click(); await p.waitForTimeout(300);
  ok((await txt(p, "#goalPickBar .gpk-head strong")) === "2件を選んでいます", "④ pressed again: let go, and picked again");
  await p.locator("#goalPickBar .chip-btn", { hasText: "保留にする" }).click(); await p.waitForTimeout(600);
  let g1 = await goal(p, "g1"), g3 = await goal(p, "g3");
  ok(g1.pausedAt > 0 && g3.pausedAt > 0 && (await status(p)).includes("2件を保留にしました") && !(await p.$("#goalPickEnd")), "④ both on hold, picking over", await status(p));
  await undo(p);
  g1 = await goal(p, "g1"); g3 = await goal(p, "g3");
  ok(!g1.pausedAt && !g3.pausedAt, "④ 元に戻す");
  // 分類 for one
  await p.click("#goalPickStart"); await p.waitForTimeout(300);
  await block(p, "社会人になるまでに").click(); await p.waitForTimeout(300);
  await p.selectOption("#goalPickBar .gpk-tag", "study"); await p.waitForTimeout(600);
  ok((await goal(p, "g2")).tag === "study" && (await status(p)).includes("1件の分類を「学び」にしました"), "④ 分類 at once", await status(p));
  // 削除 for one, with 元に戻す
  await p.click("#goalPickStart"); await p.waitForTimeout(300);
  await block(p, "ハーフマラソン").click(); await p.waitForTimeout(300);
  await p.locator("#goalPickBar .chip-btn", { hasText: "削除" }).click(); await p.waitForTimeout(600);
  ok(!(await goal(p, "g7")) && !!(await goal(p, "g3")) && (await status(p)).includes("目標を削除しました"), "④ 削除", await status(p));
  await undo(p);
  ok(!!(await goal(p, "g7")), "④ 削除 undone");
  // おわる
  await p.click("#goalPickStart"); await p.waitForTimeout(300);
  await p.click("#goalPickEnd"); await p.waitForTimeout(300);
  ok(!(await p.$("#goalList.picking")) && !!(await p.$("#goalPickStart")), "④ おわる");

  // ⑩ 達成したマスをうすく: on, this device's
  await p.click("#goalSettings"); await p.waitForTimeout(600);
  await p.click("#goalDim"); await p.waitForTimeout(300);
  ok((await p.evaluate(() => localStorage.getItem("tsumikasane:goalDimDone"))) === "on", "⑩ on, this device's");
  await done(p);

  await open(p, "TOEIC");
  const op = (k) => p.evaluate((k) => Number(getComputedStyle(document.querySelector(`.m-cell[data-k="${k}"]`)).opacity), k);
  ok((await p.evaluate(() => document.getElementById("mGrid").classList.contains("dimdone"))) && (await op(1)) < 0.5 && (await op(0)) === 1, "⑩ 文法 (done) faded, 単語 not", [await op(1), await op(0)]);
  // ⑥ the bars of the cells with cells inside
  const bars = await p.evaluate(() => [0, 1, 2, 3, 4, 5].map((k) => document.querySelector(`.m-cell[data-k="${k}"] .m-pbar i`)?.style.width ?? null));
  ok(bars[1] === "100%" && bars[0] && bars[0] !== "0%" && bars[2] && bars[3] && bars[4] === null && bars[5] === null, "⑥ bars on 単語・文法・模試・リスニング only", bars);
  // ⑨ the memo's link
  await p.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  await p.click('.m-cell[data-k="4"] .m-url-btn'); await p.waitForTimeout(300);
  ok(JSON.stringify(await p.evaluate(() => window.__opened)) === '["https://example.com/toeic"]' && (await W(p, "path")).length === 0 && !(await p.evaluate(() => document.activeElement?.tagName === "TEXTAREA")), "⑨ opened at once, the cell not written in", await p.evaluate(() => window.__opened));
  ok(!(await p.$('.m-cell[data-k="0"] .m-url-btn')), "⑨ none without a link");
  // ⑤ 並べ直す: まだのマスを前に, with 元に戻す
  await p.click("#mSortOpen"); await p.waitForTimeout(300);
  await p.click('#mSortRow [data-sort="todo"]'); await p.waitForTimeout(600);
  g1 = await goal(p, "g1");
  ok(JSON.stringify(titles(g1)) === JSON.stringify(["単語", "模試", "リスニング", "長文", "文法", "語彙アプリ", null, null]) && (await status(p)).includes("要素を並べ直しました（まだのマスを前に）"), "⑤ those still to do first", [titles(g1), await status(p)]);
  ok(g1.mandala[4].c?.length === 8 && g1.mandala[4].c[2].t === "苦手まとめ" && g1.mandala[3].m === "教材はここ https://example.com/toeic を見る", "⑤ each with what is inside it", g1.mandala[4]);
  await undo(p);
  g1 = await goal(p, "g1");
  ok(JSON.stringify(titles(g1)) === JSON.stringify(["単語", "文法", "模試", "リスニング", "長文", "語彙アプリ", null, null]), "⑤ 元に戻す", titles(g1));
  // ⑦ ほかの目標へ複製: 模試 into 部屋を片づける
  await menuOf(p, 2); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "ほかの目標へ複製" }).click(); await p.waitForTimeout(300);
  const items = await p.$$eval("#mMenu button", (xs) => xs.map((x) => x.textContent));
  ok((await txt(p, "#mMenu .m-menu-head")) === "「模試」をどの目標に？" && items.includes("部屋を片づける") && !items.some((x) => x.includes("TOEIC") || x.includes("簿記")), "⑦ the other goals under way", items);
  await p.locator("#mMenu button", { hasText: "部屋を片づける" }).click(); await p.waitForTimeout(600);
  g3 = await goal(p, "g3");
  ok(g3.mandala[3]?.t === "模試" && g3.mandala[3].c?.[0]?.t === "模試1回目" && !g3.mandala[3].c[0].d && !g3.mandala[3].c[1].due && (await status(p)).includes("「模試」を「部屋を片づける」に複製しました（中のマスごと）"), "⑦ copied, unchecked, with what is inside", g3.mandala[3]);
  await undo(p);
  ok(!(await goal(p, "g3")).mandala[3], "⑦ 元に戻す");

  // ③ in the progress under the chart
  ok((await txt(p, "#mProgress .m-prow.elapsed")) === "時間 49%" && (await txt(p, "#mProgress .m-elapsed-say")).startsWith("期限までの日数のうち 49% が過ぎて、マスは "), "③ in its progress", await txt(p, "#mProgress"));
  // ② 期限をまとめて動かす: 毎日30語 (11/12) and 模試2回目 (11/9), past
  ok((await shown(p, "mShift")) && (await txt(p, "#mShift")).startsWith("期限が過ぎたマス 2つ を"), "② the cells past their 期限", await txt(p, "#mShift"));
  await p.locator("#mShift .chip-btn", { hasText: "あしたに" }).click(); await p.waitForTimeout(600);
  g1 = await goal(p, "g1");
  ok(g1.mandala[0].c[2].due === "2026-11-15" && g1.mandala[2].c[1].due === "2026-11-15" && (await status(p)).includes("期限が過ぎた 2マスの期限を 11/15 にしました"), "② both to tomorrow", [g1.mandala[0].c[2], g1.mandala[2].c[1]]);
  ok(!(await txt(p, "#mShift")).includes("期限が過ぎた"), "② none past now");
  await undo(p);
  g1 = await goal(p, "g1");
  ok(g1.mandala[0].c[2].due === "2026-11-12" && g1.mandala[2].c[1].due === "2026-11-09", "② 元に戻す");
  await p.locator("#mShift .chip-btn", { hasText: "1週間うしろへ" }).click(); await p.waitForTimeout(600);
  g1 = await goal(p, "g1");
  ok(g1.mandala[0].c[2].due === "2026-11-19" && g1.mandala[2].c[1].due === "2026-11-16" && (await status(p)).includes("2マスの期限を1週間うしろへずらしました"), "② all a week on", await status(p));

  // ① ふりかえりを書きなおす
  await p.locator("#mReflectList li .link-btn", { hasText: "書きなおす" }).click(); await p.waitForTimeout(300);
  ok((await p.inputValue("#mNoteEditText")) === "単語を毎日続けられた" && (await p.evaluate(() => document.activeElement?.id)) === "mNoteEditText", "① written over in its place");
  await p.fill("#mNoteEditText", "単語を毎日続けられた。次は文法も");
  await W(p, "render"); await p.waitForTimeout(300);
  ok((await p.inputValue("#mNoteEditText")) === "単語を毎日続けられた。次は文法も" && (await p.evaluate(() => document.activeElement?.id)) === "mNoteEditText", "① drawn again meanwhile: left as it is");
  await p.click("#mNoteEditSave"); await p.waitForTimeout(600);
  g1 = await goal(p, "g1");
  ok(g1.notes[0].text === "単語を毎日続けられた。次は文法も" && g1.notes[0].editedAt > 0 && g1.notes[0].at === 1794312000000 && (await txt(p, "#mReflectList li")).includes("（11/14 書きなおし）"), "① saved, its day kept", [g1.notes[0], await txt(p, "#mReflectList li")]);
  await undo(p);
  g1 = await goal(p, "g1");
  ok(g1.notes[0].text === "単語を毎日続けられた" && !g1.notes[0].editedAt, "① 元に戻す", g1.notes[0]);
  await p.locator("#mReflectList li .link-btn", { hasText: "書きなおす" }).click(); await p.waitForTimeout(300);
  await p.click("#mNoteEditCancel"); await p.waitForTimeout(300);
  ok(!(await p.$("#mNoteEditText")) && (await goal(p, "g1")).notes[0].text === "単語を毎日続けられた", "① やめる");
  await done(p);

  ok(!p.errs.length, "no errors", p.errs);
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  await b.close();
})();
