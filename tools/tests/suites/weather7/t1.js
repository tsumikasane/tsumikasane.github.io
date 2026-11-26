// 天気 その7 ①〜⑩, through the hook build at 8809 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8809/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s  ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((x) => x.textContent).join("｜"), sel).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__wx7[f](...a), { f, a });
const json = (body) => ({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
async function open(b, when, more = {}, o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, ...o });
  p.calls = [];
  await p.route("https://api.open-meteo.com/**", (r) => {
    const u = r.request().url(); p.calls.push(u);
    return r.fulfill(json(u.includes("latitude=35.68,34.69") ? D.places() : u.includes("latitude=34.69") || u.includes("latitude=35.01") ? D.osaka() : u.includes("past_days=31") ? D.month() : u.includes("forecast_days=16") || u.includes("models=") ? { daily: { time: [] } } : D.forecast()));
  });
  await p.route("https://archive-api.open-meteo.com/**", (r) => { const u = r.request().url(); p.calls.push(u); return r.fulfill(json(D.archive(u))); });
  await p.route("https://air-quality-api.open-meteo.com/**", (r) => r.fulfill(json({ hourly: { time: [], pm2_5: [], dust: [] } })));
  await p.route("https://mreversegeocoder.gsi.go.jp/**", (r) => r.fulfill(json({ results: { muniCd: "13101" } })));
  await seed(p, D.all(more), "home"); await p.waitForTimeout(1200);
  await p.click('.tile[data-tile="weather"]'); await p.waitForTimeout(2000);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, "2026-11-16T10:00:00+09:00");

  // ③ the day in a sentence or two
  ok((await txt(p, "#wx7Sum")) === flat("きょうは晴れ、最高 15°・最低 7°。服装は薄手の上着。急な強い雨や雷に注意。"), "③ today's summary", await txt(p, "#wx7Sum"));
  // ⑤ the light (the reference: 5:50:02 and 17:00:50 in 東京, to the nearest minute)
  ok((await txt(p, ".wx7-light")) === "明るい時間5:50〜17:01", "⑤ dawn to dusk", await txt(p, ".wx7-light"));
  // ⑦ what changed since last night (前に見たとき（…）から、予報が変わりました): taken out at the user's call (2026-11-26,
  // tools/REMOVED.md). With last night's forecast kept (wxSeen: 11/19 sunny then, rain now), nothing said; wxSeen stays as it was
  const seenAt = () => p.evaluate((P) => JSON.parse(localStorage.getItem(P + "wxSeen") || "null")?.dataAt, P);
  ok(!(await p.$("#wx7Diff")) && !(await p.$(".wx7-diff")) && !(await p.evaluate(() => document.getElementById("daySheet").innerText)).includes("予報が変わりました"), "⑦ 予報の変化: gone");
  await W(p, "redraw"); await p.waitForTimeout(300);
  ok(!(await p.$("#wx7Diff")) && (await seenAt()) === Date.parse("2026-11-15T21:00:00+09:00"), "⑦ none as the page is drawn again; wxSeen kept as it was", await seenAt());
  // ① the chips
  const chips = await p.$$eval('#wx7Jump button:not([data-key="simple"])', (l) => l.map((x) => x.textContent)); // (その10 ① puts かんたん表示 first)
  ok(chips[0] === "1時間ごと" && chips.includes("1週間") && chips.includes("雨の日の予定") && chips.at(-1) === "お知らせ・場所", "① the sections' chips", chips);
  await p.click('#wx7Jump [data-key="week"]'); await p.waitForTimeout(900);
  const y = await p.evaluate(() => { const h = document.getElementById("wx7-week").getBoundingClientRect().top, s = document.getElementById("daySheet").getBoundingClientRect().top; return h - s; });
  ok(y > 0 && y < 140, "① 1週間 pressed: its heading at the top", y);
  // ④ the week's rainy days with plans
  ok((await txt(p, "#wx7RainPlans li")) === "11/19（木）雨12〜21時10:00授業、17:00バイト｜11/20（金）雨70%15:00歯医者", "④ 11/19 and 11/20 (not 11/18)", await txt(p, "#wx7RainPlans li"));
  // ⑧ the weather and the runs
  ok((await txt(p, "#wx7Runs .wx-line")) === "晴れ・くもりの日：24日のうち4日走りました合わせて18km（1回平均4.5km）｜雨・雪の日：6日のうち1日走りました合わせて2km（1回平均2km）。エアロバイクは2日", "⑧ dry and wet days", await txt(p, "#wx7Runs .wx-line"));
  // ⑩ the year, still asked for (1週間の雨の量 and 先の日の天気 use it; its own section taken out 2026-11-18)
  ok(p.calls.some((u) => u.includes("archive-api") && u.includes("start_date=2016-01-01") && u.includes("end_date=2025-12-31")), "⑩ the 10 years asked for");
  // ⑥ the wind's way
  await p.click('#wx3Seg [data-view="wind"]'); await p.waitForTimeout(300);
  const a = await p.$eval(".wx-hours .wx7-arrow path", (x) => x.getAttribute("transform"));
  ok(a === "rotate(270 8 8)" && (await p.$eval(".wx-hours .wx4-hb", (x) => x.getAttribute("aria-label"))).endsWith("、東の風"), "⑥ from the east: an arrow to the west", a);
  await p.click('#wx3Seg [data-view="temp"]'); await p.waitForTimeout(300);
  ok(!(await p.$(".wx-hours .wx7-arrow")), "⑥ none on 気温");

  // ② hiding 1時間ごと
  await p.locator("#wx7Show summary").scrollIntoViewIfNeeded();
  await p.click("#wx7Show summary"); await p.waitForTimeout(200);
  await p.click("#wx7s-hours"); await p.waitForTimeout(500);
  const st = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "settings")).find((x) => x.id === "wxHide"), P);
  ok(!(await p.$(".wx-hours")) && !(await p.$('#wx7Jump [data-key="hours"]')) && JSON.stringify(st.keys) === JSON.stringify(["hours"]) && (await txt(p, "#wx7ShowSum")).includes("1個を隠しています"), "② 1時間ごと hidden (kept in the settings)", st);
  await p.click("#wx7s-hours"); await p.waitForTimeout(500);
  ok(!!(await p.$(".wx-hours")), "② shown again");
  await p.screenshot({ path: out + "/wx7-show.png" });

  // ⑨ the places: 京都 up, 大阪 renamed
  await p.locator("#wxPlaceList").scrollIntoViewIfNeeded();
  await p.click('#wxPlaceList [data-up="2"]'); await p.waitForTimeout(400);
  ok(JSON.stringify((await W(p, "places")).map((x) => x.name)) === JSON.stringify(["東京", "京都", "大阪"]), "⑨ 京都 moved up", await W(p, "places"));
  await p.click('#wxPlaceList button[aria-label="「大阪」の名前を変える"]'); await p.waitForTimeout(300);
  await p.fill("#wx7Name", "実家"); await p.click("#wxPlaceList .wx7-edit .chip-btn"); await p.waitForTimeout(400);
  ok(JSON.stringify((await W(p, "places")).map((x) => x.name)) === JSON.stringify(["東京", "京都", "実家"]) && (await W(p, "place")).name === "東京", "⑨ 大阪 renamed 実家, in its place", await W(p, "places"));
  await p.locator("#wxPlaceList").scrollIntoViewIfNeeded();
  await p.screenshot({ path: out + "/wx7-places.png" });
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();

  // dark, and no sideways scroll
  p = await open(b, "2026-11-16T10:00:00+09:00");
  await p.emulateMedia({ colorScheme: "dark" }); await p.waitForTimeout(300);
  await p.screenshot({ path: out + "/wx7-dark.png" });
  ok(await p.evaluate(() => document.getElementById("daySheet").scrollWidth <= document.getElementById("daySheet").clientWidth + 1), "no sideways scroll");
  ok(!p.errs.length, "no page errors (dark)", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
