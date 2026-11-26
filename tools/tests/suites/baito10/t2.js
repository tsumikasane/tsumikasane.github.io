// バイト その10 ②⑦⑧: what is pressed and typed (④⑨ は使う人が消した: 2026-11-18; ①⑩ は出勤・退勤といっしょに)
process.env.URL0 = process.env.URL0 || "http://localhost:8869/";
const { chromium } = require("playwright");
const { P, at, phone, seed, openShift } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setting = async (p, id) => (await ls(p, "settings")).find((s) => s.id === id);
const job = async (p, id) => (await setting(p, "jobs")).items.find((j) => j.id === id);
const shift = async (p, id) => (await ls(p, "shifts")).find((x) => x.id === id);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  // ① 出勤前・退勤前にやること and ⑩ 休憩: went with 出勤・退勤 (2026-11-18, the user's call); the shift of today stays as it was put in
  ok(!(await p.$("#bt2Clock")) && !(await p.$(".bt10-checks")) && !(await p.$("#bt10Break")), "①⑩ (taken out) gone");
  const td = await shift(p, "td");
  ok(td.start === "12:00" && td.end === "17:00" && td.rest === 0 && !("clocked" in td), "①⑩ the shift of today as it was: " + JSON.stringify(td));
  // ② いっしょ in the sheet
  await openShift(p, "c3");
  ok((await p.inputValue("#reShiftWith")) === "田中", "② in the sheet");
  await p.fill("#reShiftWith", "田中、 鈴木・田中"); await p.locator("#recSave").click(); await p.waitForTimeout(600);
  ok(JSON.stringify((await shift(p, "c3")).with) === JSON.stringify(["田中", "鈴木"]), "② kept: " + JSON.stringify((await shift(p, "c3")).with));
  // ⑦ 件数 in the sheet
  await openShift(p, "d1");
  ok((await p.inputValue("#reShiftUnits")) === "12", "⑦ in the sheet");
  await p.fill("#reShiftUnits", "15"); await p.locator("#recSave").click(); await p.waitForTimeout(600);
  ok((await shift(p, "d1")).units === 15, "⑦ kept");
  ok(/出来高 23\s件・\+6,900\s円/.test(await p.evaluate(() => [...document.querySelectorAll("#jobSum .job-block")].find((b) => b.innerText.includes("配達"))?.innerText.replace(/\s+/g, " ") || "")), "⑦ the month again");
  // ② the names, 鈴木 too (pressed to look for until 勤務を探す was taken off 2026-11-18)
  const w = await txt(p, "#bt10With p.bt10-with");
  ok(w.startsWith("田中 3 回・") && w.includes("鈴木 1 回") && w.split("・").length === 3 && !(await p.$("#bt10With button")), "② the names: " + w);
  // ⑦ ひとことで: taken out with ひとことでシフト (2026-11-18, the user's call); 件数 in the sheet is checked above
  ok(!(await p.$("#bt3QuickText")), "⑦ (taken out) ひとことでシフト: gone");
  // as カフェ is left: 借りているもの no more said (消した: 2026-11-18); not left
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  await p.click('#jobForms [data-job="j1"] .bt9-end'); await p.waitForTimeout(300);
  ok((await txt(p, "#confirmMsg")).startsWith("「カフェ」をやめたことにしますか？") && !(await txt(p, "#confirmMsg")).includes("借りているもの"), "no 借りているもの: " + (await txt(p, "#confirmMsg")));
  await p.click("#confirmNo"); await p.waitForTimeout(300);
  ok(!("ended" in (await job(p, "j1"))), "not left");
  // ⑧ its お知らせ off; ⑦ the price changed (① the lists' rows went with 出勤・退勤)
  await p.uncheck('#jobForms [data-job="j1"] [data-f="contractAlarm"]'); await p.waitForTimeout(700);
  ok((await job(p, "j1")).contractAlarm === false && !(await p.evaluate(() => window.__bt10.alarms(Date.now()).some((a) => a.tag.startsWith("bt10-contract")))), "⑧ off");
  ok(!(await p.$('#jobForms [data-job="j1"] [data-f="checksOut"]')) && JSON.stringify((await job(p, "j1")).checks) === JSON.stringify({ in: ["名札をつける", "シフト表を見る"], out: ["レジ締め"] }), "① (taken out) no rows; the lists kept: " + JSON.stringify((await job(p, "j1")).checks));
  await p.fill('#jobForms [data-job="j2"] [data-f="unitPrice"]', "350"); await p.waitForTimeout(900);
  ok((await job(p, "j2")).unitPrice === 350, "⑦ the price");
  await p.fill('#jobForms [data-job="j1"] [data-f="contractEnd"]', ""); await p.waitForTimeout(900);
  ok(!("contractEnd" in (await job(p, "j1"))), "⑧ the contract's end taken off");
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
