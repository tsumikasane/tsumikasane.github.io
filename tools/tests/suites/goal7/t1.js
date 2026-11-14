// 目標 その7 ①〜⑩, through the hook build at 8837 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8837/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const { all, settings } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const goal = async (p, id) => (await ls(p, "goals")).find((g) => g.id === id);
const status = (p) => p.evaluate(() => [document.getElementById("status").textContent, document.getElementById("sheetStatus").textContent].join("｜"));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__g7[f](...a), { f, a });
const open = async (p, name) => { await p.locator(".goal-open", { hasText: name }).first().click(); await p.waitForTimeout(900); };
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
const menuOf = (p, k) => p.evaluate((k) => document.querySelector(`.m-cell[data-k="${k}"]`).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), k);
const item = (p, words) => p.locator("#mMenu button", { hasText: words }).first().click().then(() => p.waitForTimeout(400));
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-11T20:30:00+09:00"), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, { goals: all(), settings }, "goal"); await p.waitForTimeout(1000);

  // ⑧ これから: its own section, its day on the block, no pace, no 次の一歩, a notification that morning
  const heads = await p.evaluate(() => [...document.querySelectorAll("#goalList .goal-head span:first-child")].map((x) => x.textContent));
  ok(heads.join() === "進行中,これから", "⑧ これから after 進行中", heads);
  ok(await p.evaluate(() => { const x = [...document.querySelectorAll(".goal")].find((x) => x.textContent.includes("ハーフマラソン")); return x.querySelector(".goal-start")?.textContent === "12/1から（あと 20 日）" && !x.querySelector(".goal-pace"); }), "⑧ its day, and no pace");
  ok(!(await W(p, "next")).includes("走る"), "⑧ no 次の一歩 from it", await W(p, "next"));
  const st = (await W(p, "alarms", await p.evaluate(() => Date.now()))) /* (the page's clock, not the real one) */.find((a) => a.tag === "goal-start:g7:2026-12-01");
  ok(st && new Date(st.at).toISOString() === "2026-12-01T00:00:00.000Z" && st.url === "./#goal:g7" && st.body.startsWith("きょうから始める目標です。"), "⑧ 9:00 on 12/1", st);

  // ③ あとで out of 次の一歩; ⑦ シャドーイング (1) before 毎日15分 (2)
  const lv = await W(p, "leaves", "g1");
  ok(!lv.includes("模試3回目"), "③ あとで left out", lv);
  ok(lv.indexOf("シャドーイング") >= 0 && (lv.indexOf("毎日15分") < 0 || lv.indexOf("シャドーイング") < lv.indexOf("毎日15分")), "⑦ in its 順番", lv);
  ok((await W(p, "next")).includes("シャドーイング") && !(await W(p, "next")).includes("毎日15分"), "⑦ the element's next is its first", await W(p, "next"));

  // ④ 期限が近いマス
  ok((await txt(p, "#goalDue")) === "期限が近いマス 2 マス 2日過ぎ 模試2回目 TOEIC 800点 あした 毎日30語 TOEIC 800点", "④ soonest first", await txt(p, "#goalDue"));
  // ① 期限の見通し
  ok((await p.$$eval("#goalLine .gl-row", (x) => x.length)) === 4 && (await p.evaluate(() => [...document.querySelectorAll(".gl-row")].find((x) => x.textContent.includes("ハーフ"))?.querySelector(".gl-bar.later"))), "① a bar a goal; the one to start, faded");
  // ⑨ ポイント: 1 a cell done, 10 a goal achieved
  const earned = await W(p, "earned");
  ok(earned > 10 && (await txt(p, "#goalPoints .gp-now")) === `使えるのは ${earned}pt`, "⑨ the points", earned);
  ok(await p.evaluate(() => [...document.querySelectorAll("#goalPoints .gp-list li")].find((x) => x.textContent.includes("シューズ")).querySelector(".btn").disabled) === (earned < 50), "⑨ one it can't buy, greyed");
  await p.locator("#goalPoints .gp-list li", { hasText: "ケーキ" }).locator(".btn").click(); await p.waitForTimeout(500);
  let s = (await ls(p, "settings")).find((x) => x.id === "goalPoints");
  ok(s.log.length === 1 && s.log[0].cost === 10 && (await txt(p, "#goalPoints .gp-now")) === `使えるのは ${earned - 10}pt` && (await status(p)).includes("「ケーキを食べる」と交換しました（−10pt）"), "⑨ 交換", s.log);
  await p.locator("#status button").click(); await p.waitForTimeout(400);
  ok(!(await ls(p, "settings")).find((x) => x.id === "goalPoints").log.length, "⑨ 元に戻す");
  await p.fill("#goalPoints input", "映画を見る"); await p.selectOption("#goalPoints select", "30"); await p.press("#goalPoints input", "Enter"); await p.waitForTimeout(500);
  ok((await ls(p, "settings")).find((x) => x.id === "goalPoints").rewards.some((r) => r.name === "映画を見る" && r.cost === 30), "⑨ a reward added");
  // ⑩ コンパクト
  await p.selectOption("#goalListView", "compact"); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById("goalList").classList.contains("compact") && localStorage.getItem("tsumikasane:goalView") === "compact"), "⑩ compact, kept on this device");
  const hs = await p.evaluate(() => [...document.querySelectorAll("#goalList .goal")].slice(0, 2).map((x) => x.getBoundingClientRect()));
  ok(hs[0].width > 300 && hs[1].top > hs[0].bottom - 1, "⑩ a row a goal", hs);
  await p.selectOption("#goalListView", ""); await p.waitForTimeout(300);

  // ② いまやる: checked on the page
  ok((await txt(p, "#goalNow")).startsWith("いまやる 1 / 5 毎日15分"), "② over the page", await txt(p, "#goalNow"));
  await p.locator("#goalNow .check").click(); await p.waitForTimeout(500);
  ok((await goal(p, "g1")).mandala[3].c[0].d === true && (await p.evaluate(() => document.getElementById("goalNow").hidden)), "② checked there; gone from it");
  await p.locator("#status button").click(); await p.waitForTimeout(400);
  ok(!(await goal(p, "g1")).mandala[3].c[0].d, "② 元に戻す");

  // in the chart: 長押し's いまやる, あとで, 順番
  await open(p, "TOEIC");
  ok((await txt(p, "#mWhen")).startsWith("よく進めるのは"), "⑥ the days and times", await txt(p, "#mWhen"));
  ok(await p.evaluate(() => document.getElementById("mPhotos").hidden && document.getElementById("mPhotosHead").hidden), "⑤ no photos, no card");
  await p.click('.m-cell[data-k="0"] [data-role="open"]'); await p.waitForTimeout(500);
  await menuOf(p, 2); await p.waitForTimeout(300);
  await item(p, "いまやるに入れる");
  ok(num((await goal(p, "g1")).mandala[0].c[2].now) > 0 && (await txt(p, '.m-cell[data-k="2"] .m-top')).includes("いま"), "② put in from the menu");
  await menuOf(p, 2); await p.waitForTimeout(300);
  await item(p, "あとでにする");
  let c = (await goal(p, "g1")).mandala[0].c[2];
  ok(c.later === true && !c.now && (await p.evaluate(() => document.querySelector('.m-cell[data-k="2"]').classList.contains("later"))), "③ あとで (and out of いまやる)", c);
  await menuOf(p, 2); await p.waitForTimeout(300);
  await item(p, "順番をつける");
  await p.locator("#mMenu .chip-btn", { hasText: /^3$/ }).click(); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).mandala[0].c[2].ord === 3 && (await txt(p, '.m-cell[data-k="2"] .m-ord')) === "3", "⑦ 3番");
  await p.locator("#sheetStatus button").click(); await p.waitForTimeout(400);
  ok(!(await goal(p, "g1")).mandala[0].c[2].ord, "⑦ 元に戻す");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  // ⑧ 始める日 from the sheet
  await p.fill("#mStartDay", "2026-11-20"); await p.dispatchEvent("#mStartDay", "change"); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).startOn === "2026-11-20" && (await txt(p, "#mStartFoot")).startsWith("あと 9 日で始まります"), "⑧ set in the sheet", await txt(p, "#mStartFoot"));
  await p.click("#mStartClear"); await p.waitForTimeout(400);
  ok(!(await goal(p, "g1")).startOn, "⑧ はずす");
  await done(p);

  ok(!p.errs.length, "no errors", p.errs);
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  await b.close();
})();
function num(v) { return typeof v === "number" ? v : Number(v) || 0; }
