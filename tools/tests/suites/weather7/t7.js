// 天気 その13 ①〜⑩, through weather7's hook build at 8809 (きょう・天気's ports all taken) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8809/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s  ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((x) => x.textContent).join("｜"), sel).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__wx13[f](...a), { f, a });
const T = (hm, d = D.DAY) => Date.parse(`${d}T${hm}:00+09:00`);
const json = (body) => ({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
const ix = (H, t) => H.time.indexOf(t);
// the forecast: today wet at 11・12時 and 16〜18時 (70%), 13〜15時 at 20%; 11/17's air damp (80%), 11/18's dry (35%);
// 11/21 a north wind of 9 m/s
function forecast() {
  const f = D.forecast(), H = f.hourly;
  for (const h of [11, 12, 16, 17, 18]) H.precipitation_probability[ix(H, `2026-11-16T${h}:00`)] = 70;
  for (const h of [13, 14, 15]) H.precipitation_probability[ix(H, `2026-11-16T${h}:00`)] = 20;
  H.time.forEach((t, i) => { if (t.startsWith("2026-11-17")) H.relative_humidity_2m[i] = 80; if (t.startsWith("2026-11-18")) H.relative_humidity_2m[i] = 35; });
  const i = f.daily.time.indexOf("2026-11-21"); f.daily.wind_speed_10m_max[i] = 9; f.daily.wind_direction_10m_dominant[i] = 315;
  return f;
}
// the 10 years: rain (5 mm) on the 5th, 10th, 15th … of each month
const ten = (u) => { const a = D.archive(u); a.daily.precipitation_sum = a.daily.time.map((d) => (Number(d.slice(8)) % 5 === 0 ? 5 : 0)); return a; };
// the air: 黄砂 (dust 80) on 11/17
const air = () => { const time = []; for (let k = 0; k < 5; k++) for (let h = 0; h < 24; h++) time.push(`2026-11-${16 + k}T${String(h).padStart(2, "0")}:00`); return { hourly: { time, pm2_5: time.map(() => 20), dust: time.map((t) => (t.startsWith("2026-11-17") ? 80 : 5)), ozone: time.map(() => 60) } }; };
async function open(b, when, more = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1 });
  p.calls = [];
  await p.route("https://api.open-meteo.com/**", (r) => {
    const u = r.request().url(); p.calls.push(u);
    return r.fulfill(json(u.includes("latitude=43.06,38.27") ? [] : u.includes("latitude=35.68,34.69") ? D.places() : u.includes("latitude=34.69") || u.includes("latitude=35.01") ? D.osaka() : u.includes("past_days=31") ? D.month() : u.includes("forecast_days=16") || u.includes("models=") ? { daily: { time: [] } } : forecast()));
  });
  await p.route("https://archive-api.open-meteo.com/**", (r) => { const u = r.request().url(); p.calls.push(u); return r.fulfill(json(u.includes("start_date=2016-01-01") ? ten(u) : D.archive(u))); });
  await p.route("https://air-quality-api.open-meteo.com/**", (r) => r.fulfill(json(air())));
  await p.route("https://mreversegeocoder.gsi.go.jp/**", (r) => r.fulfill(json({ results: { muniCd: "13101" } })));
  await seed(p, D.all(more), "home"); await p.waitForTimeout(1200);
  await p.click('.tile[data-tile="weather"]'); await p.waitForTimeout(2200);
  return p;
}
const day = async (p, n) => { await p.click(`.wx-days li:nth-child(${n}) button`); await p.waitForTimeout(400); };
// 出費 and 勉強 on rainy days (11/4・9・14) and the rest; 2 routines
const ex = [["2026-11-14", 2400], ["2026-11-09", 1800], ["2026-11-04", 3000], ["2026-11-10", 800], ["2026-11-11", 600], ["2026-11-12", 1000], ["2026-11-13", 500]].map(([date, amount], i) => ({ id: "x" + i, kind: "out", date, amount, createdAt: 1 + i }));
const st = [["2026-11-14", 30], ["2026-11-10", 90], ["2026-11-11", 60], ["2026-11-12", 120], ["2026-11-09", 20]].map(([date, minutes], i) => ({ id: "s" + i, date, minutes, createdAt: 1 + i }));
const rt = [{ id: "r1", name: "ストレッチ", createdAt: 1 }, { id: "r2", name: "読書", createdAt: 2 }];
const rd = [["2026-11-14", ["r1", "r2"]], ["2026-11-09", ["r1"]], ["2026-11-10", ["r1", "r2"]], ["2026-11-11", ["r1", "r2"]], ["2026-11-12", ["r2"]]].map(([date, done]) => ({ id: date, date, done }));
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-16T10:00:00+09:00", { expenses: ex, study: st, routines: rt, routineDays: rd, events: [...D.all().events, { id: "far", date: "2026-12-24", time: "18:00", title: "クリスマス会", createdAt: 5 }] });

  // ③ 小春日和 today, ⑨ the sun's bearings
  ok((await txt(p, "#wx13Kotoba")) === flat("小春日和になりそう晩秋から初冬の、春のようにおだやかで暖かい晴れの日"), "③ 小春日和", await txt(p, "#wx13Kotoba"));
  const sun = await p.evaluate(() => { const x = [...document.querySelectorAll(".wx-dl > div")].find((y) => y.querySelector("dt").textContent === "日の出・入りの方角"); return x && [x.querySelector("dd").textContent, x.querySelector("dd").getAttribute("aria-label")]; });
  ok(sun && sun[0] === "東南東 / 西南西" && /^日の出は東南東（11\d度）、日の入りは西南西（24\d度）$/.test(sun[1]), "⑨ 東南東 and 西南西", sun);
  // ① the break 13〜16時
  ok((await txt(p, ".wx13-gap")) === flat("雨の合間：13時〜16時ごろは、雨が弱まりそうです（降水確率 20%）出かけるなら、この時間がおすすめです"), "① 13時〜16時", await txt(p, ".wx13-gap"));
  // ⑧ the records against the weather
  ok((await txt(p, "#wx13Records .wx-line")) === flat("出費：晴れ・くもりの日 121 円／雨・雪の日 1,200 円雨の日のほうが多め（約9.9倍）（24日と6日の平均）｜勉強：晴れ・くもりの日 11分／雨・雪の日 8分雨の日のほうが少なめ（26%少ない）（24日と6日の平均）｜ルーティーン：晴れ・くもりの日 10%／雨・雪の日 25%雨の日のほうが多め（約2.4倍）（24日と6日の平均）"),
    "⑧ 出費・勉強・ルーティーン", await txt(p, "#wx13Records .wx-line"));
  // ⑩ further ahead: 12/16 (today + 30) and the plan on 12/24, from その7 ⑩'s one request
  ok(p.calls.filter((u) => u.includes("start_date=2016-01-01&end_date=2025-12-31")).length === 1 && (await txt(p, "#wx13AheadOut")) === flat("12月16日（水）は、ときどき雨の降る時期ですこの10年で雨（1mm以上）の日は 20%。平均の最高 12°・最低 4°")
    && (await p.getAttribute("#wx13Plans li", "aria-label")) === "12月24日（木）、クリスマス会、この10年で雨の日は20%、平均の最高12度、最低4度", "⑩ 12/16 and 12/24's plan", [await txt(p, "#wx13AheadOut"), await p.getAttribute("#wx13Plans li", "aria-label")]);
  await p.fill("#wx13AheadDay", "2027-01-01"); await p.dispatchEvent("#wx13AheadDay", "change"); await p.waitForTimeout(500);
  ok((await txt(p, "#wx13AheadOut")) === flat("2027年1月1日（金）は、ときどき雨の降る時期ですこの10年で雨（1mm以上）の日は 20%。平均の最高 11°・最低 3°"), "⑩ 2027/1/1", await txt(p, "#wx13AheadOut"));
  await p.locator("#wx13Ahead").scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
  await p.screenshot({ path: out + "/wx13-ahead.png" });
  // ③ 放射冷却 on 11/18 (⑦ hair and static, ② the night: taken out with 暮らしのひとこと, 2026-11-18)
  await day(p, 3);
  ok((await txt(p, "#wx13Kotoba")).startsWith("放射冷却で、朝は冷えこみそう"), "③ 放射冷却 on 11/18", await txt(p, "#wx13Kotoba"));
  // ③ 木枯らし on 11/21
  await day(p, 6);
  ok((await txt(p, "#wx13Kotoba")) === flat("木枯らしが吹きそう冬の訪れを告げる、北寄りの冷たい強い風（9 m/s）"), "③ 木枯らし on 11/21", await txt(p, "#wx13Kotoba"));
  await day(p, 2);
  const take17 = (await p.$$eval("#wx8Take li", (l) => l.map((x) => x.textContent.trim()))).join("・");
  await day(p, 1);

  // ④ 持ち物 at 7:30 (no 行きと帰り): from tomorrow
  await p.locator("#wx13TakeBox").scrollIntoViewIfNeeded();
  await p.click("#wx13TakeOn"); await p.waitForTimeout(300);
  let al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-take:"));
  ok(al.length >= 1 && al[0].at === T("07:30", "2026-11-17") && al[0].title === "きょうの持ち物" && al[0].body === take17, "④ 11/17 7:30, 持ち物 as the page shows them", [al[0], take17]);
  // ⑤ the 3連休 told at 20:00 on 11/20
  await p.locator("#wx10NoteBox").scrollIntoViewIfNeeded();
  await p.click("#wx13RestOn"); await p.waitForTimeout(300);
  al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-rest:"));
  ok(al.length === 1 && al[0].at === T("20:00", "2026-11-20") && al[0].title === "あしたから3連休です" && al[0].body === "11/21（土） 晴れ 18°/8°、11/22（日） 晴れ 17°/7°、11/23（月） まだ予報がありません", "⑤ 20:00 on 11/20", al);
  // ⑥ 黄砂 on 11/17, told at 7:00
  await p.click("#wx13AirOn"); await p.waitForTimeout(300);
  al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-air:"));
  ok(al.length === 1 && al[0].at === T("07:00", "2026-11-17") && al[0].title === "きょうは黄砂に注意" && al[0].body === "外ではマスクを。洗濯物は部屋干しがおすすめ", "⑥ 黄砂 at 7:00 on 11/17", al);
  await p.screenshot({ path: out + "/wx13-notes.png" });
  ok(await p.evaluate(() => document.getElementById("daySheet").scrollWidth <= document.getElementById("daySheet").clientWidth + 1), "no sideways scroll");
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
