// バイト その15 ①②③⑧⑩: what is pressed and typed (⑦ 年末調整と源泉徴収票 は使う人が消した: 2026-11-18)
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
  // ② 1分ごとに, the job's ⑦ tick (j.fuyo) kept as its form is saved; ⑧ お知らせ off
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  await p.selectOption('#jobForms [data-job="j1"] [data-f="round"]', "0"); await p.waitForTimeout(900);
  ok(!("round" in (await job(p, "j1"))) && (await job(p, "j1")).fuyo === true, "② each minute; ⑦'s tick kept");
  ok(!(await p.$("#bt15HuntChk")) && (await setting(p, "bt15")).taxChk === true && !(await tags(p)).length, "⑧ its お知らせ gone (⑦'s taxChk kept, nothing sent): " + JSON.stringify(await tags(p)));
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  ok((await txt(p, '#shiftList li[data-shift="c2"]')).includes("4,896 円") && !(await p.$("#jobSum .bt15-notes")), "② the 11/9 shift: " + (await txt(p, '#shiftList li[data-shift="c2"]')));
  // ⑧ バイト探し: taken out at the user's call (2026-11-19, tools/REMOVED.md); what was put in stays
  ok(!(await p.$("#bt15Hunt")) && (await setting(p, "bt15")).hunt.some((x) => x.name === "本屋"), "⑧ gone, what was put in kept");
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
