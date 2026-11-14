// きょう その6 ①〜⑩, through the hook build at 8804 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8804/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s  ]+/g, "");
const H = (p, f, ...a) => p.evaluate(({ f, a }) => window.__h6[f](...a), { f, a });
const shown = (p) => p.$$eval("#homeTiles > .tile", (l) => l.map((t) => t.dataset.tile));
const hold = (p, k) => p.evaluate((k) => document.querySelector(`.tile[data-tile="${k}"]`).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), k);
const closeSheet = async (p) => { await p.click("#sheetCancel").catch(() => {}); await p.keyboard.press("Escape"); await p.waitForTimeout(600); };
const more = async (p, cls) => { await p.click("#h6MoreBtn"); await p.waitForTimeout(300); await p.click(`#h6MenuGroup .${cls}`); await p.waitForTimeout(500); };
async function open(b, when) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.addInitScript(() => {
    // (the browser's ear: what it would hear; the screen kept on; the share sheet, its files kept)
    window.SpeechRecognition = class { start() { setTimeout(() => { this.onresult?.({ results: [[{ transcript: "勉強30分" }]] }); this.onend?.(); }, 50); } stop() { this.onend?.(); } };
    window.__wake = [];
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async (t) => { window.__wake.push("on:" + t); return { release: async () => { window.__wake.push("off"); } }; } } });
    navigator.canShare = () => true;
    navigator.share = async (d) => { window.__shared = { title: d.title, files: (d.files || []).map((f) => [f.name, f.type, f.size]) }; };
  });
  await seed(p, D.all(), "home"); await p.waitForTimeout(1000);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, "2026-11-14T10:00:00+09:00");
  const all0 = await shown(p);

  // ⑦ the next days off: today, a Saturday
  ok(flat(await p.textContent("#h6Rest")) === "きょうはお休み（2連休の1日目）", "⑦ today off: which of how many", await p.textContent("#h6Rest"));

  // ① when a tile shows: 天気, evenings only (from its menu)
  await hold(p, "weather"); await p.waitForTimeout(300);
  await p.locator("#h2TileGroup button", { hasText: "出すとき" }).click(); await p.waitForTimeout(400);
  ok((await p.$$eval("#h2TileGroup [data-when]", (l) => l.map((x) => x.dataset.when))).join(",") === "always,am,day,pm,wd,we", "① the choices");
  await p.click('#h2TileGroup [data-when="pm"]'); await p.waitForTimeout(500);
  ok((await H(p, "prefs")).when?.weather === "pm" && !(await shown(p)).includes("weather"), "① 夜だけ: kept, not shown at 10:00");
  ok(flat(await p.textContent("#status")).includes("「天気」を夜だけ出します（いまは出ません）"), "① said", await p.textContent("#status"));
  // ⑧ the guide and ② the settings: the tiles with a when, いつも出す
  await p.click("#homeSettings"); await p.waitForTimeout(700);
  ok(flat(await p.textContent('#h6WhenList [data-k="weather"]')).startsWith("天気夜だけ（18時〜4時）・いまは出ていません"), "① listed in the gear's sheet", await p.textContent("#h6WhenList"));
  ok(flat(await p.textContent('#tileList li[data-key="weather"]')).includes("夜だけ"), "① its note in the tiles' list");
  // ③ the look
  await p.click('#h6Look [data-look="compact"]'); await p.waitForTimeout(300);
  ok((await H(p, "prefs")).look === "compact" && (await p.getAttribute('#h6Look [data-look="compact"]', "aria-pressed")) === "true", "③ コンパクト kept");
  await p.click('#h6WhenList [data-k="weather"] button'); await p.waitForTimeout(400);
  ok(!(await H(p, "prefs")).when?.weather, "① いつも出す again");
  await closeSheet(p);
  ok((await shown(p)).includes("weather") && await p.$eval("#homeTiles", (g) => g.classList.contains("h6-compact")), "① back, ③ compact on the tiles");
  const ar = await p.$eval('.tile[data-tile="journal"]', (t) => [getComputedStyle(t).aspectRatio, Math.round(t.getBoundingClientRect().height), Math.round(t.getBoundingClientRect().width)]);
  ok(ar[0] === "auto" && ar[1] < ar[2], "③ half tiles no longer square", ar);
  // large
  await p.click("#homeSettings"); await p.waitForTimeout(600);
  await p.click('#h6Look [data-look="large"]'); await p.waitForTimeout(300);
  await closeSheet(p);
  const fs = await p.$eval('.tile[data-tile="journal"] .tile-head', (h) => parseFloat(getComputedStyle(h).fontSize));
  ok(await p.$eval("#homeTiles", (g) => g.classList.contains("h6-large")) && fs >= 16, "③ 大きい文字", fs);
  await p.click("#homeSettings"); await p.waitForTimeout(600); await p.click('#h6Look [data-look="normal"]'); await p.waitForTimeout(300); await closeSheet(p);

  // ④ the figures hidden, and shown
  await more(p, "h6-hide-btn");
  const bl = await p.$eval('.tile[data-tile="money"] .big', (x) => getComputedStyle(x).filter);
  ok(await p.$eval("#homeTiles", (g) => g.classList.contains("h6-hide")) && bl.includes("blur") && (await p.getAttribute('.tile[data-tile="money"] .big', "aria-hidden")) === "true", "④ money blurred, out of a reader's way", bl);
  ok(!(await p.$eval('.tile[data-tile="todo"] .big', (x) => getComputedStyle(x).filter)).includes("blur"), "④ ToDo's as it was");
  await p.click("#h6ShowBtn"); await p.waitForTimeout(400);
  ok(!(await p.$eval("#homeTiles", (g) => g.classList.contains("h6-hide"))) && !(await p.$("#h6ShowBtn")), "④ 数字を出す");

  // ⑤ by voice
  await p.click(".h6-mic"); await p.waitForTimeout(400);
  ok((await p.inputValue("#h4LineIn")) === "勉強30分" && flat(await p.textContent("#h4LineSay")).startsWith("記録するもの：勉強30分"), "⑤ what was heard, read", await p.inputValue("#h4LineIn"));
  await p.fill("#h4LineIn", ""); await p.dispatchEvent("#h4LineIn", "input");

  // ⑥ the clock
  await more(p, "h6-clock-btn");
  ok(await p.evaluate(() => document.getElementById("h6Clock").open) && (await p.textContent("#h6CTime")) === "10:00" && (await p.textContent("#h6CDate")) === "11月14日（土）"
    && (await p.textContent("#h6CNext")).startsWith("次は 15:00「映画」"), "⑥ the time, the date, the next plan", [await p.textContent("#h6CTime"), await p.textContent("#h6CNext")]);
  ok((await p.evaluate(() => window.__wake.join(","))) === "on:screen", "⑥ the screen kept on");
  await p.screenshot({ path: out + "/h6-clock.png" });
  await p.click("#h6CClose"); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => document.getElementById("h6Clock").open)) && (await p.evaluate(() => window.__wake.join(","))) === "on:screen,off", "⑥ closed, let go");

  // ⑧ what the page can do, and a tile's own
  await more(p, "h6-guide-btn");
  const dts = await p.$$eval("#h6GuideBody dt[data-about]", (l) => l.map((x) => x.dataset.about));
  ok(await p.evaluate(() => document.getElementById("h6Guide").open) && dts.length >= 38 && dts.includes("h5year") && dts.includes("quick"), "⑧ every tile's word", dts.length);
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await hold(p, "calendar"); await p.waitForTimeout(300);
  await p.locator("#h2TileGroup button", { hasText: "このタイルについて" }).click(); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById("h6Guide").open) && await p.$eval("#h6About-calendar", (x) => x.classList.contains("spot")), "⑧ このタイルについて: its own, lit up");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);

  // ⑩ the day as a picture
  const rows = await H(p, "rows");
  ok(JSON.stringify(rows.map(([k]) => k)) === JSON.stringify(["つみかさね", "ToDo", "勉強", "睡眠", "水分", "気分", "テーマ"]) && !rows.some(([k]) => /支出|体重/.test(k)), "⑩ what goes in (no money, no weight)", rows);
  await more(p, "h6-pic-btn"); await p.waitForTimeout(600);
  const sh = await p.evaluate(() => window.__shared);
  ok(sh && sh.files.length === 1 && sh.files[0][0] === "tsumikasane-2026-11-14.png" && sh.files[0][1] === "image/png" && sh.files[0][2] > 20000, "⑩ a picture to the share sheet", sh);

  // ② the order of use
  for (let i = 0; i < 3; i++) { await p.click('.h4-face[data-mood="3"]'); await p.waitForTimeout(200); }
  ok((await H(p, "uses")).h4mood >= 3, "② presses counted", await H(p, "uses"));
  await p.click("#homeSettings"); await p.waitForTimeout(600);
  ok(flat(await p.textContent("#h6UseNote")).startsWith("この端末でよく押すタイル：きょうの気分（"), "② the counts said", await p.textContent("#h6UseNote"));
  await p.click("#h6SortUse"); await p.waitForTimeout(400);
  ok((await H(p, "prefs")).order?.[0] === "h4mood", "② きょうの気分 first", (await H(p, "prefs")).order?.slice(0, 3));
  await p.locator("#sheetStatus button:visible").first().click(); await p.waitForTimeout(400);
  ok(!(await H(p, "prefs")).order, "② 元に戻す");
  await closeSheet(p);

  // ⑨ the place on きょう kept: カレンダー and back
  await p.evaluate(() => window.scrollTo(0, 1500)); await p.waitForTimeout(300);
  const y0 = await p.evaluate(() => window.scrollY);
  await p.click('.menu button[data-tab="calendar"]'); await p.waitForTimeout(700);
  ok((await H(p, "tab")) === "calendar", "⑨ カレンダー opened");
  await p.click('.menu button[data-tab="home"]'); await p.waitForTimeout(700);
  const y1 = await p.evaluate(() => window.scrollY);
  ok(y0 > 1000 && Math.abs(y1 - y0) < 5, "⑨ back where it was", [y0, y1]);
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();

  // ⑦ on a Tuesday: the next, a 3連休 with 勤労感謝の日; a week on: the next, 2 days, and the next 3連休 (お正月)
  p = await open(b, "2026-11-17T12:00:00+09:00");
  ok(flat(await p.textContent("#h6Rest")) === "次の休みは11/21（土）から3連休（勤労感謝の日）、あと4日", "⑦ the next, 3連休", await p.textContent("#h6Rest"));
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200);
  await p.screenshot({ path: out + "/h6-top.png" });
  await p.close();
  p = await open(b, "2026-11-24T12:00:00+09:00");
  ok(flat(await p.textContent("#h6Rest")) === "次の休みは11/28（土）から2連休、あと4日。次の3連休は1/1〜1/3（あと38日）", "⑦ the next, and the next 3連休", await p.textContent("#h6Rest"));
  await p.emulateMedia({ colorScheme: "dark" }); await p.waitForTimeout(200);
  await p.screenshot({ path: out + "/h6-dark.png" });
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "no sideways scroll");
  ok(!p.errs.length, "no page errors (11/24)", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
