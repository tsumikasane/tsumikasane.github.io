// バイト その8 ④⑨⑩: what is pressed and typed
process.env.URL0 = process.env.URL0 || "http://localhost:8868/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await p.addInitScript(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); window.__copied = ""; Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true }); });
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  // ④ シフト希望: 月・木 ○ in December
  await p.click("#bt3Ask summary"); await p.waitForTimeout(300);
  ok((await txt(p, "#bt3AskBody")).includes("いつも入っている曜日：月・木"), "④ the usual days");
  await p.click("#bt8AskUsual"); await p.waitForTimeout(300);
  const marks = await p.evaluate(() => [...document.querySelectorAll('#bt3AskBody button[data-m="o"]')].map((b) => b.dataset.day));
  ok(JSON.stringify(marks) === JSON.stringify(["2026-12-03", "2026-12-07", "2026-12-10", "2026-12-14", "2026-12-17", "2026-12-21", "2026-12-24", "2026-12-28", "2026-12-31"]), "④ ○: " + JSON.stringify(marks));
  // ⑨ 代わりのお願い from the sheet
  await p.click('#shiftList [data-edit="t27"]'); await p.waitForTimeout(500);
  await p.click("#bt8SwapSend"); await p.waitForTimeout(400);
  ok((await p.evaluate(() => window.__copied)) === "11月27日（金） 17:00〜22:00のシフトに、入れなくなってしまいました。\n代わりに入っていただける方はいませんか？よろしくお願いします。", "⑨ the words: " + JSON.stringify(await p.evaluate(() => window.__copied)));
  ok((await ls(p, "shifts")).find((x) => x.id === "t27").seeking === true && await p.isChecked("#reShiftSeek"), "⑨ marked");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  ok(!(await p.evaluate(() => document.querySelector("dialog[open]"))), "⑨ closed without a word");
  ok((await txt(p, '#shiftList li:has([data-edit="t27"])')).includes("代わりを探し中"), "⑨ in the list");
  await p.click('#shiftList [data-edit="t27"]'); await p.waitForTimeout(500);
  await p.evaluate(() => { const c = document.getElementById("reShiftSeek"); c.checked = false; c.dispatchEvent(new Event("change")); }); await p.waitForTimeout(300);
  await p.locator("#recSave").click(); await p.waitForTimeout(500);
  ok(!("seeking" in (await ls(p, "shifts")).find((x) => x.id === "t27")), "⑨ taken off");
  // ⑩ in the job's form: changed, then taken off
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  const f = '#jobForms [data-job="j1"] .bt8-next';
  ok((await txt(p, f)).includes("12月1日（火）から 1,100円"), "⑩ shown: " + (await txt(p, f)));
  await p.fill(`${f} input[type="date"]`, "2027-01-01"); await p.fill(`${f} input[type="number"]`, "1150"); await p.click(`${f} .btn`); await p.waitForTimeout(500);
  let j = (await ls(p, "settings")).find((s) => s.id === "jobs").items[0];
  ok(j.wageNext.from === "2027-01-01" && j.wageNext.wage === 1150 && j.wage === 1000, "⑩ changed: " + JSON.stringify(j.wageNext));
  await p.click(`${f} .link-btn.danger`); await p.waitForTimeout(500);
  j = (await ls(p, "settings")).find((s) => s.id === "jobs").items[0];
  ok(!("wageNext" in j), "⑩ taken off");
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
