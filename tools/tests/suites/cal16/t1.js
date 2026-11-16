// カレンダー その16 ①〜⑩ (on the hooked copy at 8962)
process.env.URL0 = process.env.URL0 || "http://localhost:8962/";
const { chromium } = require("playwright");
const { phone, seed, at, P } = require("./lib");
const { make, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const txts = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((x) => x.innerText.replace(/\s+/g, " ").trim()), sel);
const nos = (s) => String(s || "").replace(/\s+/g, "");
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const ev = async (p, id) => (await ls(p, "events")).find((e) => e.id === id);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id) || null;
const openDayOf = async (p, md) => { await p.evaluate((md) => [...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith(md)).click(), md); await p.waitForTimeout(700); };
const openPlan = async (p, md, title) => { await openDayOf(p, md); await p.locator("#calDayList .row-btn", { hasText: title }).first().click(); await p.waitForTimeout(700); };
const closeSheet = async (p) => { for (let i = 0; i < 6 && (await p.evaluate(() => document.getElementById("daySheet").open)); i++) { if (await p.evaluate(() => document.getElementById("discardAsk").open)) await p.click("#discardYes"); else await p.keyboard.press("Escape"); await p.waitForTimeout(700); } };
const undo = async (p) => { await p.locator(".show button", { hasText: "元に戻す" }).first().click(); await p.waitForTimeout(700); };
const menuOpen = (p) => p.evaluate(() => document.getElementById("cal16Menu").open);
const rightClick = async (p, title) => { await p.locator("#calDayList .row-btn", { hasText: title }).first().click({ button: "right" }); await p.waitForTimeout(300); };
const press = async (p, k) => { await p.click(`#cal16Menu [data-k="m-${k}"]`); await p.waitForTimeout(700); };
async function open(when = "10:00", day = today, data = make()) { const p = await phone(b, at(when, day), { deviceScaleFactor: 1 }); await seed(p, data, "calendar"); await p.waitForTimeout(900); return p; }
let b;

