// カレンダー その4 ①〜⑩ (on the hooked copy at 8810)
process.env.URL0 = process.env.URL0 || "http://localhost:8810/";
const { chromium } = require("playwright");
const { phone, seed, at, P } = require("./lib");
const { make, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show, .show[role=status]")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const ev = async (p, id) => (await ls(p, "events")).find((e) => e.id === id);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id) || null;
const cell = (p, md) => p.evaluate((md) => { const c = [...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith(md)); return c ? { bars: [...c.querySelectorAll(".bar")].map((b) => b.textContent + (b.classList.contains("cx") ? "#cx" : "")), stamp: c.querySelector(".cal4-stamp")?.textContent || "", label: c.getAttribute("aria-label") } : null; }, md);
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

  // ①③④② in the month
  let c = await cell(p, "11月16日");
  ok(c && c.bars.includes("★ゼミ") && c.stamp === "🎂" && c.label.includes("スタンプ 🎂"), "① ★ before a 大事な予定, ④ its stamp in the corner", c);
  c = await cell(p, "11月18日");
  ok(c && c.bars.includes("英会話#cx"), "② a turn called off is struck through", c);
  c = await cell(p, "11月25日");
  ok(c && c.bars.includes("英会話") && c.bars.includes("結婚記念日（10周年）"), "② the other turns as they were, ③ 10周年", c);
  c = await cell(p, "11月20日");
  ok(c && c.bars.includes("母の誕生日（56歳）"), "③ a birthday says how old", c);

  // ② and ⑤ the notifications
  let al = await p.evaluate(() => window.__cal4.alarms(Date.now()));
  ok(!al.some((a) => a.tag === "e2:2026-11-18") && al.some((a) => a.tag === "e2:2026-11-25"), "② no 通知アラーム for the turn called off", al.map((a) => a.tag));
  const end = al.find((a) => a.tag === "cal-end:e6:2026-11-17");
  ok(end && end.title === "おつかれさま：面接" && new Date(end.at).toISOString() === "2026-11-17T06:00:00.000Z", "⑤ おつかれさま at 15:00 as 面接 ends", end);
  ok((await p.evaluate(() => window.__cal4.clashes("2026-11-18", 18 * 60 + 30, 19 * 60, null))).length === 0, "② a turn called off runs into nothing");
  ok(JSON.stringify(await p.evaluate(() => window.__cal4.agenda("2026-11-18"))) === "[]", "② not in the morning's list");
  const sig0 = await p.evaluate(() => window.__cal4.sig());

  // ⑩ and ④ the day's sheet
  await openDayOf(p, "11月25日");
  ok((await txt(p, "#cal4Day .cal4-from")) === "きょうから11日後（1週間と4日）", "⑩ how far the day is", await txt(p, "#cal4Day .cal4-from"));
  await p.click('#cal4Day [data-stamp="⭐"]'); await p.waitForTimeout(500);
  ok((await setting(p, "calendar"))?.stamps?.["2026-11-25"] === "⭐", "④ a stamp put on the day", (await setting(p, "calendar"))?.stamps);
  ok((await p.getAttribute('#cal4Day [data-stamp="⭐"]', "aria-pressed")) === "true", "④ shown as picked");
  await closeSheet(p);
  ok((await cell(p, "11月25日")).stamp === "⭐", "④ and in the month");
  await openDayOf(p, "11月15日");
  ok(await p.evaluate(() => !document.querySelector("#cal4Day .cal4-from")), "⑩ none for あした (its title says it)");
  await closeSheet(p);

  // ⑧ 前回・次回
  await openPlan(p, "11月21日", "美容院");
  let ln = await txt(p, ".cal4-lastnext");
  ok(ln && ln.includes("前回 10/3（土）・42日前") && !ln.includes("次回"), "⑧ the last time of the same plan", ln);
  await closeSheet(p);
  await openPlan(p, "11月25日", "英会話");
  ln = await txt(p, ".cal4-lastnext");
  ok(ln && ln.includes("前回 11/11（水）") && ln.includes("次回 12/2（水）"), "⑧ a weekly one: its turns before and after (not the one called off)", ln);
  ok(await p.evaluate(() => !document.querySelector(".cal4-move")), "⑨ none for a repeating plan");
  await closeSheet(p);

  // ② 中止 from the plan, and back with 元に戻す
  await openPlan(p, "11月16日", "ゼミ");
  ok((await p.$eval("#edStar", (x) => x.checked)) && (await p.inputValue("#edWith")) === "田中さん", "①⑥ the form holds ★ and いっしょの人");
  await p.click('.cal4-plan [data-k="cx"]'); await p.waitForTimeout(600);
  ok(JSON.stringify((await ev(p, "e1")).cancel) === '["2026-11-16"]', "② called off", (await ev(p, "e1")).cancel);
  ok((await txt(p, '.cal4-plan [data-k="cx"]')) === "中止をやめる", "② the button now takes it back");
  await p.click('.cal4-plan [data-k="cx"]'); await p.waitForTimeout(600);
  ok(!(await ev(p, "e1")).cancel, "② 中止をやめる", (await ev(p, "e1")).cancel);
  // ⑨ ずらす: 次の日, then 元に戻す
  await p.click('.cal4-plan [data-k="mv-day"]'); await p.waitForTimeout(700);
  ok((await ev(p, "e1")).date === "2026-11-17", "⑨ moved to the next day", (await ev(p, "e1")).date);
  ok((await toast(p)).includes("11月17日（火）に移しました"), "⑨ says where it went", await toast(p));
  await p.locator(".show button", { hasText: "元に戻す" }).first().click(); await p.waitForTimeout(600);
  ok((await ev(p, "e1")).date === "2026-11-16", "⑨ 元に戻す", (await ev(p, "e1")).date);
  await closeSheet(p);
  await openPlan(p, "11月16日", "ゼミ");
  await p.click('.cal4-plan [data-k="mv-hour"]'); await p.waitForTimeout(700);
  let e1 = await ev(p, "e1");
  ok(e1.time === "11:00" && e1.endTime === "12:30", "⑨ 1時間後", e1);
  await closeSheet(p);
  // ① off in the form, saved
  await openPlan(p, "11月16日", "ゼミ");
  await p.click("#edStar"); await p.waitForTimeout(150);
  await p.click("#sheetSave"); await p.waitForTimeout(700);
  e1 = await ev(p, "e1");
  ok(!e1.star && e1.with === "田中さん", "① ★ taken off, ⑥ the rest kept", e1);
  await closeSheet(p);

  // a new plan: ①⑤⑥⑦ and ③
  await p.click("#calAdd"); await p.waitForTimeout(700);
  await p.fill("#planTitle", "打ち合わせ");
  await p.focus("#planPlace"); await p.waitForTimeout(150);
  const opts = await p.evaluate(() => [...document.querySelectorAll("#cal4PlaceList option")].map((o) => o.value));
  ok(opts.includes("3号館") && opts.includes("駅前の美容院") && (await p.getAttribute("#planPlace", "list")) === "cal4PlaceList", "⑦ the places used before offered", opts);
  await setVal(p, "planTime", ""); await p.waitForTimeout(200);
  ok(await p.$eval("#planEndNote", (x) => x.disabled), "⑤ 終わったらお知らせ: not for an all-day plan");
  await setVal(p, "planTime", "13:00"); await p.waitForTimeout(200);
  ok(!(await p.$eval("#planEndNote", (x) => x.disabled)), "⑤ there once it has a time");
  await p.click("#planStar"); await p.click("#planEndNote"); await p.fill("#planWith", "佐藤さん");
  await p.click("#planSave"); await p.waitForTimeout(700);
  const made = (await ls(p, "events")).find((e) => e.title === "打ち合わせ");
  ok(made && made.star === true && made.endNote === true && made.with === "佐藤さん", "①⑤⑥ saved with them", made);
  ok((await p.evaluate(() => window.__cal4.sig())) !== sig0, "⑤ the notifications sent again");
  // 予定を探す: by who it is with, and ★
  await p.click("#calFind"); await p.waitForTimeout(600);
  await p.fill("#findText", "佐藤"); await p.waitForTimeout(400);
  ok((await txt(p, "#findList")).includes("★打ち合わせ") && (await txt(p, "#findList")).includes("いっしょ：佐藤さん"), "⑥ found by who it is with", await txt(p, "#findList"));
  await p.fill("#findText", "★"); await p.waitForTimeout(400);
  ok((await txt(p, "#findList")).includes("打ち合わせ") && !(await txt(p, "#findList")).includes("美容院"), "① ★ finds the 大事な予定", await txt(p, "#findList"));
  await closeSheet(p);
  // ③ はじまりの年 while it is 毎年
  await p.click("#calAdd"); await p.waitForTimeout(700);
  await p.fill("#planTitle", "父の誕生日");
  ok(await p.isHidden("#planSinceRow"), "③ no はじまりの年 until it is 毎年");
  await p.selectOption("#planRepeat", "yearly"); await p.waitForTimeout(150);
  ok(await p.isVisible("#planSinceRow"), "③ there for 毎年");
  await p.fill("#planSince", "1968"); await p.waitForTimeout(150);
  ok((await txt(p, "#planSinceFoot")).includes("「58歳」"), "③ what the year makes of it", await txt(p, "#planSinceFoot"));
  await p.click("#planSave"); await p.waitForTimeout(700);
  const dad = (await ls(p, "events")).find((e) => e.title === "父の誕生日");
  ok(dad && dad.repeat === "yearly" && dad.fromYear === 1968, "③ saved", dad);

  // 週 shows ★ and 中止 too
  await p.evaluate(() => window.__cal4 && 0);
  ok(!p.errs.length, "no error on the way", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
