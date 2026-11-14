// 天気 その3 ①〜⑩, through the hook build at 8805 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8805/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s  ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((x) => x.textContent).join("｜"), sel).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__wx3[f](...a), { f, a });
const T = (hm, d = D.DAY) => Date.parse(`${d}T${hm}:00+09:00`);
const json = (body) => ({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
async function open(b, when, o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, ...o });
  p.calls = [];
  await p.route("https://api.open-meteo.com/**", (r) => { const u = r.request().url(); p.calls.push(u); return r.fulfill(json(u.includes("latitude=35.68,34.69") ? D.places() : D.forecast())); });
  await p.route("https://air-quality-api.open-meteo.com/**", (r) => r.fulfill(json({ hourly: { time: [], pm2_5: [], dust: [] } })));
  await seed(p, D.all(), "home"); await p.waitForTimeout(1200);
  await p.click('.tile[data-tile="weather"]'); await p.waitForTimeout(1200);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, "2026-11-14T10:00:00+09:00");
  ok(p.calls.some((u) => u.includes("cloud_cover_low") && u.includes("snowfall") && u.includes("shortwave_radiation")), "the forecast asks for その3's more", p.calls[0]);

  // ④ the day's length
  ok((await txt(p, ".wx-dl")).includes("日の長さ10時間18分−2分") && (await p.getAttribute(".wx-dl div:last-child dd", "aria-label")) === "10時間18分、きのうより2分短い", "④ the day's length, against yesterday", await txt(p, ".wx-dl"));
  // ⑥ thunder with the rain
  ok((await txt(p, ".wx3-thunder")).startsWith("雷のおそれ：16時ごろから17時ごろまで"), "⑥ thunder", await txt(p, ".wx3-thunder"));
  // ⑤ the glow, ④ the solstice
  ok((await txt(p, ".wx3-glow-pm")).startsWith("夕焼け：きれいに色づきそう日の入り16:35。15:35ごろから") && !(await p.$(".wx3-glow-am")), "⑤ today's evening glow (the dawn gone by)", await txt(p, ".wx3-glow-pm"));
  ok((await txt(p, ".wx3-sol")) === "冬至（12/22）まで、日は短くなっていきますあと38日", "④ to the solstice", await txt(p, ".wx3-sol"));
  // ③ the week's best
  ok(flat(await W(p, "best")) === "外に出やすいのは11/17（火）：晴れ21°、降水確率0%。洗濯日和はあした・11/17（火）・11/19（木）。" && (await txt(p, "#wx3Best")).startsWith("外に出やすいのは11/17（火）"), "③ the best days", await W(p, "best"));
  // ② the places kept
  ok(p.calls.some((u) => u.includes("latitude=35.68,34.69") && u.includes("longitude=139.77,135.5")), "② one request for the places kept", p.calls);
  const pl = await p.$$eval(".wx3-place", (l) => l.map((x) => [x.getAttribute("aria-pressed"), x.innerText.replace(/\s+/g, "")]));
  ok(JSON.stringify(pl) === JSON.stringify([["true", "東京いま14°18°/8°70%"], ["false", "大阪18°20°/11°0%"]]), "② each with its weather, the one in use marked", pl);
  // ⑨ the hours' figure
  ok((await txt(p, ".wx-hours .wx-t")).startsWith("14°｜"), "⑨ 気温 at first");
  await p.click('#wx3Seg [data-view="hum"]'); await p.waitForTimeout(300);
  ok((await txt(p, ".wx-hours .wx-t")).startsWith("65%｜65%") && (await p.getAttribute('#wx3Seg [data-view="hum"]', "aria-pressed")) === "true", "⑨ 湿度", await txt(p, ".wx-hours .wx-t"));
  await p.click('#wx3Seg [data-view="mm"]'); await p.waitForTimeout(300);
  const mm = (await txt(p, ".wx-hours .wx-t")).split("｜");
  ok(mm[5] === "2" && mm[0] === "0", "⑨ 雨量 by the hour (2 mm at 15時)", mm.slice(0, 7));
  await p.click('#wx3Seg [data-view="temp"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: out + "/wx3-top.png" });

  // ① before the rain
  await p.click("#wx3RainOn"); await p.waitForTimeout(300);
  let al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-rain:"));
  ok(al.length === 1 && al[0].at === T("14:00") && al[0].title === "1時間ほどで雨が降りそうです" && al[0].body === "15時ごろから17時ごろまで、雨の予報です（降水確率 70%）。傘を持っていこう" && al[0].tag === "wx-rain:2026-11-14:15",
    "① an hour before 15時 (none tomorrow; 11/18's snow beyond)", al);
  await p.selectOption("#wx3RainBefore", "30"); await p.waitForTimeout(300);
  al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-rain:"));
  ok(al.length === 1 && al[0].at === T("14:30") && al[0].title.startsWith("30分ほどで"), "① 30分前", al);
  ok(JSON.stringify((await W(p, "parts")).find((x) => x[0] === "wxRain")?.slice(0, 2)) === JSON.stringify(["wxRain", 30]), "① in the push's signature");
  ok(!(await W(p, "alarms", T("15:30"))).some((a) => a.tag.startsWith("wx-rain:2026-11-14")), "① not once it is raining");

  // another day: 11/15's dawn, 11/17's heat, 11/18's snow
  const pick = async (d) => { await p.click(`.wx-days li:nth-child(${d}) button`); await p.waitForTimeout(400); };
  await pick(2);
  ok((await txt(p, ".wx3-glow-am")).startsWith("朝焼け：きれいに色づきそう日の出6:18") && (await txt(p, ".wx3-glow-pm")).startsWith("夕焼け：雲が少なく、すっきりした空"), "⑤ 11/15's dawn and dusk", [await txt(p, ".wx3-glow-am"), await txt(p, ".wx3-glow-pm")]);
  await pick(4);
  ok((await txt(p, ".wx3-heat")).startsWith("暑さ指数（WBGT）は12時ごろ31（危険）") && !(await p.$(".wx2-muggy")), "⑧ WBGT (and not 不快指数 with it)", await txt(p, ".wx3-heat"));
  ok(Math.round(await W(p, "wbgt", 33, 60, 800, 2)) === 31 && Math.round(await W(p, "wbgt", 25, 50, 300, 2)) === 22, "⑧ the formula");
  await pick(5);
  ok((await txt(p, ".wx3-snow")) === "雪：つもる量は3cmほどいちばん降るのは3時ごろ。足もとと、車の運転に気をつけて", "⑦ snow", await txt(p, ".wx3-snow"));

  // ② 大阪 pressed: used
  await p.click(".wx3-place[aria-pressed=false]"); await p.waitForTimeout(900);
  ok((await W(p, "place")).name === "大阪", "② pressed: 大阪 in use", await W(p, "place"));
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();

  // ⑩ the place kept at where the phone is (京都, 3 km and more from 東京); a place picked by hand turns it off
  p = await open(b, "2026-11-14T10:00:00+09:00", { geolocation: { latitude: 35.0116, longitude: 135.7681 }, permissions: ["geolocation"] });
  await p.click("#wx3AutoOn"); await p.waitForTimeout(1200);
  const pl2 = await W(p, "place");
  ok(pl2.name === "現在地" && pl2.lat === 35.01 && pl2.lon === 135.77 && flat(await p.textContent("#sheetStatus, #status")).includes("現在地（"), "⑩ followed: 現在地 (moved)", [pl2, await p.textContent("#sheetStatus")]);
  await p.click(".wx3-place >> nth=0"); await p.waitForTimeout(900);
  ok((await W(p, "place")).name === "東京" && !(await p.evaluate((P) => localStorage.getItem(P + "wxAuto"), P)), "⑩ 東京 picked: it stops following");
  await p.emulateMedia({ colorScheme: "dark" }); await p.waitForTimeout(300);
  await p.screenshot({ path: out + "/wx3-dark.png" });
  ok(await p.evaluate(() => document.getElementById("daySheet").scrollWidth <= document.getElementById("daySheet").clientWidth + 1), "no sideways scroll");
  ok(!p.errs.length, "no page errors (⑩)", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
