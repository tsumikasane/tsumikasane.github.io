// 天気 その6 ①〜⑩, through the hook build at 8808 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8808/";
const { chromium } = require("playwright");
const { phone, seed } = require("./lib");
const D = require("./data");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s  ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((x) => x.textContent).join("｜"), sel).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__wx6[f](...a), { f, a });
const T = (hm, d = D.DAY) => Date.parse(`${d}T${hm}:00+09:00`);
const json = (body) => ({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
async function open(b, when, more = {}, o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, ...o });
  p.calls = [];
  await p.route("https://api.open-meteo.com/**", (r) => {
    const u = r.request().url(); p.calls.push(u);
    return r.fulfill(json(u.includes("latitude=35.68,34.69") ? D.places() : u.includes("latitude=34.69") ? D.osaka() : u.includes("past_days=31") ? D.month() : u.includes("forecast_days=16") || u.includes("models=") ? { daily: { time: [] } } : D.forecast()));
  });
  await p.route("https://archive-api.open-meteo.com/**", (r) => r.fulfill(json({ daily: { time: [] } })));
  await p.route("https://air-quality-api.open-meteo.com/**", (r) => r.fulfill(json({ hourly: { time: [], pm2_5: [], dust: [] } })));
  await p.route("https://mreversegeocoder.gsi.go.jp/**", (r) => r.fulfill(json({ results: { muniCd: "13101" } })));
  await seed(p, D.all(more), "home"); await p.waitForTimeout(1200);
  await p.click('.tile[data-tile="weather"]'); await p.waitForTimeout(1800);
  return p;
}
const pick = async (p, n) => { await p.click(`.wx-days li:nth-child(${n}) button`); await p.waitForTimeout(400); };
(async () => {
  const b = await chromium.launch();
  let p = await open(b, "2026-11-16T10:00:00+09:00");
  ok(p.calls.some((u) => u.includes("hourly=") && u.includes("cape,visibility,wind_gusts_10m")), "④⑤⑥ the forecast asks for CAPE, visibility and gusts", p.calls[0]);

  // ① the week as words, ⑦ the month's coldest and warmest coming
  ok((await txt(p, "#wx6Story")).startsWith(flat("きょうとあしたは晴れ、11/18（水）はくもり、11/19（木）と11/20（金）は雨、11/21（土）と11/22（日）は晴れの予報です。11/19（木）は気温がぐっと下がり、最高 9°（前の日より −5°）。11/21（土）は気温がぐっと上がり、最高 18°（前の日より +8°）。11/19（木）の朝は、この1か月でいちばんの冷えこみになりそう（最低 -1°）。11/21（土）は、この1か月でいちばんあたたかくなりそう（最高 18°）。")), // (その10 ⑨ and later add their own after)
    "①⑦ the week's story", await txt(p, "#wx6Story"));
  // ② what to wear by the time of day (today: 昼 and 夜, the morning gone by)
  ok((await txt(p, "#wx6Times li")) === "昼12〜15時体感17°薄手の上着｜夜18〜21時体感9°コート", "② 昼 and 夜", await txt(p, "#wx6Times li"));
  // ③ what to run in
  ok((await txt(p, ".wx-lines .wx-line")).includes("外を走るのにいい日です（11時〜15時ごろ、体感16°前後）走るときの服装：半袖・短パンで（体感16°に10°足して考えます）"), "③ under the run's line", await txt(p, ".wx-lines .wx-line"));
  // ④ unstable, ⑥ strong wind
  ok((await txt(p, "#wx6Out .wx6-unstable")) === "大気の状態が不安定になりそうです（13時〜17時ごろ）急な強い雨や雷に気をつけて。空が暗くなってきたら、建物の中へ", "④ the air unstable", await txt(p, "#wx6Out .wx6-unstable"));
  ok((await txt(p, "#wx6Out .wx6-wind")) === "風が強い時間：15時〜18時ごろ最大9m/s、突風16m/s。自転車や傘に気をつけて", "⑥ the hours of strong wind", await txt(p, "#wx6Out .wx6-wind"));
  ok(!(await p.$("#wx6Out .wx6-fog")) && !(await p.$("#wx6Out .wx6-frost")), "⑤ no fog nor frost today");
  // ⑧ 大阪's week, without moving to it
  ok(p.calls.some((u) => u.includes("latitude=34.69&longitude=135.5") && u.includes("forecast_days=7")), "⑧ 大阪's week asked for");
  const os = await p.$$eval("#wx6Other li", (l) => l.map((x) => x.getAttribute("aria-label")));
  ok(os.length === 7 && os[0] === "大阪、11月16日（月）、晴れ、最高18度、最低9度、降水確率10%" && (await txt(p, "#wx6OtherNote")) === "東京より、最高気温は平均3°高めです。雨や雪の予報の日は1日。" && (await W(p, "place")).name === "東京",
    "⑧ its 7 days, against 東京 (still in use)", [os[0], await txt(p, "#wx6OtherNote")]);
  await p.screenshot({ path: out + "/wx6-top.png" });

  // ⑤ tomorrow's fog, 11/19's frost
  await pick(p, 2);
  ok((await txt(p, "#wx6Out .wx6-fog")) === "霧で見通しが悪くなりそうです（5時〜8時ごろ）いちばん悪いときで400mほど。車や自転車はライトをつけて、ゆっくり", "⑤ fog at dawn tomorrow", await txt(p, "#wx6Out"));
  ok((await txt(p, "#wx6Times li")).startsWith("朝7〜9時"), "② another day: from 朝", await txt(p, "#wx6Times li"));
  await pick(p, 4);
  ok((await txt(p, "#wx6Out .wx6-frost")) === "霜がおりそうです（朝の最低-1°、晴れて風が弱い）車の窓の霜や、植物に気をつけて", "⑤ 11/19's frost", await txt(p, "#wx6Out"));
  await pick(p, 1);

  // ⑨ the notifications coming, ⑩ paused
  await p.locator("#wxMornOn").scrollIntoViewIfNeeded();
  await p.click("#wxMornOn"); await p.waitForTimeout(400);
  ok((await txt(p, "#wx6NextSum")) === "これから届く天気のお知らせ（6件）", "⑨ the count", await txt(p, "#wx6NextSum"));
  await p.click("#wx6NextSum"); await p.waitForTimeout(200);
  ok((await txt(p, "#wx6NextList li")).startsWith("あした7:00きょうの天気：晴れ16°/6°｜11/18（水）7:00きょうの天気：くもり14°/5°"), "⑨ the next, by when", await txt(p, "#wx6NextList li"));
  await p.fill("#wx6QuietUntil", "2026-11-18"); await p.waitForTimeout(400);
  let al = await W(p, "alarms", T("10:00"));
  ok(al.length === 4 && al[0].at === T("07:00", "2026-11-19") && (await txt(p, "#wx6NextSum")) === "これから届く天気のお知らせ（4件）" && (await txt(p, "#wx6QuietNote")) === "11/18（水）まで、この端末の天気のお知らせ（朝・夜・雨・体調）を休んでいます。",
    "⑩ paused to 11/18: from 11/19", al.map((a) => a.tag));
  ok(JSON.stringify((await W(p, "parts")).find((x) => x[0] === "wxQuiet")) === JSON.stringify(["wxQuiet", "2026-11-18"]), "⑩ in the push's signature");
  await p.locator("#wx6Box").scrollIntoViewIfNeeded();
  await p.screenshot({ path: out + "/wx6-more.png" });
  await p.click("#wx6QuietOff"); await p.waitForTimeout(400);
  ok((await W(p, "alarms", T("10:00"))).length === 6 && (await p.isHidden("#wx6QuietOff")), "⑩ やめる: all 6 again");
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();

  // dark, and no sideways scroll
  p = await open(b, "2026-11-16T10:00:00+09:00");
  await p.emulateMedia({ colorScheme: "dark" }); await p.waitForTimeout(300);
  await p.locator("#wx6Out").scrollIntoViewIfNeeded();
  await p.screenshot({ path: out + "/wx6-dark.png" });
  ok(await p.evaluate(() => document.getElementById("daySheet").scrollWidth <= document.getElementById("daySheet").clientWidth + 1), "no sideways scroll");
  ok(!p.errs.length, "no page errors (dark)", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
