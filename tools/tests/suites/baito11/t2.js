// バイト その11 ①④⑦⑧⑨⑩: what is pressed and typed (⑥ 時刻を変える went with その9 ⑩ 選ぶ: 2026-11-19, the user's call;
// ⑦ 勤務表を印刷 and ⑧ .ics with the month's list of shifts: 2026-11-26)
process.env.URL0 = process.env.URL0 || "http://localhost:8862/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setting = async (p, id) => (await ls(p, "settings")).find((s) => s.id === id);
const shift = async (p, id) => (await ls(p, "shifts")).find((x) => x.id === id);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today), { acceptDownloads: true });
  await p.addInitScript(() => { Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true }); });
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  // ⑥ 時刻を変える: gone with その9 ⑩ 選ぶ (2026-11-19, tools/REMOVED.md)
  ok(!(await p.$("#bt9Pick")) && !(await p.$("#bt11TimeBtn")) && !(await p.$("#bt11Time")), "⑥ gone");
  // ⑦ 勤務表を印刷, ⑧ カレンダーに入れる（.ics）: taken out with the month's list at the user's call (2026-11-26,
  // tools/REMOVED.md)
  ok(!(await p.$("#bt11PrintBtn")) && !(await p.$("#bt11Ics")) && !(await p.$("#bt11Print")), "⑦⑧ gone");
  // ① a shift 10 時間 after 塾's: said as it goes in (on its row too, till the month's list was taken out, 2026-11-26)
  await p.clock.setFixedTime(at("12:01", today)); // (the one put in last, by its time)
  await p.fill("#shiftDate", "2026-11-18"); await p.fill("#shiftStart", "07:00"); await p.fill("#shiftEnd", "10:00"); await p.fill("#shiftRest", "0");
  await p.locator('#shiftForm button[type="submit"]').click(); await p.waitForTimeout(500);
  ok((await txt(p, "#status")).includes("前の勤務の終わりから 10 時間です。休む時間が 11 時間より短くなります"), "① said: " + (await txt(p, "#status")));
  const nw = (await ls(p, "shifts")).find((x) => x.date === "2026-11-18");
  ok(!!nw, "① it went in");
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  await p.fill("#bt11Gap", "9"); await p.dispatchEvent("#bt11Gap", "change"); await p.waitForTimeout(300);
  ok((await setting(p, "bt11")).gap === 9, "① 9 時間 kept");
  // ⑨ 塾 in ピンク
  await p.selectOption('#jobForms [data-job="j2"] [data-f="color"]', "pink"); await p.waitForTimeout(600);
  ok((await setting(p, "jobs")).items.find((j) => j.id === "j2").color === "pink" && /--lc-pink/.test(await p.getAttribute('#jobForms [data-job="j2"] .bt11-swatch', "style")), "⑨ pink");
  // ④⑩ off
  await p.click("#bt11WeekOn"); await p.waitForTimeout(300); // (⑩ went with 有給休暇のめやす, 2026-11-19)
  const s = await setting(p, "bt11");
  ok(s.weekOn === false && !(await p.evaluate(() => window.__bt11.alarms(Date.now()).some((a) => /^bt11-(week|leave)/.test(a.tag)))), "④⑩ off");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  // (① at 9 時間 on the rows, ⑨ the rows in pink: went with the month's list, 2026-11-26)
  ok(/--lc-pink/.test(await p.evaluate(() => [...document.querySelectorAll("#jobSum .job-block")].find((x) => x.innerText.includes("塾"))?.getAttribute("style") || "")), "⑨ 塾's block in pink");
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
