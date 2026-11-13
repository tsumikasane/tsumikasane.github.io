// ルーティーン: none yet, the first added, and a day's checks changed from 記録 (お休み and counts kept right)
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10";
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
(async () => {
  const b = await chromium.launch();
  let p = await phone(b, at("12:00", today));
  await seed(p, {}, "routine");
  ok((await txt(p, "#rtList")).includes("まだ項目がありません"), "none yet: " + await txt(p, "#rtList"));
  ok(await p.isHidden("#rtWeekCard") && await p.isHidden("#rtCalCard") && await p.isHidden("#rtStatsCard") && await p.isHidden("#rtPausedCard"), "the week, the month and the records hidden");
  await p.fill("#rtName", "ストレッチ"); await p.press("#rtName", "Enter"); await p.waitForTimeout(300);
  ok((await p.evaluate(() => [...document.querySelectorAll("#rtList .rt-name")].map((i) => i.value).join(","))) === "ストレッチ" && await p.isVisible("#rtCalCard") && await p.isVisible("#rtWeekCard"), "the first added, the cards shown");
  const cal = await p.evaluate(() => [...document.querySelectorAll("#rtCal button.rtc-d")].map((c) => c.querySelector(".dn").textContent));
  ok(cal.join(",") === "10", "② only today pressable: " + cal.join(","));
  ok(!p.errs.length, "no page errors: " + p.errs.join(" | "));
  // a day's checks from 記録
  const R = (id, name, extra = {}) => ({ id, name, createdAt: T("2026-10-01") + id.charCodeAt(1), ...extra });
  await seed(p, {
    routines: [R("r1", "ストレッチ"), R("r2", "水を飲む", { target: 8, unit: "杯" })],
    routineDays: [{ id: "2026-11-05", date: "2026-11-05", done: ["r1"], at: { r1: T("2026-11-05") }, rest: true, updatedAt: T("2026-11-05") },
      { id: "2026-11-06", date: "2026-11-06", done: ["r1"], at: { r1: T("2026-11-06") }, counts: { r2: 3 }, updatedAt: T("2026-11-06") }],
  }, "records");
  await p.locator('.sum-card:has-text("ルーティーン") .sum-head button').first().click(); await p.waitForTimeout(500);
  await p.locator('[data-edit="2026-11-05"]').click(); await p.waitForTimeout(500);
  ok((await txt(p, "#sheetTitle")) === "ルーティーンを編集", "記録 opens the day: " + await txt(p, "#sheetTitle"));
  await p.locator('#recForm .rt-row[data-item="r1"]').click(); await p.locator("#recSave").click(); await p.waitForTimeout(500);
  let d5 = (await ls(p, "routineDays")).find((d) => d.id === "2026-11-05");
  ok(d5 && d5.rest === true && !d5.done.length, "⑧ its check taken off, お休み kept: " + JSON.stringify(d5));
  await p.locator('[data-edit="2026-11-06"]').click(); await p.waitForTimeout(500);
  await p.locator('#recForm .rt-row[data-item="r2"]').click(); await p.locator("#recSave").click(); await p.waitForTimeout(500);
  let d6 = (await ls(p, "routineDays")).find((d) => d.id === "2026-11-06");
  ok(d6.done.includes("r2") && d6.counts.r2 === 8, "⑤ 水 checked from 記録: at its number: " + JSON.stringify(d6));
  await p.locator('[data-edit="2026-11-06"]').click(); await p.waitForTimeout(500);
  await p.locator('#recForm .rt-row[data-item="r2"]').click(); await p.locator("#recSave").click(); await p.waitForTimeout(500);
  d6 = (await ls(p, "routineDays")).find((d) => d.id === "2026-11-06");
  ok(!d6.done.includes("r2") && !(d6.counts && d6.counts.r2), "⑤ and unchecked: back to none: " + JSON.stringify(d6));
  ok(!p.errs.length, "no page errors: " + p.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
