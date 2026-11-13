// きょう ⑧⑨⑩: ふりかえり, あしたの準備, カウントダウン
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed, T0 } = require("./lib");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-09", tmr = "2026-11-10";
const tileText = (p, key) => p.evaluate((key) => { const t = document.querySelector(`.tile[data-tile="${key}"]`); return t ? t.innerText.replace(/\s+/g, " ").trim() : null; }, key);
const order = (p) => p.evaluate(() => [...document.querySelectorAll("#homeTiles > .tile")].map((t) => t.dataset.tile).join(","));
const at21 = Date.parse("2026-11-09T21:00:00+09:00");
const DATA = {
  todos: [
    { id: "t1", text: "洗濯", done: true, doneAt: at21 - 3600e3, due: today, createdAt: T0 },
    { id: "t2", text: "レポート提出", done: false, due: tmr, createdAt: T0 },
    { id: "t3", text: "本を返す", done: false, due: tmr, createdAt: T0 },
  ],
  study: [{ id: "s1", date: today, minutes: 90, createdAt: at21 - 7200e3 }],
  workouts: [{ id: "w1", date: today, type: "ランニング", km: 4, minutes: 26, createdAt: at21 - 9000e3 }, { id: "w2", date: today, type: "筋トレ", exercise: "レッグプレス", reps: 20, sets: 3, createdAt: at21 - 8000e3 }],
  meals: [{ id: "m1", date: today, slot: "朝食", text: "パン", kcal: 450, createdAt: T0 }, { id: "m2", date: today, slot: "夕食", text: "カレー", kcal: 900, createdAt: T0 }],
  weights: [{ id: today, date: today, kg: 65.2, createdAt: T0 }],
  expenses: [{ id: "x1", date: today, kind: "out", category: "食費", amount: 1200, createdAt: T0 }, { id: "x2", date: today, kind: "in", category: "給与", amount: 50000, createdAt: T0 }],
  events: [
    { id: "e1", date: tmr, time: "09:00", endTime: "10:30", title: "ゼミ", createdAt: T0 },
    { id: "e2", date: tmr, time: "13:00", title: "面談", createdAt: T0 },
    { id: "c1", date: "2026-11-21", title: "期末試験", count: true, createdAt: T0 },
    { id: "c2", date: "2026-11-29", time: "10:00", title: "面接", count: true, createdAt: T0 },
    { id: "c3", date: "2025-12-01", title: "誕生日", repeat: "yearly", count: true, createdAt: T0 },
    { id: "c4", date: "2026-10-01", title: "終わった試験", count: true, createdAt: T0 },
  ],
  shifts: [{ id: "h1", date: tmr, start: "17:00", end: "22:00", rest: 0, jobId: "j1", createdAt: T0 }],
  settings: [{ id: "jobs", items: [{ id: "j1", name: "カフェ", wage: 1200, fare: 0, night: true, cutoff: 0, payday: 25 }], updatedAt: T0 }],
};
function forecast() {
  const hours = [], prob = [];
  for (const d of [today, tmr]) for (let h = 0; h < 24; h++) { hours.push(`${d}T${String(h).padStart(2, "0")}:00`); prob.push(5); }
  return { daily: { time: [today, tmr], weather_code: [3, 1], temperature_2m_max: [16.2, 20.1], temperature_2m_min: [8.8, 11.0], precipitation_probability_max: [20, 10] }, hourly: { time: hours, precipitation_probability: prob } };
}
(async () => {
  const b = await chromium.launch();
  // 21:00: the evening's two on top
  let p = await phone(b, at("21:00"));
  await p.route("https://api.open-meteo.com/**", (r) => r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(forecast()) }));
  await seed(p, DATA);
  await p.evaluate((P) => localStorage.setItem(P + "wxPlace", JSON.stringify({ lat: 35.68, lon: 139.77, at: Date.now() })), P);
  await p.reload(); await p.waitForTimeout(1000);
  ok((await order(p)).startsWith("review,tomorrow,quick,weather,todo,calendar,countdown,"), "21:00: " + await order(p));
  const rv = await tileText(p, "review");
  ok(rv === "きょうのふりかえり 6こ きょう積んだブロック ToDo 1件 完了 勉強 1時間 30分 運動 ラン 4 km・筋トレ 3セット 食事 2回・1,350 kcal 体重 65.2 kg 支出 1,200円 日記を書く"
    || /^きょうのふりかえり 7こ きょう積んだブロック ToDo 1件 完了 勉強 1 時間 30 分 運動 ラン 4 km・筋トレ 3セット 食事 2回・1,350 kcal 体重 65.2 kg 支出 1,200 円 日記を書く( 文字で送る)?$/.test(rv), "⑧ " + rv); // (文字で送る: きょう その2, 2026-11-13)
  const tm = await tileText(p, "tomorrow");
  ok(tm.includes("予定 09:00 ゼミ、13:00 面談") && tm.includes("ToDo レポート提出、本を返す") && tm.includes("バイト 17:00〜22:00") && tm.includes("運動 ラン 4 km・レッグカール・ラットプルダウン・アームカール") && tm.includes("天気 晴れ 20° / 11°・降水確率 10%"), "⑨ " + tm);
  const cd = await tileText(p, "countdown");
  ok(cd === "カウントダウン 12日 「期末試験」まで 面接 あと20日 誕生日 あと22日", "⑩ " + cd);
  await p.screenshot({ path: out + "/evening-393.png", fullPage: true });
  // 日記を書く: 日記 opens
  await p.locator('.tile[data-tile="review"] .rv-act').click(); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.documentElement.dataset.tab) === "journal", "⑧ 日記を書く opens 日記");
  // あしたの準備's head: the calendar at tomorrow
  await p.goto(URL0 + "#home"); await p.reload(); await p.waitForTimeout(800);
  await p.locator('.tile[data-tile="tomorrow"] .tile-head').click(); await p.waitForTimeout(800);
  const cal = await p.evaluate(() => ({ tab: document.documentElement.dataset.tab, sel: document.querySelector("#calGrid .cal-day.sel")?.getAttribute("aria-label") || document.querySelector("#calGrid .cal-day.sel")?.dataset.day || "" }));
  ok(cal.tab === "calendar" && /10/.test(cal.sel), "⑨ its head: the calendar at tomorrow " + JSON.stringify(cal));
  // the tiles' settings say when the evening's show
  await p.goto(URL0 + "#home"); await p.reload(); await p.waitForTimeout(800);
  await p.locator("#homeSettings").click(); await p.waitForTimeout(500);
  const notes = await p.evaluate(() => [...document.querySelectorAll("#tileList li")].filter((li) => li.querySelector(".tnote")).map((li) => li.dataset.key + ":" + li.querySelector(".tnote").textContent));
  // (きょう その2, 2026-11-13, added tiles of their own times: きょうの準備, きのうの書き忘れ)
  ok(notes.includes("review:夜8時から") && notes.includes("tomorrow:夜8時から"), "the settings: " + notes.join(" "));
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  // 14:15: no evening ones; 日記 written: said so
  p = await phone(b, at("14:15"));
  await seed(p, DATA);
  ok(!(await order(p)).includes("review") && !(await order(p)).includes("tomorrow"), "14:15: not shown: " + await order(p));
  await p.close();
  p = await phone(b, at("21:30"));
  await seed(p, { ...DATA, journal: [{ id: today, date: today, text: "いい日だった", createdAt: T0 }] });
  ok((await tileText(p, "review")).replace(/ 文字で送る$/, "").endsWith("日記は書きました"), "⑧ written: " + (await tileText(p, "review")).slice(-12));
  await p.close();
  // ⑩ one today; none at all
  p = await phone(b, at("10:00"));
  await seed(p, { events: [{ id: "c1", date: today, time: "18:00", title: "発表会", count: true, createdAt: T0 }] });
  ok(await tileText(p, "countdown") === "カウントダウン きょう 「発表会」です", "⑩ today: " + await tileText(p, "countdown"));
  await p.close();
  p = await phone(b, at("10:00"));
  await seed(p, {});
  ok((await tileText(p, "countdown")).includes("予定の「カウントダウン」をオンにすると"), "⑩ none: " + await tileText(p, "countdown"));
  // the plan forms: カウントダウン on a new plan, then off in its edit form
  await p.goto(URL0 + "#calendar"); await p.reload(); await p.waitForTimeout(700);
  await p.locator("#calAdd").click(); await p.waitForTimeout(500);
  await p.locator("#planTitle").fill("模試");
  ok(await p.isChecked("#planCount") === false, "⑩ a new plan: カウントダウン off at first");
  await p.locator('label[for="planCount"]').click().catch(() => {}); 
  if (!(await p.isChecked("#planCount"))) await p.locator("#planCount").check({ force: true });
  await p.locator("#planSave").click(); await p.waitForTimeout(600);
  let ev = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "events") || "[]").find((e) => e.title === "模試"), P);
  ok(ev && ev.count === true, "⑩ saved with it: " + JSON.stringify(ev));
  await p.goto(URL0 + "#home"); await p.reload(); await p.waitForTimeout(700);
  ok((await tileText(p, "countdown")).includes("「模試」"), "⑩ on きょう: " + await tileText(p, "countdown"));
  // edit: off
  await p.goto(URL0 + "#calendar"); await p.reload(); await p.waitForTimeout(700);
  const opened = await p.evaluate((id) => { const b = document.querySelector(`#calGrid .cal-day[data-day="${new Date().toISOString().slice(0, 10)}"]`); return !!b; }, ev.id);
  await p.evaluate(() => document.querySelector("#calGrid .cal-day.sel, #calGrid .cal-day.today")?.click()); await p.waitForTimeout(600);
  await p.evaluate(() => [...document.querySelectorAll("#calDayList .row-btn")].find((x) => x.textContent.includes("模試"))?.click()); await p.waitForTimeout(600);
  ok(await p.isChecked("#edCount") === true, "⑩ its edit form: on");
  await p.locator("#edCount").uncheck({ force: true });
  await p.locator("#sheetSave").click(); await p.waitForTimeout(600);
  ev = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "events") || "[]").find((e) => e.title === "模試"), P);
  ok(ev && !ev.count, "⑩ off: " + JSON.stringify(ev));
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  // dark, 320, for a look
  for (const [name, o] of [["evening-320", { viewport: { width: 320, height: 640 } }], ["evening-393d", { colorScheme: "dark" }]]) {
    p = await phone(b, at("21:00"), o);
    await seed(p, DATA);
    await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
    ok(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) && !p.errs.length, `${name}: nothing wider than the screen, no errors`, p.errs);
    await p.close();
  }
  await b.close();
  console.log(fails ? `${fails} FAILED` : "all OK");
})();
