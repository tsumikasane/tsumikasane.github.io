// バイト その3 ⑨ 給料日のお知らせ, and the settings (⑧ シフト希望 は使う人が消した: 2026-11-18)
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
