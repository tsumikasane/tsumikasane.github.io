// カレンダー その10 ①〜⑩ (on the hooked copy at 8816)
process.env.URL0 = process.env.URL0 || "http://localhost:8816/";
const { chromium } = require("playwright");
const { phone, seed, at, P } = require("./lib");
const { make, today } = require("./data");
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
const setVal = (p, id, v) => p.evaluate(({ id, v }) => { const t = document.getElementById(id); t.value = v; t.dispatchEvent(new Event("input", { bubbles: true })); t.dispatchEvent(new Event("change", { bubbles: true })); }, { id, v });
const turns = (p, d) => p.evaluate((d) => window.__cal10.turns(d), d);
async function open(data = make(), when = "10:30", day = today) { const p = await phone(b, at(when, day), { deviceScaleFactor: 1 }); await seed(p, data, "calendar"); await p.waitForTimeout(900); return p; }
let b;

(async () => {
  b = await chromium.launch();
  let p = await open();
  ok(!p.errs.length, "the page opens, no error", p.errs);

  // ① the 2nd and 4th Mondays
  ok((await turns(p, "2026-11-09")).includes("サークル") && (await turns(p, "2026-11-23")).includes("サークル") && !(await turns(p, "2026-11-16")).includes("サークル") && (await turns(p, "2026-12-14")).includes("サークル") && (await turns(p, "2026-12-28")).includes("サークル"), "① 11/9, 11/23, 12/14, 12/28");
  ok((await p.evaluate(() => window.__cal10.ics("e1"))).includes("RRULE:FREQ=MONTHLY;BYDAY=2MO,4MO"), "① .ics: BYDAY=2MO,4MO");
  await openDayOf(p, "11月23日");
  ok((await txt(p, "#calDayList")).includes("毎月第2・第4月曜"), "① said in the day's list", await txt(p, "#calDayList"));
  await p.locator("#calDayList .row-btn", { hasText: "サークル" }).first().click(); await p.waitForTimeout(700);
  ok(await p.isHidden("#edNths"), "① none for this turn alone");
  await p.click('#edScope [data-scope="all"]'); await p.waitForTimeout(300);
  const picked = await p.evaluate(() => [...document.querySelectorAll("#edNths input")].map((x) => (x.checked ? "x" : "-") + (x.disabled ? "d" : "")).join(" "));
  ok(await p.isVisible("#edNths") && picked === "- xd - x -", "① すべての回: 第2 (its own) and 第4", picked);
  ok((await p.evaluate(() => document.getElementById("edRepeat").selectedOptions[0].textContent)) === "毎月（第2・第4月曜日）", "① the menu says so");
  await closeSheet(p);
  // a new one on the 1st and 3rd Mondays
  await p.click("#calAdd"); await p.waitForTimeout(700);
  await p.fill("#planTitle", "読書会");
  await setVal(p, "planDate", "2026-11-02"); await p.waitForTimeout(150);
  await p.selectOption("#planRepeat", "monthlyNth"); await p.waitForTimeout(200);
  await p.click('#planNths label[data-n="3"]'); await p.waitForTimeout(150);
  await p.click("#planSave"); await p.waitForTimeout(700);
  const club = (await ls(p, "events")).find((e) => e.title === "読書会");
  ok(club && club.repeat === "monthlyNth" && JSON.stringify(club.nths) === "[1,3]", "① saved: 第1・第3", club);
  ok((await turns(p, "2026-11-16")).includes("読書会") && (await turns(p, "2026-12-07")).includes("読書会") && !(await turns(p, "2026-11-09")).includes("読書会"), "① its turns");
  await closeSheet(p);

  // ② a turn's note
  await openDayOf(p, "11月18日");
  ok((await txt(p, "#calDayList")).includes("この回：テーマは自己紹介"), "② the turn's note in the list");
  await closeSheet(p);
  await openPlan(p, "11月25日", "英会話");
  await p.fill("#cal10TurnNote", "発表の練習"); await p.press("#cal10TurnNote", "Enter"); await p.waitForTimeout(500);
  ok((await ev(p, "e2")).turnNotes?.["2026-11-25"] === "発表の練習" && (await ev(p, "e2")).turnNotes?.["2026-11-18"] === "テーマは自己紹介", "② kept for that turn", (await ev(p, "e2")).turnNotes);
  await closeSheet(p);

  // ③ a year ago
  await openDayOf(p, "11月16日");
  ok(nos(await txt(p, ".cal10-ago")) === "1年前のきょう合宿", "③ a year ago", await txt(p, ".cal10-ago"));
  await p.click(".cal10-ago"); await p.waitForTimeout(500);
  ok((await txt(p, "#sheetTitle")).includes("11月16日") && (await txt(p, "#calDayList")).includes("合宿"), "③ that day at a press", await txt(p, "#sheetTitle"));
  await closeSheet(p);

  // ⑨⑩ by train, with time to get ready
  ok(JSON.stringify(await p.evaluate(() => window.__cal10.free("2026-11-17"))) === "[[540,780],[900,1320]]", "⑩ free: up to the time to get ready", await p.evaluate(() => window.__cal10.free("2026-11-17")));
  await openDayOf(p, "11月17日");
  const row = nos(await txt(p, "#calDayList"));
  ok(row.includes("電車で移動30分・13:30出発") && row.includes("支度30分・13:00から"), "⑨⑩ in the day's list", row);
  await p.locator("#calDayList .row-btn", { hasText: "面接" }).first().click(); await p.waitForTimeout(700);
  ok((await p.inputValue("#edBy")) === "電車" && (await p.inputValue("#edPrep")) === "30" && (await txt(p, "#edPrepFoot")).startsWith("13:00 から支度（13:30 に出発）"), "⑨⑩ in the form", await txt(p, "#edPrepFoot"));
  await closeSheet(p);
  const al = await p.evaluate(() => window.__cal10.alarms(Date.now()));
  const prep = al.find((a) => a.tag === "cal-prep:e6:2026-11-17"), leave = al.find((a) => a.tag === "cal-leave:e6:2026-11-17");
  ok(prep && prep.title === "そろそろ支度：面接" && new Date(prep.at).toISOString() === "2026-11-17T04:00:00.000Z" && prep.body.startsWith("13:30 に出発・14:00から"), "⑩ そろそろ支度 at 13:00", prep);
  ok(leave && leave.body.includes("電車で移動 30 分"), "⑨ 出発のお知らせ says 電車で", leave);

  // ④ countdowns, ⑧ the days with nothing, in 予定
  await p.click("#calFind"); await p.waitForTimeout(700);
  const cd = await p.evaluate(() => [...document.querySelectorAll(".cal10-count li")].map((x) => x.innerText.replace(/\s+/g, "")));
  ok(cd.length === 2 && cd[0].startsWith("あと17日旅行") && cd[1].startsWith("あと57日誕生日"), "④ the countdowns, nearest first", cd);
  await p.click('.cal5-free [data-k="free--1"]'); await p.waitForTimeout(400);
  const empty = await p.evaluate(() => [...document.querySelectorAll(".cal5-free-list li")].map((x) => x.innerText.replace(/\s+/g, "")));
  ok(empty.length > 3 && empty[0].startsWith("きょう・11/14（土）") && !empty.some((x) => x.includes("11/17") || x.includes("11/18")), "⑧ the days with nothing", empty);
  await closeSheet(p);

  // ⑥ a start time used often
  await p.click("#calAdd"); await p.waitForTimeout(700);
  ok(await p.isVisible('#planStarts [data-time="10:00"]'), "⑥ よく使う 10:00");
  await p.click('#planStarts [data-time="10:00"]'); await p.waitForTimeout(200);
  ok((await p.inputValue("#planTime")) === "10:00", "⑥ put in", await p.inputValue("#planTime"));
  await closeSheet(p);

  // ⑤ the notifications to come, ⑦ one's own stamps, in the gear
  await p.click("#calSettings"); await p.waitForTimeout(800);
  const up = await txt(p, "#cal10Up");
  ok(up.includes("これから届く予定のお知らせ") && up.includes("そろそろ支度：面接") && up.includes("そろそろ出発：面接"), "⑤ listed", up && up.slice(0, 300));
  await p.click('.cal10-palette [data-s="🎓"]'); await p.waitForTimeout(300);
  ok(!(await setting(p, "calendar")).stampSet, "⑦ not an eleventh");
  await p.click('.cal10-palette [data-s="⭐"]'); await p.waitForTimeout(300);
  await p.click('.cal10-palette [data-s="🎓"]'); await p.waitForTimeout(300);
  const ss = (await setting(p, "calendar")).stampSet;
  ok(ss && ss.length === 10 && ss.includes("🎓") && !ss.includes("⭐"), "⑦ ⭐ out, 🎓 in", ss);
  await closeSheet(p);
  await openDayOf(p, "11月19日");
  ok(await p.isVisible('#cal4Day [data-stamp="🎓"]') && !(await p.isVisible('#cal4Day [data-stamp="⭐"]')), "⑦ in the day's sheet");
  await closeSheet(p);

  ok(!p.errs.length, "no error on the way", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
