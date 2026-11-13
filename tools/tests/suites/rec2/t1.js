// 記録 その2 ①〜⑩
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10"; // a Tuesday
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
const tab = (p) => p.evaluate(() => document.documentElement.dataset.tab);
const wait = (p, ms = 300) => p.waitForTimeout(ms);
// records on 11/10, 11/9, 11/5, 11/1, 10/20 and a year ago (2025-11-03)
const DATA = {
  journal: [{ id: today, date: today, text: "きょうはラーメン", createdAt: T(today, 22) }, { id: "2026-11-05", date: "2026-11-05", text: "公園を散歩", createdAt: T("2026-11-05", 22) },
    { id: "2025-11-03", date: "2025-11-03", text: "去年の文化の日", createdAt: T("2025-11-03", 22) }],
  meals: [{ id: "m1", date: today, slot: "昼食", text: "ラーメン", kcal: 700, createdAt: T(today, 12) }, { id: "m2", date: "2026-11-09", slot: "夕食", text: "カレー", kcal: 800, createdAt: T("2026-11-09", 19) },
    { id: "m3", date: "2026-11-01", slot: "朝食", text: "パン", kcal: 300, createdAt: T("2026-11-01", 8) }],
  study: [{ id: "s1", date: "2026-11-09", minutes: 60, note: "英語", createdAt: T("2026-11-09", 20) }, { id: "s2", date: "2026-11-05", minutes: 30, createdAt: T("2026-11-05", 20) }],
  weights: [{ id: "2026-11-01", date: "2026-11-01", kg: 60.2, createdAt: T("2026-11-01", 7) }, { id: "2026-10-20", date: "2026-10-20", kg: 60.8, createdAt: T("2026-10-20", 7) }],
  expenses: [{ id: "e1", date: today, kind: "out", category: "食費", amount: 980, memo: "ラーメン", createdAt: T(today, 12) },
    { id: "e2", date: "2026-11-05", kind: "out", category: "日用品", amount: 2400, memo: "洗剤", createdAt: T("2026-11-05", 12) },
    { id: "e3", date: "2026-10-20", kind: "out", category: "食費", amount: 650, memo: "ラーメン", createdAt: T("2026-10-20", 12) }],
  todos: [{ id: "t1", text: "ラーメン屋を予約", done: true, doneAt: T(today, 10), createdAt: 1 }, { id: "t2", text: "レポート", done: false, createdAt: 2 }],
  workouts: [{ id: "w1", date: "2026-11-09", type: "ランニング", minutes: 30, km: 5.2, createdAt: T("2026-11-09", 7) }],
  deleted: [
    { id: "journal/x1", store: "journal", rid: "x1", at: T("2026-11-09", 10), data: { id: "x1", date: "2026-11-08", text: "ねこと遊んだ", createdAt: 1 } },
    { id: "meals/x2", store: "meals", rid: "x2", at: T("2026-11-08", 10), data: { id: "x2", date: "2026-11-08", slot: "昼食", text: "うどん", createdAt: 1 } },
    { id: "todos/x3", store: "todos", rid: "x3", at: T("2026-11-07", 10), data: { id: "x3", text: "買い物に行く", done: false, createdAt: 1 } },
    { id: "expenses/x4", store: "expenses", rid: "x4", at: T("2026-11-06", 10), data: { id: "x4", date: "2026-11-06", kind: "out", category: "食費", amount: 500, memo: "パン", createdAt: 1 } },
    { id: "study/x5", store: "study", rid: "x5", at: T("2026-11-05", 10), data: { id: "x5", date: "2026-11-05", minutes: 20, note: "数学", createdAt: 1 } },
  ],
};

