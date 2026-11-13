// 記録 ①〜⑩
const { chromium } = require("playwright");
const fs = require("fs");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10"; // a Tuesday
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
const card = (p, key) => txt(p, `#sumCards [data-card="${key}"]`);
// 40 days: 日記 but every 7th from the 3rd (11/7, 10/31, …), 体重 every other day, a meal and a study each day
const journal = [], weights = [], meals = [], study = [];
for (let i = 0; i < 40; i++) {
  const d = addDays(today, -i);
  if (i % 7 !== 3) journal.push({ id: d, date: d, text: `日記 ${d}${i === 5 ? "　きょうはラーメン, 餃子を食べた" : ""}`, createdAt: T(d, 22) });
  if (i % 2 === 0) weights.push({ id: d, date: d, kg: Math.round((60 - i * 0.05) * 100) / 100, createdAt: T(d, 7) });
  meals.push({ id: "m" + i, date: d, slot: "昼食", text: i % 5 ? "定食" : "ラーメン", kcal: 700, createdAt: T(d, 12) });
  study.push({ id: "s" + i, date: d, minutes: 60 + i, createdAt: T(d, 20) });
}
journal.push({ id: "2025-11-10", date: "2025-11-10", text: "1年前の日記", createdAt: T("2025-11-10", 22) });
const DATA = { journal, weights, meals, study,
  expenses: [{ id: "e1", date: today, kind: "out", category: "食費", amount: 980, memo: "ラーメン", method: "card", createdAt: T(today, 12) }, { id: "e2", date: addDays(today, -2), kind: "out", category: "日用品", amount: 2400, memo: "洗剤", createdAt: T(today, 12) }],
  todos: [{ id: "t1", text: "ラーメン屋を予約", done: true, doneAt: T(today, 10), createdAt: 1 }, { id: "t2", text: "レポート", done: false, due: addDays(today, 2), createdAt: 2 }],
  workouts: [{ id: "w1", date: addDays(today, -1), type: "ランニング", minutes: 30, km: 5.2, createdAt: T(addDays(today, -1), 7) }] };
async function open(b, data = DATA, hash = "records") {
  const p = await phone(b, at("20:00", today), { deviceScaleFactor: 1, acceptDownloads: true });
  await seed(p, data, hash);
  return p;
}
const download = async (p, click) => { const [d] = await Promise.all([p.waitForEvent("download"), click()]); return { name: d.suggestedFilename(), text: fs.readFileSync(await d.path(), "utf8") }; };

