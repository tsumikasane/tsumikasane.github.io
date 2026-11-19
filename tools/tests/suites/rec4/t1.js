// 記録 その4 ①〜⑩
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
const tab = (p) => p.evaluate(() => document.documentElement.dataset.tab);
const isOpen = (p, id) => p.evaluate((id) => !!document.getElementById(id)?.open, id);
const wait = (p, ms = 300) => p.waitForTimeout(ms);
// a swipe on the day's page, from x0 to x1 (as a finger: start, a move, the end)
const swipe = (p, x0, x1, y = 420) => p.evaluate(({ x0, x1, y }) => {
  const target = document.getElementById("recDayBody"), mk = (x) => new Touch({ identifier: 7, target, clientX: x, clientY: y });
  target.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, cancelable: true, touches: [mk(x0)], targetTouches: [mk(x0)], changedTouches: [mk(x0)] }));
  target.dispatchEvent(new TouchEvent("touchmove", { bubbles: true, cancelable: true, touches: [mk((x0 + x1) / 2)], targetTouches: [mk((x0 + x1) / 2)], changedTouches: [mk((x0 + x1) / 2)] }));
  target.dispatchEvent(new TouchEvent("touchend", { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [mk(x1)] }));
}, { x0, x1, y });
const DATA = {
  meals: [
    { id: "m1", date: today, slot: "昼食", text: "ラーメン", kcal: 700, createdAt: T(today, "12:15") },
    { id: "m2", date: "2026-11-10", slot: "昼食", text: "ラーメン", kcal: 650, createdAt: T("2026-11-10", "12:30") },
    { id: "m3", date: "2026-10-14", slot: "夕食", text: "らーめん大盛り", kcal: 900, createdAt: T("2026-10-14", "19:00") },
    { id: "m4", date: "2026-11-13", slot: "朝食", text: "パン", kcal: 300, createdAt: T("2026-11-13", "07:30") },
  ],
  expenses: [
    { id: "x1", date: "2025-03-02", kind: "out", category: "医療", amount: 2000, memo: "病院 内科", createdAt: T("2025-03-02", "10:00") },
    { id: "x2", date: "2025-12-20", kind: "out", category: "医療", amount: 3000, memo: "病院 歯医者", createdAt: T("2025-12-20", "10:00") },
    { id: "x3", date: "2026-02-10", kind: "out", category: "医療", amount: 1500, memo: "病院", createdAt: T("2026-02-10", "10:00") },
    { id: "x4", date: today, kind: "out", category: "食費", amount: 900, memo: "ラーメン", createdAt: T(today, "12:20") },
  ],
  journal: [{ id: today, date: today, text: "きょうの日記", wx: { word: "晴れ", icon: "sun", hi: 18, lo: 9 }, createdAt: T(today, "21:00") }],
  events: [{ id: "e1", date: today, title: "飲み会", time: "19:00", endTime: "21:00", createdAt: 1 }, { id: "e2", date: today, title: "授業", time: "10:00", endTime: "12:30", createdAt: 1 }],
  shifts: [{ id: "sh1", date: today, start: "14:00", end: "17:00", rest: 0, jobId: "j1", createdAt: 1 }],
  goals: [{ id: "g1", title: "TOEIC 800点", criterion: "TOEIC 800点", deadline: "2027-01-31", depth: 2, done: false, createdAt: T("2026-10-01", "09:00"),
    mandala: [{ t: "単語", c: [{ t: "単語帳1周", d: true, at: T(today, "20:00") }, null, null, null, null, null, null, null] }, { t: "文法", d: true, at: T("2026-11-12", "20:00") }, null, null, null, null, null, null] }],
  deleted: ["ラーメン屋", "うどん", "そば", "カレー"].map((text, i) => ({ id: `meals/z${i}`, store: "meals", rid: `z${i}`, at: T(today, "09:00") + i, data: { id: `z${i}`, date: "2026-11-11", slot: "夕食", text, kcal: 500, createdAt: 1 } })),
  settings: [{ id: "jobs", items: [{ id: "j1", name: "コンビニ", wage: 1100, fare: 0, cutoff: 0, payday: 25 }], updatedAt: 1 }],
};

