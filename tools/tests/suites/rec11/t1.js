// 記録 その11 ①〜⑩
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-16"; // a Monday
const T = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const rows = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].filter((x) => x.offsetParent !== null).map((li) => li.innerText.replace(/\s+/g, " ").trim()), sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const tab = (p) => p.evaluate(() => document.documentElement.dataset.tab);
const wait = (p, ms = 300) => p.waitForTimeout(ms);
const LONG = "雨の日の日記。" + "あ".repeat(70) + "おわり。";
const DATA = {
  journal: [{ id: today, date: today, text: "きょうの日記", createdAt: T(today, "21:00") }],
  meals: [
    { id: "m1", date: today, slot: "昼食", text: "カレー", kcal: 800, createdAt: T(today, "12:15") },
    { id: "m2", date: "2026-11-14", slot: "昼食", text: "ラーメン", kcal: 700, createdAt: T("2026-11-14", "12:00") },
  ],
  study: [
    { id: "s1", date: today, minutes: 60, note: "文法", createdAt: T(today, "20:00") },
    { id: "s2", date: "2026-11-14", minutes: 30, note: "単語", createdAt: T("2026-11-14", "09:00") },
    { id: "s3", date: "2026-11-14", minutes: 40, note: "長文", createdAt: T("2026-11-14", "20:00") },
  ],
  expenses: [
    { id: "x1", date: today, kind: "out", category: "食費", amount: 900, memo: "カレー", createdAt: T(today, "12:20") },
    { id: "x2", date: "2026-11-14", kind: "in", category: "給料", amount: 50000, createdAt: T("2026-11-14", "10:00") },
    { id: "x3", date: "2026-11-13", kind: "out", category: "交通費", amount: 300, createdAt: T("2026-11-13", "08:00") },
  ],
  weights: [{ id: "2026-11-01", kg: 60, createdAt: T("2026-11-01", "07:00") }],
  goals: [{ id: "g1", title: "TOEIC 800点", criterion: "TOEIC 800点", deadline: "2027-01-31", depth: 2, done: false, createdAt: T("2026-10-01", "09:00"),
    mandala: [{ t: "英単語", c: [{ t: "単語帳を1周", d: true, at: T("2026-11-15", "20:00") }, null, null, null, null, null, null, null] }, null, null, null, null, null, null, null] }],
  settings: [
    { id: "h4mood", days: { [today]: 4 }, updatedAt: 1 },
    { id: "h3theme", days: { [today]: { text: "早起き", done: true } }, updatedAt: 1 },
  ],
  deleted: [
    // a long 日記 going within three days, and a meal of 11/14 deleted yesterday
    { id: "journal/2026-10-20", store: "journal", rid: "2026-10-20", at: T("2026-10-19", "09:00"), data: { id: "2026-10-20", date: "2026-10-20", text: LONG, createdAt: 1 } },
    { id: "meals/m9", store: "meals", rid: "m9", at: T("2026-11-15", "09:00"), data: { id: "m9", date: "2026-11-14", slot: "夕食", text: "消したごはん", kcal: 500, createdAt: 1 } },
  ],
};

