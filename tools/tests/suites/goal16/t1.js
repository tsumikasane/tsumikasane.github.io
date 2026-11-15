// 目標 その16 ①〜⑩, through the hook build at 8898 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8898/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const { all, settings, todos, events, journal } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const goal = async (p, id) => (await ls(p, "goals")).find((g) => g.id === id);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const status = (p) => p.evaluate(() => [document.getElementById("status").textContent, document.getElementById("sheetStatus").textContent].join("｜"));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__g16[f](...a), { f, a });
const block = (p, name) => p.locator(".goal-open").filter({ has: p.locator(".title", { hasText: name }) }).first();
const open = async (p, name) => { await block(p, name).click(); await p.waitForTimeout(900); };
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
const shown = (p, id) => p.evaluate((id) => { const x = document.getElementById(id); return !!x && !x.hidden && getComputedStyle(x).display !== "none"; }, id);
const sheetOpen = (p) => p.evaluate(() => document.getElementById("daySheet").open);
const undo = async (p) => { await p.locator((await sheetOpen(p)) ? "#sheetStatus button" : "#status button").first().click(); await p.waitForTimeout(600); };
const menuOf = (p, k) => p.evaluate((k) => document.querySelector(`.m-cell[data-k="${k}"]`).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), k);
const tags = async (p) => W(p, "alarms", await p.evaluate(() => Date.now()));
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-15T20:30:00+09:00"), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, { goals: all(), settings, todos, events, journal }, "goal"); await p.waitForTimeout(1000);

  // ⑧ きょうのめやす
  const pace = await txt(p, "#goalDayPace");
  ok(pace.startsWith("きょうのめやす 0 / 1マス 進行中の 3つの目標を期限までに終えるには、1日に 0.1マスほど（いちばんは「TOEIC 800点」）。"), "⑧ the day's measure", pace);
  // ① まだのマス（すべて）
  ok((await txt(p, "#goalAllLeft .goal-head")) === "まだのマス（すべて） 13 マス" && (await txt(p, "#goalAllOpen")) === "ぜんぶ見る（13マス・期限の順）", "① offered", await txt(p, "#goalAllLeft"));
  await p.click("#goalAllOpen"); await p.waitForTimeout(300);
  const heads = await p.$$eval("#goalAllList h4", (xs) => xs.map((x) => x.textContent));
  const first = await p.$$eval("#goalAllList .g16-all-name", (xs) => xs.slice(0, 2).map((x) => x.textContent));
  ok(JSON.stringify(heads) === '["期限切れ（2）","期限なし（11）"]' && JSON.stringify(first) === '["模試2回目","毎日30語"]', "① every cell still to do, by when it falls due", [heads, first]);
  await p.fill("#goalAllFind", "部屋"); await p.waitForTimeout(200);
  ok(JSON.stringify(await p.$$eval("#goalAllList .g16-all-name", (xs) => xs.map((x) => x.textContent))) === '["クローゼット","本棚"]' && (await p.evaluate(() => document.activeElement?.id)) === "goalAllFind", "① narrowed by words");
  await p.locator("#goalAllList .g16-all-row", { hasText: "本棚" }).click(); await p.waitForTimeout(900);
  ok((await W(p, "open")) === "g3" && (await sheetOpen(p)), "① pressed: its cell");
  await done(p);
  // ⑩ 分類ごとのバランス
  const kinds = await p.$$eval("#goalKinds li", (xs) => xs.map((x) => x.innerText.replace(/\s+/g, " ").trim()));
  ok(kinds.length === 2 && kinds[0] === "学び 1マス 進行中 1・達成 0" && /^分類なし \d+マス 進行中 4・達成 3$/.test(kinds[1]), "⑩ the goals by kind", kinds);
  // ② ミニチャート
  await p.selectOption("#goalListView", "mini"); await p.waitForTimeout(500);
  const mini = await p.evaluate(() => [...document.querySelectorAll(".goal")].map((x) => [x.querySelector(".title")?.textContent, x.querySelectorAll(".g16-sq").length, x.querySelectorAll(".g16-sq.on").length]));
  const toeic = mini.find((x) => x[0] === "TOEIC 800点"), room = mini.find((x) => x[0] === "部屋を片づける");
  ok(toeic?.[1] === 81 && toeic[2] >= 6 && room?.[1] === 9 && room[2] === 1 && (await p.evaluate(() => localStorage.getItem("tsumikasane:goalView"))) === "mini", "② the blocks as small charts", [toeic, room]);
  await p.selectOption("#goalListView", ""); await p.waitForTimeout(400);
  ok(!(await p.$(".g16-mini")), "② back to ブロック");

  // ④ ノルマのお知らせ
  await p.click("#goalSettings"); await p.waitForTimeout(600);
  await p.click("#goalQaOn"); await p.waitForTimeout(400);
  let al = (await tags(p)).filter((a) => a.tag.startsWith("goal-quota:"));
  ok((await setting(p, "goalQuotaAlarm"))?.on === true && al[0]?.tag === "goal-quota:2026-11-21" && al[0].body === "TOEIC 800点 あと3マス" && new Date(al[0].at).toISOString() === "2026-11-21T10:00:00.000Z" && al[1]?.body === "TOEIC 800点 3マス", "④ the week's last day, what is left", al.slice(0, 2));
  await done(p);

  await open(p, "TOEIC 800点");
  // ⑥ まだのマスを印刷
  await p.evaluate(() => { window.print = () => { const x = document.getElementById("goalPrint"); window.__printed = [x?.className, x?.querySelectorAll("li").length, x?.querySelector("h1")?.textContent, [...(x?.querySelectorAll("h2") || [])].map((h) => h.textContent)]; }; });
  await p.click("#mPrintTodo"); await p.waitForTimeout(300);
  const pr = await p.evaluate(() => window.__printed);
  ok(pr?.[0] === "g16-todo" && pr[1] === 7 && pr[2] === "TOEIC 800点：まだのマス（7）" && JSON.stringify(pr[3]) === '["単語","模試","リスニング","まわりのマス"]', "⑥ the cells still to do, on paper", pr);
  // ⑦ アイデア: one around the goal, one inside リスニング
  await p.fill("#mIdeaText", "過去問を時間をはかって解く"); await p.press("#mIdeaText", "Enter"); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).ideas?.[0]?.t === "過去問を時間をはかって解く" && (await p.inputValue("#mIdeaText")) === "" && (await p.evaluate(() => document.activeElement?.id)) === "mIdeaText", "⑦ kept, the field ready for the next");
  await p.selectOption("#mIdeas .g16-idea-to", ""); await p.waitForTimeout(600);
  let g1 = await goal(p, "g1");
  ok(g1.mandala[6]?.t === "過去問を時間をはかって解く" && !g1.ideas && (await status(p)).includes("をマスにしました"), "⑦ a cell around the goal", [g1.mandala[6], g1.ideas]);
  await undo(p);
  g1 = await goal(p, "g1");
  ok(!g1.mandala[6] && g1.ideas?.length === 1, "⑦ 元に戻す", [g1.mandala[6], g1.ideas]);
  await p.selectOption("#mIdeas .g16-idea-to", "3"); await p.waitForTimeout(600);
  g1 = await goal(p, "g1");
  ok(g1.mandala[3].c[2]?.t === "過去問を時間をはかって解く" && !g1.ideas, "⑦ inside リスニング", g1.mandala[3].c);
  // ⑤ 毎週の予定に入れる: 単語帳2周 (月水金)
  await p.click('.m-cell[data-k="0"] [data-role="open"]'); await p.waitForTimeout(500);
  await menuOf(p, 1); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "毎週の予定に入れる（月水金）" }).click(); await p.waitForTimeout(300);
  await p.locator("#mMenu .chip-btn", { hasText: "19:00" }).click(); await p.waitForTimeout(700);
  let es = await ls(p, "events"), e = es.find((x) => x.title === "単語帳2周");
  g1 = await goal(p, "g1");
  ok(e?.date === "2026-11-16" && e.time === "19:00" && e.endTime === "20:00" && e.repeat === "weekly" && JSON.stringify(e.repeatDays) === "[1,3,5]" && g1.mandala[0].c[1].ev?.includes(e.id) && (await status(p)).includes("「単語帳2周」を毎週月水金曜日 19:00 の予定に入れました"), "⑤ a plan each week on its days", [e, await status(p)]);
  await undo(p);
  ok(!(await ls(p, "events")).some((x) => x.title === "単語帳2周"), "⑤ 元に戻す");
  // ⑨ 数えるマスの30日
  await menuOf(p, 1); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "メモを見る・書く" }).click(); await p.waitForTimeout(400);
  ok((await shown(p, "mNoteCnt")) && (await p.$$eval("#mNoteCnt .g16-bars i", (x) => x.length)) === 30 && (await txt(p, "#mNoteCnt .sub")) === "4日・計 135ページ・やった日の平均 33.8ページ", "⑨ a counted cell's last 30 days", await txt(p, "#mNoteCnt"));
  await p.click("#mNoteClose"); await p.waitForTimeout(300);
  await done(p);

  // ③ 期間を決めて保留: 部屋を片づける for a week
  await open(p, "部屋を片づける");
  await p.click('#mPauseFor [data-days="7"]'); await p.waitForTimeout(600);
  let g3 = await goal(p, "g3");
  ok(g3.pausedAt > 0 && g3.pauseFor === g3.pausedAt && g3.resumeOn === "2026-11-22" && (await status(p)).includes("「部屋を片づける」を 11月22日（日）まで保留にしました") && (await txt(p, "#mPauseFor")) === "11月22日（日）に、ひとりでに再開します。", "③ on hold for a week", [g3.resumeOn, await status(p)]);
  await done(p);
  ok((await p.locator(".goal", { has: p.locator(".title", { hasText: "部屋を片づける" }) }).locator(".g16-resume").textContent()) === "11/22に再開", "③ said on its block");
  const ra = (await tags(p)).find((a) => a.tag === "goal-resume:g3");
  ok(ra && new Date(ra.at).toISOString() === "2026-11-22T00:00:00.000Z" && ra.body === "保留が終わりました。きょうから再開です。", "③ a notification that day", ra);
  // the day come: back by itself
  await p.clock.setFixedTime(new Date("2026-11-22T10:00:00+09:00"));
  await p.reload(); await p.waitForTimeout(1500);
  g3 = await goal(p, "g3");
  ok(!g3.pausedAt && !g3.resumeOn && (await status(p)).includes("「部屋を片づける」の保留が終わって、再開しました"), "③ back by itself that day", [g3.pausedAt, await status(p)]);
  // 元に戻す: on hold still, with no day to come back (not back again at the next opening)
  await undo(p);
  g3 = await goal(p, "g3");
  ok(g3.pausedAt > 0 && !g3.resumeOn && !g3.pauseFor, "③ 元に戻す: on hold, no day to come back", g3);
  await p.reload(); await p.waitForTimeout(1500);
  g3 = await goal(p, "g3");
  ok(g3.pausedAt > 0 && !(await status(p)).includes("再開しました") && !(await tags(p)).some((a) => a.tag === "goal-resume:g3"), "③ and so it stays", [g3.pausedAt, await status(p)]);

  ok(!p.errs.length, "no errors", p.errs);
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  await b.close();
})();