(async () => {
  b = await chromium.launch();
  let p = await open();
  ok(!p.errs.length, "the page opens, no error", p.errs);

  // ⑩ what is still to take, in the notification an hour before and in 出発のお知らせ
  let al = await p.evaluate(() => window.__cal16.alarms(Date.now()));
  const hour = al.find((a) => a.tag === "e2:2026-11-16"), leave = al.find((a) => a.tag === "cal-leave:e2:2026-11-16");
  ok(hour?.body === "きょう 14:00〜15:00\n本社\n持ち物・準備：履歴書", "⑩ 通知アラーム", hour);
  ok((leave?.body || "").endsWith("\n本社\n持ち物・準備：履歴書"), "⑩ 出発のお知らせ", leave);

  // ④ the day's places joined on the map
  await openDayOf(p, "11月16日");
  const want = "https://www.google.com/maps/dir/" + ["A101", "研究棟", "本社", "レストラン"].map(encodeURIComponent).join("/");
  ok(await p.isVisible("#cal16Route") && (await p.getAttribute("#cal16Route", "href")) === want && (await p.getAttribute("#cal16Route", "target")) === "_blank", "④ 4 places in their order", await p.getAttribute("#cal16Route", "href"));
  await p.evaluate(() => document.getElementById("dayNext").click()); await p.waitForTimeout(500);
  ok((await p.getAttribute("#cal16Route", "href")) === "https://www.google.com/maps/dir/" + ["駅前クリニック", "ジム", "駅前教室"].map(encodeURIComponent).join("/"), "④ the next day's three", await p.getAttribute("#cal16Route", "href"));
  // ① held down: its menu (歯医者, tomorrow)
  const box = await p.locator("#calDayList .row-btn", { hasText: "歯医者" }).first().boundingBox();
  await p.mouse.move(box.x + 40, box.y + box.height / 2); await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up(); await p.waitForTimeout(400);
  ok(await menuOpen(p) && nos(await txt(p, "#cal16MenuMsg")) === "11月17日（火）歯医者", "① held half a second: its menu", await txt(p, "#cal16MenuMsg"));
  ok(JSON.stringify(await txts(p, "#cal16MenuGroup .ask-btn")) === '["この回を中止にする","1時間後にずらす","次の日にずらす","複製","文字で送る","削除"]', "① its items", await txts(p, "#cal16MenuGroup .ask-btn"));
  ok(await p.evaluate(() => !document.getElementById("editView").hidden) === false, "① the press opened nothing else");
  await press(p, "cx");
  ok(JSON.stringify((await ev(p, "e6")).cancel) === '["2026-11-17"]', "① 中止");
  await undo(p);
  ok(!(await ev(p, "e6")).cancel, "① 中止 undone");
  await rightClick(p, "歯医者");
  ok(await menuOpen(p), "① a right-click opens it too");
  await press(p, "day");
  ok((await ev(p, "e6")).date === "2026-11-18", "① 次の日にずらす");
  await undo(p);
  await p.evaluate(() => { const b = document.getElementById("dayPrev"); if (window.__cal16.day() !== "2026-11-17") b.click(); }); await p.waitForTimeout(400);
  await rightClick(p, "歯医者"); await press(p, "hour");
  ok((await ev(p, "e6")).time === "11:00" && (await ev(p, "e6")).endTime === "12:00", "① 1時間後にずらす");
  await undo(p);
  await rightClick(p, "歯医者");
  await p.evaluate(() => { window.__shared = []; navigator.share = (d) => { window.__shared.push(d); return Promise.resolve(); }; });
  await press(p, "share");
  ok(((await p.evaluate(() => window.__shared))[0]?.text || "").startsWith("歯医者\n"), "① 文字で送る");
  await rightClick(p, "歯医者"); await press(p, "copy");
  ok((await p.inputValue("#planTitle")) === "歯医者" && (await p.inputValue("#planDate")) === "2026-11-17" && await p.isVisible("#planForm"), "① 複製: the form, filled");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  if (await p.evaluate(() => document.getElementById("discardAsk").open)) { await p.click("#discardYes"); await p.waitForTimeout(500); }
  await closeSheet(p);
  await openDayOf(p, "11月17日");
  await rightClick(p, "歯医者"); await press(p, "del");
  ok(!(await ev(p, "e6")), "① 削除");
  await undo(p);
  ok(!!(await ev(p, "e6")), "① 削除 undone");
  // a repeat: no ずらす, this turn deleted
  await p.evaluate(() => document.getElementById("dayNext").click()); await p.waitForTimeout(500);
  await rightClick(p, "会議");
  ok(JSON.stringify(await txts(p, "#cal16MenuGroup .ask-btn")) === '["この回を中止にする","複製","文字で送る","この回を削除"]', "① a repeat's items", await txts(p, "#cal16MenuGroup .ask-btn"));
  await press(p, "del");
  ok(JSON.stringify((await ev(p, "e5")).skip) === '["2026-11-18"]', "① a repeat: this turn deleted");
  await undo(p);
  ok(await p.isHidden("#cal16Route"), "④ none for a day without places");

  // ⑤ 11/18's plans 30 minutes later (会議 repeats: this turn alone)
  await p.click("#cal6DayBtn"); await p.waitForTimeout(300);
  ok((await p.inputValue("#cal16ShiftBy")) === "30", "⑤ 30分 at first");
  await p.click('[data-k="day-later"]'); await p.waitForTimeout(800);
  const lunch = await ev(p, "e11"), meet = await ev(p, "e5"), moved = (await ls(p, "events")).find((e) => e.title === "会議" && e.id !== "e5");
  ok(lunch.time === "12:30" && lunch.endTime === "13:30" && JSON.stringify(meet.skip) === '["2026-11-18"]' && moved?.date === "2026-11-18" && moved.time === "10:30" && moved.endTime === "11:30" && !moved.repeat, "⑤ later by 30分", [lunch, meet.skip, moved]);
  await undo(p);
  ok((await ev(p, "e11")).time === "12:00" && !(await ev(p, "e5")).skip && (await ls(p, "events")).filter((e) => e.title === "会議").length === 1, "⑤ 元に戻す");
  await closeSheet(p);

  // ② a repeat's first turns, under it in the forms
  await p.click("#calAdd"); await p.waitForTimeout(700);
  await p.fill("#planTitle", "ヨガ");
  ok(await p.isHidden("#planRepNext"), "② none without a repeat");
  await p.selectOption("#planRepeat", "weekly"); await p.waitForTimeout(300);
  const d0 = await p.inputValue("#planDate");
  ok(d0 === "2026-11-18" && nos(await txt(p, "#planRepNext")) === "はじめの回11/18（水）・11/25（水）・12/2（水）・12/9（水）…", "② 4 of them", await txt(p, "#planRepNext"));
  await p.fill("#planUntil", "2026-11-30"); await p.waitForTimeout(300);
  ok(nos(await txt(p, "#planRepNext")) === "はじめの回11/18（水）・11/25（水）（ぜんぶで2回）", "② with its end", await txt(p, "#planRepNext"));
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  if (await p.evaluate(() => document.getElementById("discardAsk").open)) { await p.click("#discardYes"); await p.waitForTimeout(500); }
  await closeSheet(p);
  await openPlan(p, "11月18日", "会議");
  ok(await p.isHidden("#edRepNext"), "② none for one turn");
  await p.evaluate(() => document.querySelector('#edScope button[data-scope="all"]').click()); await p.waitForTimeout(300);
  ok(nos(await txt(p, "#edRepNext")) === "次の回11/18（水）・11/25（水）・12/2（水）・12/9（水）…", "② from today, for one begun before", await txt(p, "#edRepNext"));
  await closeSheet(p);

  // ③ 補講・振替 for the class
  await openPlan(p, "11月16日", "線形代数");
  ok(await p.isVisible(".cal16-makeup") && (await p.inputValue("#cal16MkDay")) === "2026-11-21" && (await p.inputValue("#cal16MkPer")) === "1", "③ the next Saturday, its own period at first");
  await p.selectOption("#cal16MkPer", "2"); await p.check("#cal16MkOff");
  await p.click('[data-k="mk-add"]'); await p.waitForTimeout(800);
  const mk = (await ls(p, "events")).find((e) => e.title === "線形代数（補講）");
  ok(mk && mk.date === "2026-11-21" && mk.time === "10:40" && mk.endTime === "12:10" && mk.place === "A101" && mk.labelId === "lc" && !mk.cls && JSON.stringify((await ev(p, "e4")).skip) === '["2026-11-16"]', "③ put in, this turn 休講", mk);
  await undo(p);
  ok(!(await ls(p, "events")).some((e) => e.title === "線形代数（補講）") && !(await ev(p, "e4")).skip, "③ 元に戻す");
  await closeSheet(p);
  await openPlan(p, "11月16日", "ゼミ");
  ok(await p.isHidden(".cal16-makeup"), "③ only for a class");
  await closeSheet(p);

  // ⑥ the weekdays and hours the 8 weeks filled
  await p.click("#calFind"); await p.waitForTimeout(700);
  ok(nos(await txt(p, ".cal16-heat .sub")) === "この8週間（9/22〜11/16）で、いちばん多いのは火曜日の18時台（16時間）", "⑥ said", await txt(p, ".cal16-heat .sub"));
  ok(await p.evaluate(() => document.querySelector('[data-wh="2-18"]').className === "l4" && document.querySelector('[data-wh="1-9"]').className === "l2" && document.querySelector('[data-wh="0-9"]').className === "l0"), "⑥ darker for more");
  await closeSheet(p);

  // ⑦ the year so far
  await p.click('#calViews [data-view="year"]'); await p.waitForTimeout(700);
  const year = await txts(p, ".cal16-year-row");
  ok((await txt(p, "#cal16YearHead")) === "2026年のまとめ（きょうまで）" && JSON.stringify(year.map(nos)) === '["予定36件","時間のある予定52時間30分","いちばん多い月10月（13件）","大事な予定（★）1件","よく行った場所ジム（11回）・駅前教室（11回）・A101（7回）","よくいっしょの人田中（2回）・家族（1回）"]', "⑦ summed up", year);
  await p.click('#calViews [data-view="month"]'); await p.waitForTimeout(500);

  // ⑧ 単位
  await p.evaluate(() => window.__cal16.tt()); await p.waitForTimeout(800);
  ok((await txt(p, "#cal16Credits")) === "単位の合計 1単位（1科目）", "⑧ the total", await txt(p, "#cal16Credits"));
  await p.click("#tt-1-1"); await p.waitForTimeout(400);
  await p.fill("#ttCredit", "2"); await p.click("#ttSave"); await p.waitForTimeout(900);
  ok((await setting(p, "timetable")).items.find((x) => x.id === "c1")?.credit === 2 && (await txt(p, "#cal16Credits")) === "単位の合計 3単位（2科目）", "⑧ kept, added in", await txt(p, "#cal16Credits"));
  await closeSheet(p);

  // ⑨ plans read in from a table
  await p.click("#calSettings"); await p.waitForTimeout(800);
  ok((await txt(p, "#cal16CsvIn")) === "表（CSV）から予定を読み込む", "⑨ under 表で書き出す");
  const csv = "﻿日付,終了日,開始,終了,予定,場所,ラベル,繰り返し,繰り返しの終わり,メモ\r\n2026-11-20,,10:00,11:00,美容院,駅前,授業,,,\r\n2026/11/21,,午後3:00,,買い物,,,,,\"メモ, 2行\n目\"\r\n2026-11-16,,10:00,12:00,ゼミ,研究棟,,,,\r\n11/25/2026,,,,,,,,,\r\n";
  await p.setInputFiles("#cal16CsvFile", { name: "plans.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") }); await p.waitForTimeout(800);
  const evs = await ls(p, "events"), bi = evs.find((e) => e.title === "美容院"), kai = evs.find((e) => e.title === "買い物");
  ok(bi && bi.date === "2026-11-20" && bi.time === "10:00" && bi.endTime === "11:00" && bi.place === "駅前" && bi.labelId === "lc" && kai && kai.date === "2026-11-21" && kai.time === "15:00" && !kai.endTime && kai.memo === "メモ, 2行\n目" && evs.filter((e) => e.title === "ゼミ").length === 1, "⑨ two read in, the one there not twice", [bi, kai]);
  ok((await txt(p, ".toast.show")).includes("2 件の予定を表から読み込みました。すでにある 1 件は読み込んでいません。日付・予定・時刻が読めない 1 行は飛ばしました"), "⑨ said", await txt(p, ".toast.show"));
  await undo(p);
  ok(!(await ls(p, "events")).some((e) => e.title === "美容院" || e.title === "買い物"), "⑨ 元に戻す");
  const g = "Subject,Start Date,Start Time,End Date,End Time,All Day Event,Description,Location\n歯科検診,12/01/2026,10:00 AM,12/01/2026,11:30 AM,False,,駅前クリニック\n";
  await p.setInputFiles("#cal16CsvFile", { name: "google.csv", mimeType: "text/csv", buffer: Buffer.from(g, "utf8") }); await p.waitForTimeout(800);
  const gx = (await ls(p, "events")).find((e) => e.title === "歯科検診");
  ok(gx && gx.date === "2026-12-01" && gx.time === "10:00" && gx.endTime === "11:30" && gx.place === "駅前クリニック", "⑨ Google カレンダー's columns", gx);
  await closeSheet(p);
  ok(!p.errs.length, "no error on the way", p.errs);

  // ⑩ none once 履歴書 is checked
  const d2 = make();
  d2.events[1].checks[0].done = true;
  p = await open("10:00", today, d2);
  al = await p.evaluate(() => window.__cal16.alarms(Date.now()));
  ok(al.find((a) => a.tag === "e2:2026-11-16")?.body === "きょう 14:00〜15:00\n本社", "⑩ nothing left to take: no line");
  ok(!p.errs.length, "no error", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
