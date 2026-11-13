// 天気 その2 ①〜⑩, through the hook build at 8800 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8800/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s  ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((x) => x.textContent).join("｜"), sel).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__wx2[f](...a), { f, a });
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-13T10:00:00+09:00"), { deviceScaleFactor: 1 });
  const calls = [];
  const json = (body) => ({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
  await p.route("https://api.open-meteo.com/**", (r) => { calls.push(r.request().url()); return r.fulfill(json(D.forecast())); });
  await p.route("https://air-quality-api.open-meteo.com/**", (r) => { calls.push(r.request().url()); return r.fulfill(json(D.air())); });
  await p.addInitScript(() => { navigator.share = async (d) => { window.__shared = d; }; });
  await seed(p, D.all(), "home"); await p.waitForTimeout(1200);
  ok(calls.some((u) => u.includes("pressure_msl") && u.includes("wind_gusts_10m_max") && u.includes("precipitation_sum") && u.includes("cloud_cover")), "the forecast asks for その2's more", calls[0]);
  await p.click('.tile[data-tile="weather"] .tile-head, .tile[data-tile="weather"]'); await p.waitForTimeout(1200);
  ok((await p.textContent("#sheetTitle")) === "天気", "天気's page open");
  ok(calls.some((u) => u.includes("air-quality-api") && u.includes("pm2_5,dust")), "⑦ the air asked for", calls);
  // ① the graph
  ok(await p.$$eval(".wx2-graph .wx2-temp", (x) => x.length) === 1 && (await txt(p, ".wx2-graph .wx2-tl"))=== "19°｜8°", "① the temperature's line (48 hours), its highest marked", await txt(p, ".wx2-graph .wx2-tl"));
  ok((await p.$$eval(".wx2-graph .wx2-bar.wet", (x) => x.length)) === 4 && (await txt(p, ".wx2-graph .wx2-hl")).startsWith("いま"), "① rain's bars (4 wet hours), いま first", await txt(p, ".wx2-graph .wx2-hl"));
  // ④ the wind
  const dl = await txt(p, ".wx-dl");
  ok(dl.includes("風向き（いま）北西の風") && dl.includes("突風16m/s強い"), "④ wind direction now and gusts", dl);
  ok((await W(p, "dir", 0)) === "北" && (await W(p, "dir", 90)) === "東" && (await W(p, "dir", 200)) === "南南西" && (await W(p, "dir", 359)) === "北", "④ the 16 directions");
  // ③ the amount
  ok((await txt(p, ".wx2-amount")) === "これからの雨の量は8mmいちばん強いのは17時ごろ、1時間に4.5mm（本降りの雨）", "③ how much and how hard", await txt(p, ".wx2-amount"));
  ok((await W(p, "strength", 0.2)) === "ぱらつく程度" && (await W(p, "strength", 25)) === "強い雨" && (await W(p, "strength", 60)) === "非常に激しい雨", "③ JMA's words");
  // ② the pressure
  ok((await txt(p, ".wx2-press")) === "気圧が大きく下がります（いまから6時間で6hPa）頭痛やだるさが出やすい日です。無理をしないで" && !!(await p.$(".wx2-press.warn")), "② falling: said, marked", await txt(p, ".wx2-press"));
  ok((await W(p, "press", "2026-11-15")).level === 0, "② another day: steady");
  // ⑧ dry
  ok((await txt(p, ".wx2-dry")).startsWith("空気が乾燥しています（湿度35%まで下がる予報）"), "⑧ dry air", await txt(p, ".wx2-dry"));
  ok(!(await p.$(".wx2-muggy")), "⑧ not muggy in November");
  // ⑦ the air
  ok((await txt(p, ".wx2-pm")) === "PM2.5はやや多め（いちばん多いときで42µg/m³）敏感な人は、マスクがあると安心", "⑦ PM2.5", await txt(p, ".wx2-pm"));
  ok((await txt(p, ".wx2-dust")).startsWith("黄砂が飛ぶかもしれません（60µg/m³）"), "⑦ 黄砂", await txt(p, ".wx2-dust"));
  // ⑥ the plans
  const plans = await p.$$eval(".wx2-plans li", (l) => l.map((x) => [x.className, x.textContent.replace(/\s+/g, "")]));
  ok(plans.length === 2 && plans[0][1].startsWith("11:00買い物") && !plans[0][0] && plans[1][1].includes("映画") && plans[1][1].endsWith("70%傘を") && plans[1][0] === "wet", "⑥ the plans with their hours' weather", plans);
  // ⑤ the moon and the night
  ok((await W(p, "moon", "2026-11-24")).name === "満月" && (await W(p, "moon", "2026-11-09")).name === "新月" && (await W(p, "moon", "2026-11-17")).name === "上弦の月", "⑤ the moon's age", [await W(p, "moon", "2026-11-24"), await W(p, "moon", "2026-11-09")]);
  ok((await txt(p, ".wx2-night")).startsWith("今夜の月：三日月（月齢") && (await txt(p, ".wx2-night")).includes("雲が少なく、月や星がよく見えそうです"), "⑤ tonight", await txt(p, ".wx2-night"));
  // ⑩ the week's bars
  const bars = await p.$$eval(".wx-days .wx2-range > span", (l) => l.map((x) => x.getAttribute("style")));
  ok(bars.length === 7 && bars[0].replace(/\s/g, "").startsWith("left:21.4%;width:57.1%"), "⑩ a bar for each day, on the week's range", bars);
  ok(flat(await p.evaluate(() => document.querySelector(".wx-days li").innerText)) === "きょう雨16°/8°70%", "⑩ the rows' words as before", await p.evaluate(() => document.querySelector(".wx-days li").innerText));
  await p.screenshot({ path: out + "/wx2-top.png", fullPage: false });
  // ⑨ as words
  await p.click(".wx2-share"); await p.waitForTimeout(300);
  const sh = await p.evaluate(() => window.__shared);
  ok(sh && sh.title === "11月13日（金）の天気（東京）" && sh.text.includes("雨 16° / 8°、降水確率 70%") && sh.text.includes("15時ごろから19時ごろまで雨の予報です") && sh.text.includes("これからの雨の量は 8 mm") && sh.text.includes("傘を持っていこう"), "⑨ the day as words", sh);
  // another day pressed: its own
  await p.locator(".wx-days li button").nth(1).click(); await p.waitForTimeout(500);
  ok((await txt(p, ".wx-dl")).includes("風向き北の風") && !(await p.$(".wx2-plans")) && (await txt(p, ".wx2-night")).startsWith("その日の夜の月"), "another day: its wind, no plans, its night", await txt(p, ".wx-dl"));
  await p.click(".wx2-share"); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__shared.title)) === "11月14日（土）の天気（東京）", "⑨ the day shown");
  for (const y of [0, 900, 1800]) { await p.evaluate((y) => document.getElementById("daySheet").scrollTo(0, y), y); await p.waitForTimeout(200); await p.screenshot({ path: `${out}/wx2-${y}.png` }); }
  // no width over the phone's
  ok(await p.evaluate(() => document.getElementById("daySheet").scrollWidth <= document.getElementById("daySheet").clientWidth + 1), "no sideways scroll");
  // dark
  await p.emulateMedia({ colorScheme: "dark" }); await p.evaluate(() => document.getElementById("daySheet").scrollTo(0, 0)); await p.waitForTimeout(300);
  await p.screenshot({ path: out + "/wx2-dark.png" });
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
