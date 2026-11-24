// 天気 その12 ①〜⑩, through weather7's hook build at 8809 (きょう・天気's ports all taken) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8809/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s  ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((x) => x.textContent).join("｜"), sel).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__wx12[f](...a), { f, a });
const T = (hm, d = D.DAY) => Date.parse(`${d}T${hm}:00+09:00`);
const json = (body) => ({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
const ix = (H, t) => H.time.indexOf(t);
// the forecast: 60% at 15時 today; snow on 11/17 4時〜9時 (1 cm an hour)
function forecast() {
  const f = D.forecast(), H = f.hourly;
  H.precipitation_probability[ix(H, "2026-11-16T15:00")] = 60;
  for (let h = 4; h <= 9; h++) { const i = ix(H, `2026-11-17T0${h}:00`); H.snowfall[i] = 1; H.weather_code[i] = 73; }
  return f;
}
// 大阪's next 3 days by the hour: thunder and 30 mm at 15時 tomorrow
function watch() {
  const time = [], z = (v) => time.map(() => v), H = {};
  for (const d of ["2026-11-16", "2026-11-17", "2026-11-18"]) for (let h = 0; h < 24; h++) time.push(`${d}T${String(h).padStart(2, "0")}:00`);
  Object.assign(H, { time, weather_code: z(1), precipitation: z(0), wind_speed_10m: z(3), wind_gusts_10m: z(6), snowfall: z(0) });
  H.weather_code[time.indexOf("2026-11-17T15:00")] = 95; H.precipitation[time.indexOf("2026-11-17T15:00")] = 30;
  return { hourly: H };
}
async function open(b, when, more = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1 });
  p.calls = [];
  await p.route("https://api.open-meteo.com/**", (r) => {
    const u = r.request().url(); p.calls.push(u);
    return r.fulfill(json(u.includes("latitude=43.06,38.27") ? [] : u.includes("latitude=35.68,34.69") ? D.places() : u.includes("forecast_days=3") ? watch() : u.includes("latitude=34.69") || u.includes("latitude=35.01") ? D.osaka() : u.includes("past_days=31") ? D.month() : u.includes("forecast_days=16") || u.includes("models=") ? { daily: { time: [] } } : forecast()));
  });
  // (this year's: 1° warmer than its normal)
  await p.route("https://archive-api.open-meteo.com/**", (r) => { const u = r.request().url(), a = D.archive(u); p.calls.push(u); if (u.includes("start_date=2026-01-01")) a.daily.temperature_2m_max = a.daily.temperature_2m_max.map((v) => v + 1); return r.fulfill(json(a)); });
  await p.route("https://air-quality-api.open-meteo.com/**", (r) => r.fulfill(json({ hourly: { time: [], pm2_5: [], dust: [] } })));
  await p.route("https://mreversegeocoder.gsi.go.jp/**", (r) => r.fulfill(json({ results: { muniCd: "13101" } })));
  await seed(p, D.all(more), "home"); await p.waitForTimeout(1200);
  await p.click('.tile[data-tile="weather"]'); await p.waitForTimeout(2200);
  return p;
}
const setting = (p, id) => p.evaluate(({ P, id }) => (JSON.parse(localStorage.getItem(P + "settings")) || []).find((x) => x.id === id), { P, id });
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k)), { P, k });
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-16T10:00:00+09:00", { settings: [{ id: "wxCommute", on: true, go: "05:30", back: "18:00", weekdays: true, updatedAt: 1 }, { id: "wxUmbAt", at: 30, updatedAt: 1 }] }); // (③ 傘の基準 taken out, 2026-11-22: a 30% kept from before)

  // ① rain's chance by the 6 hours (降水確率 6時間ごと): taken out at the user's call (2026-11-24, tools/REMOVED.md)
  ok(!(await p.$("#wx12Six")) && !(await p.$(".wx12-six")), "① gone");
  // ② the warmest and coldest hours (16° at 14時, 8° at 2時)
  ok((await txt(p, ".wx-dl > div")).includes("最高の時刻14時ごろ｜最低の時刻2時ごろ"), "② 14時 and 2時", await txt(p, ".wx-dl > div"));
  // ④ the way there before dawn (5:50), back after dusk (17:01)
  ok((await txt(p, "#wx12Dark")) === flat("行き（5:30）は、まだ暗い時間です（明るくなるのは 5:50ごろ）。帰り（18:00）は、暗くなってからです（暗くなるのは 17:01ごろ）。自転車はライトを早めに。明るい色の服や反射材があると安心です"), "④ dark both ways", await txt(p, "#wx12Dark"));
  // ⑤ 持ち物 ticked off
  const pills0 = await txt(p, "#wx8Take li");
  ok(pills0.startsWith("折りたたみ傘") && (await txt(p, "#wx12PackNote")) === "用意できたものを押すと、印がつきます", "⑤ nothing packed yet (折りたたみ傘 first: 60% under 50's line for the day)", pills0);
  await p.click("#wx8Take li:first-child button"); await p.waitForTimeout(400);
  const n = (await p.$$eval("#wx8Take li", (l) => l.length));
  ok((await p.getAttribute("#wx8Take li:first-child", "class")) === "wx12-on" && (await p.getAttribute("#wx8Take li:first-child button", "aria-pressed")) === "true" && (await txt(p, "#wx12PackNote")) === `${n}つのうち1つ、用意できました`
    && JSON.stringify(await ls(p, "wxPacked")) === JSON.stringify({ "2026-11-16": ["折りたたみ傘"] }) && (await p.evaluate(() => document.activeElement && document.activeElement.dataset.pack)) === "折りたたみ傘", "⑤ 折りたたみ傘 packed (focus kept)", await ls(p, "wxPacked"));
  await p.click("#wx8Take li:first-child button"); await p.waitForTimeout(400);
  ok((await ls(p, "wxPacked")) === null, "⑤ and unpacked");
  // ③ the umbrella's line: taken out (the user's call, 2026-11-22, tools/REMOVED.md): no box; the 30% kept from before
  // is left as it is and not used (today's 40% is no wet day: 折りたたみ傘, as at 50%)
  ok(!(await p.$("#wx12UmbBox")) && !(await p.$("#wx12UmbAt")) && (await txt(p, "#wx8Take li")).startsWith("折りたたみ傘") && JSON.stringify(await setting(p, "wxUmbAt")).includes('"at":30'),
    "③ 傘の基準: gone, 50% as before, the kept 30% left alone", [await txt(p, "#wx8Take li"), await setting(p, "wxUmbAt")]);
  // ⑧ snow tomorrow from 4時 (6 cm): told at 20:00 tonight
  await p.locator("#wx10NoteBox").scrollIntoViewIfNeeded();
  await p.click("#wx12SnowOn"); await p.waitForTimeout(300);
  let al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-snow:"));
  ok(al.length === 1 && al[0].at === T("20:00") && al[0].title === "あしたは雪の予報です（4時ごろから）" && al[0].body === "1日で6cmほど降りそうです。足もとや路面の凍結、交通の乱れに気をつけて", "⑧ 20:00 tonight", al);
  // ⑨ 大阪 watched over: thunder and 30 mm at 15時 tomorrow
  await p.locator("#wx12WatchBox").scrollIntoViewIfNeeded();
  await p.selectOption("#wx12WatchPlace", "1"); await p.click("#wx12WatchOn"); await p.waitForTimeout(900);
  al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-watch:"));
  ok(p.calls.some((u) => u.includes("latitude=34.69") && u.includes("forecast_days=3") && u.includes("hourly=weather_code,precipitation,wind_speed_10m,wind_gusts_10m,snowfall")) && al.length === 1 && al[0].at === T("20:00") && al[0].title === "大阪：あしたは雷・激しい雨の予報です" && al[0].body === "15時ごろから。見守りの場所のお知らせです。連絡してみては"
    && (await txt(p, "#wx12WatchNote")) === flat("あした：雷・激しい雨（15時ごろから）"), "⑨ 大阪's thunder told at 20:00", [al, await txt(p, "#wx12WatchNote")]);
  await p.screenshot({ path: out + "/wx12-watch.png" });
  // ⑩ one stopped from the list, then back
  await p.locator("#wx6Next summary").scrollIntoViewIfNeeded();
  await p.click("#wx6Next summary"); await p.waitForTimeout(200);
  const before = await txt(p, "#wx6NextList .wx6-nn");
  ok(before.includes("あしたは雪の予報です（4時ごろから）") && !(await p.isVisible("#wx12Unmute")), "⑩ the snow's in the list", before);
  await p.click('#wx6NextList [aria-label="「あしたは雪の予報です（4時ごろから）」を止める"]'); await p.waitForTimeout(400);
  ok(!(await txt(p, "#wx6NextList .wx6-nn")).includes("雪の予報") && !(await W(p, "alarms", T("10:00"))).some((a) => a.tag === "wx-snow:2026-11-17") && JSON.stringify(Object.keys(await ls(p, "wxMuted"))) === JSON.stringify(["wx-snow:2026-11-17"])
    && (await txt(p, "#wx12Unmute")) === "止めたお知らせ（1件）を、もとにもどす", "⑩ the snow's stopped", await ls(p, "wxMuted"));
  await p.screenshot({ path: out + "/wx12-mute.png" });
  await p.click("#wx12Unmute"); await p.waitForTimeout(400);
  ok((await ls(p, "wxMuted")) === null && (await W(p, "alarms", T("10:00"))).some((a) => a.tag === "wx-snow:2026-11-17") && !(await p.isVisible("#wx12Unmute")), "⑩ and back");
  ok(await p.evaluate(() => document.getElementById("daySheet").scrollWidth <= document.getElementById("daySheet").clientWidth + 1), "no sideways scroll");
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
