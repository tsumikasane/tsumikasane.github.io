// カレンダー その15 ①〜⑩ (on the hooked copy at 8961)
process.env.URL0 = process.env.URL0 || "http://localhost:8961/";
const fs = require("fs");
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
const openDayOf = async (p, md) => { await p.evaluate((md) => [...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith(md)).click(), md); await p.waitForTimeout(700); };
const openPlan = async (p, md, title) => { await openDayOf(p, md); await p.locator("#calDayList .row-btn", { hasText: title }).first().click(); await p.waitForTimeout(700); };
const closeSheet = async (p) => { for (let i = 0; i < 4 && (await p.evaluate(() => document.getElementById("daySheet").open)); i++) { await p.keyboard.press("Escape"); await p.waitForTimeout(700); } };
const undo = async (p) => { await p.locator(".show button", { hasText: "元に戻す" }).first().click(); await p.waitForTimeout(700); };
const alarms = (p) => p.evaluate(() => window.__cal15.alarms(Date.now()));
const iso = (a) => (a ? new Date(a.at).toISOString() : null);
async function open(when = "10:00", day = today, data = make()) { const p = await phone(b, at(when, day), { deviceScaleFactor: 1 }); await seed(p, data, "calendar"); await p.waitForTimeout(900); return p; }
let b;

