// カレンダー その2: (年 turned by a swipe: 年 taken out, 2026-11-24); a ふりかえり being typed isn't redrawn under the finger
process.env.URL0 = process.env.URL0 || "http://localhost:8772/";
const { chromium } = require("playwright");
const { phone, seed, at, P } = require("./lib");
const { make, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("10:00", today), { deviceScaleFactor: 1 });
  await seed(p, make(), "calendar"); await p.waitForTimeout(1000);
  // ⑦ 年 (and its swipe): taken out at the user's call (2026-11-24, tools/REMOVED.md)
  ok(!(await p.$('#calViews button[data-view="year"]')) && !(await p.$("#calYear")), "⑦ 年: gone");
  // ⑩ typing a word: a change elsewhere (another device's) doesn't take it away
  await p.click('#calViews button[data-view="month"]'); await p.waitForTimeout(400);
  await p.evaluate(() => [...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith("11月10日")).click()); await p.waitForTimeout(700);
  await p.locator("#calDayList .row-btn", { hasText: "説明会" }).click(); await p.waitForTimeout(700);
  await p.click("#edNoteText"); await p.keyboard.type("途中まで");
  await p.evaluate(() => window.dispatchEvent(new StorageEvent("storage", { key: "tsumikasane:events" })));
  await p.evaluate(() => { const s = window.__cal; }); await p.waitForTimeout(300);
  ok((await p.inputValue("#edNoteText")) === "途中まで" && (await p.evaluate(() => document.activeElement?.id)) === "edNoteText", "⑩ the word being typed stays, the field still in use");
  await p.keyboard.type("書いた"); await p.keyboard.press("Enter"); await p.waitForTimeout(400);
  const e7 = JSON.parse(await p.evaluate((P) => localStorage.getItem(P + "events"), P)).find((e) => e.id === "e7");
  ok(e7.notes?.["2026-11-10"]?.text === "途中まで書いた", "⑩ kept as typed", e7.notes);
  ok(!p.errs.length, "no error", p.errs);
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  await b.close();
})();
