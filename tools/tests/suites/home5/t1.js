// きょう その5 ①〜⑩, through the hook build at 8803 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8803/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s  ]+/g, "");
const tileTxt = (p, k) => p.evaluate((k) => document.querySelector(`.tile[data-tile="${k}"]`)?.innerText ?? null, k).then(flat);
const H = (p, f, ...a) => p.evaluate(({ f, a }) => window.__h5[f](...a), { f, a });
const lsOf = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const shown = (p) => p.$$eval("#homeTiles > .tile", (l) => l.map((t) => t.dataset.tile));
const undo = async (p) => { await p.locator("#status button:visible, #sheetStatus button:visible").first().click(); await p.waitForTimeout(500); };
async function open(b, when) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "home"); await p.waitForTimeout(1000);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, "2026-11-14T07:30:00+09:00");
  const keys = await shown(p);
  ok(["h5yday", "h5mood", "h5since", "h5links", "h5year"].every((k) => keys.includes(k)), "the new tiles on きょう (きのうのまとめ in the morning)", keys);

  // ⑨ birthdays and anniversaries under the date
  const an = await p.$$eval("#h5Head .h5-anniv", (l) => l.map((x) => x.textContent.replace(/\s+/g, "")));
  ok(JSON.stringify(an) === JSON.stringify(["🎂きょうは「誕生日」（20歳）", "🎉あと4日（11/18）：「記念日」（6周年）"]), "⑨ today's birthday, an anniversary in 4 days", an);

  // ⑥ yesterday
  const yd = await tileTxt(p, "h5yday");
  ok(["ToDo1件完了", "勉強45分", "運動ラン3km", "支出1,200円", "体重60.0kg", "気分😄とてもよい", "テーマ「早く寝る」できた"].every((w) => yd.includes(w)), "⑥ yesterday's", yd);

  // ⑦ mood and sleep
  const msd = await p.$$eval(".h5-msd", (l) => l.length);
  const mt = await tileTxt(p, "h5mood");
  ok(msd === 14 && mt.includes("よく眠れた日（7時間以上）の気分は平均4.5、短い日（6時間未満）は1.7"), "⑦ two weeks, the mood by the night's sleep", [msd, mt]);

  // ⑩ the year
  const yr = await tileTxt(p, "h5year"), x = await H(p, "year");
  ok(x.of === 318 && x.study === 165 && x.moveDays === 2 && x.km === 8 && x.diary === 2 && x.done === 2 && x.kg === -2, "⑩ the year's sums", x);
  ok(yr.includes("勉強2時間45分") && yr.includes("運動した日2日ラン8km") && yr.includes("ToDo2件完了") && yr.includes("体重−2.0kg1/10（土）から") && yr.includes("2026年の318日のうち"), "⑩ its tile", yr);

  // ④ the days since
  ok(JSON.stringify(await H(p, "since", { date: "2026-08-06" })) === JSON.stringify({ n: 100, now: "きょうで100日" }), "④ 100 days today");
  ok(JSON.stringify(await H(p, "since", { date: "2025-11-14" })) === JSON.stringify({ n: 365, now: "きょうで1年" }), "④ a year today");
  ok(JSON.stringify(await H(p, "since", { date: "2026-10-01" })) === JSON.stringify({ n: 44, next: "あと56日で100日" }), "④ the next round number");
  ok(JSON.stringify(await H(p, "since", { date: "2025-11-20" })) === JSON.stringify({ n: 359, next: "あと6日で1年" }), "④ a year coming before 400 days");
  await p.click('.tile[data-tile="h5since"] .h5-edit-btn'); await p.waitForTimeout(300);
  await p.fill("#h5SinceName", "禁煙"); await p.fill("#h5SinceDate", "2026-08-06"); await p.click(".h5-add-go"); await p.waitForTimeout(400);
  await p.click(".h5-done"); await p.waitForTimeout(300);
  ok((await H(p, "setting", "h5since"))?.items?.[0]?.name === "禁煙" && (await tileTxt(p, "h5since")).startsWith("あの日から禁煙100日きょうで100日"), "④ added on the tile, said", await tileTxt(p, "h5since"));

  // ⑤ links
  ok((await H(p, "url", "example.ac.jp/portal")) === "https://example.ac.jp/portal" && (await H(p, "url", "javascript:alert(1)")) === null && (await H(p, "url", "ふつうの文")) === null, "⑤ https only, put in front when missing");
  await p.click('.tile[data-tile="h5links"] .h5-edit-btn'); await p.waitForTimeout(300);
  await p.fill("#h5LinkName", "大学"); await p.fill("#h5LinkUrl", "example.ac.jp/portal"); await p.click('.tile[data-tile="h5links"] .h5-add-go'); await p.waitForTimeout(400);
  await p.fill("#h5LinkUrl", "javascript:alert(1)"); await p.click('.tile[data-tile="h5links"] .h5-add-go'); await p.waitForTimeout(300);
  await p.click('.tile[data-tile="h5links"] .h5-done'); await p.waitForTimeout(300);
  const ln = await p.$$eval(".h5-link", (l) => l.map((a) => [a.textContent, a.getAttribute("href"), a.target, a.rel]));
  ok(JSON.stringify(ln) === JSON.stringify([["大学", "https://example.ac.jp/portal", "_blank", "noopener noreferrer"]]), "⑤ one link, the bad one refused", ln);

  // ⑧ a line with no figures: 日記, ToDo, メモ
  await p.fill("#h4LineIn", "牛乳を買う"); await p.waitForTimeout(200);
  ok(flat(await p.textContent("#h4LineSay")).startsWith("記録する数字がありません") && !!(await p.$(".h5-to-diary")), "⑧ said, and where it can go");
  await p.click(".h5-to-diary"); await p.waitForTimeout(500);
  ok(((await lsOf(p, "journal")).find((x) => x.id === D.DAY) || {}).text === "牛乳を買う" && (await p.inputValue("#h4LineIn")) === "", "⑧ 日記: today's, the field emptied");
  await undo(p);
  ok(!(await lsOf(p, "journal")).some((x) => x.id === D.DAY), "⑧ 元に戻す");
  await p.fill("#h4LineIn", "電話する"); await p.waitForTimeout(150); await p.click(".h5-to-memo"); await p.waitForTimeout(400);
  ok((await H(p, "setting", "h4memo"))?.text === "電話する", "⑧ メモ");
  await p.fill("#h4LineIn", "レポートを書く"); await p.waitForTimeout(150); await p.click(".h5-to-todo"); await p.waitForTimeout(800);
  ok((await p.textContent("#sheetTitle")) === "新しいToDo" && (await p.inputValue("#todoText")) === "レポートを書く", "⑧ ToDo: its sheet, the words in", await p.textContent("#sheetTitle"));
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  await p.screenshot({ path: out + "/h5-top.png" });

  // ① a tile folded from its menu, and opened again
  const hold = (k) => p.evaluate((k) => document.querySelector(`.tile[data-tile="${k}"]`).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), k);
  await hold("calendar"); await p.waitForTimeout(300);
  await p.locator("#h2TileGroup button", { hasText: "たたむ" }).click(); await p.waitForTimeout(500);
  const f = await p.$eval('.tile[data-tile="calendar"]', (t) => [t.classList.contains("h5-fold"), t.classList.contains("wide"), getComputedStyle(t.querySelector("ul.ev") || t).display, Math.round(t.getBoundingClientRect().height)]);
  ok((await H(p, "prefs")).fold?.includes("calendar") && f[0] && !f[1] && f[2] === "none" && f[3] < 150, "① folded: kept, half, its list hidden, short", f);
  ok(flat(await tileTxt(p, "calendar")) === "きょうの予定1件ひらく", "① its name and number (the birthday today)", await tileTxt(p, "calendar"));
  await p.click('.tile[data-tile="calendar"] .h5-unfold'); await p.waitForTimeout(400);
  ok(!(await H(p, "prefs")).fold?.includes("calendar") && !(await p.$('.tile[data-tile="calendar"].h5-fold')), "① ひらく");

  // ③ to a tile
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.click("#h5JumpBtn"); await p.waitForTimeout(300);
  const items = await p.$$eval("#h5JumpGroup [data-go]", (l) => l.map((x) => x.dataset.go));
  ok(await p.evaluate(() => document.getElementById("h5Jump").open) && items.length === keys.length, "③ the tiles listed", items.length);
  await p.click('#h5JumpGroup [data-go="h5year"]'); await p.waitForTimeout(300);
  const lit = await p.$eval('.tile[data-tile="h5year"]', (t) => t.classList.contains("spot"));
  await p.waitForTimeout(1700);
  const vis = await p.$eval('.tile[data-tile="h5year"]', (t, lit) => { const r = t.getBoundingClientRect(); return [lit, r.top >= 0 && r.bottom <= innerHeight]; }, lit);
  ok(!(await p.evaluate(() => document.getElementById("h5Jump").open)) && vis[0] && vis[1], "③ gone to, lit up", vis);

  // ② a set, and 元に戻す
  await p.click("#homeSettings"); await p.waitForTimeout(700);
  await p.click('#h5Set [data-set="simple"]'); await p.waitForTimeout(500);
  ok((await H(p, "prefs")).hidden?.includes("goal"), "② シンプル: the others hidden");
  await p.locator("#sheetStatus button:visible").first().click(); await p.waitForTimeout(400);
  ok(!(await H(p, "prefs")).hidden?.length, "② 元に戻す");
  await p.click('#h5Set [data-set="simple"]'); await p.waitForTimeout(500);
  await p.click("#h5AnnivOn"); await p.waitForTimeout(200);
  ok((await H(p, "prefs")).noAnniv === true, "⑨ off in the gear's sheet");
  await p.click("#sheetCancel").catch(() => {}); await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  const simple = await shown(p);
  ok(JSON.stringify(simple.filter((k) => !["review", "tomorrow", "prep", "missed"].includes(k)).sort()) === JSON.stringify(["calendar", "h3now", "h5yday", "quick", "todo", "weather"]), "② シンプル: those alone", simple);
  ok(!(await p.$("#h5Head .h5-anniv")), "⑨ none when off");
  await p.click("#homeSettings"); await p.waitForTimeout(700);
  await p.click('#h5Set [data-set="all"]'); await p.waitForTimeout(400);
  await p.click("#sheetCancel").catch(() => {}); await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  ok((await shown(p)).length === keys.length, "② ぜんぶ: all back", (await shown(p)).length);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200);
  await p.screenshot({ path: out + "/h5-home.png", fullPage: true });
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();

  // the afternoon: no きのうのまとめ
  p = await open(b, "2026-11-14T13:00:00+09:00");
  ok(!(await shown(p)).includes("h5yday"), "⑥ not after the morning");
  await p.emulateMedia({ colorScheme: "dark" }); await p.waitForTimeout(300);
  await p.screenshot({ path: out + "/h5-dark.png", fullPage: true });
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "no sideways scroll");
  ok(!p.errs.length, "no page errors (afternoon)", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
