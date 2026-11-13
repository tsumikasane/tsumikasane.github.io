// カレンダー その2: 年 turned by a swipe; a ふりかえり being typed isn't redrawn under the finger
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
  await p.click('#calViews button[data-view="year"]'); await p.waitForTimeout(500);
  const swipe = (dx) => p.evaluate((dx) => {
    const box = document.getElementById("calYear"), r = box.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + 200;
    const fire = (type, cx) => box.dispatchEvent(new PointerEvent(type, { pointerType: "touch", isPrimary: true, pointerId: 7, clientX: cx, clientY: y, bubbles: true }));
    fire("pointerdown", x); for (let k = 1; k <= 6; k++) fire("pointermove", x + (dx * k) / 6); fire("pointerup", x + dx);
  }, dx);
  await swipe(-200); await p.waitForTimeout(900);
  ok((await txt(p, "#calMonthName")) === "2027年", "⑦ a swipe to the left: the next year", await txt(p, "#calMonthName"));
  await swipe(200); await p.waitForTimeout(900);
  ok((await txt(p, "#calMonthName")) === "2026年", "⑦ and back");
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
