// バイト その15 ①②③⑦⑧⑩: what is pressed and typed
process.env.URL0 = process.env.URL0 || "http://localhost:8876/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setting = async (p, id) => (await ls(p, "settings")).find((s) => s.id === id);
const job = async (p, id) => (await setting(p, "jobs")).items.find((j) => j.id === id);
const tags = (p) => p.evaluate(() => window.__bt15.alarms(Date.now()).filter((a) => /^bt15-/.test(a.tag)).map((a) => a.tag));
const copied = (p) => p.evaluate(() => window.__copied);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await p.addInitScript(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); window.__copied = ""; Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true }); });
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  // ③ the example 打刻の修正のお願い, for the 11/24 shift, in words
  await p.click("#bt15Tpl summary"); await p.waitForTimeout(300);
  ok((await p.inputValue("#bt15TplShift")) === "c4", "③ the next shift at first");
  await p.click("#bt15TplBody .bt15-tpl0 button"); await p.waitForTimeout(300);
  await p.selectOption("#bt15TplShift", "c5"); await p.waitForTimeout(300);
  await p.click("#bt15TplBody li.bt15-tpl .btn"); await p.waitForTimeout(300);
  ok((await copied(p)) === "お疲れさまです。11/24（火）の勤務（17:00〜22:00）の打刻を忘れてしまいました。修正をお願いできますか。", "③ " + (await copied(p)));
  // ③ one of the user's own
  await p.fill('#bt15TplBody [data-t="name"]', "入れる時間"); await p.fill('#bt15TplBody [data-t="body"]', "{バイト先}の{日付}は{開始}から入れます");
  await p.click("#bt15TplSave"); await p.waitForTimeout(300);
  const tp = (await setting(p, "bt15")).tpls;
  ok(tp.length === 2 && tp[1].name === "入れる時間" && tp[1].body === "{バイト先}の{日付}は{開始}から入れます", "③ kept: " + JSON.stringify(tp));
  await p.click(`#bt15TplBody li[data-tpl="${tp[1].id}"] .btn`); await p.waitForTimeout(300);
  ok((await copied(p)) === "カフェの11/24（火）は17:00から入れます", "③ mine: " + (await copied(p)));
  await p.click(`#bt15TplBody li[data-tpl="${tp[1].id}"] .bt15-tpl-name`); await p.waitForTimeout(300);
  ok((await txt(p, `#bt15TplBody li[data-tpl="${tp[1].id}"] .bt15-tpl-text`)) === "カフェの11/24（火）は17:00から入れます", "③ opened, filled in");
  await p.click(`#bt15TplBody li[data-tpl="${tp[0].id}"] .bt4-adv-x`); await p.waitForTimeout(300);
  ok((await setting(p, "bt15")).tpls.length === 1, "③ off");
  await p.click(".toast.show .toast-undo"); await p.waitForTimeout(300);
  ok((await setting(p, "bt15")).tpls.length === 2, "③ back");
  // ⑩ the 3 days put in as 仮 at once, and taken back
  await p.click("#bt15ReachAdd"); await p.waitForTimeout(500);
  const tent = (await ls(p, "shifts")).filter((x) => x.tentative).map((x) => [x.date, x.start, x.end, x.jobId]).sort();
  ok(JSON.stringify(tent) === JSON.stringify([["2026-11-23", "17:00", "22:00", "j1"], ["2026-11-28", "17:00", "22:00", "j1"], ["2026-11-30", "17:00", "22:00", "j1"]]) && (await p.isHidden("#bt15Reach")), "⑩ " + JSON.stringify(tent));
  await p.click(".toast.show .toast-undo"); await p.waitForTimeout(500);
  ok(!(await ls(p, "shifts")).some((x) => x.tentative) && !(await p.isHidden("#bt15Reach")), "⑩ taken back");
  // ① a shift to 23:45: said as it goes in
  await p.clock.setFixedTime(at("12:01", today));
  await p.selectOption("#shiftJob", "j1"); await p.fill("#shiftDate", "2026-11-27"); await p.fill("#shiftStart", "18:00"); await p.fill("#shiftEnd", "23:45"); await p.fill("#shiftRest", "0");
  await p.locator('#shiftForm button[type="submit"]').click(); await p.waitForTimeout(500);
  ok((await txt(p, "#status")).includes("終電（23:40）に間に合わないかもしれません（駅まで 15 分）"), "① said: " + (await txt(p, "#status")));
  // ② 1分ごとに; ⑦ 塾 ticked too; ⑦⑧ お知らせ off
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  await p.selectOption('#jobForms [data-job="j1"] [data-f="round"]', "0"); await p.waitForTimeout(900);
  ok(!("round" in (await job(p, "j1"))), "② each minute");
  await p.click('#jobForms [data-job="j2"] [data-f="fuyo"]'); await p.waitForTimeout(900);
  ok((await job(p, "j2")).fuyo === true, "⑦ 塾 ticked");
  await p.click("#bt15TaxChk"); await p.click("#bt15HuntChk"); await p.waitForTimeout(300);
  ok((await setting(p, "bt15")).taxChk === false && (await setting(p, "bt15")).huntOff === true && !(await tags(p)).length, "⑦⑧ off: " + JSON.stringify(await tags(p)));
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  ok((await txt(p, '#shiftList li[data-shift="c2"]')).includes("4,896 円") && !(await p.$("#jobSum .bt15-notes")), "② the 11/9 shift: " + (await txt(p, '#shiftList li[data-shift="c2"]')));
  ok((await txt(p, "#bt15Tax")).includes("扶養控除等申告書は、1か所にしか出せません。"), "⑦ two of them: " + (await txt(p, "#bt15Tax")));
  // ⑧ the interview in the calendar; パン屋 in, 採用, made a job
  await p.click("#bt15Hunt summary"); await p.waitForTimeout(300);
  await p.click('#bt15HuntBody li[data-hunt="h1"] .btn.ghost'); await p.waitForTimeout(600);
  const ev = (await ls(p, "events")).find((e) => e.title === "面接：本屋");
  ok(ev && ev.date === "2026-11-21" && ev.time === "15:00" && ev.endTime === "16:00" && ev.memo === "駅前" && (await setting(p, "bt15")).hunt[0].ev === ev.id && !(await p.$('#bt15HuntBody li[data-hunt="h1"] .btn.ghost')), "⑧ in the calendar: " + JSON.stringify(ev));
  await p.fill('#bt15HuntBody [data-h="name"]', "パン屋"); await p.fill('#bt15HuntBody [data-h="wage"]', "1050"); await p.fill('#bt15HuntBody [data-h="memo"]', "家の近く");
  await p.click("#bt15HuntAdd"); await p.waitForTimeout(400);
  const h2 = (await setting(p, "bt15")).hunt.find((x) => x.name === "パン屋");
  ok(h2 && h2.wage === 1050 && h2.st === "sent" && h2.memo === "家の近く" && !h2.day, "⑧ in: " + JSON.stringify(h2));
  await p.selectOption(`#bt15HuntBody li[data-hunt="${h2.id}"] select`, "got"); await p.waitForTimeout(400);
  await p.click(`#bt15HuntBody li[data-hunt="${h2.id}"] .btn:not(.ghost)`); await p.waitForTimeout(500);
  const j3 = (await setting(p, "jobs")).items.find((j) => j.name === "パン屋");
  ok(j3 && j3.wage === 1050 && j3.fromHunt === h2.id && (await setting(p, "bt15")).hunt.find((x) => x.id === h2.id).st === "got" && !(await p.$(`#bt15HuntBody li[data-hunt="${h2.id}"] .btn:not(.ghost)`)), "⑧ a job: " + JSON.stringify(j3));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
