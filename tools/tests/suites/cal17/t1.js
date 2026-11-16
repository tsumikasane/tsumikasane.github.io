// カレンダー その17 ①〜⑩ (on the hooked copy at 8963)
process.env.URL0 = process.env.URL0 || "http://localhost:8963/";
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
const undo = async (p) => { await p.locator(".toast.show button", { hasText: "元に戻す" }).first().click(); await p.waitForTimeout(700); };
const gear = async (p) => { await p.click("#calSettings"); await p.waitForTimeout(800); };
const tap = (p, sel) => p.evaluate((sel) => document.querySelector(sel).click(), sel);
const alarms = (p) => p.evaluate(() => window.__cal17.alarms(Date.now()));
async function open(when = "10:00", day = today, data = make()) { const p = await phone(b, at(when, day), { deviceScaleFactor: 1 }); await seed(p, data, "calendar"); await p.waitForTimeout(900); return p; }
let b;

(async () => {
  b = await chromium.launch();
  let p = await open();
  ok(!p.errs.length, "the page opens, no error", p.errs);

  // ① a new plan's length, set in the gear
  await gear(p);
  ok((await p.inputValue("#cal17Len")) === "60", "① an hour at first");
  await p.selectOption("#cal17Len", "30"); await p.waitForTimeout(400);
  ok((await setting(p, "calendar")).len17 === 30, "① kept");
  // ⑤ ④ ⑥ switched on there too
  await p.check("#cal17BarTime"); await p.check("#cal17Bands"); await p.check("#cal17GapOn"); await p.waitForTimeout(400);
  const cs = await setting(p, "calendar");
  ok(cs.barTime17 === true && cs.bands17 === true && cs.gap17?.on === true && (await p.inputValue("#cal17GapMin")) === "60", "④⑤⑥ on", cs);
  // ② 研究 made one with ゼミ
  ok(await p.isVisible("#cal17Merge"), "② under the labels");
  await p.selectOption("#cal17From", "l2"); await p.selectOption("#cal17To", "l1");
  await p.click("#cal17MergeGo"); await p.waitForTimeout(800);
  ok((await ev(p, "e2")).labelId === "l1" && (await ev(p, "e3")).labelId === "l1" && !(await ls(p, "labels")).some((l) => l.id === "l2"), "② 研究's plans are ゼミ's, 研究 gone");
  await undo(p);
  ok((await ev(p, "e2")).labelId === "l2" && (await ev(p, "e3")).labelId === "l2" && (await ls(p, "labels")).some((l) => l.id === "l2"), "② 元に戻す");
  await closeSheet(p);
  await p.click("#calAdd"); await p.waitForTimeout(700);
  ok((await p.inputValue("#planTime")) === "11:00" && (await p.inputValue("#planEndTime")) === "11:30", "① a new plan of 30分", [await p.inputValue("#planTime"), await p.inputValue("#planEndTime")]);
  await closeSheet(p);

  // ⑤ the start times in the month
  const bars = await p.evaluate(() => [...[...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith("11月16日")).querySelectorAll(".bar")].map((x) => x.textContent));
  ok(JSON.stringify(bars) === '["9:00 線形代数","10:00 ゼミ","14:00 面接","19:00 夕食"]', "⑤ before their names", bars);

  // ⑥ the time between plans
  let al = await alarms(p);
  const g1 = al.find((a) => a.tag === "cal-gap:2026-11-16:12:00"), g2 = al.find((a) => a.tag === "cal-gap:2026-11-16:15:00");
  ok(g1 && new Date(g1.at).toISOString() === "2026-11-16T03:00:00.000Z" && g1.title === "すきま時間 1 時間 30 分" && g1.body === "次の「面接」（14:00、13:30に出発）まで、1 時間 30 分あります", "⑥ after ゼミ, the way to 面接 counted", g1);
  ok(g2 && g2.body === "次の「夕食」（19:00）まで、4 時間あります" && !al.some((a) => a.tag === "cal-gap:2026-11-16:10:30"), "⑥ after 面接; none where they run into each other", g2);

  // ③ 平日, ④ 時限の帯 (週)
  await p.click('#calViews [data-view="week"]'); await p.waitForTimeout(600);
  await tap(p, '#calDays [data-days="wd"]'); await p.waitForTimeout(500);
  ok(JSON.stringify(await p.evaluate(() => window.__cal17.days())) === '["2026-11-16","2026-11-17","2026-11-18","2026-11-19","2026-11-20"]' && (await p.getAttribute('#calDays [data-days="wd"]', "aria-pressed")) === "true" && (await p.getAttribute('#calDays [data-days="5"]', "aria-pressed")) === "false", "③ Monday to Friday", await p.evaluate(() => window.__cal17.days()));
  const bands = await p.evaluate(() => [...document.querySelectorAll('.tg-col[data-day="2026-11-16"] .cal17-band')].map((x) => x.textContent + "@" + x.style.top));
  ok(bands.length === 6 && bands[0] === "1限@37.5%", "④ the 6 periods behind", bands);
  await tap(p, "#calNext"); await p.waitForTimeout(500);
  ok(JSON.stringify(await p.evaluate(() => window.__cal17.days())) === '["2026-11-23","2026-11-24","2026-11-25","2026-11-26","2026-11-27"]', "③ a week at a turn", await p.evaluate(() => window.__cal17.days()));
  await tap(p, '#calDays [data-days="5"]'); await p.waitForTimeout(500);
  const five = await p.evaluate(() => window.__cal17.days());
  ok(five.length === 5 && five[0] === (await p.evaluate(() => window.__cal17.day())) && (await p.getAttribute('#calDays [data-days="5"]', "aria-pressed")) === "true", "③ 5日 again: five from the day", five);
  await tap(p, '#calDays [data-days="7"]'); await p.waitForTimeout(500);
  ok((await p.evaluate(() => window.__cal17.days())).length === 7 && !(await p.evaluate(() => document.querySelector('.tg-col[data-day="2026-11-22"] .cal17-band'))), "④ none on a Sunday");
  await p.click('#calViews [data-view="month"]'); await p.waitForTimeout(500);

  // ⑦ this week printed
  await openDayOf(p, "11月16日");
  await p.evaluate(() => { window.__printed = null; window.print = () => { window.__printed = document.getElementById("cal8Print")?.innerText || ""; }; });
  await tap(p, "#dayShare"); await p.waitForTimeout(300);
  await p.click('#dayShareBox [data-share="week-print"]'); await p.waitForTimeout(400);
  const printed = nos(await p.evaluate(() => window.__printed));
  ok(printed.startsWith("11/15〜11/21の予定") && printed.includes("11/16（月）09:00〜10:30線形代数（A101）10:00〜12:00ゼミ（研究棟）14:00〜15:00面接（本社）19:00〜20:00夕食") && printed.includes("11/21（土）18:00〜20:00映画"), "⑦ a line a day", printed);

  // ⑧ the class's other turns
  await p.locator("#calDayList .row-btn", { hasText: "線形代数" }).first().click(); await p.waitForTimeout(700);
  const past = (await txts(p, ".cal17-past li")).map(nos);
  ok(JSON.stringify(past) === '["11/23小テスト","11/9第6回行列式","11/2よかったよくわかった"]', "⑧ the latest first", past);
  await p.click('[data-k="past-2026-11-09"]'); await p.waitForTimeout(700);
  ok((await p.inputValue("#edDate")) === "2026-11-09" && (await p.evaluate(() => window.__cal17.day())) === "2026-11-09", "⑧ that turn opened");
  await closeSheet(p);

  // ⑩ the month's note, from a day's list
  await openDayOf(p, "11月16日");
  ok((await txt(p, "#cal17NoteBtn")) === "11月のメモ", "⑩ in the day's tools", await txt(p, "#cal17NoteBtn"));
  await p.click("#cal17NoteBtn"); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById("cal17NoteAsk").open) && (await txt(p, "#cal17NoteTitle")) === "2026年11月のメモ", "⑩ its window");
  await p.fill("#cal17MonthNote", "テスト期間・レポート3つ"); await p.click("#cal17NoteSave"); await p.waitForTimeout(500);
  ok(JSON.stringify((await setting(p, "calendar")).monthNotes17) === '{"2026-11":"テスト期間・レポート3つ"}' && !(await p.evaluate(() => document.getElementById("cal17NoteAsk").open)), "⑩ kept");
  await closeSheet(p);
  ok(await p.isVisible("#cal17Memo") && (await txt(p, "#cal17Memo")) === "メモ：テスト期間・レポート3つ", "⑩ over the month", await txt(p, "#cal17Memo"));
  await p.click("#cal17Memo"); await p.waitForTimeout(400);
  ok((await p.inputValue("#cal17MonthNote")) === "テスト期間・レポート3つ", "⑩ pressed: to change it");
  await p.click("#cal17NoteNo"); await p.waitForTimeout(300);
  await tap(p, "#calNext"); await p.waitForTimeout(500);
  ok(await p.isHidden("#cal17Memo"), "⑩ none for December");
  await tap(p, "#calPrev"); await p.waitForTimeout(500);
  ok(!p.errs.length, "no error on the way", p.errs);

  // ⑨ the plans with photos
  await p.evaluate(() => new Promise((done) => {
    const req = indexedDB.open("tsumikasane-plan-photos", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("photos", { keyPath: "id" });
    req.onsuccess = () => {
      const cv = document.createElement("canvas"); cv.width = 40; cv.height = 40; cv.getContext("2d").fillRect(0, 0, 40, 40);
      cv.toBlob((blob) => { const tx = req.result.transaction("photos", "readwrite"); tx.objectStore("photos").put({ id: "ph1", planId: "e7", blob, createdAt: 5 }); tx.objectStore("photos").put({ id: "ph2", planId: "e7", blob, createdAt: 6 }); tx.oncomplete = () => { req.result.close(); done(); }; });
    };
  }));
  await p.reload(); await p.waitForTimeout(900);
  await p.click("#calFind"); await p.waitForTimeout(1200);
  const album = await p.evaluate(() => [...document.querySelectorAll(".cal17-album-item")].map((x) => x.getAttribute("aria-label")));
  ok(JSON.stringify(album) === '["映画（11月21日（土）・写真 2枚）を開く"]', "⑨ listed", album);
  await p.click(".cal17-album-item"); await p.waitForTimeout(800);
  ok((await p.inputValue("#edTitle")) === "映画" && await p.isVisible("#editView"), "⑨ pressed: the plan");
  await closeSheet(p);
  ok(!p.errs.length, "no error", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
