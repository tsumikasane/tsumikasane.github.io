// カレンダー その8 ①〜⑩ (on the hooked copy at 8814)
process.env.URL0 = process.env.URL0 || "http://localhost:8814/";
const { chromium } = require("playwright");
const { phone, seed, at, P } = require("./lib");
const { make, makeTT, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const nos = (s) => String(s || "").replace(/\s+/g, "");
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const ev = async (p, id) => (await ls(p, "events")).find((e) => e.id === id);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id) || null;
const openDayOf = async (p, md) => { await p.evaluate((md) => [...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith(md)).click(), md); await p.waitForTimeout(700); };
const openPlan = async (p, md, title) => { await openDayOf(p, md); await p.locator("#calDayList .row-btn", { hasText: title }).first().click(); await p.waitForTimeout(700); };
const closeSheet = async (p) => { for (let i = 0; i < 4 && (await p.evaluate(() => document.getElementById("daySheet").open)); i++) { await p.keyboard.press("Escape"); await p.waitForTimeout(700); } };
const undo = async (p) => { await p.locator(".show button", { hasText: "元に戻す" }).first().click(); await p.waitForTimeout(600); };
async function open(data = make(), when = "10:30", day = today) { const p = await phone(b, at(when, day), { deviceScaleFactor: 1 }); await seed(p, data, "calendar"); await p.waitForTimeout(900); return p; }
let b;

