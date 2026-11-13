// きょう ⑤⑥⑦: 摂取カロリー, 体重の変化, 天気
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed, T0 } = require("./lib");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-09";
const tileText = (p, key) => p.evaluate((key) => { const t = document.querySelector(`.tile[data-tile="${key}"]`); return t ? t.innerText.replace(/\s+/g, " ").trim() : null; }, key);
const colText = (p, part) => p.evaluate((part) => { const c = [...document.querySelectorAll('.tile[data-tile="diet"] .dt-col')].find((x) => x.getAttribute("style").includes(part)); return c ? c.innerText.replace(/\s+/g, " ").trim() : null; }, part);
// a forecast: today rain from 16:00, tomorrow fine
function forecast() {
  const hours = [], prob = [];
  for (const d of ["2026-11-09", "2026-11-10"]) for (let h = 0; h < 24; h++) { hours.push(`${d}T${String(h).padStart(2, "0")}:00`); prob.push(d === "2026-11-09" && h >= 16 ? 70 : 5); }
  return { daily: { time: ["2026-11-09", "2026-11-10"], weather_code: [61, 1], temperature_2m_max: [18.4, 20.1], temperature_2m_min: [9.2, 11.0], precipitation_probability_max: [80, 10] }, hourly: { time: hours, precipitation_probability: prob } };
}
(async () => {
  const b = await chromium.launch();
  // ⑤⑥
  let p = await phone(b, at("14:15"));
  await seed(p, {
    weights: [{ id: "2026-11-01", date: "2026-11-01", kg: 66.0, createdAt: T0 }, { id: "2026-11-08", date: "2026-11-08", kg: 65.4, createdAt: T0 }],
    meals: [{ id: "m1", date: today, slot: "朝食", text: "パン", kcal: 450, createdAt: T0 }, { id: "m2", date: today, slot: "昼食", text: "定食", kcal: 700, createdAt: T0 }, { id: "m3", date: today, slot: "間食", text: "みかん", createdAt: T0 }],
  });
  let wcol = await colText(p, "weight"), mcol = await colText(p, "meal");
  ok(wcol === "からだ 65.4kg 1週間前から −0.6 kg", "⑥ からだ: " + wcol);
  ok(mcol === "食事 記録済み 1,150 / 2,500 kcal", "⑤ 食事: " + mcol);
  // the goal set in ダイエット's settings
  await p.goto(URL0 + "#weight"); await p.reload(); await p.waitForTimeout(600);
  await p.locator("#wtSettings").click(); await p.waitForTimeout(500);
  ok(await p.getAttribute("#kcalGoal", "placeholder") === "2500" && await p.inputValue("#kcalGoal") === "", "⑤ the goal's field: empty, 2500 as its hint");
  await p.locator("#kcalGoal").fill("2200"); await p.locator("#kcalGoal").press("Enter"); await p.waitForTimeout(400);
  const kg = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "settings")).find((x) => x.id === "kcalGoal"), P);
  ok(kg && kg.target === 2200, "⑤ saved: " + JSON.stringify(kg));
  await p.goto(URL0 + "#home"); await p.reload(); await p.waitForTimeout(600);
  mcol = await colText(p, "meal");
  ok(mcol === "食事 記録済み 1,150 / 2,200 kcal", "⑤ against the goal set: " + mcol);
  await p.locator('.tile[data-tile="diet"]').screenshot({ path: out + "/diet-393.png" });
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  // ⑤ no kcal on the meals: the day's 摂取カロリー; ⑥ the week before too far back: none
  p = await phone(b, at("14:15"));
  await seed(p, {
    weights: [{ id: "2026-10-20", date: "2026-10-20", kg: 67.0, createdAt: T0 }, { id: today, date: today, kg: 65.0, intake: 1800, createdAt: T0 }],
    meals: [{ id: "m1", date: today, slot: "朝食", text: "パン", createdAt: T0 }],
  });
  wcol = await colText(p, "weight"); mcol = await colText(p, "meal");
  ok(wcol === "からだ 65.0kg" && mcol === "食事 記録済み 1,800 / 2,500 kcal", "⑤⑥ " + wcol + " | " + mcol);
  await p.close();
  // ⑦ 天気: asked for, got, kept
  let calls = [];
  const route = (p, ok200 = true) => p.route("https://api.open-meteo.com/**", (r) => { calls.push(r.request().url()); return ok200 ? r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(forecast()) }) : r.fulfill({ status: 500, body: "x" }); });
  p = await phone(b, at("14:15"), { geolocation: { latitude: 35.68123, longitude: 139.76712 }, permissions: ["geolocation"] });
  await route(p);
  await seed(p, {});
  let wx = await tileText(p, "weather");
  ok(wx === "天気 いる場所のきょうの天気を出せます 天気を出す", "⑦ before: " + wx);
  await p.locator('.tile[data-tile="weather"] .wx-ask').click(); await p.waitForTimeout(1200);
  wx = await tileText(p, "weather");
  ok(wx === "天気 雨 18° / 9° 降水確率 80% 16時ごろから雨の予報です ランはエアロバイク30分に替えても", "⑦ got: " + wx);
  ok(calls.length === 1 && calls[0].includes("latitude=35.68&longitude=139.77") && calls[0].includes("timezone=auto"), "⑦ asked once, the place to 1 km: " + calls[0]);
  const kept = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "wxPlace")), P);
  ok(kept && kept.lat === 35.68 && kept.lon === 139.77, "⑦ the place kept on this device: " + JSON.stringify(kept));
  await p.locator('.tile[data-tile="weather"]').screenshot({ path: out + "/weather-393.png" });
  // opened again within the hour: not asked again
  await p.reload(); await p.waitForTimeout(800);
  ok(calls.length === 1 && (await tileText(p, "weather")).includes("降水確率 80%"), "⑦ again within the hour: from what was kept (" + calls.length + " asks)");
  // the run done: no エアロバイク note
  await p.evaluate((P) => localStorage.setItem(P + "workouts", JSON.stringify([{ id: "w1", date: "2026-11-09", type: "ランニング", km: 4, minutes: 25, createdAt: Date.now() }])), P);
  await p.reload(); await p.waitForTimeout(800);
  wx = await tileText(p, "weather");
  ok(!wx.includes("エアロバイク"), "⑦ the run done: no note about it: " + wx);
  // the settings: 現在地にしなおす, 天気の場所を消す
  await p.locator("#homeSettings").click(); await p.waitForTimeout(500);
  const st = await p.evaluate(() => ({ here: wxHere.textContent, forget: !wxForgetRow.hidden }));
  ok(st.here === "現在地にしなおす" && st.forget, "⑦ in the tiles' settings", st);
  await p.locator("#wxForget").click(); await p.waitForTimeout(400);
  await p.locator("#sheetDone").click(); await p.waitForTimeout(500);
  wx = await tileText(p, "weather");
  ok(wx.includes("天気を出す") && !(await p.evaluate((P) => localStorage.getItem(P + "wxPlace"), P)), "⑦ forgotten: " + wx);
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  // ⑦ the server failing: said, with もう一度
  calls = [];
  p = await phone(b, at("14:15"), { geolocation: { latitude: 35.68, longitude: 139.77 }, permissions: ["geolocation"] });
  await route(p, false);
  await seed(p, {});
  await p.evaluate((P) => localStorage.setItem(P + "wxPlace", JSON.stringify({ lat: 35.68, lon: 139.77, at: Date.now() })), P);
  await p.reload(); await p.waitForTimeout(1000);
  wx = await tileText(p, "weather");
  ok(wx === "天気 天気を取得できませんでした もう一度", "⑦ failing: " + wx);
  await p.close();
  // ⑦ the location not allowed
  p = await phone(b, at("14:15"));
  await seed(p, {});
  await p.locator('.tile[data-tile="weather"] .wx-ask').click(); await p.waitForTimeout(1500);
  wx = await tileText(p, "weather");
  ok(wx.includes("許可されていません") || wx.includes("わかりませんでした"), "⑦ not allowed: " + wx);
  await p.close();
  // dark, for a look
  p = await phone(b, at("14:15"), { colorScheme: "dark", geolocation: { latitude: 35.68, longitude: 139.77 }, permissions: ["geolocation"] });
  await route(p);
  await seed(p, { weights: [{ id: "2026-11-01", date: "2026-11-01", kg: 66.0, createdAt: T0 }, { id: "2026-11-08", date: "2026-11-08", kg: 65.4, createdAt: T0 }], meals: [{ id: "m1", date: today, slot: "朝食", text: "パン", kcal: 450, createdAt: T0 }] });
  await p.evaluate((P) => localStorage.setItem(P + "wxPlace", JSON.stringify({ lat: 35.68, lon: 139.77, at: Date.now() })), P);
  await p.reload(); await p.waitForTimeout(1000);
  await p.screenshot({ path: out + "/home2-393d.png", fullPage: true });
  ok(!p.errs.length, "no page errors (dark)", p.errs);
  await p.close();
  await b.close();
  console.log(fails ? `${fails} FAILED` : "all OK");
})();