(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("21:30", today), { deviceScaleFactor: 1 });
  await seed(p, DATA, "records");
  await wait(p, 600);

  // ⑩ the share of days recorded since the first; ⑨ those going soon, on 記録
  // (the 続けた日 card's いまの連続・いちばん長い連続: taken out at the user's call, 2026-11-18)
  ok((await txt(p, "#sumCards > .card")).endsWith("はじめてから 16 日のうち 31%") && !(await txt(p, "#sumCards > .card")).includes("連続"), "⑩ 続けた日: the share since the first (5 of 16 days)", await txt(p, "#sumCards > .card"));
  ok((await txt(p, "#trashBtn .rec11-soon")) === "まもなく消える 1" && (await p.getAttribute("#trashBtn", "aria-label")).includes("3日以内に消える 1 件"), "⑨ the one going soon, told of", await txt(p, "#trashBtn"));
  // ⑦ the ways to look, while the field is chosen and empty
  ok(await p.isHidden("#rec11Tips"), "⑦ none at first");
  await p.focus("#recAll"); await wait(p, 300);
  ok(await p.isVisible("#rec11Tips") && (await txt(p, "#rec11Tips")).includes("ことばの前に「-」を付けると"), "⑦ chosen: the ways to look", await txt(p, "#rec11Tips"));
  // ① 目標 in the search
  await p.keyboard.type("単語"); await wait(p, 400);
  ok(await p.isHidden("#rec11Tips"), "⑦ words typed: put away");
  ok((await rows(p, "#recFound .rec-found-head")).includes("目標2 件") && JSON.stringify(await rows(p, "#recFound .rec11-goals li")) === JSON.stringify(["英単語 TOEIC 800点", "単語帳を1周済 TOEIC 800点 › 英単語"]), "① the goal's cells found, where each is", await rows(p, "#recFound .rec11-goals li"));
  ok(JSON.stringify(await rows(p, "#recFound .rec2-kinds .chip-btn")) === JSON.stringify(["ぜんぶ 3", "勉強 1", "目標 2"]), "① 目標 among the kinds", await rows(p, "#recFound .rec2-kinds .chip-btn"));
  await p.fill("#recAll", "TOEIC"); await wait(p, 400);
  ok((await txt(p, "#recFound .rec11-goals li")) === "TOEIC 800点 目標", "① a goal by its name", await txt(p, "#recFound .rec11-goals"));
  await p.fill("#recAll", "単語"); await wait(p, 400);
  await p.locator("#recFound .rec11-goals li button", { hasText: "単語帳" }).click(); await wait(p, 900);
  ok(await p.evaluate(() => document.getElementById("daySheet").open), "① pressed: the goal's chart, in the sheet");
  await p.click("#sheetDone"); await wait(p, 800);
  await p.click("#recAllClear"); await wait(p, 400);

  // ② 勉強: a number by the day's total
  await p.locator('#sumCards .sum-open[data-kind="study"]').click(); await wait(p, 800);
  await p.click("#rec3NumBtn"); await wait(p, 300);
  ok(await p.isVisible("#rec11DayNumBtn"), "② 1日の合計で, there");
  await p.fill("#rec3Lo", "70"); await wait(p, 400);
  ok((await txt(p, "#recList")) .includes("記録がありません") || (await rows(p, "#recList .rec-what")).length === 0, "② each entry: none of 70 分 or more", await rows(p, "#recList .rec-what"));
  await p.click("#rec11DayNumBtn"); await wait(p, 400);
  const two = await rows(p, "#recList .rec-what");
  ok((await txt(p, "#recListNote")).startsWith("1日の合計 70 分以上の記録 2 件・1 日分") && two.length === 2 && two.some((r) => r.includes("単語")) && two.some((r) => r.includes("長文")) && (await p.getAttribute("#rec11DayNumBtn", "aria-pressed")) === "true", "② by the day's total: 11/14's two", [await txt(p, "#recListNote"), two]);
  await p.fill("#rec3Lo", ""); await wait(p, 300);
  // ③ 家計簿: money out or in alone
  await p.locator("#rec6Kinds .chip-btn", { hasText: "家計簿" }).click(); await wait(p, 700);
  ok(JSON.stringify(await rows(p, "#rec11Money .chip-btn")) === JSON.stringify(["支出だけ 2", "収入だけ 1"]), "③ out and in, counted", await rows(p, "#rec11Money .chip-btn"));
  await p.locator("#rec11Money .chip-btn", { hasText: "収入" }).click(); await wait(p, 400);
  ok((await txt(p, "#recListNote")).startsWith("収入だけの記録 1 件・1 日分") && (await rows(p, "#recList .rec-what")).length === 1, "③ 収入 alone", await txt(p, "#recListNote"));
  await p.locator("#rec11Money .chip-btn", { hasText: "支出" }).click(); await wait(p, 400);
  ok((await txt(p, "#recListNote")).startsWith("支出だけの記録 2 件・2 日分"), "③ 支出 alone", await txt(p, "#recListNote"));
  await p.locator("#rec11Money .chip-btn", { hasText: "支出" }).click(); await wait(p, 300);
  ok((await txt(p, "#recListNote")) === "3 日分・新しい順", "③ pressed again: all", await txt(p, "#recListNote"));

  // ⑤ ⑥ ④ today's page
  await p.locator("#recList .rec-day-open").first().click(); await wait(p, 900);
  ok((await txt(p, "#recDayNote")) === "きょう・テーマ「早起き」できた", "⑤ きょう's theme (the mood went with きょうの気分, taken out 2026-11-19)", await txt(p, "#recDayNote"));
  ok((await rows(p, "#recDayBody .rec-day-go .chip-btn")).includes("予定"), "⑥ 予定 among この日に書く");
  // ④ the day read aloud: taken out at the user's call (2026-11-24, tools/REMOVED.md): no button on the day's page
  ok(!(await p.$("#rec11Speak")) && !(await p.evaluate(() => document.body.innerText.includes("読み上げ"))), "④ no reading aloud (taken out)");
  await p.locator("#recDayBody .rec-day-go .chip-btn", { hasText: "予定" }).click(); await wait(p, 800);
  ok((await tab(p)) === "calendar", "⑥ 予定: the calendar, at the day", await tab(p));

  // ⑧ 最近削除した項目: a long one read whole; one put back, its day a press away
  await p.goto(URL0 + "#records"); await p.reload(); await wait(p, 1200);
  await p.click("#trashBtn"); await wait(p, 800);
  const long = p.locator('#trashList li[data-key="journal/2026-10-20"]');
  ok((await long.locator(".rec11-whole-btn").innerText()) === "全文" && (await p.locator('#trashList li[data-key="meals/m9"] .rec11-whole-btn').count()) === 0, "⑧ 全文 on the long one alone");
  await long.locator(".rec11-whole-btn").click(); await wait(p, 300);
  ok(await p.evaluate(() => { const t = document.querySelector('#trashList li[data-key="journal/2026-10-20"] .text'); return getComputedStyle(t).webkitLineClamp === "none" || getComputedStyle(t).display === "block"; }) && (await long.locator(".rec11-whole-btn").innerText()) === "たたむ", "⑧ read whole");
  await p.locator('#trashList li[data-key="meals/m9"] button', { hasText: "戻す" }).click(); await wait(p, 500);
  ok((await toast(p)).includes("食事を戻しました") && (await toast(p)).includes("その日を見る"), "⑧ put back: その日を見る", await toast(p));
  await p.locator(".toast.show .toast-undo").click(); await wait(p, 900);
  ok((await tab(p)) === "recday" && (await txt(p, "#recDayTitle")) === "11月14日（土）" && (await rows(p, '#recDayBody ul[data-kind="meal"] li')).some((r) => r.includes("消したごはん")), "⑧ its day, with it back", await txt(p, "#recDayTitle"));

  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
