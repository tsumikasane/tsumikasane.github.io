// 天気 その10 ①〜⑩, through weather7's hook build at 8809 (きょう・天気's ports all taken) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8809/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s  ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((x) => x.textContent).join("｜"), sel).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__wx10[f](...a), { f, a });
const T = (hm, d = D.DAY) => Date.parse(`${d}T${hm}:00+09:00`);
const json = (body) => ({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
// the forecast with a hot noon on 11/20 (33°, 60%, 800 W/m²: 暑さ指数 31) and a clear night on 11/17
function forecast() {
  const f = D.forecast(), H = f.hourly;
  for (let h = 12; h <= 14; h++) { const i = H.time.indexOf(`2026-11-20T${h}:00`); H.temperature_2m[i] = 33; H.relative_humidity_2m[i] = 60; H.shortwave_radiation[i] = 800; }
  for (let h = 20; h <= 23; h++) H.cloud_cover[H.time.indexOf(`2026-11-17T${h}:00`)] = 10; // (a clear night for しし座流星群)
  return f;
}
async function open(b, when, more = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1 });
  await p.route("https://api.open-meteo.com/**", (r) => {
    const u = r.request().url();
    return r.fulfill(json(u.includes("latitude=43.06,38.27") ? [] : u.includes("latitude=35.68,34.69") ? D.places() : u.includes("latitude=34.69") || u.includes("latitude=35.01") ? D.osaka() : u.includes("past_days=31") ? D.month() : u.includes("forecast_days=16") || u.includes("models=") ? { daily: { time: [] } } : forecast()));
  });
  await p.route("https://archive-api.open-meteo.com/**", (r) => r.fulfill(json(D.archive(r.request().url()))));
  await p.route("https://air-quality-api.open-meteo.com/**", (r) => r.fulfill(json({ hourly: { time: [], pm2_5: [], dust: [] } })));
  await p.route("https://mreversegeocoder.gsi.go.jp/**", (r) => r.fulfill(json({ results: { muniCd: "13101" } })));
  await seed(p, D.all(more), "home"); await p.waitForTimeout(1200);
  await p.click('.tile[data-tile="weather"]'); await p.waitForTimeout(2200);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, "2026-11-16T10:00:00+09:00", { settings: [{ id: "wxCommute", on: true, go: "08:00", back: "18:00", weekdays: true, updatedAt: 1 }] });

  // ② the day before, the day and the day after
  const three = await p.$$eval("#wx10Three [role=listitem]", (l) => l.map((x) => x.getAttribute("aria-label")));
  ok(JSON.stringify(three) === JSON.stringify(["きのう、くもり、最高16度、最低8度、降水確率20%", "きょう、晴れ、最高15度、最低7度、降水確率40%", "あした、晴れ、最高16度、最低6度、降水確率10%"]), "② きのう・きょう・あした", three);
  // ⑨ the first frost
  ok((await txt(p, "#wx6Story")).includes("11/19（木）の朝は、この冬はじめて0°を下回りそうです。"), "⑨ the winter's first 0° and under", await txt(p, "#wx6Story"));
  // ① the page in brief
  await p.click('#wx7Jump [data-key="simple"]'); await p.waitForTimeout(400);
  const chips = await p.$$eval("#wx7Jump button", (l) => l.map((x) => x.textContent));
  ok(JSON.stringify(chips) === JSON.stringify(["ぜんぶ表示", "1時間ごと", "雨", "服装", "持ち物", "1週間", "お知らせ・場所"]) && !(await p.$("#wx6Out")) && !!(await p.$(".wx-hours")), "① かんたん表示: five sections", chips);
  await p.screenshot({ path: out + "/wx10-simple.png" });
  await p.click('#wx7Jump [data-key="simple"]'); await p.waitForTimeout(400);
  ok(!!(await p.$("#wx6Out")) && (await p.evaluate((P) => localStorage.getItem(P + "wxSimple"), P)) === null, "① ぜんぶ表示 again");
  // ⑧ which umbrella (11/19: 2 mm an hour, little wind)
  await p.click(".wx-days li:nth-child(4) button"); await p.waitForTimeout(400);
  ok((await txt(p, "#wx10Umb")) === "傘は、折りたたみで大丈夫そう（1時間に2mmほど）", "⑧ a folding one will do", await txt(p, "#wx10Umb"));
  await p.click(".wx-days li:nth-child(1) button"); await p.waitForTimeout(400);
  ok(!(await p.$("#wx10Umb")), "⑧ none on a dry day");

  // ④⑤⑥ the notifications
  await p.locator("#wx10NoteBox").scrollIntoViewIfNeeded();
  await p.click("#wx10DrinkOn"); await p.waitForTimeout(300);
  let al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-drink:"));
  ok(JSON.stringify(al.map((a) => a.tag)) === JSON.stringify(["wx-drink:2026-11-20:12", "wx-drink:2026-11-20:14"]) && al[0].at === T("12:00", "2026-11-20") && al[0].body === "暑さ指数 31（危険）。水と塩分をとって、すずしい所で休けいを", "④ 12時 and 14時 on the hot day", al);
  await p.click("#wx10SkyOn"); await p.waitForTimeout(300);
  al = (await W(p, "alarms", T("10:00"))).filter((a) => /^wx-(glow|sky):/.test(a.tag));
  const glow = al.find((a) => a.tag === "wx-glow:2026-11-16"), shower = al.find((a) => a.tag === "wx-sky:2026-11-17");
  ok(glow && glow.at === T("16:04") && glow.title === "夕焼けがきれいに見えそうです" && glow.body === "日の入りは 16:34。16:04ごろから、西の空を見てみて" && shower && shower.at === T("20:00", "2026-11-17") && shower.title === "今夜はしし座流星群",
    "⑤ today's sunset, tomorrow's しし座流星群", al.map((a) => [a.tag, a.title]));
  await p.locator("#wx10BackOn").scrollIntoViewIfNeeded();
  await p.click("#wx10BackOn"); await p.waitForTimeout(300);
  al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-back:"));
  ok(al.length === 1 && al[0].at === T("17:30", "2026-11-19") && al[0].title === "帰りは雨の予報です" && al[0].body === "18:00ごろの降水確率 80%。傘を持って帰ろう", "⑥ 30 minutes before 帰り on 11/19", al);
  // ⑦ a trip to 大阪 on 11/20〜11/21
  await p.locator("#wx10TripBox").scrollIntoViewIfNeeded();
  await p.selectOption("#wx10TripPlace", "1"); await p.waitForTimeout(200);
  await p.fill("#wx10TripFrom", "2026-11-20"); await p.fill("#wx10TripTo", "2026-11-21"); await p.waitForTimeout(200);
  await p.click("#wx10TripOn"); await p.waitForTimeout(900);
  al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-trip:"));
  ok(al.length === 2 && al[0].at === T("07:00", "2026-11-20") && al[0].title === "大阪の天気：晴れ 13° / 5°" && al[1].title === "大阪の天気：晴れ 21° / 10°" && al[0].body === "降水確率 10%"
    && (await txt(p, "#wx10TripNote")).startsWith("11/20（金）：晴れ13°/5°・10%"), "⑦ 大阪 on the mornings of 11/20 and 11/21", [al, await txt(p, "#wx10TripNote")]);
  // ⑩ quiet hours: 6:00 to 8:00, the trip's mornings not sent
  await p.locator("#wx10CalmBox").scrollIntoViewIfNeeded();
  await p.click("#wx10CalmOn"); await p.waitForTimeout(200);
  await p.fill("#wx10CalmFrom", "06:00"); await p.fill("#wx10CalmTo", "08:00"); await p.waitForTimeout(400);
  const all = await W(p, "alarms", T("10:00"));
  ok(!all.some((a) => a.tag.startsWith("wx-trip:")) && all.some((a) => a.tag.startsWith("wx-back:")), "⑩ none between 6:00 and 8:00 (帰り's stays)", all.map((a) => a.tag));
  await p.screenshot({ path: out + "/wx10-more.png" });
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();

  // ③ in the evening the page opens at tomorrow; turned off, at today
  p = await open(b, "2026-11-16T19:00:00+09:00");
  ok((await txt(p, ".wx-dayhead")).startsWith("あした・11月17日（火）"), "③ 19:00: tomorrow first", await txt(p, ".wx-dayhead"));
  await p.screenshot({ path: out + "/wx10-evening.png" });
  await p.evaluate((P) => localStorage.setItem(P + "wxEveFirstOff", "1"), P);
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  await p.click('.tile[data-tile="weather"]'); await p.waitForTimeout(900);
  ok((await txt(p, ".wx-dayhead")).startsWith("きょう・11月16日（月）"), "③ turned off: today", await txt(p, ".wx-dayhead"));
  ok(await p.evaluate(() => document.getElementById("daySheet").scrollWidth <= document.getElementById("daySheet").clientWidth + 1), "no sideways scroll");
  ok(!p.errs.length, "no page errors (evening)", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