(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("20:00", today), { deviceScaleFactor: 1, permissions: ["clipboard-read", "clipboard-write"] });
  await p.addInitScript(() => { try { delete Navigator.prototype.share; } catch {} }); // (no share sheet here: the words are copied)
  await seed(p, DATA, "records");

  // ⑨ はじめた日: each kind's first, the oldest first, with how many days since
  const first = await txt(p, '#sumCards [data-card="first"]');
  ok(first && first.startsWith("はじめた日 日記 2025年11月3日（月）から・3 日記録 373 日目") && first.includes("からだ 10月20日（火）から・2 日記録 22 日目") && first.includes("ToDoの完了 11月10日（火）から・1 日記録 1 日目"), "⑨ はじめた日", first);
  await p.locator('[data-card="first"] .rec-row-btn', { hasText: "勉強" }).click(); await wait(p, 700);
  ok(await tab(p) === "recday" && (await txt(p, "#recDayTitle")) === "11月5日（木）", "⑨ pressed: that day whole");
  await p.click("#backBtn"); await wait(p, 700);

  // ④ a date typed: that day at the top of what was found
  await p.fill("#recAll", "11/5"); await wait(p);
  let found = await txt(p, "#recFound");
  ok(found.startsWith("11月5日（木）の記録をまとめて見る 公園を散歩"), "④ 11/5: that day, with its 日記's words", found);
  await p.fill("#recAll", "2025年11月3日"); await wait(p);
  ok((await txt(p, "#recFound")).startsWith("2025年11月3日（月）の記録をまとめて見る 去年の文化の日"), "④ with its year", await txt(p, "#recFound"));
  await p.fill("#recAll", "12/1"); await wait(p);
  ok((await txt(p, "#recFound")).startsWith("2025年12月1日（月）の記録をまとめて見る この日の記録はありません"), "④ one still to come this year: last year's", await txt(p, "#recFound"));
  await p.fill("#recAll", "きのう"); await wait(p);
  ok((await txt(p, "#recFound")).startsWith("きのう・11月9日（月）の記録をまとめて見る"), "④ きのう", await txt(p, "#recFound"));
  await p.fill("#recAll", "11/5"); await wait(p);
  await p.locator("#recFound .rec2-date .rec-row-btn").click(); await wait(p, 700);
  ok(await tab(p) === "recday" && (await txt(p, "#recDayTitle")) === "11月5日（木）", "④ pressed: that day whole");

  // ① the nearest days with records, where they skip days with none
  let jump = await txt(p, "#rec2Jump");
  ok(await p.isVisible("#rec2Jump") && jump === "11/1（日） 記録のある日 11/9（月）", "① 11/5: 11/1 before, 11/9 after", jump);
  await p.locator("#rec2Jump .chip-btn.next").click(); await wait(p);
  jump = await txt(p, "#rec2Jump");
  ok((await txt(p, "#recDayTitle")) === "11月9日（月）" && jump === "11/5（木） 記録のある日" && !(await p.locator("#rec2Jump .chip-btn.next").count()), "① 11/9: 11/5 before, none after (11/10 is the next day)", jump);

  // ② the day as words (copied, with no share sheet)
  await p.click("#rec2DayShare"); await wait(p, 500);
  const words = await p.evaluate(() => navigator.clipboard.readText());
  ok(words.startsWith("11月9日（月）の記録\n\n【食事】 合計 800 kcal\n・夕食 カレー 800 kcal\n\n【運動】 合計 30 分\n・ランニング") && words.includes("【勉強】 合計 1 時間\n・科目なし 60 分 英語") && (await toast(p)).includes("文字でコピーしました"), "② the day as words", words);
  await p.click("#recDayNext"); await wait(p);
  await p.click("#rec2DayShare"); await wait(p, 500);
  const w2 = await p.evaluate(() => navigator.clipboard.readText());
  ok(w2.includes("【日記】\nきょうはラーメン") && w2.includes("【家計簿】 支出 980 円\n・食費 ラーメン 980 円") && w2.endsWith("【完了したToDo】 1 件\n✓ ラーメン屋を予約"), "② 日記 as written, 家計簿, the ToDos done", w2);
  await p.click("#backBtn"); await wait(p, 700);

  // ③ the kinds of what was found
  await p.fill("#recAll", "ラーメン"); await wait(p);
  let chips = await p.evaluate(() => [...document.querySelectorAll("#recFound .rec2-kinds .chip-btn")].map((c) => c.textContent + (c.getAttribute("aria-pressed") === "true" ? "*" : "")));
  ok(chips.join(",") === "ぜんぶ 5*,日記 1,食事 1,家計簿 2,ToDo 1", "③ the kinds with their counts", chips);
  await p.locator("#recFound .rec2-kinds .chip-btn", { hasText: "家計簿" }).click(); await wait(p);
  let heads = await p.evaluate(() => [...document.querySelectorAll("#recFound .rec-found-head")].map((h) => h.textContent));
  ok(heads.join(",") === "家計簿2 件" && (await txt(p, "#recFound")).includes("「ラーメン」の記録 5 件"), "③ 家計簿 alone", heads);
  await p.fill("#recAll", "カレー"); await wait(p);
  heads = await p.evaluate(() => [...document.querySelectorAll("#recFound .rec-found-head")].map((h) => h.textContent));
  ok(heads.join(",") === "食事1 件" && !(await p.locator("#recFound .rec2-kinds").count()), "③ other words with none of 家計簿: all of them again", heads);

  // ⑤ the words looked for lately
  await p.fill("#recAll", "ラーメン"); await p.press("#recAll", "Enter"); await wait(p);
  await p.fill("#recAll", "洗剤"); await p.press("#recAll", "Enter"); await wait(p);
  await p.click("#recAllClear"); await wait(p);
  let recent = await txt(p, "#rec2Recent");
  ok(await p.isVisible("#rec2Recent") && recent === "最近探した言葉 洗剤 ラーメン 11/5 履歴を消す", "⑤ the latest first, under the empty field", recent);
  ok(JSON.parse(await p.evaluate((P) => localStorage.getItem(P + "recAllRecent"), P)).join(",") === "洗剤,ラーメン,11/5", "⑤ kept on this device");
  await p.locator("#rec2Recent .chip-btn", { hasText: "ラーメン" }).click(); await wait(p);
  ok(await p.inputValue("#recAll") === "ラーメン" && (await txt(p, "#recFound")).includes("「ラーメン」の記録 5 件") && await p.isHidden("#rec2Recent"), "⑤ pressed: looked for again");
  await p.click("#recAllClear"); await wait(p);
  await p.locator("#rec2Recent .link-btn").click(); await wait(p);
  ok(await p.isHidden("#rec2Recent") && !(await p.evaluate((P) => localStorage.getItem(P + "recAllRecent"), P)), "⑤ 履歴を消す");
  await p.locator("#sec-tsumi .sec-head, #sec-records .sec-head").first().click().catch(() => {});
  await p.evaluate(() => document.activeElement?.blur()); await wait(p);
  ok(await p.isHidden("#rec2Recent"), "⑤ hidden with the field not in use");

  // ⑥ what was found added up; ⑦ oldest first; ⑧ a day to go to
  await p.locator('#sumCards .sum-open[data-kind="money"]').click(); await wait(p, 700);
  ok((await txt(p, "#recListNote")) === "3 日分・新しい順" && (await txt(p, "#rec2Order")) === "古い順にする", "⑦ newest first, as before");
  await p.click("#rec2Order"); await wait(p);
  let ds = await p.evaluate(() => [...document.querySelectorAll("#recList li[data-day]")].map((x) => x.dataset.day));
  ok(ds.join(",") === "2026-10-20,2026-11-05,2026-11-10" && (await txt(p, "#recListNote")) === "3 日分・古い順" && (await txt(p, "#rec2Order")) === "新しい順にする", "⑦ oldest first", ds);
  ok(await p.evaluate((P) => localStorage.getItem(P + "recListOld"), P) === "1", "⑦ kept on this device");
  await p.click("#rec2Order"); await wait(p);
  ds = await p.evaluate(() => [...document.querySelectorAll("#recList li[data-day]")].map((x) => x.dataset.day));
  ok(ds[0] === "2026-11-10", "⑦ back to newest first", ds);
  await p.fill("#recSearch", "ラーメン"); await wait(p);
  ok((await txt(p, "#recListNote")) === "「ラーメン」の記録 2 件・2 日分・支出 1,630 円", "⑥ the money of what was found", await txt(p, "#recListNote"));
  await p.click("#recSearchClear"); await wait(p);
  await p.fill("#rec2Go", "2026-11-04"); await wait(p, 400);
  ok(await p.evaluate(() => document.querySelector("#recList li.rec2-lit")?.dataset.day) === "2026-11-05" && (await toast(p)).includes("近い11月5日（木）へ移りました"), "⑧ 11/4 (none): the nearest, 11/5, lit", await toast(p));
  await p.fill("#rec2Go", "2026-10-20"); await wait(p, 400);
  ok(await p.evaluate(() => document.querySelector("#recList li.rec2-lit")?.dataset.day) === "2026-10-20", "⑧ 10/20: there");
  await p.click("#backBtn"); await wait(p, 700);

  // ⑩ 最近削除した項目 looked through
  await p.click("#trashBtn"); await wait(p, 700);
  ok(await p.isVisible("#rec2TrashFind") && (await p.locator("#trashList > li").count()) === 5, "⑩ the field, with 5 there");
  await p.fill("#rec2TrashFind", "ねこ"); await wait(p);
  ok((await p.locator("#trashList > li").count()) === 1 && (await txt(p, "#trashList")).includes("ねこと遊んだ") && (await txt(p, "#trashNote")) === "5 件のうち 1 件" && await p.isHidden("#trashFoot"), "⑩ ねこ: the 日記, すべて完全に削除 out of the way");
  await p.fill("#rec2TrashFind", "todo"); await wait(p);
  ok((await txt(p, "#trashList")).includes("買い物に行く") && (await p.locator("#trashList > li").count()) === 1, "⑩ by its kind (ToDo)");
  await p.fill("#rec2TrashFind", "ぞう"); await wait(p);
  ok((await txt(p, "#trashList")) === "「ぞう」に合う項目はありません。", "⑩ none found, said");
  await p.click("#rec2TrashClear"); await wait(p);
  ok((await p.locator("#trashList > li").count()) === 5 && await p.isVisible("#trashFoot"), "⑩ cleared: all of them");

  ok(!p.errs.length, "no errors: " + p.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
