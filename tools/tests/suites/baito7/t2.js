// バイト その7 ③④⑥⑦⑧⑩: what is typed in (⑤ シフト表の写真 は使う人が消した: 2026-11-18; ⑨ ほかの日にもコピー: 2026-11-19)
process.env.URL0 = process.env.URL0 || "http://localhost:8867/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setting = async (p, id) => (await ls(p, "settings")).find((s) => s.id === id);
// a 2 × 2 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==", "base64");
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(800);
  // ④ the form's: what it comes to as it is typed
  await p.fill("#shiftDate", "2026-11-28"); await p.fill("#shiftStart", "10:00"); await p.fill("#shiftEnd", "14:00"); await p.fill("#shiftRest", "0"); await p.dispatchEvent("#shiftEnd", "change");
  ok((await txt(p, "#bt7FormPay")) === "この勤務は 約 4,000 円（4 時間）", "④ the form: " + (await txt(p, "#bt7FormPay")));
  // ③ 日給 from the form
  await p.click("#bt7PayKind"); await p.waitForTimeout(100);
  ok((await txt(p, 'label[for="shiftWage"]')).startsWith("日給") && (await p.textContent("#bt7PayKind")) === "時給で入れる", "③ turned to 日給");
  await p.fill("#shiftWage", "9000"); await p.dispatchEvent("#shiftWage", "input");
  ok((await txt(p, "#bt7FormPay")).startsWith("この勤務は 約 9,000 円"), "④ with 日給: " + (await txt(p, "#bt7FormPay")));
  await p.locator('#shiftForm button[type="submit"]').click(); await p.waitForTimeout(500);
  let sh = (await ls(p, "shifts")).find((x) => x.date === "2026-11-28");
  ok(sh && sh.dayPay === 9000 && !("wage" in sh), "③ put in: " + JSON.stringify(sh));
  await p.click("#bt7PayKind"); // (back to 時給)
  // ⑩ one put in 1 day before 試験 (from the form; ひとことでシフト taken out 2026-11-19)
  await p.fill("#shiftDate", "2026-12-11"); await p.fill("#shiftStart", "17:00"); await p.fill("#shiftEnd", "22:00");
  await p.locator('#shiftForm button[type="submit"]').click(); await p.waitForTimeout(500);
  ok((await p.evaluate(() => document.body.innerText)).includes("試験「数学」の1日前です"), "⑩ said as it goes in");
  if ((await txt(p, "#monthNav")).includes("12月")) { await p.click("#monthNav .navbtn"); await p.waitForTimeout(300); } // (back to 11月)
  // ⑨ この勤務をほかの日にもコピー: taken out at the user's call (2026-11-19, tools/REMOVED.md)
  await p.click('#shiftList [data-edit="n1"]'); await p.waitForTimeout(500);
  ok((await p.evaluate(() => document.querySelectorAll("dialog[open]").length)) === 1 && !(await p.$("#bt7CopyDay")) && !(await txt(p, "dialog[open]")).includes("ほかの日にもコピー"), "⑨ gone from the sheet");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  if (await p.evaluate(() => !!document.querySelector("dialog[open]"))) { await p.click("#discardGo").catch(() => {}); await p.waitForTimeout(400); }
  // ⑥ その月だけの手当
  await p.click("#jobSum .bt7-extra-open"); await p.waitForTimeout(300);
  await p.fill('#jobSum [data-extra="j1|2026-11"] [data-a="name"]', "交通費の精算"); await p.fill('#jobSum [data-extra="j1|2026-11"] [data-a="amount"]', "1200");
  await p.click('#jobSum [data-extra="j1|2026-11"] .btn'); await p.waitForTimeout(500);
  const ex = (await setting(p, "bt7Extra")).items["j1|2026-11"];
  ok(ex.length === 2 && ex[1].name === "交通費の精算" && ex[1].amount === 1200 && (await txt(p, "#jobSum")).includes("交通費の精算：+1,200 円"), "⑥ added: " + JSON.stringify(ex));
  await p.click('#jobSum .bt7-extra .bt4-adv-x'); await p.waitForTimeout(400);
  ok((await setting(p, "bt7Extra")).items["j1|2026-11"].length === 1, "⑥ one taken off");
  ok(!(await p.$("#bt7Photos")) && !(await p.$("#bt7PhotoFile")), "⑤ シフト表の写真: gone");
  // ⑦⑥ the job's form; ①⑧ the お知らせ
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  const f = '#jobForms [data-job="j1"]';
  ok((await p.inputValue(`${f} [data-f="payShift"]`)) === "before" && (await p.inputValue(`${f} [data-f="allow"]`)) === "3000" && (await p.inputValue(`${f} [data-f="allowName"]`)) === "皆勤手当", "⑥⑦ the job's form");
  await p.selectOption(`${f} [data-f="payShift"]`, "after"); await p.fill(`${f} [data-f="allow"]`, ""); await p.waitForTimeout(900);
  const j = (await setting(p, "jobs")).items[0];
  ok(j.payShift === "after" && !("allow" in j) && j.allowName === "皆勤手当", "⑥⑦ saved: " + JSON.stringify([j.payShift, j.allow, j.allowName]));
  ok(await p.isChecked("#bt7GoOn") && await p.isChecked("#bt7EveOn") && (await p.inputValue("#bt7EveAt")) === "21:00", "①⑧ the settings");
  await p.fill("#bt7EveAt", "20:30"); await p.dispatchEvent("#bt7EveAt", "change"); await p.waitForTimeout(300);
  ok((await setting(p, "bt7")).eveAt === "20:30", "⑧ its time");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  // ⑦ October's 11/28 (土) now the weekday after: 11/30 (月)
  await p.click("#monthNav .navbtn"); await p.waitForTimeout(400);
  ok((await txt(p, "#jobSum")).includes("給料日 11月30日（月）"), "⑦ after: " + (await txt(p, "#jobSum")));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
