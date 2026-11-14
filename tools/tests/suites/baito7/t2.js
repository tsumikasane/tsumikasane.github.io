// バイト その7 ③④⑤⑥⑦⑧⑨⑩: what is typed in
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
  // ④③ ひとことで
  await p.fill("#bt3QuickText", "11/29 10-14"); await p.waitForTimeout(200);
  ok((await txt(p, "#bt3QuickSay")).endsWith("（約 4,000 円）"), "④ ひとことで: " + (await txt(p, "#bt3QuickSay")));
  await p.fill("#bt3QuickText", "11/29 9-18 日給1.2万"); await p.waitForTimeout(200);
  ok((await txt(p, "#bt3QuickSay")).includes("日給 12,000円") && (await txt(p, "#bt3QuickSay")).endsWith("（約 12,000 円）"), "③ 日給1.2万: " + (await txt(p, "#bt3QuickSay")));
  // ⑩ one put in 1 day before 試験
  await p.fill("#bt3QuickText", "12/11 17-22"); await p.press("#bt3QuickText", "Enter"); await p.waitForTimeout(400);
  ok((await p.evaluate(() => document.body.innerText)).includes("試験「数学」の1日前です"), "⑩ said as it goes in");
  await p.click("#monthNav .navbtn"); await p.waitForTimeout(300); // (back to 11月)
  // ⑨ n1 copied to 11/30
  await p.click('#shiftList [data-edit="n1"]'); await p.waitForTimeout(500);
  await p.fill("#bt7CopyDay", "2026-11-30"); await p.click("#bt7CopyGo"); await p.waitForTimeout(400);
  ok((await ls(p, "shifts")).some((x) => x.date === "2026-11-30" && x.start === "17:00" && x.end === "22:00" && x.id !== "n1") && (await p.inputValue("#bt7CopyDay")) === "", "⑨ copied, the sheet still open");
  await p.fill("#bt7CopyDay", "2026-11-30"); await p.click("#bt7CopyGo"); await p.waitForTimeout(300);
  ok((await ls(p, "shifts")).filter((x) => x.date === "2026-11-30" && x.start === "17:00").length === 1, "⑨ not twice");
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
  // ⑤ a photo of the shift table, on this device
  await p.click("#bt7Photos summary"); await p.waitForTimeout(300);
  await p.setInputFiles("#bt7PhotoFile", { name: "shift.png", mimeType: "image/png", buffer: PNG }); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => document.querySelectorAll("#bt7PhotoList img").length) === 1 && (await txt(p, "#bt7PhotoHead")) === "11月のシフト表の写真（1）", "⑤ kept: " + (await txt(p, "#bt7PhotoHead")));
  await p.reload(); await p.waitForTimeout(800); await p.click("#bt7Photos summary"); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.querySelectorAll("#bt7PhotoList img").length) === 1, "⑤ still there");
  await p.click("#bt7PhotoList .bt7-photo-open"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById("bt7PhotoView").open), "⑤ shown large");
  await p.click("#bt7PhotoView .bt7-photo-close"); await p.waitForTimeout(200);
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