(async () => {
  b = await chromium.launch();
  let p = await open();
  ok(!p.errs.length, "the page opens, no error", p.errs);

  // ③ the way back: in the free hours, the day's list and the form
  ok(JSON.stringify(await p.evaluate(() => window.__cal8.free("2026-11-16"))) === "[[540,570],[730,780],[840,1320]]", "③ free: up to the way there, after the way back", await p.evaluate(() => window.__cal8.free("2026-11-16")));
  await openDayOf(p, "11月16日");
  ok(nos(await txt(p, "#calDayList")).includes("帰り40分・12:10ごろ着く"), "③ said in the day's list", await txt(p, "#calDayList"));
  // ① a note for the day
  await p.fill("#cal8Note", "雨なら中止"); await p.press("#cal8Note", "Enter"); await p.waitForTimeout(500);
  ok((await setting(p, "calendar")).dayNotes?.["2026-11-16"] === "雨なら中止", "① the note kept", (await setting(p, "calendar")).dayNotes);
  await p.locator("#calDayList .row-btn", { hasText: "ゼミ" }).first().click(); await p.waitForTimeout(700);
  ok((await p.inputValue("#edTravelBack")) === "40" && (await txt(p, "#edTravelBackFoot")) === "12:10 ごろ着きます", "③ in the form", [await p.inputValue("#edTravelBack"), await txt(p, "#edTravelBackFoot")]);
  await closeSheet(p);
  const c16 = await p.evaluate(() => { const c = [...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith("11月16日")); return { cls: c.className, label: c.getAttribute("aria-label") }; });
  ok(c16.cls.includes("c8note") && c16.label.includes("メモ 雨なら中止"), "① its date marked in the month", c16);

  // ② the next free time
  await openPlan(p, "11月17日", "打ち合わせ");
  await p.click('.cal4-plan [data-k="mv-free"]'); await p.waitForTimeout(700);
  let e3 = await ev(p, "e3");
  ok(e3.date === "2026-11-17" && e3.time === "17:00" && e3.endTime === "18:00", "② moved to 17:00, after 授業", e3);
  await undo(p);
  e3 = await ev(p, "e3");
  ok(e3.time === "10:00" && e3.endTime === "11:00", "② 元に戻す", e3);
  await closeSheet(p);

  // ④ a ひな形 put on a day, and one kept from a day
  await openDayOf(p, "11月19日");
  await p.click("#cal8TplBtn"); await p.waitForTimeout(300);
  await p.click('#cal8TplBox [data-tpl="t1"]'); await p.waitForTimeout(700);
  let all = await ls(p, "events");
  const run = all.find((e) => e.title === "朝ラン" && e.date === "2026-11-19"), eng = all.find((e) => e.title === "英語" && e.date === "2026-11-19");
  ok(run && run.time === "06:30" && eng && eng.labelId === "l2" && eng.checks?.[0]?.text === "単語帳", "④ 平日's plans on 11/19", [run, eng]);
  await undo(p);
  all = await ls(p, "events");
  ok(!all.some((e) => e.date === "2026-11-19"), "④ 元に戻す");
  await closeSheet(p);
  await openDayOf(p, "11月17日");
  await p.click("#cal8TplBtn"); await p.waitForTimeout(300);
  await p.fill("#cal8TplName", "研究日"); await p.click('#cal8TplBox [data-k="tpl-save"]'); await p.waitForTimeout(500);
  const tpls = (await setting(p, "calendar")).dayTpls;
  ok(tpls.length === 2 && tpls[1].name === "研究日" && tpls[1].plans.map((x) => x.title).join() === "打ち合わせ,授業", "④ 11/17 kept as 研究日", tpls);
  await closeSheet(p);

  // ⑤ the label's hours against its 目安 (今週)
  await p.click("#calFind"); await p.waitForTimeout(700);
  const sum = nos(await txt(p, ".cal-sum"));
  ok(sum.includes("勉強3時間/10時間"), "⑤ 勉強 3時間 / 10時間", sum);
  // ⑨ what was found, changed at once
  await p.fill("#findText", "ゼミ"); await p.waitForTimeout(400);
  ok((await txt(p, ".cal8-bulk")).includes("見つかった予定 2件"), "⑨ the two found", await txt(p, ".cal8-bulk"));
  await p.selectOption("#cal8BulkLabel", "l2"); await p.waitForTimeout(600);
  ok((await ev(p, "e1")).labelId === "l2" && (await ev(p, "e7")).labelId === "l2", "⑨ both given 勉強");
  await undo(p);
  ok((await ev(p, "e1")).labelId === "l1" && !(await ev(p, "e7")).labelId, "⑨ 元に戻す");
  await p.click("#cal8BulkDel"); await p.waitForTimeout(200);
  ok(!!(await ev(p, "e1")), "⑨ not deleted on the first press");
  await p.click("#cal8BulkDel"); await p.waitForTimeout(600);
  ok(!(await ev(p, "e1")) && !(await ev(p, "e7")), "⑨ deleted on the second");
  await undo(p);
  ok(!!(await ev(p, "e1")) && !!(await ev(p, "e7")), "⑨ 元に戻す");
  await closeSheet(p);

  // ⑧ the month printed
  await p.evaluate(() => { window.__printed = null; window.print = () => { window.__printed = document.getElementById("cal8Print")?.innerText.replace(/\s+/g, " "); }; });
  await p.click("#calMonthBtn"); await p.waitForTimeout(800);
  await p.click("#cal8PrintBtn"); await p.waitForTimeout(400);
  const printed = await p.evaluate(() => window.__printed);
  ok(printed && printed.includes("2026年11月") && printed.includes("10:00 ゼミ") && printed.includes("雨なら中止") && printed.includes("文化の日"), "⑧ the month as a table", printed && printed.slice(0, 300));
  await closeSheet(p);

  // ⑦ the keyboard
  await p.keyboard.press("w"); await p.waitForTimeout(400);
  ok((await p.evaluate(() => window.__cal8.view())) === "week", "⑦ W: 週");
  await p.keyboard.press("m"); await p.waitForTimeout(400);
  await p.keyboard.press("ArrowRight"); await p.waitForTimeout(700);
  ok((await p.evaluate(() => window.__cal8.month())) === "2026-12", "⑦ →: the next month", await p.evaluate(() => window.__cal8.month()));
  await p.keyboard.press("t"); await p.waitForTimeout(500);
  ok((await p.evaluate(() => window.__cal8.month())) === "2026-11", "⑦ T: きょう");
  await p.keyboard.press("n"); await p.waitForTimeout(800);
  ok(await p.isVisible("#planView"), "⑦ N: a new plan");

  // ⑩ the start at a press (its length kept)
  await p.click('#planStarts [data-start="1時間後"]'); await p.waitForTimeout(200);
  ok((await p.inputValue("#planDate")) === today && (await p.inputValue("#planTime")) === "11:30" && (await p.inputValue("#planEndTime")) === "12:30", "⑩ 1時間後: 11:30〜12:30", [await p.inputValue("#planDate"), await p.inputValue("#planTime"), await p.inputValue("#planEndTime")]);
  await p.click('#planStarts [data-start="あしたの朝 9:00"]'); await p.waitForTimeout(200);
  ok((await p.inputValue("#planDate")) === "2026-11-15" && (await p.inputValue("#planTime")) === "09:00" && (await p.inputValue("#planEndTime")) === "10:00", "⑩ あしたの朝", [await p.inputValue("#planDate"), await p.inputValue("#planTime"), await p.inputValue("#planEndTime")]);
  await closeSheet(p);
  ok(!p.errs.length, "no error on the way", p.errs);

  // ⑥ the timetable as words
  p = await open(makeTT());
  await p.evaluate(() => { window.__shared = null; navigator.share = (d) => { window.__shared = d; return Promise.resolve(); }; });
  await p.evaluate(() => window.__cal8.tt()); await p.waitForTimeout(800);
  await p.click("#cal8TTShare"); await p.waitForTimeout(400);
  const shared = await p.evaluate(() => window.__shared);
  ok(shared && shared.title === "時間割" && shared.text.includes("月曜\n　1限 09:00〜10:30 線形代数（A101）") && shared.text.includes("水曜\n　3限 13:00〜14:30 英語") && shared.text.startsWith("時間割（10/1（木）〜2027/1/31（日））"), "⑥ the timetable as words", shared);
  ok(!p.errs.length, "no error in the timetable", p.errs);

  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
