// バイト その3 ⑧ シフト希望, ⑨ 給料日のお知らせ, and the settings
process.env.URL0 = process.env.URL0 || "http://localhost:8861/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const st = (p) => p.evaluate((P) => (JSON.parse(localStorage.getItem(P + "settings")) || []).find((s) => s.id === "bt3") || {}, P);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await p.addInitScript(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); window.__copied = ""; Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true }); });
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(800);
  // ⑧ December's: 12/1 ○, 12/2 △, 12/3 ×
  await p.click("#bt3Ask summary"); await p.waitForTimeout(300);
  await p.click('#bt3AskBody button[data-day="2026-12-01"]');
  for (let i = 0; i < 2; i++) await p.click('#bt3AskBody button[data-day="2026-12-02"]');
  for (let i = 0; i < 3; i++) await p.click('#bt3AskBody button[data-day="2026-12-03"]');
  await p.fill('#bt3AskBody input[type="text"]', "平日は17時から");
  await p.click("#bt3AskSend"); await p.waitForTimeout(300);
  const t = await p.evaluate(() => window.__copied);
  ok(t === "12月のシフト希望\n○ 入れる：1(火)\n△ 時間しだい：2(水)\n× 入れない：3(木)\n平日は17時から", "⑧ the words: " + JSON.stringify(t));
  await p.reload(); await p.waitForTimeout(800); await p.click("#bt3Ask summary"); await p.waitForTimeout(300);
  ok(await p.getAttribute('#bt3AskBody button[data-day="2026-12-02"]', "data-m") === "t", "⑧ kept on this device");
  // the settings: 週の上限, 月の目標, 給料日のお知らせ
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  ok(await p.inputValue("#bt3WeekMax") === "20" && await p.inputValue("#bt3Aim") === "60000", "settings shown");
  await p.fill("#bt3WeekMax", "28"); await p.press("#bt3WeekMax", "Tab"); await p.waitForTimeout(300);
  ok((await st(p)).weekMax === 28, "④ limit saved");
  await p.evaluate(() => { const c = document.getElementById("bt3PayOn"); c.checked = true; c.dispatchEvent(new Event("change")); }); await p.waitForTimeout(300);
  ok((await st(p)).payOn === true, "⑨ on");
  // ⑨ 11/25 09:00: October's pay (末日締め・翌月25日払い)
  const al = await p.evaluate(() => window.__bt3.alarms(Date.now()).filter((a) => String(a.tag).startsWith("bt3-pay:")));
  ok(al.length >= 1 && al[0].title === "きょうは給料日" && al[0].body.startsWith("カフェの10月分・見込み 12,600円") && al[0].at === Date.parse("2026-11-25T09:00:00+09:00"), "⑨ alarm: " + JSON.stringify(al[0]));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
