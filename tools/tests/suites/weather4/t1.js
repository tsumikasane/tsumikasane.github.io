// 天気 その4 ①〜⑩, through the hook build at 8806 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8806/";
const { chromium } = require("playwright");
const { phone, seed } = require("./lib");
const D = require("./data");
const { toTile } = require("../homeparts/parts"); // (きょう まだ・完了, 2026-11-25: a tile with its record put in today, or opened, is in 完了)
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s  ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((x) => x.textContent).join("｜"), sel).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__wx4[f](...a), { f, a });
const T = (hm, d = D.DAY) => Date.parse(`${d}T${hm}:00+09:00`);
const json = (body) => ({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
async function open(b, when, more = {}, o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, ...o });
  p.calls = [];
  await p.route("https://api.open-meteo.com/**", (r) => { const u = r.request().url(); p.calls.push(u); return r.fulfill(json(u.includes("models=") ? D.models() : u.includes("past_days=31") ? D.month() : D.forecast())); });
  await p.route("https://archive-api.open-meteo.com/**", (r) => { const u = r.request().url(); p.calls.push(u); return r.fulfill(json(D.archive(u))); });
  await p.route("https://air-quality-api.open-meteo.com/**", (r) => r.fulfill(json({ hourly: { time: [], pm2_5: [], dust: [] } })));
  await p.route("https://mreversegeocoder.gsi.go.jp/**", (r) => { p.calls.push(r.request().url()); return r.fulfill(json({ results: { muniCd: "13101", lv01Nm: "丸の内一丁目" } })); });
  await seed(p, D.all(more), "home"); await p.waitForTimeout(1200);
  await p.click('.tile[data-tile="weather"]'); await p.waitForTimeout(1500);
  return p;
}
const redraw = async (p) => { await W(p, "redraw"); await p.waitForTimeout(200); };
(async () => {
  const b = await chromium.launch();
  // (two days of 暑かった kept already: 2° lighter)
  let p = await open(b, "2026-11-14T10:00:00+09:00", { settings: [{ id: "wxWearFb", list: [{ d: "2026-11-12", v: 1 }, { d: "2026-11-13", v: 1 }], updatedAt: 1 }] });
  ok(p.calls.some((u) => /hourly=[^&]*uv_index/.test(u)), "⑥ the forecast asks for UV by the hour", p.calls[0]);

  // ① the normal and last year's
  ok(p.calls.some((u) => u.includes("archive-api") && u.includes("start_date=2016-11-06") && u.includes("end_date=2025-12-04")), "① the archive asked once for the 10 years", p.calls.filter((u) => u.includes("archive")));
  ok((await txt(p, "#wx4Norm")) === "平年よりあたたか最高+3°・最低+2°平年（過去10年の同じころ）は15°/6°。去年のきょうは20°/10°", "① against the normal, and last year's day", await txt(p, "#wx4Norm"));
  // ⑧ how sure (予報の自信): taken out at the user's call (2026-11-24, tools/REMOVED.md): not in the day card nor under the
  // week, and the models no longer asked for
  ok(!(await p.$(".wx4-sure")) && !(await p.$("#wx4SureNote")) && !/予報の自信|予報がはずれやすい/.test(await txt(p, "#calPanelBody")) && !p.calls.some((u) => u.includes("models=")), "⑧ gone");
  // ⑨ the warnings, by the 市区町村
  ok((await p.getAttribute(".wx4-warn", "href")) === "https://www.jma.go.jp/bosai/warning/#area_type=class20s&area_code=1310100&lang=ja" && (await txt(p, ".wx4-warn")) === "警報・注意報を見る（気象庁）", "⑨ 千代田区's page", await p.getAttribute(".wx4-warn", "href"));
  const codes = await p.evaluate(() => ["13101", "14118", "14131", "27128", "27141", "27202", "01101", "40131", "23101", "x"].map((m) => window.__wx4.area(m)));
  ok(JSON.stringify(codes) === JSON.stringify(["1310100", "1410000", "1413000", "2710000", "2714000", "2720200", "0110000", "4013000", "2310000", null]), "⑨ a ward of a 政令指定都市 by its city", codes);
  // ⑥ UV as the hours' figure (the strong hours were said in 暮らしのひとこと, taken out 2026-11-18)
  await p.click('#wx3Seg [data-view="uv"]'); await p.waitForTimeout(300);
  ok((await txt(p, ".wx-hours .wx-t")).startsWith("3｜5｜6｜5｜3｜1｜0") && (await p.getAttribute('#wx3Seg [data-view="uv"]', "aria-pressed")) === "true", "⑥ 紫外線 by the hour", await txt(p, ".wx-hours .wx-t"));
  ok(await p.evaluate(() => [...document.querySelectorAll("#wx3Seg button")].every((x) => x.scrollWidth <= x.clientWidth + 1)), "⑥ the five buttons fit");
  // (その3 ⑨'s 体感 to pick, an hour's 体感 and the tile's （体感 ○°） taken out at the user's call (2026-11-24, tools/REMOVED.md))
  ok(!(await p.$('#wx3Seg [data-view="feel"]')) && (await p.$$eval("#wx3Seg button", (l) => l.map((x) => x.textContent).join("・"))) === "気温・風・湿度・雨量・紫外線" && !/体感/.test(await txt(p, '.tile[data-tile="weather"]')), "体感: not to pick, nor on the tile", await p.$$eval("#wx3Seg button", (l) => l.map((x) => x.textContent).join("・")));
  await p.click('#wx3Seg [data-view="temp"]'); await p.waitForTimeout(300);

  // ⑤ an hour pressed
  ok(await p.evaluate(() => document.getElementById("wx4HourBox").hidden), "⑤ no hour open at first");
  await p.click('.wx4-hb[data-t="2026-11-14T15:00"]'); await p.waitForTimeout(300);
  ok((await txt(p, "#wx4HourBox")).startsWith("きょう15時雨閉じる気温16°降水確率70%雨量2mm風北2m/s湿度65%雲の量50%気圧1015hPa紫外線1（弱い）") && // (その5 adds the same hour yesterday after it)
    (await p.getAttribute('.wx4-hb[data-t="2026-11-14T15:00"]', "aria-expanded")) === "true",
    "⑤ 15時 in full", await txt(p, "#wx4HourBox"));
  await p.screenshot({ path: out + "/wx4-hour.png" });
  await p.click('.wx4-hb[data-t="2026-11-14T15:00"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById("wx4HourBox").hidden), "⑤ pressed again: put away");

  // ⑦ what to wear, fitted
  ok((await W(p, "shift")) === 2 && (await txt(p, "#wx4FbNote")) === "「暑かった」が多いので、2°ぶん薄着のめやすにしています。もとに戻す", "⑦ two 暑かった: 2° lighter", await txt(p, "#wx4FbNote"));
  ok((await W(p, "wear", D.DAY)).main.startsWith("薄手の上着"), "⑦ 体感 17° + 2°: 薄手の上着", await W(p, "wear", D.DAY));
  await p.click('#wx4FbSeg [data-fb="1"]'); await p.waitForTimeout(300);
  ok((await W(p, "shift")) === 3 && (await W(p, "wear", D.DAY)).main.startsWith("長袖1枚で") && (await p.getAttribute('#wx4FbSeg [data-fb="1"]', "aria-pressed")) === "true", "⑦ today's 暑かった: 3°, 長袖1枚", await W(p, "wear", D.DAY));
  await p.click("#wx4FbNote .link-btn"); await p.waitForTimeout(300);
  ok((await W(p, "shift")) === 0 && !(await p.$("#wx4FbNote")) && (await W(p, "wear", D.DAY)).main.startsWith("薄手の上着"), "⑦ もとに戻す", await W(p, "shift"));

  // ② the month gone by
  ok((await txt(p, ".wx4-mcount")) === "晴れ21日・くもり3日・雨6日10/15（木）〜11/13（金）（雨と雪は1mm以上の日）", "② the days by their weather", await txt(p, ".wx4-mcount"));
  ok((await txt(p, ".wx4-mtemp")) === "いちばん暑かったのは10/20（火）（26°）いちばん寒かったのは11/10（火）（3°）" && (await txt(p, ".wx4-mrain")) === "雨の量は、合わせて30mm", "② the warmest, the coldest, the rain", [await txt(p, ".wx4-mtemp"), await txt(p, ".wx4-mrain")]);
  await p.click(".wx4-month-cal summary"); await p.waitForTimeout(200);
  const cal = await p.$$eval(".wx4-cd", (l) => l.map((x) => x.getAttribute("aria-label")));
  ok(cal.length === 30 && cal[0] === "10月15日（木）、晴れ、最高20度、最低10度" && cal[4] === "10月19日（月）、雨、最高20度、最低10度、5ミリ" && (await p.$$eval(".wx4-cal > span:not(.wx4-wd)", (l) => l.length)) === 4, "② the calendar (Sunday first: 4 blank)", cal.slice(0, 5));
  await redraw(p);
  ok(await p.evaluate(() => document.querySelector(".wx4-month-cal").open), "② kept open as the page is drawn again");
  await p.locator(".wx4-month").scrollIntoViewIfNeeded();
  await p.screenshot({ path: out + "/wx4-month.png" });

  // ③ the way there and back
  await p.locator("#wx4ComOn").scrollIntoViewIfNeeded();
  await p.click("#wx4ComOn"); await p.waitForTimeout(400);
  ok(JSON.stringify(await W(p, "com")) === JSON.stringify({ on: true, go: "08:00", back: "18:00", weekdays: true }) && !(await p.$("#wx4Com")), "③ on: 8:00 and 18:00, weekdays (none on a Saturday)", await W(p, "com"));
  await p.click("#wx4ComWd"); await p.waitForTimeout(400);
  ok((await txt(p, "#wx4Com")) === "行き8:0012°10%帰り18:0014°70%傘を", "③ every day: 行き and 帰り, 帰り in the rain", await txt(p, "#wx4Com"));

  // ⑩ as the rain stops, ④ tomorrow's in the evening
  ok((await txt(p, "#wx3RainBox h3")) === "雨のお知らせ", "⑩ 雨のお知らせ");
  await p.click("#wx4RainEnd"); await p.waitForTimeout(300);
  let al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-rainend:"));
  ok(al.length === 2 && al[0].at === T("18:50") && al[0].title === "まもなく雨がやみそうです" && al[0].body === "19時ごろには雨がやむ予報です。このあと、きょうはもう降らない予報です" && al[1].at === T("09:50", "2026-11-15") && al[1].tag === "wx-rainend:2026-11-15:10",
    "⑩ 10 minutes before today's 19時 and tomorrow's 10時", al);
  ok((await W(p, "parts")).some((x) => x[0] === "wxRainEnd"), "⑩ in the push's signature");
  await p.click("#wx4EveOn"); await p.waitForTimeout(300);
  al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-evening:"));
  ok(al.length === 6 && al[0].at === T("21:00") && al[0].title === "あしたの天気：雨 13° / 6°" && al[0].body === "7時ごろから10時ごろまで雨の予報です。傘を持っていこう。きょうより最高気温が 5° 低い予報です" && al[0].tag === "wx-evening:2026-11-15",
    "④ each evening at 21:00, tomorrow's against today's", al[0]);
  ok(al[1].body === "朝は 2° まで冷えこみます。ジャケットなど、しっかりした上着を", "④ a cold morning", al[1].body);
  await p.click("#wx4EveChange"); await p.waitForTimeout(300);
  al = (await W(p, "alarms", T("10:00"))).filter((a) => a.tag.startsWith("wx-evening:"));
  ok(al.length === 5 && !al.some((a) => a.tag === "wx-evening:2026-11-20"), "④ 変わる日だけ: not 11/19's evening (11/20 as 11/19)", al.map((a) => a.tag));
  ok(JSON.stringify((await W(p, "parts")).find((x) => x[0] === "wxEvening")?.slice(0, 3)) === JSON.stringify(["wxEvening", "21:00", 1]), "④ in the push's signature");
  // ③ in the morning's notification (11/15, a Sunday, every day now): 行き in the rain
  await p.locator("#wxMornOn").scrollIntoViewIfNeeded();
  await p.click("#wxMornOn"); await p.waitForTimeout(300);
  const mo = (await W(p, "alarms", T("10:00"))).find((a) => a.tag === "wx-morning:2026-11-15");
  ok(mo && mo.body === "朝から10時ごろまで雨の予報です。行き（8:00）は降っていそうです。傘を持っていこう", "③ the morning's: 行き in the rain", mo);
  await p.locator("#wx4EveBox").scrollIntoViewIfNeeded();
  await p.screenshot({ path: out + "/wx4-more.png" });
  ok(!p.errs.length, "no page errors", p.errs);

  // ③ on きょう's tile
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  await toTile(p, "weather"); // (opened above: in 完了)
  ok((await txt(p, '.tile[data-tile="weather"] .wx4-tnote')) === "帰り（18:00）は雨の予報です。傘を", "③ the tile: 帰り in the rain (行き gone by)", await txt(p, '.tile[data-tile="weather"]'));
  await p.close();

  // dark, and no sideways scroll
  p = await open(b, "2026-11-14T10:00:00+09:00");
  await p.click('.wx4-hb[data-t="2026-11-14T12:00"]'); await p.waitForTimeout(300);
  await p.emulateMedia({ colorScheme: "dark" }); await p.waitForTimeout(300);
  await p.screenshot({ path: out + "/wx4-dark.png" });
  ok(await p.evaluate(() => document.getElementById("daySheet").scrollWidth <= document.getElementById("daySheet").clientWidth + 1), "no sideways scroll");
  ok(!p.errs.length, "no page errors (dark)", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
