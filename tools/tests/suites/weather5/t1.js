// 天気 その5 ①〜⑩, through the hook build at 8807 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8807/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s  ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((x) => x.textContent).join("｜"), sel).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__wx5[f](...a), { f, a });
const T = (hm, d = D.DAY) => Date.parse(`${d}T${hm}:00+09:00`);
const json = (body) => ({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
async function open(b, when, more = {}, o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, ...o });
  p.calls = [];
  await p.route("https://api.open-meteo.com/**", (r) => { const u = r.request().url(); p.calls.push(u); return r.fulfill(json(u.includes("forecast_days=16") ? D.long() : u.includes("models=") || u.includes("past_days=31") ? { daily: { time: [] } } : D.forecast())); });
  await p.route("https://archive-api.open-meteo.com/**", (r) => r.fulfill(json({ daily: { time: [] } })));
  await p.route("https://air-quality-api.open-meteo.com/**", (r) => r.fulfill(json({ hourly: { time: [], pm2_5: [], dust: [] } })));
  await p.route("https://mreversegeocoder.gsi.go.jp/**", (r) => r.fulfill(json({ results: { muniCd: "13101" } })));
  await seed(p, D.all(more), "home"); await p.waitForTimeout(1200);
  await p.click('.tile[data-tile="weather"]'); await p.waitForTimeout(1500);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, "2026-11-16T10:00:00+09:00");

  // ⑤ now against yesterday's same hour
  ok((await txt(p, ".wx-dl > div:first-child")) === "いまの気温14°きのうより−3°", "⑤ いまの気温, against yesterday", await txt(p, ".wx-dl > div:first-child"));
  await p.click('.wx4-hb[data-t="2026-11-16T15:00"]'); await p.waitForTimeout(300);
  ok((await txt(p, "#wx4HourBox")).endsWith("きのうの同じ時刻19°"), "⑤ an hour pressed: the same hour yesterday", await txt(p, "#wx4HourBox"));
  await p.click('.wx4-hb[data-t="2026-11-16T15:00"]'); await p.waitForTimeout(200);
  // ⑧ the moon (the reference: 11:45 and 22:11 in 東京), ⑨ the sky's events
  ok((await txt(p, ".wx5-moon")) === "月の出11:45・月の入り22:11", "⑧ the moon's rise and set", await txt(p, ".wx5-moon"));
  ok((await txt(p, "#wx5Events .wx-line")) === "あしたの夜しし座流星群1時間に数個ほど。夜おそくから明け方が見ごろ。雲が少なく、見えやすそう｜11/24（火）の夜満月｜12/9（水）新月月明かりがなく、星を見るのにいい夜です｜12/14（月）の夜ふたご座流星群多い年は1時間に数十個。夜おそくから明け方が見ごろ｜12/24（木）満月",
    "⑨ the showers and the moons, with tomorrow night's clear sky", await txt(p, "#wx5Events .wx-line"));
  const ph = (await W(p, "phases", Date.parse("2026-11-01T00:00:00Z"), 60)).map((x) => [x.name, new Date(x.at).toISOString()]);
  const near = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) < 6 * 60000;
  ok(ph.length === 4 && near(ph[0][1], "2026-11-09T07:02:42Z") && near(ph[1][1], "2026-11-24T14:54:04Z") && near(ph[2][1], "2026-12-09T00:52:31Z") && near(ph[3][1], "2026-12-24T01:28:45Z") && ph[1][0] === "満月",
    "⑨ the phases within 6 minutes of the reference", ph);
  // ① the days 8 to 16 ahead
  const lg = await p.$$eval("#wx5Long li", (l) => l.map((x) => [x.getAttribute("aria-label"), x.querySelector(".wx-d").className]));
  ok(lg.length === 9 && lg[0][0] === "11月23日（月）、晴れ、最高14度、最低6度、降水確率10%" && lg[0][1].includes("sun") && lg[1][0] === "11月24日（火）、雨、最高13度、最低6度、降水確率60%", "① 11/23 (勤労感謝の日, red) to 12/1", lg.slice(0, 2));
  ok(p.calls.some((u) => u.includes("forecast_days=16")), "① the 16 days asked for");
  // ⑩ yesterday's forecast against what came, and the days before
  ok((await txt(p, "#wx5Check .wx5-check")) === "気温は2°ずれ、雨ははずれ（降らなかった）予報雨18°/9°・降水確率70%→実際16°/8°・雨0mm", "⑩ yesterday's: 2° off, no rain", await txt(p, "#wx5Check .wx5-check"));
  ok((await txt(p, "#wx5Check .wx5-score")) === "この4日の雨のあたり2/4日気温のずれは、平均1.3°", "⑩ the 4 days", await txt(p, "#wx5Check .wx5-score"));
  const g = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "wxGuess")), P);
  ok(JSON.stringify(g.days["2026-11-17"]) === JSON.stringify({ hi: 16, lo: 6, rain: 10, word: "晴れ" }) && JSON.stringify(g.days["2026-11-15"].act) === JSON.stringify({ hi: 16, lo: 8, mm: 0 }), "⑩ tomorrow's kept, yesterday's come", g.days);
  // ⑥ the day read aloud: taken out at the user's call (2026-11-24, tools/REMOVED.md): no button by the place (画像で送る still there)
  ok(!(await p.$("#wx5Speak")) && !!(await p.$(".wx-place-line")), "⑥ no reading aloud (taken out)");
  await p.screenshot({ path: out + "/wx5-top.png" });

  // ② before the pressure falls
  await p.locator("#wx5PressOn").scrollIntoViewIfNeeded();
  await p.click("#wx5PressOn"); await p.waitForTimeout(300);
  let al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-press:"));
  ok(al.length === 1 && al[0].at === T("14:00") && al[0].title === "気圧が大きく下がりそうです" && al[0].body === "17時ごろから、6時間で 6 hPa 下がる予報です。頭痛やだるさが出やすいので、無理をしないで" && al[0].tag === "wx-press:2026-11-16:17",
    "② 3 hours before 17時's fall of 6 hPa", al);
  await p.click("#wx5PressSmall"); await p.waitForTimeout(300);
  al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-press:"));
  ok(al.length === 2 && al[1].at === T("21:00") && al[1].title === "気圧が下がりそうです" && al[1].body === "あしたの4時ごろから、6時間で 2.5 hPa 下がる予報です。気圧に敏感な人は、気をつけて", "② 少しでも: tomorrow 4時's, the evening before at 21:00", al[1]);
  // ③ heat and frozen roads
  await p.click("#wx5HealthOn"); await p.waitForTimeout(300);
  al = (await W(p, "alarms", T("10:00"))).filter((a) => /^wx-(heat|ice):/.test(a.tag));
  ok(al.length === 2 && al[0].tag === "wx-ice:2026-11-19" && al[0].at === T("07:00", "2026-11-19") && al[0].title === "路面の凍結に気をつけて：最低 -1°" && al[1].tag === "wx-heat:2026-11-20" && al[1].title === "熱中症に気をつけて：暑さ指数 31（危険）" && al[1].body === "いちばん暑いのは 12時ごろ（最高 33°）。こまめに水分と塩分を。外での運動はやめて、すずしい室内で",
    "③ 11/19's ice and 11/20's heat, at 7:00", al);
  const parts = await W(p, "parts");
  ok(parts.some((x) => x[0] === "wxPress" && x[1] === 1) && parts.some((x) => x[0] === "wxHealth" && x[1] === "07:00"), "②③ in the push's signature");
  await p.locator("#wx5Box").scrollIntoViewIfNeeded();
  await p.screenshot({ path: out + "/wx5-more.png" });
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();

  // dark, and no sideways scroll
  p = await open(b, "2026-11-16T10:00:00+09:00");
  await p.emulateMedia({ colorScheme: "dark" }); await p.waitForTimeout(300);
  await p.locator("#wx5Events").scrollIntoViewIfNeeded();
  await p.screenshot({ path: out + "/wx5-dark.png" });
  ok(await p.evaluate(() => document.getElementById("daySheet").scrollWidth <= document.getElementById("daySheet").clientWidth + 1), "no sideways scroll");
  ok(!p.errs.length, "no page errors (dark)", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
