// 天気 その9 ①〜⑩, through weather7's hook build at 8809 (きょう・天気's ports all taken) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8809/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s  ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((x) => x.textContent).join("｜"), sel).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__wx9[f](...a), { f, a });
const T = (hm, d = D.DAY) => Date.parse(`${d}T${hm}:00+09:00`);
const json = (body) => ({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
// the forecast with 11/17 cooling 6.5° from 16時 (15.5°) to 18時, and 11/19 35 mm at 15時
function forecast() {
  const f = D.forecast(), H = f.hourly, at = (t) => H.time.indexOf(t);
  H.temperature_2m[at("2026-11-17T17:00")] = 10; H.temperature_2m[at("2026-11-17T18:00")] = 9;
  H.precipitation[at("2026-11-19T15:00")] = 35;
  return f;
}
// the ten cities: 札幌 snowy and cold, the rest as 東京
const japan = () => Array.from({ length: 10 }, (_, i) => ({ daily: { weather_code: i === 0 ? [71, 73] : [1, 3], temperature_2m_max: i === 0 ? [3, 1] : [15 + i, 14 + i], temperature_2m_min: i === 0 ? [-3, -5] : [7, 6], precipitation_probability_max: i === 0 ? [80, 90] : [10, 20] } }));
async function open(b, when, more = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1 });
  p.calls = [];
  await p.route("https://api.open-meteo.com/**", (r) => {
    const u = r.request().url(); p.calls.push(u);
    return r.fulfill(json(u.includes("latitude=43.06,38.27") ? japan() : u.includes("latitude=35.68,34.69") ? D.places() : u.includes("latitude=34.69") || u.includes("latitude=35.01") ? D.osaka() : u.includes("past_days=31") ? D.month() : u.includes("forecast_days=16") || u.includes("models=") ? { daily: { time: [] } } : forecast()));
  });
  await p.route("https://archive-api.open-meteo.com/**", (r) => r.fulfill(json(D.archive(r.request().url()))));
  await p.route("https://air-quality-api.open-meteo.com/**", (r) => r.fulfill(json({ hourly: { time: [], pm2_5: [], dust: [] } })));
  await p.route("https://mreversegeocoder.gsi.go.jp/**", (r) => r.fulfill(json({ results: { muniCd: "13101" } })));
  await seed(p, D.all(more), "home"); await p.waitForTimeout(1200);
  await p.click('.tile[data-tile="weather"]'); await p.waitForTimeout(2200);
  return p;
}
const ev = (date, time, title, i) => ({ id: "x" + i, date, time, title, createdAt: Date.parse("2026-11-10T09:00:00+09:00") + i });
(async () => {
  const b = await chromium.launch();
  const base = D.all();
  const p = await open(b, "2026-11-16T10:00:00+09:00", {
    events: [...base.events, ev("2026-11-19", "12:00", "BBQ", 1), ev("2026-11-19", "18:00", "部活", 2), ev("2026-11-18", "10:00", "公園で散歩", 3)],
    settings: [{ id: "wxOutWords", text: "部活", updatedAt: 1 }, { id: "wxCommute", on: true, go: "08:00", back: "18:00", weekdays: true, updatedAt: 1 },
      { id: "wxAche", days: { "2026-11-10": 1, "2026-11-12": 1, "2026-11-14": 1 }, updatedAt: 1 },
      { id: "h4mood", days: { "2026-10-18": 4, "2026-10-20": 2, "2026-10-22": 4, "2026-10-25": 2, "2026-11-01": 5, "2026-11-04": 3, "2026-11-10": 4 }, updatedAt: 1 }],
    wxPressLog: { "2026-11-10": 5, "2026-11-11": 1, "2026-11-12": 6, "2026-11-13": 0.5, "2026-11-14": 4.5, "2026-11-15": 1 },
  });

  // ① the outdoor plans in the rain (BBQ, and 部活 added; not 11/18's walk, dry)
  ok((await txt(p, "#wx9OutPlans li")) === "11/19（木）雨80%12:00BBQ｜11/19（木）雨80%18:00部活", "① BBQ and 部活 on 11/19", await txt(p, "#wx9OutPlans li"));
  // ④ disasters (防災: キキクル, the hazard map, heavy rain): taken out at the user's call (2026-11-24, tools/REMOVED.md)
  ok(!(await p.$("#wx9Bousai")) && !(await p.$(".wx9-kiki")) && !(await p.$(".wx9-hazard")) && !(await p.$("#wx7-bousai")), "④ gone");
  // ⑦ why it feels colder (⑥ the pleasant hours, in 暮らしのひとこと: taken out 2026-11-18)
  ok((await txt(p, "#wx9Feel")) === "18時ごろは、空気が乾いていて、気温より5°寒く感じそうです", "⑦ 18時 feels 5° colder", await txt(p, "#wx9Feel"));
  // ⑨ 天気と気分 went with きょうの気分 (taken out, the user's call 2026-11-19)
  ok(!(await p.$("#wx9Mood")), "⑨ no 天気と気分 (taken out)");
  await p.screenshot({ path: out + "/wx9-top.png" });

  // ⑤ 11/17 cooling; 11/19 (heavy rain): no 防災's line
  await p.click(".wx-days li:nth-child(2) button"); await p.waitForTimeout(400);
  ok((await txt(p, ".wx9-swing")) === "急に寒くなる時間：16時〜18時に7°下がります羽織るものがあると安心", "⑤ 11/17 16時〜18時 (15.5° to 9°)", await txt(p, ".wx9-swing"));
  await p.click(".wx-days li:nth-child(4) button"); await p.waitForTimeout(400);
  ok(!(await p.$(".wx9-heavy")), "④ 11/19: no 大雨 line (防災 taken out)");
  await p.click(".wx-days li:nth-child(1) button"); await p.waitForTimeout(400);

  // ① ② ⑩ the notifications
  await p.locator("#wx9Box").scrollIntoViewIfNeeded();
  await p.click("#wx9OutOn"); await p.waitForTimeout(300);
  let al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-outplan:"));
  ok(al.length === 2 && al[0].at === T("20:00", "2026-11-18") && al[0].title === "あしたの「BBQ」は雨の予報です" && al[0].body === "12:00ごろの降水確率 80%。予定を見なおすか、雨の用意を", "① the evening before at 20:00", al);
  await p.locator("#wx9UmbOn").scrollIntoViewIfNeeded();
  await p.click("#wx9UmbOn"); await p.waitForTimeout(300);
  al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-umb:"));
  ok(al.length === 1 && al[0].at === T("07:45", "2026-11-19") && al[0].body === "12時ごろから21時ごろまで雨の予報です。帰り（18:00）は降っていそうです", "② 15 minutes before 行き on 11/19", al);
  await p.locator("#wxMornOn").scrollIntoViewIfNeeded();
  await p.click("#wxMornOn"); await p.waitForTimeout(300);
  await p.click("#wx9MornExtra"); await p.waitForTimeout(300);
  const mo = (await W(p, "alarms", T("10:00"))).find((a) => a.tag === "wx-morning:2026-11-19");
  ok(mo && mo.body.endsWith("。傘を持っていこう。注意：路面の凍結"), "⑩ 11/19's morning: frozen roads", mo && mo.body);
  await p.locator("#wx9Box").scrollIntoViewIfNeeded();
  await p.screenshot({ path: out + "/wx9-more.png" });
  ok(await p.evaluate(() => document.getElementById("daySheet").scrollWidth <= document.getElementById("daySheet").clientWidth + 1), "no sideways scroll");
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
