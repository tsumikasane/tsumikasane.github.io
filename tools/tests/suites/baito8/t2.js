// バイト その8 ⑨⑩: what is pressed and typed (④ は使う人が消した: 2026-11-18)
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
  // ⑩ これから時給が変わる日: taken out at the user's call (2026-11-19, tools/REMOVED.md); wageNext stays on the job
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  ok(!(await p.$('#jobForms [data-job="j1"] .bt8-next')) && !(await txt(p, "#jobForms")).includes("これから時給が変わる日"), "⑩ gone from the job's form");
  ok(!(await txt(p, "#jobForms")).includes("時給が変わったとき"), "その2 ④ 時給が変わったとき: gone from the job's form");
  const j = (await ls(p, "settings")).find((s) => s.id === "jobs").items[0];
  ok(j.wageNext && j.wageNext.from === "2026-12-01" && j.wageNext.wage === 1100, "⑩ wageNext kept: " + JSON.stringify(j.wageNext));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
