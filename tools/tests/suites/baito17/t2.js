// バイト その17 ②④⑤⑩: what is pressed and typed (⑨ は使う人が消した: 2026-11-18)
process.env.URL0 = process.env.URL0 || "http://localhost:8879/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setting = async (p, id) => (await ls(p, "settings")).find((s) => s.id === id);
const job = async (p, id) => (await setting(p, "jobs")).items.find((j) => j.id === id);
// a 2 × 2 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==", "base64");
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  // ② 担当 as a shift goes in (カフェ's), none for 塾; ④ the 上限 said
  await p.selectOption("#shiftJob", "j2"); await p.waitForTimeout(200);
  ok(await p.isHidden("#bt17RoleRow"), "② none for 塾");
  await p.selectOption("#shiftJob", "j1"); await p.waitForTimeout(200);
  ok(!(await p.isHidden("#bt17RoleRow")) && JSON.stringify(await p.evaluate(() => [...document.querySelectorAll("#bt17Role option")].map((o) => o.value))) === JSON.stringify(["", "レジ", "キッチン"]), "② カフェ's");
  await p.clock.setFixedTime(at("12:01", today));
  await p.selectOption("#bt17Role", "キッチン"); await p.fill("#shiftDate", "2026-11-19"); await p.fill("#shiftStart", "17:00"); await p.fill("#shiftEnd", "22:00"); await p.fill("#shiftRest", "0");
  await p.locator('#shiftForm button[type="submit"]').click(); await p.waitForTimeout(500);
  const nw = (await ls(p, "shifts")).find((x) => x.date === "2026-11-19");
  ok(nw && nw.role === "キッチン" && nw.jobId === "j1", "② kept: " + JSON.stringify(nw));
  ok((await txt(p, "#status")).includes("11月は 35 時間になり、上限の 20 時間をこえます。この週は 3 日になり、上限の 2 日をこえます"), "④ said: " + (await txt(p, "#status")));
  // ② under the edit: 11/9 キッチン → レジ
  await p.click('#shiftList [data-edit="n2"]'); await p.waitForTimeout(500);
  ok((await p.inputValue("#reShiftRole")) === "キッチン", "② in the sheet");
  await p.selectOption("#reShiftRole", "レジ"); await p.locator("#recSave").click(); await p.waitForTimeout(600);
  ok((await ls(p, "shifts")).find((x) => x.id === "n2").role === "レジ", "② changed");
  // ⑩ the シフト表's photo kept in sight
  await p.click("#bt7Photos summary"); await p.waitForTimeout(300);
  await p.setInputFiles("#bt7PhotoFile", { name: "shift.png", mimeType: "image/png", buffer: PNG }); await p.waitForTimeout(1200);
  await p.click("#bt17ViewOpen"); await p.waitForTimeout(600);
  ok(!(await p.isHidden("#bt17Viewer")) && (await p.$$("#bt17Viewer img")).length === 1 && (await p.evaluate(() => getComputedStyle(document.getElementById("bt17Viewer")).position)) === "fixed", "⑩ open");
  await p.click("#bt17ViewZoom"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector("#bt17Viewer .bt17-view-img").classList.contains("zoom")), "⑩ 大きく");
  await p.click("#bt17ViewClose"); await p.waitForTimeout(300);
  ok(await p.isHidden("#bt17Viewer"), "⑩ closed");
  // ④⑤ the settings: 上限 off, 使いみち 50% 生活費
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  await p.fill("#bt17MonthMax", ""); await p.fill("#bt17WeekDays", ""); await p.dispatchEvent("#bt17WeekDays", "change"); await p.waitForTimeout(300);
  await p.fill("#bt17S2n", "生活費"); await p.fill("#bt17S2p", "50"); await p.dispatchEvent("#bt17S2p", "change"); await p.waitForTimeout(300);
  const s = await setting(p, "bt17");
  ok(!("monthMax" in s) && !("weekDays" in s) && JSON.stringify(s.split) === JSON.stringify([{ name: "貯金", pct: 30 }, { name: "自由", pct: 20 }, { name: "生活費", pct: 50 }]), "④⑤ kept: " + JSON.stringify(s));
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  ok((await p.isHidden("#bt17Caps")) && (await txt(p, "#bt17Split")).endsWith("生活費 50% 10,000 円"), "④⑤ on the page: " + (await txt(p, "#bt17Split")));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