(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("21:30", today), { deviceScaleFactor: 1, acceptDownloads: true });
  await seed(p, DATA, "records");
  // ⑤ a 日記's photo and a 体型の写真 of today, as their pages keep them (this device's photos)
  await p.evaluate(async () => {
    const bytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
    const db = await new Promise((res, rej) => { const r = indexedDB.open("tsumikasane-photos", 1); r.onupgradeneeded = () => r.result.createObjectStore("photos", { keyPath: "id" }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    await new Promise((res, rej) => {
      const tx = db.transaction("photos", "readwrite"), os = tx.objectStore("photos");
      os.put({ id: "jp1", jnDay: "2026-11-14", blob: new Blob([bytes], { type: "image/png" }), w: 1, h: 1, createdAt: 1 });
      os.put({ id: "bp1", date: "2026-11-14", blob: new Blob([bytes], { type: "image/png" }), w: 1, h: 1, createdAt: 2 });
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
    db.close();
  });
  await p.reload(); await wait(p, 1200);

  // ④ the words found, marked (かな and カナ alike): 記録's search
  await p.fill("#recAll", "らーめん"); await wait(p, 400);
  const hits = await rows(p, "#recFound mark.rec4-hit");
  ok(hits.length === 4 && hits.filter((h) => h === "ラーメン").length === 3 && hits.includes("らーめん") && (await txt(p, "#recFound .rec-found-say")) === "「らーめん」の記録 4 件", "④ marked where found, as written", hits);
  await p.click("#recAllClear"); await wait(p, 300);

  // ① ② ③ 家計簿's list: 「病院」, the days between, a span, the table
  await p.locator('#sumCards .sum-open[data-kind="money"]').click(); await wait(p, 800);
  ok(await p.isHidden("#rec4Gaps") && await p.isHidden("#rec4CsvBtn") && await p.isHidden("#rec4SpanBox") && (await txt(p, "#rec4SpanBtn")) === "期間・曜日でしぼる", "whole: no days between, no table, the span's field put away");
  await p.fill("#recSearch", "病院"); await wait(p, 400);
  ok((await txt(p, "#recListNote")) === "「病院」の記録 3 件・3 日分・支出 6,500 円・平均 2,167 円", "the words: 3", await txt(p, "#recListNote"));
  ok((await txt(p, "#rec4Gaps")) === "はじめて 2025年3月2日（日）・最後は 277 日前・平均 173 日ごと", "② the first, the last and the mean", await txt(p, "#rec4Gaps"));
  ok(JSON.stringify(await rows(p, "#recList li.dayhead .rec4-gap")) === JSON.stringify(["前回から 52 日", "前回から 293 日", "はじめて"]), "② each day's", await rows(p, "#recList li.dayhead .rec4-gap"));
  ok((await rows(p, "#recList mark.rec4-hit")).length === 3, "④ marked in the list too");
  ok((await txt(p, "#rec4CsvBtn")) === "3 件を表にして書き出す", "③ the table's button", await txt(p, "#rec4CsvBtn"));
  await p.click("#rec4SpanBtn"); await wait(p, 300);
  ok(await p.isVisible("#rec4SpanBox") && (await p.getAttribute("#rec4SpanBtn", "aria-expanded")) === "true", "① the span's fields");
  await p.fill("#rec4From", "2025-12-31"); await p.fill("#rec4To", "2025-01-01"); await p.dispatchEvent("#rec4To", "change"); await wait(p, 400);
  ok((await txt(p, "#recListNote")) === "「病院」・2025/1/1〜2025/12/31の記録 2 件・2 日分・支出 5,000 円・平均 2,500 円" && await p.inputValue("#rec4From") === "2025-01-01", "① 2025 only (picked the other way round)", await txt(p, "#recListNote"));
  ok((await txt(p, "#rec4Gaps")) === "最後は 329 日前・平均 293 日ごと" && JSON.stringify(await rows(p, "#recList li.dayhead .rec4-gap")) === JSON.stringify(["前回から 293 日"]), "② within the span (no はじめて)", { g: await txt(p, "#rec4Gaps"), r: await rows(p, "#recList li.dayhead .rec4-gap") });
  ok((await txt(p, "#rec4CsvBtn")) === "2 件を表にして書き出す", "③ two");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#rec4CsvBtn")]);
  const lines = fs.readFileSync(await dl.path(), "utf8").replace(/^﻿/, "").trim().split("\r\n");
  ok(dl.suggestedFilename() === "tsumikasane-kakeibo-shibori-2026-11-14.csv" && lines.length === 3 && lines[0].startsWith("日付,区分,費目,金額,メモ") && lines[1].startsWith("2025-03-02,支出,医療費,2000,病院 内科") && lines[2].startsWith("2025-12-20,支出,医療費,3000,病院 歯医者"), "③ the ones found, in 家計簿's columns", { name: dl.suggestedFilename(), lines });
  await p.click("#recSearchClear"); await wait(p, 300);
  ok((await txt(p, "#recListNote")).startsWith("2025/1/1〜2025/12/31の記録 2 件・2 日分") && await p.isHidden("#rec4Gaps") && (await txt(p, "#rec4CsvBtn")) === "2 件を表にして書き出す", "① the span alone (no days between, the table still)", await txt(p, "#recListNote"));
  // a list opened from its card again starts whole: its words, its number and its span
  await p.click("#backBtn"); await wait(p, 700);
  await p.locator('#sumCards .sum-open[data-kind="money"]').click(); await wait(p, 800);
  ok((await txt(p, "#recListNote")) === "4 日分・新しい順" && await p.isHidden("#rec4SpanBox") && await p.inputValue("#rec4From") === "", "opened again: whole", await txt(p, "#recListNote"));
  await p.click("#rec3NumBtn"); await p.fill("#rec3Lo", "2500"); await wait(p, 300);
  ok((await txt(p, "#recListNote")).startsWith("2500 円以上の記録 1 件"), "a number", await txt(p, "#recListNote"));
  await p.click("#backBtn"); await wait(p, 700);
  await p.locator('#sumCards .sum-open[data-kind="money"]').click(); await wait(p, 800);
  ok((await txt(p, "#recListNote")) === "4 日分・新しい順" && await p.isHidden("#rec3NumBox") && await p.inputValue("#rec3Lo") === "", "opened again: the number put away too", await txt(p, "#recListNote"));

  // ⑤ ⑥ ⑦ ⑧ ⑨ today's page
  await p.locator("#recList .rec-day-open").first().click(); await wait(p, 1200);
  const note = await p.evaluate(() => document.getElementById("recDayNote").textContent);
  // ⑥ the weather its 日記 kept: taken out (the user's call, 2026-11-19, tools/REMOVED.md), as 日記's weather is; the 日記's
  // wx stays, read by nothing
  ok((await txt(p, "#recDayTitle")) === "11月14日（土）" && note === "きょう" && !(await p.$("#recDayNote .rec4-wx")), "⑥ (taken out) no weather on the day's page", note);
  ok((await txt(p, ".rec4-photos .rec-day-head")) === "写真 2 枚" && (await p.locator(".rec4-photos .td-thumb").count()) === 2 && await p.evaluate(() => document.getElementById("recDayBody").firstElementChild.classList.contains("rec4-photos")), "⑤ the day's photos, over its records", await txt(p, ".rec4-photos .rec-day-head"));
  await p.locator(".rec4-photos .td-thumb").nth(1).click(); await wait(p, 400);
  ok(await isOpen(p, "tsumiPhotoView"), "⑤ 体型の写真, large");
  await p.click("#tsumiPhotoClose"); await wait(p, 300);
  await p.locator(".rec4-photos .td-thumb").first().click(); await wait(p, 400);
  ok(await isOpen(p, "jn2PhotoView"), "⑤ 日記's photo, large");
  await p.click("#jn2PhotoClose"); await wait(p, 300);
  const plans = await rows(p, ".rec4-plans li");
  ok((await txt(p, ".rec4-plans .rec-day-head")) === "予定 3 件" && plans.length === 3 && plans[0] === "10:00〜12:30 授業" && plans[1].startsWith("14:00 コンビニ 14:00〜17:00") && plans[2] === "19:00〜21:00 飲み会", "⑦ the plans and the shift, by time", plans);
  ok(await p.evaluate(() => { const g = document.querySelector(".rec4-plans"), go = document.querySelector("#recDayBody .rec-day-go"); return !!(g && go && (g.compareDocumentPosition(go) & Node.DOCUMENT_POSITION_FOLLOWING)); }), "⑦ under the records, over この日に書く");
  await p.locator(".rec4-plans li", { hasText: "飲み会" }).locator("button").click(); await wait(p, 800);
  ok(await isOpen(p, "daySheet") && await p.inputValue("#edTitle") === "飲み会", "⑦ a plan pressed: its form");
  await p.keyboard.press("Escape"); await wait(p, 800);
  ok(!(await isOpen(p, "daySheet")) && await tab(p) === "recday", "⑦ put away: the day still");
  await p.locator(".rec4-plans li", { hasText: "コンビニ" }).locator("button").click(); await wait(p, 800);
  ok(await isOpen(p, "daySheet") && (await txt(p, "#sheetTitle")).includes("勤務"), "⑦ the shift pressed: its form", await txt(p, "#sheetTitle"));
  await p.keyboard.press("Escape"); await wait(p, 800);
  ok((await txt(p, '#recDayBody .rec4-goals')) === "「単語帳1周」を達成（「TOEIC 800点」のマス）", "⑧ the goal's cell achieved today", await txt(p, "#recDayBody .rec4-goals"));
  await p.locator("#recDayBody .rec4-goals button").click(); await wait(p, 800);
  ok(await isOpen(p, "daySheet"), "⑧ pressed: the goal's chart");
  for (let i = 0; i < 4 && await isOpen(p, "daySheet"); i++) { await p.keyboard.press("Escape"); await wait(p, 800); }
  ok(!(await isOpen(p, "daySheet")) && await tab(p) === "recday", "⑧ put away: the day still");
  ok((await txt(p, "#rec4DayStairsText")) === "つみかさねの階段でこの日を見る（4 こ）" && await p.isVisible("#rec4DayStairs"), "⑨ the day's blocks", await txt(p, "#rec4DayStairsText"));

  // ⑩ swiped: leftwards on today, nothing; rightwards, the day before; leftwards, back
  await swipe(p, 300, 120); await wait(p, 300);
  ok((await txt(p, "#recDayTitle")) === "11月14日（土）", "⑩ no day after today");
  await swipe(p, 100, 320); await wait(p, 400);
  ok((await txt(p, "#recDayTitle")) === "11月13日（金）" && await p.evaluate(() => document.getElementById("recDayBody").classList.contains("rec4-in-prev")), "⑩ rightwards: the day before", await txt(p, "#recDayTitle"));
  await swipe(p, 10, 300); await wait(p, 300);
  ok((await txt(p, "#recDayTitle")) === "11月13日（金）", "⑩ not from the screen's edge");
  await swipe(p, 200, 150); await wait(p, 300);
  ok((await txt(p, "#recDayTitle")) === "11月13日（金）", "⑩ not a short one");
  // ⑧ a day with only a goal achieved: its records are that
  await p.click("#recDayPrev"); await wait(p, 400);
  ok((await txt(p, "#recDayTitle")) === "11月12日（木）" && (await txt(p, "#recDayBody .rec4-goals")) === "「文法」を達成（「TOEIC 800点」のマス）" && (await p.locator("#recDayBody .card.empty").count()) === 0 && await p.isVisible("#rec2DayShare"), "⑧ a goal's day: not 記録はありません", await txt(p, "#recDayBody"));
  ok(await p.isHidden("#rec4DayStairs") === false && (await txt(p, "#rec4DayStairsText")) === "つみかさねの階段でこの日を見る（1 こ）", "⑨ its one block", await txt(p, "#rec4DayStairsText"));
  await p.click("#recDayPrev"); await wait(p, 400);
  ok((await txt(p, "#recDayTitle")) === "11月11日（水）", "the day before it", await txt(p, "#recDayTitle"));
  await swipe(p, 320, 100); await wait(p, 400);
  ok((await txt(p, "#recDayTitle")) === "11月12日（木）", "⑩ leftwards: the day after", await txt(p, "#recDayTitle"));
  await p.click("#rec4DayStairs"); await wait(p, 1000);
  ok(await tab(p) === "tsumi", "⑨ pressed: the stairs");

  // ④ marked in 最近削除した項目 too
  await p.click("#trashBtn"); await wait(p, 800);
  await p.fill("#rec2TrashFind", "ラーメン"); await wait(p, 300);
  ok(JSON.stringify(await rows(p, "#trashList mark.rec4-hit")) === JSON.stringify(["ラーメン"]), "④ 最近削除した項目", await rows(p, "#trashList mark.rec4-hit"));
  ok(!p.errs.length, "no errors: " + p.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
