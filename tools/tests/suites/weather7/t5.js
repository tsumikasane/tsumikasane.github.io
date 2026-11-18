// 天気 その11 ①〜⑩, through weather7's hook build at 8809 (きょう・天気's ports all taken) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8809/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s  ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((x) => x.textContent).join("｜"), sel).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__wx11[f](...a), { f, a });
const T = (hm, d = D.DAY) => Date.parse(`${d}T${hm}:00+09:00`);
const json = (body) => ({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
const ix = (H, t) => H.time.indexOf(t);
// the forecast: thunder at 15時 today; thunder and 25 mm at 3時 tomorrow, gusts of 22 m/s at 16時; rain 6時〜9時 on 11/18
// (行き wet, 帰り dry); tomorrow's air at 45%
function forecast() {
  const f = D.forecast(), H = f.hourly;
  H.weather_code[ix(H, "2026-11-16T15:00")] = 95;
  H.weather_code[ix(H, "2026-11-17T03:00")] = 95; H.precipitation[ix(H, "2026-11-17T03:00")] = 25; H.wind_gusts_10m[ix(H, "2026-11-17T16:00")] = 22;
  for (let h = 6; h <= 9; h++) { const i = ix(H, `2026-11-18T${String(h).padStart(2, "0")}:00`); H.precipitation_probability[i] = 80; H.weather_code[i] = 61; }
  H.time.forEach((t, i) => { if (t.startsWith("2026-11-17")) H.relative_humidity_2m[i] = 45; });
  return f;
}
// a dry, warm and humid week (the evening's page)
function humid() {
  const f = D.forecast(), H = f.hourly;
  f.daily.weather_code = f.daily.weather_code.map(() => 1); f.daily.precipitation_probability_max = f.daily.precipitation_probability_max.map(() => 10);
  H.time.forEach((t, i) => { H.relative_humidity_2m[i] = 85; H.temperature_2m[i] += 12; H.weather_code[i] = 1; H.precipitation_probability[i] = 10; });
  return f;
}
// the month gone by: its last rain on 11/4
const WET = ["2026-10-20", "2026-10-25", "2026-10-30", "2026-11-04"];
const month = () => { const m = D.month(); m.daily.weather_code = m.daily.time.map((d) => (WET.includes(d) ? 61 : 1)); m.daily.precipitation_sum = m.daily.time.map((d) => (WET.includes(d) ? 5 : 0)); return m; };
// the 16 days: rain on 11/23
const long = () => { const time = Array.from({ length: 16 }, (_, i) => new Date(Date.UTC(2026, 10, 16 + i)).toISOString().slice(0, 10)); return { daily: { time, weather_code: time.map((d) => (d === "2026-11-23" ? 61 : 1)), temperature_2m_max: time.map(() => 17), temperature_2m_min: time.map(() => 8), precipitation_probability_max: time.map((d) => (d === "2026-11-23" ? 70 : 10)) } }; };
async function open(b, when, more = {}, fc = forecast) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1 });
  p.calls = [];
  await p.route("https://api.open-meteo.com/**", (r) => {
    const u = r.request().url(); p.calls.push(u);
    return r.fulfill(json(u.includes("latitude=43.06,38.27") ? [] : u.includes("latitude=35.68,34.69") ? D.places() : u.includes("latitude=34.69") || u.includes("latitude=35.01") ? D.osaka() : u.includes("past_days=31") ? month() : u.includes("forecast_days=16") ? long() : u.includes("models=") ? { daily: { time: [] } } : fc()));
  });
  await p.route("https://archive-api.open-meteo.com/**", (r) => {
    const u = r.request().url(), a = D.archive(u); p.calls.push(u);
    if (u.includes("start_date=2025-11-16&end_date=2025-11-16")) { a.daily.weather_code = [3]; a.daily.wind_speed_10m_max = [4]; }
    return r.fulfill(json(a));
  });
  await p.route("https://air-quality-api.open-meteo.com/**", (r) => r.fulfill(json({ hourly: { time: [], pm2_5: [], dust: [] } })));
  await p.route("https://mreversegeocoder.gsi.go.jp/**", (r) => r.fulfill(json({ results: { muniCd: "13101" } })));
  await seed(p, D.all(more), "home"); await p.waitForTimeout(1200);
  await p.click('.tile[data-tile="weather"]'); await p.waitForTimeout(2200);
  return p;
}
const heads = (p) => p.$$eval("#calPanelBody h3.group-head", (l) => l.map((x) => x.textContent));
const setting = (p, id) => p.evaluate(({ P, id }) => (JSON.parse(localStorage.getItem(P + "settings")) || []).find((x) => x.id === id), { P, id });
// 絶対湿度 (g/m³) as the app reckons it, on average 7時〜21時 (the data's own temperatures)
const ah = (rh) => { let s = 0, n = 0; for (let h = 7; h <= 21; h++) { const t = Math.round((12 + 4 * Math.sin(((h - 8) / 24) * 2 * Math.PI)) * 10) / 10; s += (217 * (rh / 100) * 6.1078 * Math.pow(10, (7.5 * t) / (t + 237.3))) / (t + 273.15); n++; } return s / n; };
(async () => {
  const b = await chromium.launch();
  let p = await open(b, "2026-11-16T10:00:00+09:00", { settings: [{ id: "wxCommute", on: true, go: "08:00", back: "18:00", weekdays: true, updatedAt: 1 }, { id: "wxMyThings", items: [{ w: "レインブーツ", when: "wet" }, { w: "水筒", when: "always" }], updatedAt: 1 }] });

  // ③ 15 days since the last rain
  ok((await txt(p, "#wx6Story")).endsWith("11/19（木）は、15日ぶりの雨になりそうです。"), "③ the first rain in 15 days", await txt(p, "#wx6Story"));
  // ⑧ the days off: 11/21〜11/23 (勤労感謝の日), 11/23 from the 16 days
  ok((await txt(p, "#wx11RestSay")) === "次の休みは11/21（土）から3連休（勤労感謝の日）。11/23（月）は雨の予報です。" && (await p.$$eval("#wx11Rest li", (l) => l.map((x) => x.getAttribute("aria-label")))).join("｜") === "11月21日（土）、晴れ、最高18度、最低8度、降水確率10%｜11月22日（日）、晴れ、最高17度、最低7度、降水確率5%｜11月23日（月）（勤労感謝の日）、雨、最高17度、最低8度、降水確率70%",
    "⑧ 11/21〜11/23", [await txt(p, "#wx11RestSay"), await p.$$eval("#wx11Rest li", (l) => l.map((x) => x.getAttribute("aria-label")))]);
  // ⑩ a year ago today, from the archive
  ok(p.calls.some((u) => u.includes("archive-api") && u.includes("start_date=2025-11-16&end_date=2025-11-16") && u.includes("daily=weather_code,temperature_2m_max")) && (await txt(p, "#wx11PastOut")) === flat("2025年11月16日（日）　くもり最高 17°・最低 9°・雨 3.2 mm・風 4 m/sきょうの予報（最高 15°）より 2° 高い日でした"),
    "⑩ 1年前のきょう", await txt(p, "#wx11PastOut"));
  await p.click('#wx11Past [data-years="5"]'); await p.waitForTimeout(800);
  ok((await txt(p, "#wx11PastOut")).startsWith("2021年11月16日（火）最高17°・最低9°") && (await p.getAttribute('#wx11Past [data-years="5"]', "aria-pressed")) === "true", "⑩ 5年前", await txt(p, "#wx11PastOut"));
  await p.fill("#wx11PastDay", "2026-11-04"); await p.dispatchEvent("#wx11PastDay", "change"); await p.waitForTimeout(500);
  ok((await txt(p, "#wx11PastOut")) === flat("11月4日（水）　雨最高 15°・最低 6°・雨 5 mmきょうの予報（最高 15°）と同じくらいの日でした"), "⑩ a day this month, from その4's record", await txt(p, "#wx11PastOut"));
  await p.locator("#wx11Past").scrollIntoViewIfNeeded(); await p.evaluate(() => document.getElementById("daySheet").scrollBy(0, 120)); await p.waitForTimeout(200);
  await p.screenshot({ path: out + "/wx11-past.png" });
  // ⑨ the user's own things: 水筒 always, レインブーツ on 11/19 (rain)
  ok((await txt(p, "#wx8Take li")) === "日焼け止め｜羽織るもの｜水筒" && (await p.getAttribute("#wx8Take li:last-child", "class")) === "wx11-mine", "⑨ 水筒 every day, as the user's", await txt(p, "#wx8Take li"));
  await p.click(".wx-days li:nth-child(4) button"); await p.waitForTimeout(400);
  ok((await txt(p, "#wx8Take li")).endsWith("レインブーツ｜水筒"), "⑨ レインブーツ on a wet day", await txt(p, "#wx8Take li"));
  await p.click(".wx-days li:nth-child(1) button"); await p.waitForTimeout(400);

  // ⑥ the order: 1週間 moved up past 朝焼け・夕焼け, then back
  await p.locator("#wx11Order summary").scrollIntoViewIfNeeded();
  await p.click("#wx11Order summary"); await p.waitForTimeout(200);
  let h = await heads(p);
  ok(h.indexOf("朝焼け・夕焼け") >= 0 && h.indexOf("朝焼け・夕焼け") < h.indexOf("1週間") && !(await p.isVisible("#wx11OrderReset")), "⑥ the page's own order at first", h);
  await p.click('#wx11OrderList [data-key="week"] [data-move="up"]'); await p.waitForTimeout(500);
  h = await heads(p);
  const chips = await p.$$eval("#wx7Jump button", (l) => l.map((x) => x.textContent));
  const kept = await setting(p, "wxOrder");
  ok(h.indexOf("1週間") < h.indexOf("朝焼け・夕焼け") && chips.indexOf("1週間") < chips.indexOf("朝焼け・夕焼け") && kept && kept.keys.indexOf("week") < kept.keys.indexOf("glow")
    && (await p.evaluate(() => document.activeElement && document.activeElement.closest('[data-key="week"]') !== null)), "⑥ 1週間 up: the page, the chips, the account's settings (focus kept)", [h, chips]);
  await p.screenshot({ path: out + "/wx11-order.png" });
  await p.click("#wx11OrderReset"); await p.waitForTimeout(500);
  h = await heads(p);
  ok(h.indexOf("朝焼け・夕焼け") < h.indexOf("1週間") && !(await setting(p, "wxOrder")), "⑥ はじめの順番にもどす", h);

  // ⑨ one added under the page (ネックウォーマー on a cold day), one taken out
  await p.locator("#wx11ThingsBox").scrollIntoViewIfNeeded();
  await p.fill("#wx11ThingName", "ネックウォーマー"); await p.selectOption("#wx11ThingWhen", "cold"); await p.click("#wx11ThingAdd"); await p.waitForTimeout(400);
  let things = await setting(p, "wxMyThings");
  ok(things && things.items.length === 3 && things.items[2].w === "ネックウォーマー" && things.items[2].when === "cold" && (await txt(p, "#wx11ThingList li")) === "レインブーツ（雨の日）｜水筒（いつも）｜ネックウォーマー（寒い日）" && (await p.inputValue("#wx11ThingName")) === "", "⑨ added", things);
  await p.click('#wx11ThingList [aria-label="「水筒」（いつも）を消す"]'); await p.waitForTimeout(400);
  things = await setting(p, "wxMyThings");
  ok(things.items.map((x) => x.w).join() === "レインブーツ,ネックウォーマー" && (await txt(p, "#wx8Take li")) === "日焼け止め｜羽織るもの", "⑨ 水筒 taken out (today isn't cold: 7°)", [things, await txt(p, "#wx8Take li")]);
  await p.screenshot({ path: out + "/wx11-things.png" });

  // ① stormy hours: today's thunder at 15時 (told at 14:00), tomorrow's at 3時 (told at 21:00 tonight)
  await p.locator("#wx10NoteBox").scrollIntoViewIfNeeded();
  await p.click("#wx11StormOn"); await p.waitForTimeout(300);
  let al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-storm:"));
  ok(al.length === 2 && al[0].at === T("14:00") && al[0].title === "きょう15時ごろから、雷の予報です" && al[0].body === "雷が聞こえたら、すぐに建物の中へ"
    && al[1].at === T("21:00") && al[1].title === "あした3時ごろから、雷・強い雨・強い風の予報です" && al[1].body === "雷が聞こえたら、すぐに建物の中へ。雨は1時間に25mmほど。川や低い土地には近づかないで。風は22m/sほど。飛ばされやすい物は中へ", "① 14:00 today, 21:00 for tomorrow's small hours", al);
  // ② the user's own: the lowest 0° and under, the highest 18° and over
  await p.locator("#wx11RuleBox").scrollIntoViewIfNeeded();
  await p.fill("#wx11Rule-lo", "0"); await p.dispatchEvent("#wx11Rule-lo", "change");
  await p.fill("#wx11Rule-hi", "18"); await p.dispatchEvent("#wx11Rule-hi", "change");
  await p.click("#wx11RuleOn"); await p.waitForTimeout(300);
  al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-mine:"));
  ok(al.length === 2 && al[0].at === T("21:00", "2026-11-18") && al[0].title === "あしたは最低 -1°の予報です" && al[0].body === "雨・最高 9°・最低 -1°・降水確率 80%（自分で決めたお知らせ）"
    && al[1].at === T("21:00", "2026-11-20") && al[1].title === "あしたは最高 18°の予報です" && (await txt(p, "#wx11RuleNote")) === flat("いまの予報であてはまる日：11/19（木）（最低 -1°）　11/21（土）（最高 18°）"), "② 21:00 the evenings before 11/19 and 11/21", [al, await txt(p, "#wx11RuleNote")]);
  await p.screenshot({ path: out + "/wx11-rule.png" });
  // ⑦ the umbrella home on 11/18 (rain on the way there, none on the way back)
  await p.locator("#wx11UmbOn").scrollIntoViewIfNeeded();
  await p.click("#wx11UmbOn"); await p.waitForTimeout(300);
  al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-umbback:"));
  ok(al.length === 1 && al[0].at === T("17:45", "2026-11-18") && al[0].title === "傘を忘れずに持って帰ろう" && al[0].body === "行き（8:00）は雨の予報でしたが、帰り（18:00）はやんでいそうです", "⑦ 17:45 on 11/18", al);
  ok(await p.evaluate(() => document.getElementById("daySheet").scrollWidth <= document.getElementById("daySheet").clientWidth + 1), "no sideways scroll");
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();

  // ③ dry days on end: a dry, warm and humid week (19:00, the page at tomorrow) (⑤ mould, in 暮らしのひとこと: taken out 2026-11-18)
  p = await open(b, "2026-11-16T19:00:00+09:00", {}, humid);
  ok((await txt(p, "#wx6Story")).endsWith("雨の降らない日が12日続いていて、この先1週間も雨の予報はありません。乾燥や火の元に気をつけて。"), "③ 12 dry days and none in the week", await txt(p, "#wx6Story"));
  ok((await txt(p, "#wx11RestSay")) === "次の休みは11/21（土）から3連休（勤労感謝の日）。11/23（月）は雨の予報です。", "⑧ the same days off in the evening");
  ok(!p.errs.length, "no page errors (evening)", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
