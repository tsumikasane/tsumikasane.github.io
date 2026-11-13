// カレンダー その5 ①〜⑩ (on the hooked copy at 8811)
process.env.URL0 = process.env.URL0 || "http://localhost:8811/";
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
async function open(data = make(), when = "10:00", day = today) { const p = await phone(b, at(when, day), { deviceScaleFactor: 1 }); await seed(p, data, "calendar"); await p.waitForTimeout(900); return p; }
let b;

(async () => {
  b = await chromium.launch();
  let p = await open();
  ok(!p.errs.length, "the page opens, no error", p.errs);

  // ④ the turns resting, and their notifications
  ok(!(await p.evaluate(() => window.__cal5.turns("2026-11-25"))).includes("英会話") && (await p.evaluate(() => window.__cal5.turns("2026-12-09"))).includes("英会話"), "④ no turn while it rests, back after");
  let al = await p.evaluate(() => window.__cal5.alarms(Date.now()));
  ok(al.some((a) => a.tag === "e2:2026-11-18") && !al.some((a) => a.tag === "e2:2026-11-25"), "④ no 通知アラーム while it rests", al.map((a) => a.tag));

  // ③ the day's hours, ② a run's day
  await openDayOf(p, "11月16日");
  ok(nos(await txt(p, "#cal4Day .cal5-hours")) === "予定3件・合計2時間30分", "③ the day's plans and hours (two at once counted once)", await txt(p, "#cal4Day .cal5-hours"));
  await closeSheet(p);
  await openDayOf(p, "11月21日");
  ok((await txt(p, "#calDayList")).includes("2日目（全4日）"), "② which day of the run", await txt(p, "#calDayList"));
  await closeSheet(p);

  // ⑨ 今年 何回目
  await openPlan(p, "11月21日", "美容院");
  ok((await txt(p, ".cal5-nth")) === "同じ名前の予定は、今年 3回目です", "⑨ the turn this year", await txt(p, ".cal5-nth"));
  ok(await p.evaluate(() => !document.querySelector(".cal5-pause")), "④ no お休み for a plan that doesn't repeat");
  await closeSheet(p);
  // ④ in the plan opened: said, taken off, 元に戻す
  await openPlan(p, "11月18日", "英会話");
  ok((await txt(p, ".cal5-pause .sub")).includes("11/23（月）〜12/6（日）の回はお休みです"), "④ the rest said", await txt(p, ".cal5-pause .sub"));
  await p.click('.cal5-pause [data-k="pause-off"]'); await p.waitForTimeout(600);
  ok(!(await ev(p, "e2")).pauseFrom, "④ お休みをやめる");
  await p.locator(".show button", { hasText: "元に戻す" }).first().click(); await p.waitForTimeout(600);
  ok((await ev(p, "e2")).pauseFrom === "2026-11-23", "④ 元に戻す", await ev(p, "e2"));
  await closeSheet(p);

  // ⑤ 年
  await p.click('#calViews button[data-view="year"]'); await p.waitForTimeout(600);
  ok((await txt(p, ".cal5-anniv")).includes("母の誕生日（56歳）") && (await txt(p, ".cal5-anniv")).includes("あと6日"), "⑤ the year's birthdays", await txt(p, ".cal5-anniv"));
  await p.click('#calViews button[data-view="month"]'); await p.waitForTimeout(600);

  // ⑥ 来週の予定のお知らせ
  ok(!al.some((a) => a.tag.startsWith("cal-week:")), "⑥ off at first");
  await p.click("#calSettings"); await p.waitForTimeout(700);
  await p.click("#cal5WeekOn"); await p.waitForTimeout(500);
  ok((await setting(p, "calendar"))?.week5?.on === true, "⑥ turned on", (await setting(p, "calendar"))?.week5);
  al = await p.evaluate(() => window.__cal5.alarms(Date.now()));
  const wk = al.find((a) => a.tag === "cal-week:2026-11-16");
  ok(wk && wk.title === "来週の予定 7件" && new Date(wk.at).toISOString() === "2026-11-15T11:00:00.000Z" && wk.body.includes("11/16（月） ゼミ・ゼミ・面接") && wk.body.includes("11/20（金）"), "⑥ on Sunday 20:00, the seven days after", wk);
  await closeSheet(p);

  // ① the length at a press
  await p.click("#calAdd"); await p.waitForTimeout(700);
  await p.fill("#planTitle", "勉強会");
  await setVal(p, "planTime", "10:00"); await p.waitForTimeout(200);
  ok(await p.isVisible("#planLens"), "① the lengths under 開始 and 終了");
  await p.click('#planLens [data-len="90"]'); await p.waitForTimeout(200);
  ok((await p.inputValue("#planEndTime")) === "11:30" && (await p.getAttribute('#planLens [data-len="90"]', "aria-pressed")) === "true", "① 1時間30分: ends 11:30, lit");
  await setVal(p, "planTime", "23:00"); await p.waitForTimeout(200);
  await p.click('#planLens [data-len="60"]'); await p.waitForTimeout(200);
  const d0 = await p.inputValue("#planDate"), d1 = await p.evaluate((d) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + 1); return x.toISOString().slice(0, 10); }, d0);
  ok((await p.inputValue("#planEndTime")) === "00:00" && (await p.inputValue("#planEndDate")) === d1, "① past midnight: the next day", [d0, await p.inputValue("#planEndDate"), await p.inputValue("#planEndTime")]);
  await closeSheet(p);
  if (await p.evaluate(() => document.getElementById("daySheet").open)) await closeSheet(p);

  // 予定: ⑩, ⑦ and ⑧
  p = await open();
  await p.click("#calFind"); await p.waitForTimeout(700);
  ok((await txt(p, ".cal5-dup")).includes("「ゼミ」"), "⑩ the same plan twice said", await txt(p, ".cal5-dup"));
  await p.click('.cal5-dup [data-k="dup"]'); await p.waitForTimeout(600);
  ok(!(await ev(p, "e8")) && !!(await ev(p, "e7")), "⑩ made one, the first kept");
  await p.locator(".show button", { hasText: "元に戻す" }).first().click(); await p.waitForTimeout(600);
  ok(!!(await ev(p, "e8")), "⑩ 元に戻す");
  // ⑦
  await p.click('.cal5-free [data-k="free-300"]'); await p.waitForTimeout(400);
  const free = await p.evaluate(() => [...document.querySelectorAll(".cal5-free-list li")].map((x) => x.innerText.replace(/\s+/g, "")));
  ok(free.length === 14 && free[0].includes("きょう") && free[0].includes("10:00〜22:00"), "⑦ the days with 5時間 free", free.slice(0, 3));
  // ⑧
  ok((await txt(p, ".cal5-some")).includes("温泉旅行"), "⑧ the plan with no day");
  await p.fill("#cal5SomeText", "美術館"); await p.press("#cal5SomeText", "Enter"); await p.waitForTimeout(500);
  ok((await setting(p, "calendar")).someday.map((x) => x.t).join() === "温泉旅行,美術館", "⑧ one more put in", (await setting(p, "calendar")).someday);
  await p.locator(".cal5-some-go", { hasText: "日を決める" }).first().click(); await p.waitForTimeout(800);
  ok((await p.inputValue("#planTitle")) === "温泉旅行" && (await p.inputValue("#planDate")) === today, "⑧ 日を決める: a new plan of that name");
  await p.click("#planSave"); await p.waitForTimeout(900);
  ok((await ls(p, "events")).some((e) => e.title === "温泉旅行") && (await setting(p, "calendar")).someday.map((x) => x.t).join() === "美術館", "⑧ added, and gone from the list", (await setting(p, "calendar")).someday);

  ok(!p.errs.length, "no error on the way", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