(async () => {
  b = await chromium.launch();
  let p = await open();
  ok(!p.errs.length, "the page opens, no error", p.errs);

  // ① the notifications at a time of the day, for 歯医者 tomorrow at 10:00
  let al = await alarms(p);
  const eve = al.find((a) => a.tag === "cal-clock:e3:2026-11-17:1@21:00"), morn = al.find((a) => a.tag === "cal-clock:e3:2026-11-17:0@07:30");
  ok(eve && iso(eve) === "2026-11-16T12:00:00.000Z" && eve.title === "歯医者" && eve.body === "あした 10:00〜11:00\n駅前クリニック", "① 前の日 21:00", eve);
  ok(morn && iso(morn) === "2026-11-16T22:30:00.000Z" && morn.body === "きょう 10:00〜11:00\n駅前クリニック", "① 当日 7:30", morn);
  const pushed = await p.evaluate(() => window.__cal15.push());
  ok(pushed[0]?.[0] === "cal15Clock" && JSON.stringify(pushed).includes('[{"k":1,"at":"21:00"},{"k":0,"at":"07:30"}]'), "① what the server is sent has them", pushed);

  // ⑨ the year's 大事な予定
  await p.click('#calViews [data-view="year"]'); await p.waitForTimeout(700);
  const stars = await txts(p, ".cal15-stars li");
  ok(JSON.stringify(stars.map(nos)) === '["3/1★発表会終日","11/16★面接14:00〜15:00きょう","12/10★試験09:00〜12:00あと24日"]', "⑨ the ★ ones by day (the birthday in its own list)", stars);
  ok(await p.evaluate(() => { const li = [...document.querySelectorAll(".cal15-stars li")]; return li[0].classList.contains("past") && li[1].classList.contains("next") && document.querySelector(".cal15-stars").compareDocumentPosition(document.querySelector(".cal3-hols:not(.cal15-stars)")) & 4; }), "⑨ gone by paler, the next bold, over the holidays");
  await p.locator(".cal15-stars .row-btn", { hasText: "試験" }).click(); await p.waitForTimeout(700);
  ok((await p.evaluate(() => window.__cal15.day())) === "2026-12-10" && await p.evaluate(() => document.getElementById("daySheet").open), "⑨ pressed, its day");
  await closeSheet(p);
  await p.click('#calViews [data-view="month"]'); await p.waitForTimeout(700);

  // ② the plans as a table
  await p.click("#calSettings"); await p.waitForTimeout(800);
  ok((await txt(p, "#cal15Csv")) === "予定を表（CSV）で書き出す", "② under .ics");
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 5000 }), p.click("#cal15Csv")]);
  const lines = fs.readFileSync(await dl.path(), "utf8").replace(/^﻿/, "").trim().split(/\r\n/);
  ok(dl.suggestedFilename() === "tsumikasane-calendar-2026-11-16.csv" && lines[0] === "日付,終了日,開始,終了,予定,場所,ラベル,繰り返し,繰り返しの終わり,メモ", "② its head", lines[0]);
  ok(lines.length === 12 && lines[1] === "1970-05-05,,,,母の誕生日,,,毎年,," && lines[3] === "2026-11-04,,10:00,11:00,会議,,,毎週,," && lines[5] === "2026-11-16,,14:00,15:00,面接,本社,,,," && lines[11] === "2026-12-10,,09:00,12:00,試験,,,,,", "② a plan a line, by day", lines);
  await closeSheet(p);

  // ④ a new plan at the next free time (ゼミ till 12:00, 面接 at 14:00 with 30 minutes to get there)
  await p.click("#calAdd"); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.getElementById("planForm").contains(document.getElementById("planClock"))), "① kept in the form (a draft has it)");
  ok((await txt(p, '[data-start="free"]')) === "次の空き 12:00", "④ the chip", await txt(p, '[data-start="free"]'));
  await p.fill("#planTitle", "美容院");
  await p.click('[data-start="free"]'); await p.waitForTimeout(300);
  ok((await p.inputValue("#planDate")) === today && (await p.inputValue("#planTime")) === "12:00" && (await p.inputValue("#planEndTime")) === "13:00", "④ 12:00〜13:00", [await p.inputValue("#planTime"), await p.inputValue("#planEndTime")]);
  // ① set on the 通知アラーム page
  await p.click("#planAlarmBtn"); await p.waitForTimeout(500);
  ok(await p.isVisible("#cal15ClockBox") && (await p.inputValue("#cal15ClockDay")) === "1" && (await p.inputValue("#cal15ClockAt")) === "21:00", "① 時刻で決める, 前の日 21:00 at first");
  await p.click("#cal15ClockAdd"); await p.waitForTimeout(200);
  await p.selectOption("#cal15ClockDay", "0"); await p.fill("#cal15ClockAt", "11:00"); await p.click("#cal15ClockAdd"); await p.waitForTimeout(200);
  await p.click("#cal15ClockAdd"); await p.waitForTimeout(200);
  ok(JSON.stringify(await txts(p, ".cal15-clock-list .text")) === '["前の日 21:00","当日 11:00"]', "① two, the same one not twice", await txts(p, ".cal15-clock-list .text"));
  await p.click('[data-clock="1@21:00"]'); await p.waitForTimeout(200);
  ok(JSON.stringify(await txts(p, ".cal15-clock-list .text")) === '["当日 11:00"]' && (await p.inputValue("#planClock")) === "0@11:00", "① 外す");
  await p.evaluate(() => [...document.querySelectorAll("#alarmList button")].find((x) => x.textContent === "1時間前").click()); await p.waitForTimeout(200);
  await p.click("#sheetCancel"); await p.waitForTimeout(400);
  ok((await txt(p, "#planAlarmText")) === "1時間前、当日 11:00", "① the row says both", await txt(p, "#planAlarmText"));
  await p.click("#planSave"); await p.waitForTimeout(800);
  const made = (await ls(p, "events")).find((e) => e.title === "美容院");
  ok(made && JSON.stringify(made.clock) === '[{"k":0,"at":"11:00"}]' && JSON.stringify(made.alarms) === "[60]" && made.time === "12:00", "① saved", made);
  al = await alarms(p);
  ok(iso(al.find((a) => a.tag === `cal-clock:${made?.id}:2026-11-16:0@11:00`)) === "2026-11-16T02:00:00.000Z", "① its notification at 11:00");
  await closeSheet(p);

  // ① in the plan opened; ⑥ the plans before and after
  await openPlan(p, "11月17日", "歯医者");
  ok((await txt(p, "#edAlarmText")) === "前の日 21:00、当日 07:30" && await p.isVisible("#edSayRow"), "① the row, and ひとこと offered", await txt(p, "#edAlarmText"));
  const prev = nos(await txt(p, ".cal15-nav-prev")), next = nos(await txt(p, ".cal15-nav-next"));
  ok(prev === "‹前の予定★面接11/16（月）14:00〜15:00" && next === "次の予定›会議11/18（水）10:00〜11:00", "⑥ before and after", [prev, next]);
  await p.click('[data-k="nav-next"]'); await p.waitForTimeout(700);
  ok((await p.inputValue("#edTitle")) === "会議" && (await p.inputValue("#edDate")) === "2026-11-18" && (await p.evaluate(() => window.__cal15.day())) === "2026-11-18", "⑥ 会議 opened, on its day");
  await p.fill("#edTitle", "会議2");
  await p.click('[data-k="nav-prev"]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById("discardAsk").open), "⑥ a change not saved: asked first");
  await p.click("#discardNo"); await p.waitForTimeout(400);
  ok((await p.inputValue("#edTitle")) === "会議2", "⑥ 編集を続ける: still there");
  await p.fill("#edTitle", "会議");
  await p.click('[data-k="nav-prev"]'); await p.waitForTimeout(700);
  ok((await p.inputValue("#edTitle")) === "歯医者", "⑥ back to 歯医者");
  await closeSheet(p);

  // ⑦ 予約番号
  await openPlan(p, "11月16日", "面接");
  ok(nos(await txt(p, ".cal15-resv")) === "予約番号AB-1234コピー", "⑦ at the top of the plan opened", await txt(p, ".cal15-resv"));
  await p.evaluate(() => { window.__copied = null; navigator.clipboard.writeText = (t) => { window.__copied = t; return Promise.resolve(); }; window.__shared = []; navigator.share = (d) => { window.__shared.push(d); return Promise.resolve(); }; });
  await p.click('[data-k="resv-copy"]'); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__copied)) === "AB-1234", "⑦ copied");
  await p.click("#edShare"); await p.waitForTimeout(300);
  ok(((await p.evaluate(() => window.__shared))[0]?.text || "").includes("\n予約番号：AB-1234"), "⑦ 文字で送る says it", await p.evaluate(() => window.__shared));
  ok((await p.inputValue("#edResv")) === "AB-1234", "⑦ in the form");
  await p.fill("#edResv", "CD-5678"); await p.click("#sheetSave"); await p.waitForTimeout(800);
  ok((await ev(p, "e2")).resv === "CD-5678", "⑦ changed", (await ev(p, "e2")).resv);
  await closeSheet(p);

  // ③ 仮の予定's days: what each runs into
  await openPlan(p, "11月19日", "打ち合わせ");
  const cands = await txts(p, ".cal-decide .cal15-cand");
  ok(JSON.stringify(cands) === '["15:30〜16:30の「買い物」と重なっています","ほかの予定と重なりません","この日の予定：映画"]', "③ under each day", cands);
  ok(await p.evaluate(() => [...document.querySelectorAll(".cal-decide .cal15-cand")].map((x) => x.classList.contains("clash")).join()) === "true,false,false", "③ those running into one stand out");
  await closeSheet(p);

  // ⑤ 11/18's plans called off at once
  await openDayOf(p, "11月18日");
  await p.click("#cal6DayBtn"); await p.waitForTimeout(300);
  await p.click('[data-k="day-cx"]'); await p.waitForTimeout(800);
  ok(JSON.stringify((await ev(p, "e4")).cancel) === '["2026-11-18"]' && JSON.stringify((await ev(p, "e5")).cancel) === '["2026-11-18"]', "⑤ both called off (the repeat this turn)");
  await undo(p);
  ok(!(await ev(p, "e4")).cancel && !(await ev(p, "e5")).cancel, "⑤ 元に戻す");
  await closeSheet(p);

  // ⑧ 予定の時間: the way there and back this week
  await p.click("#calFind"); await p.waitForTimeout(700);
  ok(nos(await txt(p, ".cal15-travel")) === "移動の時間1時間5分（行き45分・帰り20分、2件）", "⑧ under the labels", await txt(p, ".cal15-travel"));
  await closeSheet(p);

  // ⑩ the timetable as a picture
  await p.evaluate(() => window.__cal15.tt()); await p.waitForTimeout(800);
  ok((await txt(p, "#cal15TTImg")) === "時間割を画像で送る", "⑩ under 文字で送る");
  const drawn = await p.evaluate(() => window.__cal15.ttDrawn());
  ok(["時間割", "10/1（木）〜2027/2/10（水）", "月", "金", "1限", "線形代数", "A101", "B202"].every((w) => drawn.includes(w)) && drawn.some((w) => w.startsWith("英語")), "⑩ drawn", drawn);
  const [img] = await Promise.all([p.waitForEvent("download", { timeout: 5000 }), p.click("#cal15TTImg")]);
  ok(img.suggestedFilename() === "tsumikasane-timetable-2026-11-16.png", "⑩ saved", img.suggestedFilename());
  ok(!p.errs.length, "no error on the way", p.errs);

  // ① none for a turn called off or a 仮 plan
  const d2 = make();
  for (const e of d2.events) { if (e.id === "e3") e.cancel = ["2026-11-17"]; if (e.id === "e6") e.clock = [{ k: 0, at: "09:00" }]; }
  p = await open("10:00", today, d2);
  al = await alarms(p);
  ok(!al.some((a) => a.tag.startsWith("cal-clock:e3:") || a.tag.startsWith("cal-clock:e6:")), "① none called off, none 仮");
  ok(!p.errs.length, "no error", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
