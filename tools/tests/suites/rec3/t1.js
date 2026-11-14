// 記録 その3 ①〜⑩
const { chromium } = require("playwright");
const fs = require("fs");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-14"; // a Saturday
const T = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const rows = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((li) => li.innerText.replace(/\s+/g, " ").trim()), sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const tab = (p) => p.evaluate(() => document.documentElement.dataset.tab);
const wait = (p, ms = 300) => p.waitForTimeout(ms);
const DATA = {
  meals: [
    { id: "m1", date: today, slot: "朝食", text: "パン", kcal: 300, createdAt: T(today, "07:30") },
    { id: "m2", date: today, slot: "昼食", text: "ラーメン", kcal: 700, createdAt: T(today, "12:15") },
    { id: "m3", date: "2026-11-13", slot: "夕食", text: "カレー", kcal: 800, createdAt: T("2026-11-13", "19:00") },
    { id: "m4", date: "2026-11-12", slot: "朝食", text: "パン", kcal: 300, exId: "ex1", createdAt: T("2026-11-12", "07:40") },
    { id: "m5", date: "2026-11-10", slot: "昼食", text: "ラーメン", kcal: 650, createdAt: T("2026-11-10", "12:30") },
    { id: "m6", date: "2026-11-08", slot: "朝食", text: "パン", kcal: 350, createdAt: T("2026-11-08", "07:20") },
    { id: "m7", date: "2026-10-14", slot: "夕食", text: "ラーメン", kcal: 900, createdAt: T("2026-10-14", "19:00") },
    { id: "m8", date: "2025-11-14", slot: "夕食", text: "すし", kcal: 600, createdAt: T("2025-11-14", "19:00") },
  ],
  workouts: [{ id: "w1", date: today, type: "ランニング", minutes: 30, km: 5, createdAt: T(today, "18:00") }, { id: "w2", date: "2026-11-11", type: "ランニング", minutes: 20, km: 3, createdAt: T("2026-11-11", "18:00") },
    { id: "w3", date: "2026-11-09", type: "ウォーキング", minutes: 40, createdAt: T("2026-11-09", "18:00") }],
  study: [{ id: "s1", date: today, minutes: 60, note: "英語", createdAt: T(today, "20:00"), updatedAt: T(today, "20:30") }, { id: "s2", date: "2026-11-13", minutes: 30, note: "数学", createdAt: T("2026-11-13", "21:00") }],
  journal: [{ id: today, date: today, text: "きょうの日記", createdAt: T(today, "21:00") }, { id: "2026-11-12", date: "2026-11-12", text: "日記", createdAt: T("2026-11-12", "22:00") }],
  weights: [{ id: today, date: today, kg: 60.2, createdAt: T(today, "07:00") }],
  expenses: [{ id: "ex1", date: "2026-11-12", kind: "out", category: "食費", amount: 300, memo: "パン", meal: "m4", createdAt: T("2026-11-12", "07:40") },
    { id: "ex2", date: today, kind: "out", category: "日用品", amount: 400, memo: "洗剤", createdAt: T(today, "10:00") },
    { id: "ex3", date: "2026-11-13", kind: "out", category: "食費", amount: 900, memo: "ラーメン", createdAt: T("2026-11-13", "12:40") }],
  todos: [{ id: "t1", text: "レポート", done: true, doneAt: T(today, "16:00"), createdAt: 1 }],
};

