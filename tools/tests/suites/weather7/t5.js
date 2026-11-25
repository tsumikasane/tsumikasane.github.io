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
  // ⑩ a past day's weather (過去の天気): taken out at the user's call (2026-11-24, tools/REMOVED.md): no section, nor its
  // chip, nor the day asked of the archive
  ok(!(await p.$("#wx11Past")) && !(await p.$("#wx7-past")) && !(await p.$$eval("#wx7Jump button", (l) => l.some((x) => x.textContent === "過去の天気"))) && !p.calls.some((u) => u.includes("start_date=2025-11-16&end_date=2025-11-16")), "⑩ gone");
  // ⑨ the user's own things: taken out (the user's call, 2026-11-22, tools/REMOVED.md): those kept (水筒 always,
  // レインブーツ on a wet day) stay in the account's settings and aren't put in 持ち物 (the list: the section itself taken out, 2026-11-25)
  const take = (d) => p.evaluate((d) => window.__wx8.take(d).join("｜"), d);
  ok((await take("2026-11-16")) === "日焼け止め｜羽織るもの" && !(await p.$(".wx11-mine, #wx11TakeAdd")), "⑨ 水筒 not in 持ち物", await take("2026-11-16"));
  ok(!/レインブーツ|水筒/.test(await take("2026-11-19")), "⑨ nor レインブーツ on a wet day", await take("2026-11-19"));

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

  // ⑨ under the page: no box to add to or take from; the list kept as it was
  const things = await setting(p, "wxMyThings");
  ok(!(await p.$("#wx11ThingsBox")) && !(await p.$("#wx11ThingName")) && things && things.items.map((x) => x.w).join() === "レインブーツ,水筒", "⑨ 自分の持ち物: gone from under the page, the list kept", things);

  // ① stormy hours: today's thunder at 15時 (told at 14:00), tomorrow's at 3時 (told at 21:00 tonight)
  await p.locator("#wx10NoteBox").scrollIntoViewIfNeeded();
  await p.click("#wx11StormOn"); await p.waitForTimeout(300);
  let al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-storm:"));
  ok(al.length === 2 && al[0].at === T("14:00") && al[0].title === "きょう15時ごろから、雷の予報です" && al[0].body === "雷が聞こえたら、すぐに建物の中へ"
    && al[1].at === T("21:00") && al[1].title === "あした3時ごろから、雷・強い雨・強い風の予報です" && al[1].body === "雷が聞こえたら、すぐに建物の中へ。雨は1時間に25mmほど。川や低い土地には近づかないで。風は22m/sほど。飛ばされやすい物は中へ", "① 14:00 today, 21:00 for tomorrow's small hours", al);
  // ② a notification on the user's own terms: taken out (the user's call, 2026-11-22, tools/REMOVED.md): no box; terms
  // kept from before (wxMyAlert) are left as they are and tell nothing
  await p.evaluate((P) => localStorage.setItem(P + "wxMyAlert", JSON.stringify({ on: true, lo: 0, hi: 18, at: "21:00" })), P);
  al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-mine:"));
  ok(!(await p.$("#wx11RuleBox")) && !(await p.$("#wx11RuleOn")) && !al.length && (await p.evaluate((P) => localStorage.getItem(P + "wxMyAlert"), P)) !== null, "② 自分で決めるお知らせ: gone, nothing told, the terms left alone", al);
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