(async () => {
  const b = await chromium.launch();
  let p = await open(b);
  // ④ each kind's days on end
  ok((await txt(p, '#sumCards .sum-card:has([data-kind="journal"])')).includes("連続 3 日 最長 6 日"), "④ 日記: 3 on end now, 6 the longest", await txt(p, '#sumCards .sum-card:has([data-kind="journal"])'));
  ok((await txt(p, '#sumCards .sum-card:has([data-kind="study"])')).includes("連続 40 日 最長 40 日"), "④ 勉強: 40");
  ok((await txt(p, '#sumCards .sum-card:has([data-kind="workout"])')).includes("連続 1 日 最長 1 日"), "④ 運動: yesterday's counts as going on", await txt(p, '#sumCards .sum-card:has([data-kind="workout"])'));
  ok(!(await txt(p, '#sumCards .sum-card:has([data-kind="routine"])')).includes("連続"), "④ none for a kind with no record");
  // ③ a month and a year ago
  const mem = await card(p, "memory");
  ok(mem.includes("1か月前・10月10日（土）") && mem.includes("食事 1 回・勉強 1 時間 31 分") && mem.includes("1年前・2025年11月10日（月）") && mem.includes("1年前の日記"), "③ 1か月前 and 1年前, the 日記's words or what there was", mem);
  // ⑦ the days left out
  const miss = await card(p, "missed");
  ok(miss.includes("日記 4 日") && miss.includes("11/7（土）") && miss.includes("10/17（土）") && !miss.includes("10/10"), "⑦ 日記's 4 days left out (from 30 days back)", miss);
  ok(miss.includes("体重 15 日") && miss.includes("きのう") && miss.includes("ほか 9 日") && !miss.includes("食事 ") && !miss.includes("ルーティーン"), "⑦ 体重's, not 食事 (every day) nor ルーティーン (none)", miss);
  // ⑤ milestones: 勉強 50 時間 on the day it was passed
  const ev = study.map((x) => [x.date, x.minutes]).sort((a, b) => a[0].localeCompare(b[0]));
  let got = 0, day50 = null;
  for (const [d, m] of ev) { got += m; if (!day50 && got >= 3000) day50 = d; }
  const ms = await card(p, "milestone");
  const md = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`;
  ok(ms.includes(`${md(day50)}`) && ms.includes("勉強 50 時間") && ms.includes("記録した日 30 日") && /記録した日 50 日まで あと 9 日/.test(ms), "⑤ reached (勉強 50 時間 on its day) and next (記録した日 50 日まで あと 9 日)", { day50, ms });
  await p.locator('[data-card="milestone"] .link-btn.more').click(); await p.waitForTimeout(200);
  ok((await p.locator('[data-card="milestone"] .rec-rows').first().locator("li").count()) === 6 && (await card(p, "milestone")).includes("しまう"), "⑤ all of them at a press");
  // ⑥ the bests
  const best = await card(p, "best");
  ok(best.includes("いちばん勉強した日 10月2日（金） 1 時間 39 分") && best.includes("いちばん軽かった体重 10月3日（土） 58.1 kg") && best.includes("いちばん走った日 11月9日（月） 5.2 km") && best.includes("いちばん支出が多かった日 11月8日（日） 2,400 円"), "⑥ the bests, each with its day", best);
  // ⑥ → ① that day whole
  await p.locator('[data-card="best"] .rec-row-btn', { hasText: "いちばん勉強した日" }).click(); await p.waitForTimeout(700);
  let day = await txt(p, "#sec-recday");
  ok(await p.evaluate(() => document.documentElement.dataset.tab) === "recday" && day.startsWith("10月2日（金） 39 日前") && day.includes("日記 日記 2026-10-02") && day.includes("勉強 合計 1 時間 39 分") && day.includes("食事 合計 700 kcal"), "① the day whole", day);
  await p.click("#recDayNext"); await p.waitForTimeout(200);
  ok((await txt(p, "#recDayTitle")) === "10月3日（土）" && (await txt(p, "#sec-recday")).includes("からだ"), "① the next day");
  await p.click("#backBtn"); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.documentElement.dataset.tab) === "records", "① back to 記録");
  // ① from a kind's list: its date, and back there
  await p.locator('#sumCards .sum-open[data-kind="journal"]').click(); await p.waitForTimeout(700);
  await p.locator("#recList .rec-day-open").first().click(); await p.waitForTimeout(700);
  day = await txt(p, "#sec-recday");
  ok(day.startsWith("11月10日（火） きょう") && day.includes("完了したToDo 1 件 ラーメン屋を予約") && day.includes("家計簿 支出 980 円") && await p.isDisabled("#recDayNext"), "① from 日記's list: today, its ToDo done and 家計簿", day);
  await p.click("#backBtn"); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.documentElement.dataset.tab) === "reclist", "① back to the list it came from");
  // ① "この日に書く": 日記 on that day
  await p.locator("#recList .rec-day-open").nth(2).click(); await p.waitForTimeout(700); // (11/8: 11/7 has none)
  await p.locator(".rec-day-go .chip-btn", { hasText: "日記を開く" }).click(); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.documentElement.dataset.tab) === "journal" && await p.evaluate(() => document.querySelector("#sec-journal .datenav input[type=date]").value) === "2026-11-08", "① この日に書く: 日記 on that day");
  // ⑦ a day left out: 日記 there
  await p.goto(URL0 + "#records"); await p.reload(); await p.waitForTimeout(800);
  await p.locator('[data-card="missed"] .chip-btn', { hasText: "11/7（土）" }).first().click(); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.documentElement.dataset.tab) === "journal" && await p.evaluate(() => document.querySelector("#sec-journal .datenav input[type=date]").value) === "2026-11-07", "⑦ pressed: 日記 on that day, to write");
  await p.goto(URL0 + "#records"); await p.reload(); await p.waitForTimeout(800);
  await p.locator('[data-card="missed"] .rec-miss', { hasText: "体重" }).locator(".chip-btn").first().click(); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.documentElement.dataset.tab) === "diet" && await p.evaluate(() => document.documentElement.dataset.dietPart || localStorage.getItem("tsumikasane:dietPart")) === "weight", "⑦ 体重: からだ on that day");
  // ② every record looked for
  await p.goto(URL0 + "#records"); await p.reload(); await p.waitForTimeout(800);
  await p.fill("#recAll", "ラーメン"); await p.waitForTimeout(300);
  const found = await txt(p, "#recFound");
  ok(await p.isHidden("#sumCards") && found.startsWith("「ラーメン」の記録 11 件") && /日記\s?1 件/.test(found) && /食事\s?8 件/.test(found) && /家計簿\s?1 件/.test(found) && /ToDo\s?1 件/.test(found) && found.includes("ほか 3 件を食事の一覧で見る"), "② by kind, the cards out of the way", found);
  await p.locator("#recFound .rec-found-more", { hasText: "食事" }).click(); await p.waitForTimeout(800);
  ok(await p.evaluate(() => document.documentElement.dataset.tab) === "reclist" && await p.inputValue("#recSearch") === "ラーメン" && (await txt(p, "#recListNote")).includes("「ラーメン」の記録 8 件"), "② ほか: the kind's list with the same words");
  await p.click("#backBtn"); await p.waitForTimeout(700);
  await p.locator("#recFound li", { hasText: "ラーメン屋を予約" }).locator(".row-link").click(); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.getElementById("daySheet").open) && await p.inputValue("#reText") === "ラーメン屋を予約", "② an entry found opens to put right");
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  await p.click("#recAllClear"); await p.waitForTimeout(200);
  ok(await p.isVisible("#sumCards") && await p.isHidden("#recFound"), "② cleared: the cards back");
  // ⑨ the cards: hidden and moved, kept
  await p.click("#recSettings"); await p.waitForTimeout(500);
  const names = await p.evaluate(() => [...document.querySelectorAll("#recCardList .tname")].map((x) => x.textContent));
  ok(names.join(",") === "続けた日,1か月前・1年前のきょう,書き忘れた日,日記,食事,運動,からだ,勉強,ルーティーン,家計簿,節目,これまでのいちばん,はじめた日", "⑨ the cards in 設定", names);
  await p.locator("#recCardList li", { hasText: "書き忘れた日" }).locator(".tile-pick").click(); await p.waitForTimeout(300);
  await p.locator("#recCardList li", { hasText: "これまでのいちばん" }).locator(".grip").focus();
  for (let i = 0; i < 11; i++) { await p.keyboard.press("ArrowUp"); await p.waitForTimeout(80); }
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  const shown = await p.evaluate(() => [...document.querySelectorAll("#sumCards > .card")].map((c) => c.dataset.card || c.querySelector(".sum-open")?.dataset.kind || "days"));
  ok(shown[0] === "best" && !shown.includes("missed") && shown.length === 12, "⑨ これまでのいちばん first, 書き忘れた日 hidden", shown);
  const pref = (await ls(p, "settings")).find((x) => x.id === "recordCards");
  ok(pref && pref.hidden.includes("missed") && pref.order[0] === "best", "⑨ kept with the account", pref);
  // ⑧ a kind as a table
  await p.click("#recSettings"); await p.waitForTimeout(500);
  ok((await txt(p, "#csvList")).includes("家計簿 2 件") && (await txt(p, "#csvList")).includes("日記 35 件"), "⑧ each kind with how many", await txt(p, "#csvList"));
  let f = await download(p, () => p.click('#csvList [data-csv="money"]'));
  const rows = f.text.replace(/^﻿/, "").trim().split("\r\n");
  ok(f.name === `tsumikasane-kakeibo-${today}.csv` && f.text.startsWith("﻿") && rows[0] === "日付,区分,費目,金額,メモ,支払い方法" && rows[1].startsWith(`${addDays(today, -2)},支出,日用品,2400,洗剤`) && rows[2].startsWith(`${today},支出,食費,980,ラーメン,`), "⑧ 家計簿 as CSV: the mark for Excel, oldest first", { name: f.name, rows });
  f = await download(p, () => p.click('#csvList [data-csv="journal"]'));
  ok(f.text.includes("日付,日記") && f.text.includes('2026-11-05,"日記 2026-11-05　きょうはラーメン, 餃子を食べた"') && f.text.trim().split("\r\n").length === 36, "⑧ 日記 as CSV (a comma inside kept whole)", f.text.split("\r\n").slice(0, 3));
  f = await download(p, () => p.click('#csvList [data-csv="weight"]'));
  ok(f.text.replace(/^﻿/, "").startsWith("日付,体重(kg),体脂肪率(%),摂取カロリー(kcal),ウエスト(cm)"), "⑧ からだ's columns, its sizes too");
  // ⑩ 日記 as one book
  ok((await txt(p, "#journalBookFoot")).includes("35 日分"), "⑩ how many it holds");
  f = await download(p, () => p.click("#journalBook"));
  const lines = f.text.split("\n");
  ok(f.name === `tsumikasane-nikki-${today}.txt` && lines[0] === "つみかさね　日記" && lines[1] === "2025年11月10日（月）〜2026年11月10日（火）（35 日）" && f.text.indexOf("2025年11月10日（月）\n\n1年前の日記") > 0 && f.text.indexOf("2026年10月2日") < f.text.indexOf("2026年11月10日（火）\n\n日記 2026-11-10"), "⑩ oldest first, each under its date with its year", lines.slice(0, 8));
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  // nothing yet: the page says so, the search there
  const q = await open(b, {});
  ok((await txt(q, "#sumCards")).includes("まだ記録がありません") && await q.isVisible("#recAll"), "nothing yet: said, as before");
  ok(!p.errs.length && !q.errs.length, "no errors: " + [...p.errs, ...q.errs].join(" | "));
  await p.screenshot({ path: __dirname + "/shots/r-records.png", fullPage: true });
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
