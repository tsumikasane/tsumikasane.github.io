// 目標 その19 ①〜⑩, through the hook build at 8896 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8896/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const { all, settings, todos, events, journal } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const goal = async (p, id) => (await ls(p, "goals")).find((g) => g.id === id);
const status = (p) => p.evaluate(() => [document.getElementById("status").textContent, document.getElementById("sheetStatus").textContent].join("｜"));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__g19[f](...a), { f, a });
const block = (p, name) => p.locator(".goal-open").filter({ has: p.locator(".title", { hasText: name }) }).first();
const open = async (p, name) => { await block(p, name).click(); await p.waitForTimeout(900); };
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
const shown = (p, id) => p.evaluate((id) => { const x = document.getElementById(id); return !!x && !x.hidden && getComputedStyle(x).display !== "none"; }, id);
const menuOf = (p, k) => p.evaluate((k) => document.querySelector(`.m-cell[data-k="${k}"]`).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), k);
const tops = (p) => p.$$eval(".m-cell[data-k] .m-top", (xs) => xs.map((x) => x.innerText.replace(/\s+/g, " ").trim()));
const badge = (p) => p.evaluate(() => document.querySelector('#menu button[data-tab="goal"] .badge')?.textContent || "");
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-15T17:30:00+09:00"), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, { goals: all(), settings, todos, events, journal }, "goal"); await p.waitForTimeout(1000);
  await p.evaluate(() => { window.__shared = []; Object.defineProperty(navigator, "share", { configurable: true, value: async (d) => { window.__shared.push(d); } }); Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true }); });

  // ② 目標のタブの数: 模試2回目・毎日30語 past their 期限 (長文's plan to answer went with 予定のあとに聞く, 2026-11-20)
  ok((await badge(p)) === "2", "② the number over 目標's icon", await badge(p));
  // ① やる日: with きょうのマス (one today, one yesterday's), in 1週間のマス on its day
  ok((await txt(p, "#goalToday")) === "きょう（日曜日）のマス 2 マス 毎日30語 11/14にやる予定でした・TOEIC 800点 模試2回目 きょうやる・TOEIC 800点", "① the cells to do today (and one left from yesterday)", await txt(p, "#goalToday"));
  ok((await txt(p, '#goalWeek7 li[data-day="2026-11-17"]')) === "火曜日 11/17 本棚" && (await txt(p, '#goalWeek7 li[data-day="2026-11-15"]')) === "きょう 11/15 模試2回目", "① in 1週間のマス, on their days", await txt(p, "#goalWeek7"));
  // ⑤ ことしのまとめ
  ok((await txt(p, "#goalYearSum")) === "2026年のまとめ 11/15まで 達成した目標 2つ（5km走れるようになる・簿記3級に合格する） 進めたマス 27マス（進めた日 17日） 取り組んだ時間 3時間30分 いちばん進めた月 11月（16マス） いちばん長く続いた日数 7日 書いたふりかえり 2件 文字で送る 画像で保存", "⑤ this year so far", await txt(p, "#goalYearSum"));
  await p.click("#goalYearSend"); await p.waitForTimeout(300);
  await p.click("#goalYearImg"); await p.waitForTimeout(600);
  const sh = await p.evaluate(() => window.__shared.map((d) => [d.title, d.text?.split("\n").slice(0, 2), d.files?.[0]?.name]));
  ok(sh[0]?.[0] === "2026年の目標のまとめ" && sh[0][1][0] === "2026年の目標のまとめ（11/15まで）" && sh[0][1][1] === "・達成した目標 2つ（5km走れるようになる・簿記3級に合格する）" && sh[1]?.[2] === "tsumikasane-goals-2026.png", "⑤ sent as words, kept as a picture", sh);

  // ⑨ ③ ④ ⑧ (TOEIC)
  await open(p, "TOEIC 800点");
  ok((await txt(p, "#mEstFree")) === "この1週間の空き時間は 約86時間30分（カレンダーの予定とバイトのない時間）。 見積もりのある 1マス（2時間）は、この1週間に入りそうです。", "⑨ the week's free time, against the 見積もり", await txt(p, "#mEstFree"));
  ok((await txt(p, "#mElAhead")) === "単語 1/3 このペースなら 2027/1/14（木）ごろに終わります（期限 11/12 に間に合いません） 文法 3/3 終わりました 模試 1/3 この30日は進めていません（期限 11/9） リスニング 0/2 この30日は進めていません（目標の期限 1/31）", "④ each element's pace to its end", await txt(p, "#mElAhead"));
  ok((await txt(p, "#mMoodLink")) === "やる気が高い日（3日）は 1日 平均 1.7マス、低い日（4日）は 0.8マス進めています。 やる気が低い日も、小さな一歩や1マスだけ進めると、流れが切れにくくなります。", "⑧ やる気 beside the cells moved on", await txt(p, "#mMoodLink"));
  ok((await txt(p, "#mEstBulkRow")) === "見積もりのないマスにまとめて付ける（6）", "③ offered", await txt(p, "#mEstBulkRow"));
  await p.click("#mEstBulkOpen"); await p.waitForTimeout(300);
  const row = (name) => p.locator("#mEstBulk .g19-est li", { has: p.locator(".g19-est-name", { hasText: name }) });
  ok((await p.$$eval("#mEstBulk .g19-est li", (xs) => xs.length)) === 6 && (await txt(p, "#mEstBulk .one-head strong")) === "見積もりをまとめて付ける（0 / 6）", "③ the six with none");
  await row("単語帳2周").locator('[data-est="30"]').click(); await p.waitForTimeout(400);
  let g1 = await goal(p, "g1");
  ok(g1.mandala[0].c[1].est === 30 && (await row("単語帳2周").locator('[data-est="30"]').getAttribute("aria-pressed")) === "true" && (await p.evaluate(() => document.activeElement?.dataset?.est)) === "30", "③ 30分, at a press (still in the list, the press in focus)");
  await row("単語帳2周").locator('[data-est="30"]').click(); await p.waitForTimeout(400);
  ok(!(await goal(p, "g1")).mandala[0].c[1].est, "③ pressed again: taken off");
  await row("毎日30語").locator('[data-est="60"]').click(); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).mandala[0].c[2].est === 60 && (await txt(p, "#mEstBulk .one-head strong")) === "見積もりをまとめて付ける（1 / 6）", "③ 1 / 6");
  await p.click("#mEstBulkEnd"); await p.waitForTimeout(300);
  ok(!(await shown(p, "mEstBulk")) && (await txt(p, "#mEstBulkRow")) === "見積もりのないマスにまとめて付ける（5）" && (await txt(p, "#mEstFree .sub")) === "見積もりのある 2マス（3時間）は、この1週間に入りそうです。", "③ おわる; ⑨ counted again", await txt(p, "#mEstFree"));
  // ① やる日 from the menu: 長文, あした
  await menuOf(p, 4); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "やる日を決める" }).click(); await p.waitForTimeout(300);
  await p.locator('#mMenu [data-do="2026-11-16"]').click(); await p.waitForTimeout(500);
  ok((await goal(p, "g1")).mandala[4].doOn === "2026-11-16" && (await status(p)).includes("「長文」を 11月16日（月） にやります") && (await tops(p))[4].includes("11/16にやる"), "① a cell's day, from its menu", [await status(p), (await tops(p))[4]]);
  // ⑦ ビフォー・アフター: two photos, 12 days apart
  ok(!(await shown(p, "mBefore")), "⑦ not before there are two photos");
  await p.clock.setFixedTime(new Date("2026-11-03T12:00:00+09:00"));
  await W(p, "photo", "g1", [0, 0], "#c33"); await p.waitForTimeout(300);
  await p.clock.setFixedTime(new Date("2026-11-15T17:30:00+09:00"));
  await W(p, "photo", "g1", [4], "#33c"); await p.waitForTimeout(600);
  ok((await shown(p, "mBefore")) && JSON.stringify(await p.$$eval("#mBefore figcaption", (xs) => xs.map((x) => x.textContent))) === '["はじめ・11/3","いま・11/15"]' && (await txt(p, "#mBefore .sub")) === "12日のちがい・写真 2枚（押すと大きく）", "⑦ the first and latest, side by side", await txt(p, "#mBefore"));
  await p.locator("#mBefore figure").nth(1).click(); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.querySelectorAll("#mBefore figure")[1].classList.contains("big")), "⑦ pressed: larger");
  // ⑩ やる場所: 毎日15分 on the train
  await p.evaluate(() => document.getElementById("daySheet").scrollTo(0, 0));
  await p.click('.m-cell[data-k="3"] [data-role="open"]'); await p.waitForTimeout(500);
  await menuOf(p, 0); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "やる場所を決める" }).click(); await p.waitForTimeout(300);
  await p.locator('#mMenu [data-where="電車"]').click(); await p.waitForTimeout(500);
  ok((await goal(p, "g1")).mandala[3].c[0].where === "電車" && (await tops(p))[0].includes("電車") && (await status(p)).includes("「毎日15分」をやる場所を「電車」にしました"), "⑩ where a cell can be done", (await tops(p))[0]);
  await done(p);
  await p.locator('#goalGap [data-mins="15"]').click(); await p.waitForTimeout(300);
  const gapNames = () => p.$$eval("#goalGap .g16-all-name", (xs) => xs.map((x) => x.textContent));
  ok(JSON.stringify(await gapNames()) === '["本棚","クローゼット"]' && (await p.isVisible('#goalGap [data-where="電車"]')), "⑩ すきま時間, anywhere", await gapNames());
  await p.click('#goalGap [data-where="電車"]'); await p.waitForTimeout(300);
  ok(JSON.stringify(await gapNames()) === '["クローゼット"]' && (await p.getAttribute('#goalGap [data-where="電車"]', "aria-pressed")) === "true", "⑩ on the train: 本棚 (at home) left out", await gapNames());

  // ⑥ 達成の音, ② on and off
  await p.click("#goalSettings"); await p.waitForTimeout(600);
  ok((await W(p, "chimes")) === 0, "⑥ off at first");
  await p.click("#goalChimeOn"); await p.waitForTimeout(300);
  ok((await W(p, "chimes")) === 1 && (await p.evaluate((P) => localStorage.getItem(P + "goalChime"), P)) === "1", "⑥ on: heard once");
  await p.click("#goalBadgeOn"); await p.waitForTimeout(300);
  ok((await badge(p)) === "", "② off: no number");
  await p.click("#goalBadgeOn"); await p.waitForTimeout(300);
  ok((await badge(p)) === "2", "② on again");
  await done(p);
  // ① 模試2回目, done from きょうのマス: heard (⑥), off the list, the number down (②)
  await p.locator("#goalToday li", { hasText: "模試2回目" }).locator(".check").click(); await p.waitForTimeout(700);
  ok((await goal(p, "g1")).mandala[2].c[1].d === true && (await W(p, "chimes")) === 2 && !(await txt(p, "#goalToday")).includes("模試2回目") && (await badge(p)) === "1", "① done today: ⑥ heard, ② one less", [await W(p, "chimes"), await badge(p)]);

  ok(!p.errs.length, "no errors", p.errs);
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  await b.close();
})();
