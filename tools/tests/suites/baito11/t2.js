// バイト その11 ①④⑦⑧⑨⑩: what is pressed and typed (⑥ 時刻を変える went with その9 ⑩ 選ぶ: 2026-11-19, the user's call)
process.env.URL0 = process.env.URL0 || "http://localhost:8862/";
const fs = require("fs");
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setting = async (p, id) => (await ls(p, "settings")).find((s) => s.id === id);
const shift = async (p, id) => (await ls(p, "shifts")).find((x) => x.id === id);
const pick = (p, id) => p.click(`#shiftList li[data-shift="${id}"] .body`);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today), { acceptDownloads: true });
  await p.addInitScript(() => { Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true }); });
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  // ⑥ 時刻を変える: gone with その9 ⑩ 選ぶ (2026-11-19, tools/REMOVED.md)
  ok(!(await p.$("#bt9Pick")) && !(await p.$("#bt11TimeBtn")) && !(await p.$("#bt11Time")), "⑥ gone");
  // ⑦ 勤務表を印刷
  await p.evaluate(() => { window.__printed = null; window.print = () => { const b = document.getElementById("bt11Print"); window.__printed = b ? [b.querySelector("h1").textContent, ...[...b.querySelectorAll("tr")].map((tr) => [...tr.children].map((c) => c.textContent).filter(Boolean).join(" "))].join(" / ") : null; }; });
  await p.click("#bt11PrintBtn"); await p.waitForTimeout(300);
  const pr = (await p.evaluate(() => window.__printed)) || "";
  ok(pr.startsWith("2026年11月の勤務表 / 日付 曜日 バイト先 始まり 終わり 休憩(分) 時間 見込み(円) メモ / 11/16 月 カフェ 17:00 23:00 6 6,550 / ") && pr.includes(" / 11/17 火 塾 18:00 21:00 3 4,500 / ") && pr.endsWith(" / 6 回 27 31,450"), "⑦ " + pr);
  // ⑧ .ics: an overnight one too
  await p.fill("#shiftDate", "2026-11-29"); await p.fill("#shiftStart", "22:00"); await p.fill("#shiftEnd", "05:00"); // (from the form: ひとことでシフト taken out 2026-11-19)
  await p.locator('#shiftForm button[type="submit"]').click(); await p.waitForTimeout(500);
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#bt11Ics")]);
  const ics = fs.readFileSync(await dl.path(), "utf8");
  const ev = ics.split("BEGIN:VEVENT").slice(1);
  ok(dl.suggestedFilename() === "tsumikasane-baito-2026-11.ics" && ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.trim().endsWith("END:VCALENDAR") && ev.length === 7, "⑧ the file: " + ev.length);
  const g = ev.find((e) => e.includes("UID:g1@tsumikasane-baito")) || "";
  ok(g.includes("SUMMARY:バイト（カフェ）") && g.includes("DTSTART:20261116T170000") && g.includes("DTEND:20261116T230000") && g.includes("LOCATION:駅前1-2"), "⑧ g1: " + JSON.stringify(g));
  ok(ev.some((e) => e.includes("SUMMARY:バイト（塾）") && e.includes("DTSTART:20261117T180000")) && ev.some((e) => e.includes("DTSTART:20261129T220000") && e.includes("DTEND:20261130T050000")), "⑧ 塾's, and one past midnight");
  // ① a shift 10 時間 after 塾's: said as it goes in, and on its row; at 9 時間, not
  await p.clock.setFixedTime(at("12:01", today)); // (the one put in last, by its time)
  await p.fill("#shiftDate", "2026-11-18"); await p.fill("#shiftStart", "07:00"); await p.fill("#shiftEnd", "10:00"); await p.fill("#shiftRest", "0");
  await p.locator('#shiftForm button[type="submit"]').click(); await p.waitForTimeout(500);
  ok((await txt(p, "#status")).includes("前の勤務の終わりから 10 時間です。休む時間が 11 時間より短くなります"), "① said: " + (await txt(p, "#status")));
  const nw = (await ls(p, "shifts")).find((x) => x.date === "2026-11-18");
  ok(nw && (await txt(p, `#shiftList li[data-shift="${nw.id}"]`)).includes("前の勤務から 10 時間（短め）"), "① on its row");
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  await p.fill("#bt11Gap", "9"); await p.dispatchEvent("#bt11Gap", "change"); await p.waitForTimeout(300);
  ok((await setting(p, "bt11")).gap === 9, "① 9 時間 kept");
  // ⑨ 塾 in ピンク
  await p.selectOption('#jobForms [data-job="j2"] [data-f="color"]', "pink"); await p.waitForTimeout(600);
  ok((await setting(p, "jobs")).items.find((j) => j.id === "j2").color === "pink" && /--lc-pink/.test(await p.getAttribute('#jobForms [data-job="j2"] .bt11-swatch', "style")), "⑨ pink");
  // ④⑩ off
  await p.click("#bt11WeekOn"); await p.click("#bt11LeaveOn"); await p.waitForTimeout(300);
  const s = await setting(p, "bt11");
  ok(s.weekOn === false && s.leaveOn === false && !(await p.evaluate(() => window.__bt11.alarms(Date.now()).some((a) => /^bt11-(week|leave)/.test(a.tag)))), "④⑩ off");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  ok(!(await txt(p, `#shiftList li[data-shift="${nw.id}"]`)).includes("前の勤務から") && (await txt(p, '#shiftList li[data-shift="g2"]')).includes("前の勤務から 8 時間（短め）"), "① at 9 時間");
  ok(/--lc-pink/.test(await p.getAttribute('#shiftList li[data-shift="s1"]', "style")), "⑨ the row in pink");
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
