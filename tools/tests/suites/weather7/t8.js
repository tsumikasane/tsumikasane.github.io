// 天気 その14 ①〜⑩, through weather7's hook build at 8809 (きょう・天気's ports all taken) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8809/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s  ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((x) => x.textContent).join("｜"), sel).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__wx14[f](...a), { f, a });
const T = (hm, d = D.DAY) => Date.parse(`${d}T${hm}:00+09:00`);
const json = (body) => ({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
const ix = (H, t) => H.time.indexOf(t);
// the forecast: an east wind of 6 m/s at 8時 and 5 at 18時 today; rain 12 mm on 11/19 and 6 on 11/20
function forecast() {
  const f = D.forecast(), H = f.hourly;
  H.wind_speed_10m[ix(H, "2026-11-16T08:00")] = 6; H.wind_speed_10m[ix(H, "2026-11-16T18:00")] = 5;
  f.daily.precipitation_sum = [0, 0, 0, 0, 12, 6, 0, 0];
  return f;
}
// the next week known (11/15〜11/29, rain on 11/24 (火), cloud on 11/26 (木))
function twoWeeks() {
  const f = forecast(), time = Array.from({ length: 15 }, (_, i) => new Date(Date.UTC(2026, 10, 15 + i)).toISOString().slice(0, 10)), n = time.length;
  Object.assign(f.daily, { time, weather_code: time.map((d) => (d === "2026-11-24" ? 61 : d === "2026-11-26" ? 3 : 1)), temperature_2m_max: time.map(() => 15), temperature_2m_min: time.map(() => 7), precipitation_probability_max: time.map((d) => (d === "2026-11-24" ? 80 : 10)),
    apparent_temperature_max: Array(n).fill(14), apparent_temperature_min: Array(n).fill(5), sunrise: time.map((d) => `${d}T06:20`), sunset: time.map((d) => `${d}T16:30`), uv_index_max: Array(n).fill(3), wind_speed_10m_max: Array(n).fill(3),
    precipitation_sum: Array(n).fill(0), wind_direction_10m_dominant: Array(n).fill(0), wind_gusts_10m_max: Array(n).fill(6) });
  return f;
}
// the 16 days: 14〜18° / 5〜8°
const long = () => { const time = Array.from({ length: 16 }, (_, i) => new Date(Date.UTC(2026, 10, 16 + i)).toISOString().slice(0, 10)); return { daily: { time, weather_code: time.map(() => 1), temperature_2m_max: time.map((d, i) => 14 + (i % 5)), temperature_2m_min: time.map((d, i) => 5 + (i % 4)), precipitation_probability_max: time.map(() => 10) } }; };
async function open(b, when, more = {}, fc = forecast) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1 });
  await p.route("https://api.open-meteo.com/**", (r) => {
    const u = r.request().url();
    return r.fulfill(json(u.includes("latitude=43.06,38.27") ? [] : u.includes("latitude=35.68,34.69") ? D.places() : u.includes("latitude=34.69") || u.includes("latitude=35.01") ? D.osaka() : u.includes("past_days=31") ? D.month() : u.includes("forecast_days=16") ? long() : u.includes("models=") ? { daily: { time: [] } } : fc()));
  });
  await p.route("https://archive-api.open-meteo.com/**", (r) => r.fulfill(json(D.archive(r.request().url()))));
  await p.route("https://air-quality-api.open-meteo.com/**", (r) => r.fulfill(json({ hourly: { time: [], pm2_5: [], dust: [] } })));
  await p.route("https://mreversegeocoder.gsi.go.jp/**", (r) => r.fulfill(json({ results: { muniCd: "13101" } })));
  await seed(p, D.all(more), "home"); await p.waitForTimeout(1200);
  await p.click('.tile[data-tile="weather"]'); await p.waitForTimeout(2200);
  return p;
}
const setting = (p, id) => p.evaluate(({ P, id }) => (JSON.parse(localStorage.getItem(P + "settings")) || []).find((x) => x.id === id), { P, id });
(async () => {
  const b = await chromium.launch();
  let p = await open(b, "2026-11-16T10:00:00+09:00", { settings: [{ id: "wxCommute", on: true, go: "08:00", back: "18:00", weekdays: true, updatedAt: 1 }, { id: "wxRoute", dir: 90, updatedAt: 1 }] });

  // ① the sky's colour: sunny today, rain on 11/19
  ok((await p.getAttribute(".wx-daycard", "class")) === "card wx-daycard wx14-sky sun", "① today in the sun's colour", await p.getAttribute(".wx-daycard", "class"));
  // ④ eastward: head wind there, tail wind back
  ok((await txt(p, "#wx14Wind")) === flat("行き（8:00）は向かい風（東の風 6 m/s）。帰り（18:00）は追い風（東の風 5 m/s）。向かい風のときは、時間に余裕をもって"), "④ head wind there, tail wind back", await txt(p, "#wx14Wind"));
  // ⑧ the week's rain against the normal
  ok((await txt(p, "#wx14WeekRain")) === flat("この1週間の雨の量：合わせて 18 mm（平年のこのころの1週間は 22 mm。平年の 82%）"), "⑧ 18 mm against 22", await txt(p, "#wx14WeekRain"));
  // ⑩ the 16 days as a graph
  ok((await p.getAttribute("#wx14Long svg", "aria-label")) === "16日間の気温。いちばん暖かいのは11/21（土）（最高18度）、いちばん冷えるのは11/19（木）（最低-1度）", "⑩ the 16 days", await p.getAttribute("#wx14Long svg", "aria-label"));
  await p.locator("#wx14Long").scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
  await p.screenshot({ path: out + "/wx14-long.png" });
  // ① 11/19's rain colour (③ the plants, in 暮らしのひとこと: taken out 2026-11-18)
  await p.click(".wx-days li:nth-child(4) button"); await p.waitForTimeout(400);
  ok((await p.getAttribute(".wx-daycard", "class")).endsWith("wx14-sky rain"), "① rain's colour on 11/19", await p.getAttribute(".wx-daycard", "class"));
  await p.click(".wx-days li:nth-child(1) button"); await p.waitForTimeout(400);
  // ① turned off
  await p.locator("#wx14SkyOn").scrollIntoViewIfNeeded();
  await p.click("#wx14SkyOn"); await p.waitForTimeout(400);
  ok((await p.getAttribute(".wx-daycard", "class")) === "card wx-daycard", "① turned off");
  await p.click("#wx14SkyOn"); await p.waitForTimeout(400);
  // ⑤ readiness: one ticked, where to meet
  await p.locator("#wx14Prep summary").scrollIntoViewIfNeeded();
  await p.click("#wx14Prep summary"); await p.waitForTimeout(200);
  await p.click("#wx14PrepList li:first-child input"); await p.waitForTimeout(300);
  await p.fill("#wx14Meet", "南公園の入り口"); await p.dispatchEvent("#wx14Meet", "change"); await p.waitForTimeout(300);
  const prep = await setting(p, "wxPrep");
  ok(prep && JSON.stringify(prep.done) === JSON.stringify(["飲み水（1人1日3L × 3日分）"]) && prep.meet === "南公園の入り口" && (await txt(p, "#wx14PrepSum")) === "防災の備え（10個のうち1個）", "⑤ one ticked, 南公園", prep);
  await p.screenshot({ path: out + "/wx14-prep.png" });

  // ② sunset today 30 minutes before, sunrise tomorrow
  await p.locator("#wx14Box").scrollIntoViewIfNeeded();
  await p.click("#wx14RiseOn"); await p.click("#wx14SetOn"); await p.waitForTimeout(300);
  let al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-sun:"));
  ok(al[0].at === T("16:04") && al[0].title === "あと30分で日の入り（16:34）" && al[0].body === "晴れの予報。西南西の空に沈みます" && al[1].at === T("05:49", "2026-11-17") && al[1].title === "あと30分で日の出（6:19）" && al[1].body === "晴れの予報。東南東の空から昇ります", "② 16:04 today, 5:49 tomorrow", al.slice(0, 2));
  await p.selectOption("#wx14SunBefore", "0"); await p.waitForTimeout(300);
  al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-sun:"));
  ok(al[0].at === T("16:34") && al[0].title === "まもなく日の入り（16:34）", "② just then", al[0]);
  // ⑨ the turn of the season: winter clothes and the heating, once
  await p.click("#wx14SeasonOn"); await p.waitForTimeout(300);
  al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-season:"));
  ok(al.length === 2 && al.every((a) => a.at === T("20:00")) && al[0].title === "そろそろ冬物を出す時期です" && al[1].title === "暖房を使いはじめる時期です" && al[0].tag === "wx-season:winter:2026", "⑨ 冬物 and 暖房 at 20:00", al);
  ok(!(await W(p, "alarms", T("21:00"))).some((a) => a.tag.startsWith("wx-season:")), "⑨ not again once told");
  // ⑥ the week (11/23〜) not yet known on Monday: none
  await p.click("#wx14WeekOn"); await p.waitForTimeout(300);
  ok(!(await W(p, "alarms", T("10:00"))).some((a) => a.tag.startsWith("wx-week:")), "⑥ none while next week isn't known");
  // ⑦ the list: 5 on (日の出, 日の入り, 週の天気, 季節の変わり目 and 0 others… as the switches are); 雪's setting a press away
  await p.locator("#wx14Notes summary").scrollIntoViewIfNeeded();
  await p.click("#wx14Notes summary"); await p.waitForTimeout(200);
  const ons = await p.$$eval("#wx14NoteList li.on .wx14-nl", (l) => l.map((x) => x.textContent));
  ok((await txt(p, "#wx14NotesSum")) === flat("天気のお知らせの一覧（オン 4個）") && (await p.$$eval("#wx14NoteList li", (l) => l.length)) === 21 && !/旅行先の天気|自分で決めるお知らせ|^持ち物$/m.test((await p.$$eval("#wx14NoteList .wx14-nl", (l) => l.map((x) => x.textContent))).join("\n")) && JSON.stringify(ons) === JSON.stringify(["日の出", "日の入り", "週の天気", "季節の変わり目"]), "⑦ 4 on", [await txt(p, "#wx14NotesSum"), ons]);
  await p.screenshot({ path: out + "/wx14-notes.png" });
  await p.click('#wx14NoteList [aria-label="雪の設定へ"]'); await p.waitForTimeout(900);
  ok((await p.evaluate(() => document.activeElement && document.activeElement.id)) === "wx12SnowOn", "⑦ to 雪's switch");
  ok(await p.evaluate(() => document.getElementById("daySheet").scrollWidth <= document.getElementById("daySheet").clientWidth + 1), "no sideways scroll");
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();

  // ⑥ the week known (Saturday 11/21): told on Sunday 20:00, 火 wet; ① today's card after dark
  p = await open(b, "2026-11-21T19:00:00+09:00", {}, twoWeeks);
  await p.evaluate((P) => localStorage.setItem(P + "wxWeekAlert", "1"), P);
  const wk = (await W(p, "alarms", T("19:00", "2026-11-21"))).filter((a) => a.tag.startsWith("wx-week:"));
  ok(wk.length === 1 && wk[0].at === T("20:00", "2026-11-22") && wk[0].title === "来週の天気" && wk[0].body === "月 晴れ・火 雨・水 晴れ・木 くもり・金 晴れ・土 晴れ・日 晴れ。傘がいる日：火", "⑥ Sunday 20:00: the week, 火 wet", wk);
  await p.click(".wx-days li:nth-child(1) button"); await p.waitForTimeout(400);
  ok((await p.getAttribute(".wx-daycard", "class")).endsWith("wx14-sky night"), "① today after dark: the night's", await p.getAttribute(".wx-daycard", "class"));
  ok(!p.errs.length, "no page errors (Saturday)", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
