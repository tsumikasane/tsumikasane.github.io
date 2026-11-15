// カレンダー その14 ①〜⑩ (on the hooked copy at 8960)
process.env.URL0 = process.env.URL0 || "http://localhost:8960/";
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
const undo = async (p) => { await p.locator(".show button", { hasText: "元に戻す" }).first().click(); await p.waitForTimeout(700); };
const alarms = (p) => p.evaluate(() => window.__cal14.alarms(Date.now()));
const iso = (a) => (a ? new Date(a.at).toISOString() : null);
async function open(when = "10:00", day = today, data = make()) { const p = await phone(b, at(when, day), { deviceScaleFactor: 1 }); await seed(p, data, "calendar"); await p.waitForTimeout(900); return p; }
let b;

(async () => {
  b = await chromium.launch();
  let p = await open();
  ok(!p.errs.length, "the page opens, no error", p.errs);

  // ① 午後 where 終日 is, in its place among the day's
  await openDayOf(p, "11月17日");
  const rows = await p.evaluate(() => [...document.querySelectorAll("#calDayList .row-btn")].map((b) => b.querySelector(".chip.when")?.textContent + " " + b.querySelector(".text")?.textContent));
  ok(JSON.stringify(rows) === '["終日 掃除","10:00〜11:00 歯医者","午後 買い物","19:00〜21:00 夕食"]', "① 午後, after the morning's", rows);
  // ⑤ the way from the plan before
  await p.locator("#calDayList .row-btn", { hasText: "夕食" }).first().click(); await p.waitForTimeout(700);
  const way = await p.evaluate(() => { const a = document.querySelector('.cal14-way [data-k="way"]'); return a && [a.getAttribute("href"), a.textContent]; });
  ok(way && way[0] === "https://www.google.com/maps/dir/?api=1&origin=%E9%A7%85%E5%89%8D%E3%82%AF%E3%83%AA%E3%83%8B%E3%83%83%E3%82%AF&destination=%E3%83%AC%E3%82%B9%E3%83%88%E3%83%A9%E3%83%B3&travelmode=transit" && way[1] === "前の「歯医者」（駅前クリニック）からの経路", "⑤ from 歯医者's place", way);
  ok(await p.isVisible("#cal14LaterCard"), "⑨ offered for a plan that does not repeat");
  await closeSheet(p);
  // ⑨ 歯医者 put off
  await openPlan(p, "11月17日", "歯医者");
  ok(!(await p.isVisible(".cal14-way")), "⑤ none for the first with a place");
  await p.click("#cal14Later"); await p.waitForTimeout(800);
  ok(!(await ev(p, "e4")) && ((await setting(p, "calendar")).someday || []).some((x) => x.t === "歯医者"), "⑨ off the calendar, in 日にち未定");
  await undo(p);
  ok(!!(await ev(p, "e4")) && !((await setting(p, "calendar")).someday || []).some((x) => x.t === "歯医者"), "⑨ 元に戻す: both back");
  await closeSheet(p);

  // ① a new plan at night, no time
  await p.click("#calAdd"); await p.waitForTimeout(700);
  await p.fill("#planTitle", "映画");
  ok(await p.isHidden("#planPartRow"), "① none with a time");
  await p.click("#planAllDay"); await p.waitForTimeout(300);
  ok(await p.isVisible("#planPartRow"), "① for a plan without a time");
  await p.selectOption("#planPart", "ev"); await p.waitForTimeout(150);
  // ⑩ the names put in before
  const names = await p.evaluate(() => [...document.querySelectorAll("#cal14NameList option")].map((o) => o.value));
  ok((await p.getAttribute("#planTitle", "list")) === "cal14NameList" && names[0] === "面接" && names.includes("買い物") && names.includes("旅行") && names.filter((n) => n === "線形代数").length === 1, "⑩ the names offered, newest first", names);
  await p.click("#planSave"); await p.waitForTimeout(800);
  const film = (await ls(p, "events")).find((e) => e.title === "映画");
  ok(film && film.part === "ev" && !film.time, "① saved", film);
  await closeSheet(p);

  // ⑥ the class's turns called off and deleted
  await openPlan(p, "11月16日", "線形代数");
  const gone = await p.evaluate(() => [...document.querySelectorAll(".cal14-gone li")].map((x) => x.innerText.replace(/\s+/g, "")));
  ok(JSON.stringify(gone) === '["11/9（月）中止戻す","11/2（月）削除戻す","10/26（月）この回だけ変えた"]', "⑥ listed", gone);
  await p.click('.cal14-gone [data-gone="2026-11-09"]'); await p.waitForTimeout(600);
  ok(!(await ev(p, "e1")).cancel, "⑥ 中止 put back", (await ev(p, "e1")).cancel);
  await p.click('.cal14-gone [data-gone="2026-11-02"]'); await p.waitForTimeout(600);
  ok(JSON.stringify((await ev(p, "e1")).skip) === '["2026-10-26"]' && (await p.evaluate(() => window.__cal14.turns("2026-11-02"))).includes("線形代数"), "⑥ 削除 put back", (await ev(p, "e1")).skip);
  ok(await p.isHidden("#cal14LaterCard"), "⑨ none for a repeat");
  await closeSheet(p);

  // ③ the timetable's 先生 and メモ
  await p.evaluate(() => window.__cal14.tt()); await p.waitForTimeout(800);
  await p.click("#tt-1-1"); await p.waitForTimeout(400);
  await p.fill("#ttTeacher", "田中先生"); await p.fill("#ttNote", "教科書：線形代数入門");
  await p.click("#ttSave"); await p.waitForTimeout(900);
  const item = (await setting(p, "timetable")).items[0];
  ok(item.teacher === "田中先生" && item.note === "教科書：線形代数入門" && item.room === "A101", "③ kept with the class", item);
  await closeSheet(p);
  await openDayOf(p, "11月16日");
  ok(nos(await txt(p, "#calDayList")).includes("先生：田中先生"), "③ the teacher in the day's list");
  await p.locator("#calDayList .row-btn", { hasText: "線形代数" }).first().click(); await p.waitForTimeout(700);
  ok(nos(await txt(p, ".cal14-class")).startsWith("授業のこと先生：田中先生メモ：教科書：線形代数入門"), "③ in the class opened", await txt(p, ".cal14-class"));
  await closeSheet(p);

  // ④ 旅行's days
  await openPlan(p, "11月20日", "旅行");
  ok((await p.evaluate(() => document.querySelectorAll(".cal14-trip-row").length)) === 3 && (await p.inputValue("#cal14Trip0")) === "移動・ホテル", "④ a line a day");
  await p.fill("#cal14Trip1", "京都観光"); await p.press("#cal14Trip1", "Enter"); await p.waitForTimeout(600);
  ok((await ev(p, "e7")).trip["2026-11-21"] === "京都観光", "④ kept", (await ev(p, "e7")).trip);
  await p.evaluate(() => { window.__shared = []; navigator.share = (d) => { window.__shared.push(d); return Promise.resolve(); }; });
  await p.click('[data-k="trip-share"]'); await p.waitForTimeout(300);
  const tripText = (await p.evaluate(() => window.__shared))[0]?.text;
  ok(tripText === "旅行（11/20〜11/22）\n1日目 11/20（金） 移動・ホテル\n2日目 11/21（土） 京都観光\n3日目 11/22（日）", "④ sent as words", tripText);
  await closeSheet(p);
  await openDayOf(p, "11月21日");
  ok(nos(await txt(p, "#calDayList")).includes("2日目：京都観光"), "④ that day's line in its list", await txt(p, "#calDayList"));
  await closeSheet(p);

  // ②⑦ the notifications
  let al = await alarms(p);
  const soon = al.find((a) => a.tag === "cal-soon:e8:2026-11-16"), rev = al.find((a) => a.tag === "cal-review:2026-11-16");
  ok(soon && iso(soon) === "2026-11-16T04:20:00.000Z" && soon.title === "まもなく出発：面接" && soon.body === "10分後の 13:30 に出発（14:00から）", "② 10 minutes before leaving", soon);
  ok(rev && iso(rev) === "2026-11-16T12:30:00.000Z" && rev.title === "きょうの予定のふりかえり" && rev.body.startsWith("2件：線形代数・面接。"), "⑦ at 21:30", rev);

  // ⑧ the days gone by, from the gear (② and ⑦ there too)
  await p.click("#calSettings"); await p.waitForTimeout(800);
  ok((await p.inputValue("#cal14Soon")) === "10" && await p.isChecked("#cal14ReviewOn"), "②⑦ in the gear");
  await p.click("#cal14PastDim"); await p.waitForTimeout(400);
  ok((await setting(p, "calendar")).pastDim === true, "⑧ on");
  await closeSheet(p);
  ok(await p.evaluate(() => { const c = (md) => [...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith(md)); return c("11月15日").classList.contains("cal14-past") && !c("11月16日").classList.contains("cal14-past"); }), "⑧ the days before today paler");
  ok(!p.errs.length, "no error on the way", p.errs);

  // ⑦ none today once all of today's have their ふりかえり
  const d2 = make();
  for (const e of d2.events) if (e.id === "e1" || e.id === "e8") e.notes = { [today]: { mood: "good", text: "よかった" } };
  p = await open("10:00", today, d2);
  al = await alarms(p);
  ok(!al.some((a) => a.tag === "cal-review:2026-11-16") && al.some((a) => a.tag === "cal-review:2026-11-17"), "⑦ today's gone once looked back on, tomorrow's there");
  ok(!p.errs.length, "no error", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
