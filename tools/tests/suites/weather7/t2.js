// 天気 その8 ①〜⑩, through weather7's hook build at 8809 (きょう・天気's ports all taken) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8809/";
const { chromium } = require("playwright");
const { phone, seed } = require("./lib");
const D = require("./data");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s  ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((x) => x.textContent).join("｜"), sel).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__wx8[f](...a), { f, a });
const T = (hm, d = D.DAY) => Date.parse(`${d}T${hm}:00+09:00`);
const json = (body) => ({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
// the air today: PM2.5 50 and ozone 200 (µg/m³)
const air = () => { const time = Array.from({ length: 48 }, (_, h) => `${h < 24 ? D.DAY : "2026-11-17"}T${String(h % 24).padStart(2, "0")}:00`); return { hourly: { time, pm2_5: time.map(() => 50), dust: time.map(() => 0), ozone: time.map((t) => (t.startsWith(D.DAY) ? 200 : 60)) } }; };
async function open(b, when, more = {}, o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, ...o });
  p.calls = [];
  await p.route("https://api.open-meteo.com/**", (r) => {
    const u = r.request().url(); p.calls.push(u);
    return r.fulfill(json(u.includes("latitude=35.68,34.69") ? D.places() : u.includes("latitude=34.69") || u.includes("latitude=35.01") ? D.osaka() : u.includes("past_days=31") ? D.month() : u.includes("forecast_days=16") || u.includes("models=") ? { daily: { time: [] } } : D.forecast()));
  });
  await p.route("https://archive-api.open-meteo.com/**", (r) => r.fulfill(json(D.archive(r.request().url()))));
  await p.route("https://air-quality-api.open-meteo.com/**", (r) => { p.calls.push(r.request().url()); return r.fulfill(json(air())); });
  await p.route("https://mreversegeocoder.gsi.go.jp/**", (r) => r.fulfill(json({ results: { muniCd: "13101" } })));
  await seed(p, D.all(more), "home"); await p.waitForTimeout(1200);
  await p.click('.tile[data-tile="weather"]'); await p.waitForTimeout(2200);
  return p;
}
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-16T10:00:00+09:00");

  // ① what to take
  ok((await txt(p, "#wx8Take li")) === "日焼け止め｜羽織るもの｜マスク", "① sunscreen (UV 3), a layer (体感 9〜17°), a mask (PM2.5 50)", await txt(p, "#wx8Take li"));
  // ⑤ the air asks for ozone, for 持ち物 and 空気のお知らせ (⑤'s line in 体調と空気 and ⑥ to sunburn in 暮らしのひとこと: taken out 2026-11-18)
  ok(p.calls.some((u) => u.includes("air-quality-api") && u.includes("hourly=pm2_5,dust,ozone")), "⑤ the air asks for ozone");
  // ⑧ the season
  ok((await txt(p, "#wx8Season")) === flat("季節のめやす：最高気温が15°を下回る日が続きます。そろそろ冬物（コート）を出す時期です。朝晩の暖房が必要な時期です。氷点下の朝があります。水道管や路面の凍結に気をつけて。"), "⑧ winter clothes, heating, a frozen morning", await txt(p, "#wx8Season"));
  // ④ the days' names
  ok((await txt(p, ".wx-days li:nth-child(4) .wx8-tag")) === "冬日" && (await p.getAttribute(".wx-days li:nth-child(4) .wx8-tag", "class")).includes("cold"), "④ 11/19: 冬日 (blue)");
  ok(JSON.stringify(await Promise.all([W(p, "names", { hi: 36, lo: 26 }), W(p, "names", { hi: -2, lo: -8 }), W(p, "names", { hi: 26, lo: 10 }), W(p, "names", { hi: 31, lo: -1 })])) === JSON.stringify([["猛暑日", "熱帯夜"], ["真冬日"], ["夏日"], ["真夏日", "冬日"]]), "④ 気象庁's names");
  // ③ the hours out (おでかけの時間): taken out at the user's call (2026-11-24, tools/REMOVED.md)
  ok(!(await p.$("#wx8Out")) && !(await p.$("#wx8OutDay")) && !(await p.$("#wx7-outing")), "③ gone");
  // ① ⑩ in the chips (③ おでかけ, taken out, not)
  const chips = await p.$$eval("#wx7Jump button", (l) => l.map((x) => x.textContent));
  ok(chips.includes("持ち物") && !chips.includes("おでかけ") && chips.includes("ことば"), "①⑩ in the chips (③ not)", chips);
  // ⑩ the words
  await p.locator("#wx8Words summary").scrollIntoViewIfNeeded();
  await p.click("#wx8Words summary"); await p.waitForTimeout(200);
  ok((await p.$$eval("#wx8Words dt", (l) => l.length)) === 10 && (await txt(p, "#wx8Words dt")).startsWith("降水確率｜暑さ指数（WBGT）") && !(await txt(p, "#wx8Words dt")).includes("体感温度"), "⑩ 10 words explained (体感温度 taken out at the user's call (2026-11-24, tools/REMOVED.md))");
  await p.screenshot({ path: out + "/wx8-words.png" });

  // ② the picture: saved where it can't be shared
  await p.evaluate(() => Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true }));
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 10000 }), p.click("#wx8Pic")]);
  ok(dl.suggestedFilename() === "天気-2026-11-16.png", "② saved as a picture", dl.suggestedFilename());

  // ⑨ the morning on 土日・祝日
  await p.locator("#wxMornOn").scrollIntoViewIfNeeded();
  await p.click("#wxMornOn"); await p.waitForTimeout(300);
  await p.click("#wx8WeOn"); await p.waitForTimeout(300);
  const al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-morning:")).map((a) => [a.tag.slice(-5), new Date(a.at).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "numeric", minute: "2-digit" })]);
  ok(JSON.stringify(al) === JSON.stringify([["11-17", "7:00"], ["11-18", "7:00"], ["11-19", "7:00"], ["11-20", "7:00"], ["11-21", "9:00"], ["11-22", "9:00"]]) && (await txt(p, "#wxMornNote")).includes("土日・祝日は9:00にお知らせします。"), "⑨ 7:00 on weekdays, 9:00 on Saturday and Sunday", al);
  await p.screenshot({ path: out + "/wx8-morning.png" });

  // the top, and 持ち物
  await p.evaluate(() => document.getElementById("daySheet").scrollTo(0, 0)); await p.waitForTimeout(200);
  await p.screenshot({ path: out + "/wx8-top.png" });
  await p.locator("#wx8Take").scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
  await p.screenshot({ path: out + "/wx8-take.png" });
  ok(await p.evaluate(() => document.getElementById("daySheet").scrollWidth <= document.getElementById("daySheet").clientWidth + 1), "no sideways scroll");
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
