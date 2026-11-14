// つみかさね その10 ①〜⑩
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-14"; // a Saturday
const T = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const WD = ["日", "月", "火", "水", "木", "金", "土"], wdOf = (d) => new Date(d + "T12:00:00Z").getUTCDay();
const md = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`;
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const rows = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel + " > li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()), sel);
const wait = (p, ms = 300) => p.waitForTimeout(ms);
const errs = [];
async function open(b, data, hm) {
  const p = await phone(b, at(hm, today), { deviceScaleFactor: 1 });
  await seed(p, data, "tsumi"); await wait(p, 1600);
  return p;
}

// as tsumi7's 59 days and today, a 食事 made twice on 11/12 (07:30 and 07:35), the calendar's plans, お休み on three
// Saturdays, 1 and 2 years ago today, and きょうの目標 3 a day
const meals = [], study = [], workouts = [], blocks = [];
const put = (d, t, kind) => blocks.push({ d, t, kind });
for (let i = 1; i <= 59; i++) {
  const d = addDays(today, -i);
  meals.push({ id: "m" + i, date: d, slot: "朝食", text: i % 2 ? "ラーメン" : "パン", kcal: 500, createdAt: T(d, "07:30") }); put(d, T(d, "07:30"), "食事");
  study.push({ id: "s" + i, date: d, minutes: 30, createdAt: T(d, "21:10") }); put(d, T(d, "21:10"), "勉強");
  if (i % 3 === 0) { workouts.push({ id: "w" + i, date: d, type: "ランニング", minutes: 30, km: 5, createdAt: T(d, "18:00") }); put(d, T(d, "18:00"), "運動"); }
}
meals.push({ id: "dup", date: "2026-11-12", slot: "朝食", text: "パン", kcal: 500, createdAt: T("2026-11-12", "07:35") }); put("2026-11-12", T("2026-11-12", "07:35"), "食事");
[["パン", "07:30", "朝食"], ["うどん", "12:00", "昼食"], ["カレー", "13:00", "間食"], ["そば", "15:00", "間食"]].forEach(([text, hm, slot], j) => { meals.push({ id: "t" + j, date: today, slot, text, kcal: 400, createdAt: T(today, hm) }); put(today, T(today, hm), "食事"); });
workouts.push({ id: "w0", date: today, type: "ランニング", minutes: 20, km: 3, createdAt: T(today, "18:00") }); put(today, T(today, "18:00"), "運動");
meals.push({ id: "old", date: "2024-11-14", slot: "夕食", text: "カレー", createdAt: T("2024-11-14", "19:00") }); put("2024-11-14", T("2024-11-14", "19:00"), "食事");
const journal = [{ id: "2025-11-14", date: "2025-11-14", text: "去年のきょう", createdAt: T("2025-11-14", "22:00") }]; put("2025-11-14", T("2025-11-14", "22:00"), "日記");
const events = [], plans = new Map();
const plan = (i, n) => { const d = addDays(today, -i); plans.set(d, n); for (let j = 0; j < n; j++) events.push({ id: `e${i}-${j}`, title: "予定" + j, date: d, createdAt: 1 }); };
[1, 3, 5].forEach((i) => plan(i, 3)); [2, 4, 6, 8, 10].forEach((i) => plan(i, 1));
const routineDays = [7, 14, 21].map((i) => { const d = addDays(today, -i); return { id: d, date: d, done: [], rest: true }; });
const settings = [{ id: "tsumiDayGoal", n: 3, updatedAt: 1 }];
const DATA = { meals, study, workouts, journal, events, routineDays, settings };
const perDay = new Map();
for (const x of blocks) perDay.set(x.d, (perDay.get(x.d) || 0) + 1);
const avg = (xs) => (Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10).toFixed(1);

(async () => {
  const b = await chromium.launch();
  let p = await open(b, DATA, "16:00");
  // 1 きょうのペース: 16:00, the 28 days before by this time (a 食事 each, 11/12 two), today 5
  const by = blocks.filter((x) => x.d >= addDays(today, -28) && x.d < today && (new Date(x.t).getUTCHours() + 9) % 24 < 16).length;
  ok((await txt(p, "#ts10PaceBtn")) === `いつもよりいいペースです（いつもはこの時間までに ${(Math.round((by / 28) * 10) / 10).toFixed(1)} こ、きょうは 5 こ）`, "1 ahead of the usual pace", await txt(p, "#ts10PaceBtn"));

  await p.click("#tsumiSettings"); await wait(p, 800);
  // 2 時間ごとの積み方
  const hs = Array(24).fill(0);
  for (const x of blocks) { const h = (new Date(x.t).getUTCHours() + 9) % 24, m = new Date(x.t).getUTCMinutes(); if (x.d >= addDays(today, -29) && !(h === 12 && m === 0)) hs[h]++; }
  const top = Math.max(...hs), topH = hs.indexOf(top), axis = top <= 5 ? top : Math.ceil(top / 5) * 5;
  ok((await p.locator("#ts10Hour .ts8-bar").count()) === 24 && (await txt(p, "#ts10Hour .ts8-top")) === `${axis} こ` && (await txt(p, "#ts10HourRead")) === `いちばん多いのは ${topH}時台（${top} こ）・時刻のわかるブロック ${hs.reduce((a, c) => a + c, 0)} こ`, "2 24 columns, the top and the busiest hour", { read: await txt(p, "#ts10HourRead"), hs });
  await p.locator("#ts10Hour .ts8-bar").nth(21).click(); await wait(p);
  ok((await txt(p, "#ts10HourRead")) === `${hs[21]} こ 21時台` && (await p.getAttribute("#ts10Hour .ts8-bar:nth-child(19)", "aria-label")) === `18時台、${hs[18]} こ`, "2 an hour pressed: its count first; each named", await txt(p, "#ts10HourRead"));
  // 3 予定とつみかさね
  const g = { none: [], few: [], many: [] };
  for (let i = 60; i >= 1; i--) { const d = addDays(today, -i), n = plans.get(d) || 0; g[n === 0 ? "none" : n <= 2 ? "few" : "many"].push(perDay.get(d) || 0); }
  ok(JSON.stringify(await rows(p, "#ts10Plan")) === JSON.stringify([`予定がない日 ${g.none.length} 日 1日 ${avg(g.none)} こ`, `予定が1〜2こある日 5 日 1日 ${avg(g.few)} こ`, `予定が3こ以上ある日 3 日 1日 ${avg(g.many)} こ`]), "3 by the plans a day had", await rows(p, "#ts10Plan"));
  // 4 まだ積んだことのない種類
  ok(JSON.stringify(await rows(p, "#ts10New")) === JSON.stringify(["ToDo 積んでみる", "ルーティーン 積んでみる", "からだ 積んでみる", "家計簿 積んでみる", "目標 積んでみる"]), "4 the kinds never stacked", await rows(p, "#ts10New"));
  // 5 重なっているかもしれない記録
  ok(JSON.stringify(await rows(p, "#ts10Same")) === JSON.stringify(["食事 11/12（木） 朝食・パン・500 kcal・07:30 と 07:35 あとのほうを開く"]), "5 the 食事 made twice", await rows(p, "#ts10Same"));
  // 6 お休みの日のふりかえり
  ok(JSON.stringify(await rows(p, "#ts10Rest")) === JSON.stringify(["この60日のお休み 3 日", "いちばん多い曜日 3 日 土曜日", "お休みの次の日に積んだ日 3 / 3 日"]), "6 the お休み of 60 days", await rows(p, "#ts10Rest"));
  // 7 種類ごとに先月とくらべる
  const kc = (k, from, to) => blocks.filter((x) => x.kind === k && x.d >= from && x.d <= to).length, diff = (a, c) => (a > c ? `先月より +${a - c}` : a < c ? `先月より −${c - a}` : "先月と同じ");
  const want7 = ["食事", "運動", "勉強"].map((k) => { const now = kc(k, "2026-11-01", today), was = kc(k, "2026-10-01", "2026-10-14"); return `${k} 先月の同じころ ${was} こ・${diff(now, was)} ${now} こ`; });
  ok(JSON.stringify(await rows(p, "#ts10Kind")) === JSON.stringify(want7), "7 each kind against last month", { got: await rows(p, "#ts10Kind"), want7 });
  // 8 週のランキング
  const wk = new Map();
  for (const x of blocks) { const w = addDays(x.d, -wdOf(x.d)); wk.set(w, (wk.get(w) || 0) + 1); }
  const ranked = [...wk].sort((a, c) => c[1] - a[1] || a[0].localeCompare(c[0])).slice(0, 5).map(([w, n], i) => `${i + 1}位 ${md(w)}〜${md(addDays(w, 6))}${w === "2026-11-08" ? "（今週）" : ""} ${n} こ`);
  ok(JSON.stringify(await rows(p, "#ts10Week")) === JSON.stringify(ranked), "8 the weeks with the most", { got: await rows(p, "#ts10Week"), ranked });
  // 9 1年前のきょうのブロック
  ok(JSON.stringify(await rows(p, "#ts10Ago")) === JSON.stringify(["1年前・2025年11月14日（金）（1 こ）", "日記 22:00", "2年前・2024年11月14日（木）（1 こ）", "食事 19:00 夕食・カレー"]), "9 a year and two ago today", await rows(p, "#ts10Ago"));
  // 10 きょうの目標の達成記録 (3 a day)
  const okDay = (d) => (perDay.get(d) || 0) >= 3;
  let n30 = 0, best = 0, cur = 0;
  for (let i = 0; i < 30; i++) if (okDay(addDays(today, -i))) n30++;
  for (let i = 364; i >= 0; i--) { cur = okDay(addDays(today, -i)) ? cur + 1 : 0; best = Math.max(best, cur); }
  ok((await txt(p, "#ts10Goal")) === `この30日で ${n30} 日、1日 3 こに届きました いま 1 日続けて届いています・この1年でいちばん長く続いたのは ${best} 日（いまの目標の数で数えます）`, "10 the days the goal was reached", { got: await txt(p, "#ts10Goal"), n30, best });
  // 5 the later one opened
  await p.locator("#ts10Same .link-btn").click(); await wait(p, 900);
  ok(await p.evaluate(() => document.getElementById("daySheet").open), "5 pressed: the 食事 opened, to put right or delete");
  await p.keyboard.press("Escape"); await wait(p, 700);
  // 4 積んでみる: ToDo's page
  await p.click("#tsumiSettings"); await wait(p, 800);
  await p.locator("#ts10New .link-btn").first().click(); await wait(p, 900);
  ok(await p.evaluate(() => document.documentElement.dataset.tab) === "todo", "4 積んでみる: ToDo's page");
  if (p.errs.length) errs.push(...p.errs);
  await p.close();

  // 1 behind: 2 食事 a day before 9 for 20 days, none today, 16:00
  const m2 = [];
  for (let i = 1; i <= 20; i++) { const d = addDays(today, -i); m2.push({ id: "a" + i, date: d, slot: "朝食", text: "パン", createdAt: T(d, "07:30") }, { id: "c" + i, date: d, slot: "間食", text: "おにぎり", createdAt: T(d, "08:00") }); }
  p = await open(b, { meals: m2 }, "16:00");
  ok((await txt(p, "#ts10PaceBtn")) === "いつもはこの時間までに 1.4 こ。きょうは 0 こです", "1 behind the usual pace", await txt(p, "#ts10PaceBtn"));
  if (p.errs.length) errs.push(...p.errs);
  await p.close();
  p = await open(b, { meals: m2 }, "21:30");
  ok(await p.isHidden("#ts10PaceLine"), "1 none after 9 at night");
  if (p.errs.length) errs.push(...p.errs);
  ok(!errs.length, "no errors: " + errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