(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("21:30", today), { deviceScaleFactor: 1, acceptDownloads: true });
  await seed(p, DATA, "records"); await wait(p, 1200);
  // ⑧ 最近の記録
  const recent = await rows(p, '#sumCards [data-card="recent"] .rec-row-btn');
  ok(recent.length === 8 && recent[0] === "日記 きょうの日記 11月14日（土）の記録・きょう 21:00に書いた" && recent[1].startsWith("勉強 科目なし 60 分 英語 11月14日（土）の記録・きょう 20:30に直した") && recent[2].startsWith("運動 ランニング"), "⑧ the latest first, written or put right", recent);
  await p.locator('#sumCards [data-card="recent"] .rec-row-btn').first().click(); await wait(p, 800);
  ok(await p.evaluate(() => document.getElementById("daySheet").open), "⑧ pressed: open to put right");
  await p.keyboard.press("Escape"); await wait(p, 700);
  // ⑨ よく記録するもの
  ok((await txt(p, '#sumCards [data-card="often"]')) === "よく記録するもの 食事 パン 3 回 ラーメン 3 回 運動 ランニング 2 回", "⑨ the foods and the kinds recorded most", await txt(p, '#sumCards [data-card="often"]'));
  await p.locator('#sumCards [data-card="often"] .chip-btn', { hasText: "ラーメン" }).click(); await wait(p, 800);
  ok(await tab(p) === "reclist" && await p.inputValue("#recSearch") === "ラーメン" && (await txt(p, "#recListNote")).startsWith("「ラーメン」の記録 3 件"), "⑨ pressed: 食事's list with it looked for", await txt(p, "#recListNote"));
  // ③ the words looked for often there
  await p.click("#recSearchClear"); await wait(p);
  ok(JSON.stringify(await rows(p, "#rec3Sug .chip-btn")) === JSON.stringify(["パン", "ラーメン"]) && await p.isVisible("#rec3Sug"), "③ the words, under the empty field", await rows(p, "#rec3Sug .chip-btn"));
  await p.locator("#rec3Sug .chip-btn", { hasText: "パン" }).click(); await wait(p);
  ok(await p.inputValue("#recSearch") === "パン" && (await txt(p, "#recListNote")).startsWith("「パン」の記録 3 件") && await p.isHidden("#rec3Sug"), "③ pressed: looked for, the words put away");
  await p.click("#recSearchClear"); await wait(p);
  // ② 数でしぼる
  await p.click("#rec3NumBtn"); await wait(p);
  ok(await p.isVisible("#rec3NumBox") && (await txt(p, "#rec3UnitLo")) === "kcal", "② the number's fields, in kcal");
  await p.fill("#rec3Lo", "600"); await wait(p);
  ok((await txt(p, "#recListNote")) === "600 kcal以上の記録 5 件・5 日分・合計 3,650 kcal", "② 600 kcal and more", await txt(p, "#recListNote"));
  await p.fill("#rec3Hi", "800"); await wait(p);
  ok((await txt(p, "#recListNote")).startsWith("600〜800 kcalの記録 4 件・4 日分"), "② from 600 to 800", await txt(p, "#recListNote"));
  await p.fill("#recSearch", "ラーメン"); await wait(p);
  ok((await txt(p, "#recListNote")).startsWith("「ラーメン」・600〜800 kcalの記録 2 件"), "② with words too", await txt(p, "#recListNote"));
  await p.click("#recSearchClear"); await p.click("#rec3NumBtn"); await wait(p);
  ok(await p.isHidden("#rec3NumBox") && (await txt(p, "#recListNote")) === "7 日分・新しい順", "② put away: whole again", await txt(p, "#recListNote"));
  // ④ the days with none
  await p.click("#rec3GapsBtn"); await wait(p, 500);
  const none = await p.locator("#recList li.rec3-none").count();
  ok(none === 359 && (await rows(p, "#recList li.rec3-none"))[0].endsWith("11月11日（水） 記録なし") && (await txt(p, "#rec3GapsBtn")) === "記録のない日を出さない" && await p.evaluate((P) => localStorage.getItem(P + "recListGaps"), P) === "1", "④ every day between, the ones with none quiet", { none, first: (await rows(p, "#recList li.rec3-none"))[0] });
  await p.click("#rec3GapsBtn"); await wait(p, 300);
  ok((await p.locator("#recList li.rec3-none").count()) === 0, "④ off again");
  // ① picked and deleted at once (a 食事 with its 食費, and another), and back
  await p.click("#rec3PickBtn"); await wait(p);
  ok(await p.isVisible("#rec3Bar") && (await txt(p, "#rec3BarSay")) === "削除する記録を押して選びます" && await p.isDisabled("#rec3Del"), "① picking: the bar");
  await p.click('#recList [data-edit="m4"]'); await p.click('#recList [data-edit="m5"]'); await wait(p);
  ok((await txt(p, "#rec3BarSay")) === "2 件を選んでいます" && (await p.locator("#recList li.rec3-on").count()) === 2 && !(await p.evaluate(() => document.getElementById("daySheet").open)), "① two picked (not opened)");
  await p.click("#rec3Del"); await wait(p, 200);
  ok((await txt(p, "#rec3Del")) === "もう一度押すと、2 件を削除します" && (await ls(p, "meals")).length === 8, "① one press: asks again, nothing deleted");
  await p.click("#rec3Del"); await wait(p, 600);
  let meals = await ls(p, "meals"), ex = await ls(p, "expenses");
  ok(meals.length === 6 && !meals.some((m) => m.id === "m4" || m.id === "m5") && !ex.some((e) => e.id === "ex1") && (await toast(p)).includes("食事の記録 2 件を削除しました。家計簿の食費も消しました") && await p.isHidden("#rec3Bar"), "① deleted, its 食費 too", await toast(p));
  await p.locator(".toast.show button").first().click(); await wait(p, 600);
  meals = await ls(p, "meals"); ex = await ls(p, "expenses");
  ok(meals.length === 8 && ex.some((e) => e.id === "ex1"), "① 元に戻す: both back");
  // ⑩ a span for 表 and 日記の本
  await p.click("#backBtn"); await wait(p, 700);
  await p.click("#recSettings"); await wait(p, 600);
  await p.fill("#rec3From", "2026-11-12"); await p.fill("#rec3To", "2026-11-13"); await p.dispatchEvent("#rec3To", "change"); await wait(p, 300);
  const csv = await txt(p, "#csvList");
  ok(csv.includes("家計簿 2 件") && csv.includes("食事 2 件") && csv.includes("日記 1 件") && csv.includes("勉強 1 件") && (await txt(p, "#journalBookFoot")).includes("1 日分") && (await txt(p, "#rec3RangeFoot")).startsWith("11月12日（木）から11月13日（金）まで"), "⑩ counted for the span", { csv, foot: await txt(p, "#rec3RangeFoot") });
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click('#csvList [data-csv="money"]')]);
  const lines = fs.readFileSync(await dl.path(), "utf8").replace(/^﻿/, "").trim().split("\r\n");
  ok(dl.suggestedFilename() === "tsumikasane-kakeibo-2026-11-12_2026-11-13.csv" && lines.length === 3 && lines[1].startsWith("2026-11-12,支出,食費,300") && lines[2].startsWith("2026-11-13,支出,食費,900"), "⑩ the table, the span's rows only", { name: dl.suggestedFilename(), lines });
  await p.click("#rec3RangeClear"); await wait(p, 300);
  ok((await txt(p, "#csvList")).includes("家計簿 3 件") && await p.isHidden("#rec3RangeClear"), "⑩ the span taken off: all");
  await p.keyboard.press("Escape"); await wait(p, 700);
  // ⑤ ⑥ a day's page: the times, a month and a year before
  await p.locator('#sumCards .sum-open[data-kind="meal"]').click(); await wait(p, 800);
  await p.locator("#recList .rec-day-open").first().click(); await wait(p, 800);
  ok(JSON.stringify(await rows(p, '#recDayBody ul[data-kind="meal"] > li')) === JSON.stringify(["07:30 朝食パン 300 kcal", "12:15 昼食ラーメン 700 kcal"]) && (await txt(p, '#recDayBody ul[data-kind="todo"] > li')) === "16:00 レポート"
    && (await txt(p, '#recDayBody ul[data-kind="weight"] > li')).startsWith("07:00"), "⑤ when each was recorded (a ToDo, done)", await rows(p, "#recDayBody ul > li"));
  ok((await txt(p, "#rec3Ago")) === "1か月前（10/14） 1年前（2025/11/14）", "⑥ a month and a year before", await txt(p, "#rec3Ago"));
  await p.locator("#rec3Ago .chip-btn", { hasText: "1年前" }).click(); await wait(p, 400);
  ok((await txt(p, "#recDayTitle")) === "2025年11月14日（金）", "⑥ pressed: that day", await txt(p, "#recDayTitle"));
  // ⑦ the day's records onto its 日記 (11/13: none written that day)
  await p.evaluate(() => { document.getElementById("recDayNext").click(); });
  await p.click("#recDayPrev"); await wait(p, 200);
  for (let i = 0; i < 400 && (await txt(p, "#recDayTitle")) !== "11月13日（金）"; i++) await p.click("#recDayNext");
  await wait(p, 300);
  await p.click("#rec3DayJn"); await wait(p, 800);
  let jn = (await ls(p, "journal")).find((j) => (j.date || j.id) === "2026-11-13");
  ok(jn && jn.text === "この日の記録\n【食事】 合計 800 kcal\n・夕食 カレー 800 kcal\n【勉強】 合計 30 分\n・科目なし 30 分 数学\n【家計簿】 支出 900 円\n・食費 ラーメン 900 円" && (await toast(p)).includes("11月13日（金）の記録を日記に書き足しました"), "⑦ onto that day's 日記", jn?.text);
  await wait(p, 3000);
  await p.click("#rec3DayJn"); await wait(p, 500);
  ok((await toast(p)).includes("もう日記に入っています"), "⑦ again: already there", await toast(p));
  ok(!p.errs.length, "no errors: " + p.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
