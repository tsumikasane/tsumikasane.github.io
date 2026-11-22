// カレンダー その18 ①〜⑩ (on the hooked copy at 8964)
process.env.URL0 = process.env.URL0 || "http://localhost:8964/";
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
const closeSheet = async (p) => { for (let i = 0; i < 6 && (await p.evaluate(() => document.getElementById("daySheet").open)); i++) { if (await p.evaluate(() => document.getElementById("discardAsk").open)) await p.click("#discardYes"); else await p.keyboard.press("Escape"); await p.waitForTimeout(700); } };
const undo = async (p) => { await p.locator(".toast.show button", { hasText: "元に戻す" }).first().click(); await p.waitForTimeout(700); };
const tap = (p, sel) => p.evaluate((sel) => document.querySelector(sel).click(), sel);
const alarms = (p) => p.evaluate(() => window.__cal18.alarms(Date.now()));
const iso = (a) => (a ? new Date(a.at).toISOString() : null);
async function open(when = "10:00", day = today, data = make()) { const p = await phone(b, at(when, day), { deviceScaleFactor: 1 }); await seed(p, data, "calendar"); await p.waitForTimeout(900); return p; }
let b;

(async () => {
  b = await chromium.launch();
  let p = await open();
  ok(!p.errs.length, "the page opens, no error", p.errs);

  // ① 旅行's payment due tomorrow: the notifications
  let al = await alarms(p);
  const d1 = al.find((a) => a.tag === "cal-due:e1:2026-11-17:1"), d0 = al.find((a) => a.tag === "cal-due:e1:2026-11-17:0");
  ok(d1 && iso(d1) === "2026-11-16T11:00:00.000Z" && d1.title === "あしたは支払いの締め切り" && d1.body === "「旅行」（11月21日（土））", "① the evening before", d1);
  ok(d0 && iso(d0) === "2026-11-17T00:00:00.000Z" && d0.title === "きょうは支払いの締め切り", "① that morning", d0);
  // ⑩ the secret one's notification
  const sec = al.find((a) => a.tag === "e2:2026-11-16");
  ok(sec && sec.title === "予定のお知らせ" && sec.body === "きょう 14:00〜15:00", "⑩ its name and place kept out", sec);

  // ⑩ the month, a day's list, きょう's tile
  const bars = await p.evaluate(() => [...[...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith("11月16日")).querySelectorAll(".bar")].map((x) => x.textContent));
  ok(bars.includes("ひみつの予定") && !bars.some((x) => x.includes("面接")), "⑩ in the month", bars);
  await openDayOf(p, "11月16日");
  const row = nos(await p.locator("#calDayList li", { hasText: "ひみつの予定" }).first().innerText());
  ok(row.includes("ひみつの予定") && !row.includes("面接") && !row.includes("本社") && !row.includes("社名"), "⑩ in a day's list: no name, place or memo", row);
  await p.locator("#calDayList .row-btn", { hasText: "ひみつの予定" }).first().click(); await p.waitForTimeout(700);
  ok((await p.inputValue("#edTitle")) === "面接" && await p.isChecked("#edSecret"), "⑩ opened: there, ひみつ on");
  await closeSheet(p);

  // ④ from ゼミ on, 30 minutes later (線形代数 at 9:00 before it stays)
  await openDayOf(p, "11月16日");
  await p.locator("#calDayList .row-btn", { hasText: "ゼミ" }).first().click({ button: "right" }); await p.waitForTimeout(300);
  ok((await txt(p, '#cal16Menu [data-k="m-after"]')) === "この予定から後ろを30分ずらす", "④ in the menu", await txt(p, '#cal16Menu [data-k="m-after"]'));
  await p.click('#cal16Menu [data-k="m-after"]'); await p.waitForTimeout(800);
  const times = await Promise.all(["e3", "e4", "e2", "e5"].map(async (id) => (await ev(p, id)).time));
  ok(JSON.stringify(times) === '["10:30","13:00","14:30","16:30"]' && !(await ev(p, "e7")).skip, "④ ゼミ and those after it", times);
  await undo(p);
  ok((await ev(p, "e3")).time === "10:00" && (await ev(p, "e5")).time === "16:00", "④ 元に戻す");

  // ① that day: what is due, pressed to the plan
  await p.evaluate(() => document.getElementById("dayNext").click()); await p.waitForTimeout(500);
  ok(nos(await txt(p, "#cal18DueDay")) === "この日が締め切り支払い：旅行（11/21（土））", "① over the day's list", await txt(p, "#cal18DueDay"));
  await p.click('[data-due="e1"]'); await p.waitForTimeout(700);
  ok((await p.inputValue("#edTitle")) === "旅行" && nos(await txt(p, ".cal18-due-card")) === "支払いの締め切り11月17日（火）あした", "① the plan opened: said at its top", await txt(p, ".cal18-due-card"));
  ok((await p.inputValue("#edDueKind")) === "pay" && (await p.inputValue("#edDueDay")) === "2026-11-17", "① in its form");
  await closeSheet(p);

  // ⑧ 打ち合わせ's days as words
  await openPlan(p, "11月19日", "打ち合わせ");
  await p.evaluate(() => { window.__shared = []; navigator.share = (d) => { window.__shared.push(d); return Promise.resolve(); }; });
  await p.click('[data-k="cand-share"]'); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__shared))[0]?.text === "「打ち合わせ」の候補日です。\n・11月19日（木） 15:00〜16:00\n・11月20日（金） 10:00〜11:00\n・11月21日（土） 終日\nご都合のよい日を教えてください。", "⑧ sent", await p.evaluate(() => window.__shared));
  await closeSheet(p);

  // ③ ② a new plan: a label from the words in its name, then ゼミ's length and place as it is picked
  await p.click("#calAdd"); await p.waitForTimeout(700);
  ok((await p.inputValue("#planTime")) === "11:00" && (await p.inputValue("#planEndTime")) === "12:00", "② an hour at first");
  await p.fill("#planTitle", "輪講の準備"); await p.waitForTimeout(300);
  ok((await p.evaluate(() => document.querySelector('#planLabels input[value="l1"]').checked)) && (await p.inputValue("#planPlace")) === "研究棟" && (await p.inputValue("#planEndTime")) === "12:30", "③② picked from 輪講, its 90分 and place", [await p.inputValue("#planEndTime"), await p.inputValue("#planPlace")]);
  await p.fill("#planTitle", "買い物"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('#planLabels input[value=""]').checked), "③ taken off as the words go");
  await p.evaluate(() => document.querySelector('#planLabels input[value="l2"]').click()); await p.fill("#planTitle", "ゼミの発表"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('#planLabels input[value="l2"]').checked), "③ one picked by hand stays");
  // ① and ⑩ kept with a new plan
  await p.selectOption("#planDueKind", "cancel"); await p.fill("#planDueDay", "2026-11-18"); await p.check("#planSecret");
  await p.click("#planSave"); await p.waitForTimeout(800);
  const made = (await ls(p, "events")).find((e) => e.title === "ゼミの発表");
  ok(made && JSON.stringify(made.due18) === '{"k":"cancel","d":"2026-11-18"}' && made.secret === true && made.labelId === "l2", "①⑩ kept", made);
  await closeSheet(p);

  await p.click("#calAdd"); await p.waitForTimeout(700);
  await p.fill("#planTitle", "読書会"); await p.evaluate(() => document.querySelector('#planLabels input[value="l1"]').click()); await p.waitForTimeout(300);
  ok((await p.inputValue("#planEndTime")) === "12:30" && (await p.inputValue("#planPlace")) === "研究棟", "② ゼミ picked by hand: its 90分 and place", [await p.inputValue("#planEndTime"), await p.inputValue("#planPlace")]);
  await closeSheet(p);

  // ⑥ ⑦ ⑨ the gear
  ok(JSON.stringify(await p.evaluate(() => window.__cal18.free("2026-11-16"))) === '["12:00〜12:30","13:00〜14:00","15:00〜16:00","17:00〜22:00"]', "⑦ the free times before", await p.evaluate(() => window.__cal18.free("2026-11-16")));
  await p.click("#calSettings"); await p.waitForTimeout(800);
  await p.selectOption("#cal18Pad", "30"); await p.waitForTimeout(400);
  ok((await setting(p, "calendar")).pad18 === 30 && JSON.stringify(await p.evaluate(() => window.__cal18.free("2026-11-16"))) === '["17:30〜22:00"]', "⑦ 30分 kept free around each", await p.evaluate(() => window.__cal18.free("2026-11-16")));
  // ⑨ 最後の回のお知らせ taken out (the user's call, 2026-11-22): not in the gear, and none comes, though on from before (data.js)
  ok(!(await p.$("#cal18Last")) && !(await txt(p, "#daySheet")).includes("最後の回のお知らせ"), "⑨ taken out: not in the gear");
  al = await alarms(p);
  ok(!al.some((a) => String(a.tag).startsWith("cal-last:")) && (await setting(p, "calendar")).last18 === true, "⑨ taken out: none the evening before a last turn, the setting kept", al.map((a) => a.tag));
  ok(await p.isVisible("#cal18Defs") && (await p.inputValue("#cal18Len-l1")) === "90" && (await p.inputValue("#cal18Words-l1")) === "ゼミ、輪講", "②③ in the gear");
  await p.fill("#cal18Place-l2", "1号館"); await p.press("#cal18Place-l2", "Tab"); await p.waitForTimeout(400);
  ok((await setting(p, "calendar")).labelDefs18?.l2?.place === "1号館", "② another kept");
  await p.evaluate(() => document.getElementById("cal18Help").scrollIntoView()); await p.waitForTimeout(200);
  await p.click("#cal18HelpOpen"); await p.waitForTimeout(400);
  await p.fill("#cal18HelpFind", "締め切り"); await p.waitForTimeout(300);
  const found = await p.evaluate(() => [...document.querySelectorAll("#cal18HelpList dt")].map((x) => x.textContent));
  ok(found.includes("場所・URL・電話・予約番号・締め切り") && found.length >= 2, "⑥ looked for", found);
  await p.fill("#cal18HelpFind", "あいうえおかきくけこ"); await p.waitForTimeout(300);
  ok((await txt(p, "#cal18HelpList")).includes("に合うものはありません"), "⑥ none");
  await closeSheet(p);

  // ⑤ the timetable printed
  await p.evaluate(() => window.__cal18.tt()); await p.waitForTimeout(800);
  await p.evaluate(() => { window.__printed = null; window.print = () => { window.__printed = document.getElementById("cal8Print")?.innerText || ""; }; });
  await p.click("#cal18TTPrint"); await p.waitForTimeout(400);
  const printed = nos(await p.evaluate(() => window.__printed));
  ok(printed.startsWith("時間割（10/1（木）〜2027/2/10（水））") && printed.includes("1限09:00〜10:30線形代数A101田中先生") && printed.includes("英語B202"), "⑤ a table on paper", printed);
  await closeSheet(p);

  ok(!p.errs.length, "no error", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
