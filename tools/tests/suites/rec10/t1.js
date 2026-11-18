// 記録 その10 ①〜⑩
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
const LONG = "朝から雨だった。" + "あ".repeat(80) + "とても長い一日のまんなかで、ことばを探す。" + "い".repeat(80) + "おわり。";
const DATA = {
  journal: [
    { id: today, date: today, text: "きょうの日記", createdAt: T(today, "21:00") },
    { id: "2026-11-14", date: "2026-11-14", text: LONG, createdAt: T("2026-11-14", "22:30") },
    { id: "2026-11-13", date: "2026-11-13", text: "朝に書いた日記", createdAt: T("2026-11-13", "07:30") },
    { id: "2026-11-20", date: "2026-11-20", text: "先の日記", createdAt: T(today, "20:00") },
  ],
  meals: [
    { id: "m1", date: today, slot: "昼食", text: "カレー", kcal: 800, createdAt: T(today, "12:15") },
    { id: "m2", date: today, slot: "朝食", text: "パン", kcal: 300, createdAt: T(today, "08:00") },
    { id: "m3", date: "2026-11-14", slot: "昼食", text: "カレー", kcal: 700, createdAt: T("2026-11-14", "12:00") },
    { id: "m4", date: "2026-11-13", slot: "夕食", text: "そば", kcal: 500, createdAt: T("2026-11-13", "19:00") },
    { id: "m5", date: "2026-11-12", slot: "夕食", text: "カレー", kcal: 600, createdAt: T("2026-11-12", "19:30") },
    { id: "m6", date: "2026-11-11", slot: "昼食", text: "うどん", kcal: 650, createdAt: T("2026-11-11", "12:00") },
    { id: "m7", date: "2026-11-10", slot: "夕食", text: "ラーメン", kcal: 900, createdAt: T("2026-11-10", "19:00") },
  ],
  expenses: [
    { id: "x1", date: today, kind: "out", category: "食費", amount: 900, memo: "カレー", createdAt: T(today, "12:20") },
    { id: "x3", date: "2026-11-25", kind: "out", category: "住居費", amount: 50000, memo: "家賃", createdAt: T(today, "09:00") },
  ],
};

(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("21:30", today), { deviceScaleFactor: 1 });
  await seed(p, DATA, "records");
  await wait(p, 600);

  // ⑨ / on a computer: to 記録's search; Esc empties it, then lets it go
  await p.keyboard.press("/"); await wait(p, 200);
  ok(await p.evaluate(() => document.activeElement?.id) === "recAll", "⑨ / : 記録's search");
  await p.keyboard.type("カレー"); await wait(p, 400);
  ok((await txt(p, "#recFound .rec-found-say")) === "「カレー」の記録 4 件", "⑨ typed there", await txt(p, "#recFound .rec-found-say"));
  await p.keyboard.press("Escape"); await wait(p, 300);
  ok((await p.inputValue("#recAll")) === "" && await p.evaluate(() => document.activeElement?.id) === "recAll" && await p.isHidden("#recFound"), "⑨ Esc: emptied");
  await p.keyboard.press("Escape"); await wait(p, 200);
  ok(await p.evaluate(() => document.activeElement?.id) !== "recAll", "⑨ Esc again: let go");
  // ⑧ 日記 found, whole
  await p.fill("#recAll", "まんなか"); await wait(p, 400);
  const part = await txt(p, "#recFound .rec-what.rec-text");
  ok(await p.isVisible("#rec10JnFull") && part.startsWith("…") && part.length < LONG.length, "⑧ round where the words are, at first", part);
  await p.click("#rec10JnFull"); await wait(p, 400);
  ok((await txt(p, "#recFound .rec-what.rec-text")) === LONG && (await p.getAttribute("#rec10JnFull", "aria-pressed")) === "true" && (await p.locator("#recFound mark.rec4-hit").count()) >= 1, "⑧ whole, the words marked", await txt(p, "#recFound .rec-what.rec-text"));
  await p.click("#rec10JnFull"); await wait(p, 300);
  await p.fill("#recAll", "カレー"); await wait(p, 300);
  ok(await p.isHidden("#rec10JnFull"), "⑧ no 日記 found: none");
  await p.click("#recAllClear"); await wait(p, 300);

  // ① 食事 by name
  await p.locator('#sumCards .sum-open[data-kind="meal"]').click(); await wait(p, 800);
  await p.click("#rec10NamesBtn"); await wait(p, 400);
  const names = await rows(p, "#recList .rec10-names li");
  ok((await txt(p, "#recList .group-head")) === "名前ごと（5）" && names[0] === "カレー 3 回・最後 11/16 2,100 kcal" && names.length === 5 && (await txt(p, "#rec10NamesBtn")) === "日ごとに見る", "① by name, the most often first", names);
  await p.locator("#recList .rec10-names li", { hasText: "カレー" }).locator("button").click(); await wait(p, 500);
  ok((await p.inputValue("#recSearch")) === "カレー" && (await txt(p, "#recListNote")).startsWith("「カレー」の記録 3 件・3 日分") && (await p.locator("#recList .rec10-names").count()) === 0, "① a name pressed: its records", await txt(p, "#recListNote"));
  await p.click("#recSearchClear"); await wait(p, 300);
  // ⑥ picked: their total, as words
  await p.click("#rec3PickBtn"); await wait(p, 300);
  ok(await p.isHidden("#rec10PickSend") && await p.isHidden("#rec10NamesBtn"), "⑥ nothing picked yet: no 文字で送る (no 名前ごと while picking)");
  await p.click('#recList [data-edit="m1"]'); await p.click('#recList [data-edit="m3"]'); await wait(p, 300);
  ok((await txt(p, "#rec3BarSay")) === "2 件を選んでいます・合計 1,500 kcal" && await p.isVisible("#rec10PickSend"), "⑥ how many and their total", await txt(p, "#rec3BarSay"));
  await p.evaluate(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); navigator.clipboard.writeText = async (t) => { window.__copied = t; }; });
  await p.click("#rec10PickSend"); await wait(p, 300);
  const sent = await p.evaluate(() => window.__copied || "");
  ok(sent.startsWith("食事の記録 2 件・合計 1,500 kcal\n\n【11月14日（土）】\n") && sent.includes("【11月16日（月）】") && sent.includes("カレー 800 kcal") && (await toast(p)).includes("選んだ記録を文字でコピーしました"), "⑥ sent as words, by day", sent);
  await p.click("#rec3Cancel"); await wait(p, 300);
  // ② 日記 by the time of day; ⑤ its letters; ⑦ those dated after today
  await p.locator("#rec6Kinds .chip-btn", { hasText: "日記" }).click(); await wait(p, 800);
  ok(JSON.stringify(await rows(p, "#recList .rec10-len")) === JSON.stringify(["6 字", `${[...LONG].length} 字`, "7 字"]), "⑤ each 日記's letters", await rows(p, "#recList .rec10-len"));
  ok((await txt(p, "#rec10Ahead")) === "きょうより先の日付の記録が 1 件あります。見る", "⑦ one dated after today, told of", await txt(p, "#rec10Ahead"));
  await p.locator("#rec10Ahead button").click(); await wait(p, 300);
  ok((await rows(p, "#rec10Ahead li")).join(" | ") === "11月20日（金） | 先の日記", "⑦ listed at a press", await rows(p, "#rec10Ahead li"));
  await p.locator("#rec10Ahead li [data-edit]").click(); await wait(p, 700);
  ok(await p.evaluate(() => document.getElementById("daySheet").open), "⑦ opened, to put right");
  await p.keyboard.press("Escape"); await wait(p, 700);
  await p.click("#rec10HourBtn"); await wait(p, 300);
  ok(JSON.stringify(await rows(p, "#rec10HourBox .chip-btn")) === JSON.stringify(["朝 1", "昼 0", "夕方 0", "夜 2", "夜中 0"]) && await p.isDisabled("#rec10HourBox .chip-btn >> nth=1"), "② the times of day, counted", await rows(p, "#rec10HourBox .chip-btn"));
  await p.locator("#rec10HourBox .chip-btn", { hasText: "朝" }).click(); await wait(p, 400);
  ok((await txt(p, "#recListNote")).startsWith("朝（5〜10時）の記録 1 件・1 日分") && (await rows(p, "#recList .rec-what")).join() === "朝に書いた日記", "② 朝 alone", await txt(p, "#recListNote"));
  await p.locator("#rec10HourBox .chip-btn", { hasText: "朝" }).click(); await wait(p, 300);
  ok((await txt(p, "#recListNote")) === "3 日分・新しい順", "② pressed again: all", await txt(p, "#recListNote"));
  await p.click("#rec3NumBtn"); await wait(p, 300);
  await p.fill("#rec3Lo", "100"); await wait(p, 400);
  ok((await txt(p, "#recListNote")).startsWith("100 字以上の記録 1 件・1 日分") && (await txt(p, "#rec3UnitLo")) === "字", "⑤ 数でしぼる by letters", await txt(p, "#recListNote"));
  await p.fill("#rec3Lo", ""); await wait(p, 300);
  await p.locator("#rec6Kinds .chip-btn", { hasText: "家計簿" }).click(); await wait(p, 700);
  ok((await txt(p, "#rec10Ahead")).startsWith("きょうより先の日付の記録が 1 件あります。"), "⑦ 家計簿's too", await txt(p, "#rec10Ahead"));

  // ③ ⑤ ⑩ today's page, then 11/14's
  await p.locator("#rec6Kinds .chip-btn", { hasText: "食事" }).click(); await wait(p, 700);
  await p.locator("#recList .rec-day-open").first().click(); await wait(p, 1000);
  const mealHead = await p.evaluate(() => document.querySelector('#recDayBody ul[data-kind="meal"]').previousElementSibling.querySelector(".rec-total").innerText.replace(/\s+/g, " "));
  ok(mealHead.includes("合計 1,100 kcal") && mealHead.includes("これまででいちばん"), "③ the day's total, the most of all", mealHead);
  ok((await p.evaluate(() => document.querySelector('#recDayBody ul[data-kind="journal"]').previousElementSibling.querySelector(".rec-total")?.innerText)) === "6 字", "⑤ the day's 日記, its letters");
  await p.click("#recDayPrev"); await wait(p, 400); await p.click("#recDayPrev"); await wait(p, 700);
  const head = () => p.evaluate(() => document.querySelector('#recDayBody ul[data-kind="meal"]').previousElementSibling.querySelector(".rec-total").innerText);
  const m14 = await head();
  ok(m14.includes("これまでで 3 番目"), "③ 11/14: the third most", m14);
  await p.click("#recDayPrev"); await wait(p, 700);
  const m13 = await head();
  ok(!m13.includes("これまで"), "③ 11/13, the least: nothing", m13);
  await p.click("#backBtn"); await wait(p, 700); await p.click("#backBtn"); await wait(p, 900);
  // ⑩ 最近見た日, a card: taken out at the user's call (2026-11-18, tools/REMOVED.md); the days looked at are no more kept
  ok(!(await p.$('#sumCards [data-card="seen"]')) && await p.evaluate((P) => localStorage.getItem(P + "recSeen") === null, P), "⑩ no 最近見た日, nothing kept for it");

  // ④ a copy kept: made now, opened, 完全に削除 out of it too, let go of (元に戻す)
  await p.click("#recSettings"); await wait(p, 800);
  await p.click("#copiesBtn"); await wait(p, 1000);
  ok((await tab(p)) === "copies" && await p.isVisible("#rec10KeepNow") && await p.isHidden("#rec10KeptList"), "④ the copies' page: none kept yet");
  await p.click("#rec10KeepNow"); await wait(p, 800);
  ok((await rows(p, "#rec10KeptList li")).length === 1 && (await toast(p)).includes("のコピーを残しました"), "④ the records now, kept", await toast(p));
  const kept = () => p.evaluate(async () => { const db = await new Promise((r) => { const q = indexedDB.open("tsumikasane-kept"); q.onsuccess = () => r(q.result); }); const xs = await new Promise((r) => { const q = db.transaction("copies").objectStore("copies").getAll(); q.onsuccess = () => r(q.result); }); db.close(); return xs; });
  ok((await kept())[0]?.data?.meals?.some((m) => m.id === "m6"), "④ kept with 「うどん」 in it");
  // (「うどん」 deleted, from 食事's list)
  await p.click("#backBtn"); await wait(p, 800);
  await p.locator('#sumCards .sum-open[data-kind="meal"]').click(); await wait(p, 800);
  await p.click("#rec3PickBtn"); await wait(p, 300);
  await p.click('#recList [data-edit="m6"]'); await p.click("#rec3Del"); await wait(p, 200); await p.click("#rec3Del"); await wait(p, 500);
  ok(!(await ls(p, "meals")).some((m) => m.id === "m6"), "(うどん deleted)");
  await p.click("#backBtn"); await wait(p, 800);
  await p.click("#recSettings"); await wait(p, 800); await p.click("#copiesBtn"); await wait(p, 1000);
  await p.locator("#rec10KeptList li .row-btn").click(); await wait(p, 800);
  ok(await p.isVisible("#copyAsk") && await p.isVisible("#copyAskDeadRow") && await p.isHidden("#rec10KeepThis"), "④ the kept one opened as a copy (the one deleted here offered back; no 残す again)", await txt(p, "#copyAsk"));
  await p.click("#copyCancel"); await wait(p, 300);
  await p.click("#backBtn"); await wait(p, 800);
  await p.click("#trashBtn"); await wait(p, 800);
  const del = p.locator('#trashList li[data-key="meals/m6"] .del');
  await del.click(); await wait(p, 200); await del.click(); await wait(p, 1500);
  ok(!(await kept())[0]?.data?.meals?.some((m) => m.id === "m6"), "④ 完全に削除: out of the kept one too");
  await p.click("#backBtn"); await wait(p, 800);
  await p.click("#recSettings"); await wait(p, 800); await p.click("#copiesBtn"); await wait(p, 1000);
  await p.locator("#rec10KeptList li button", { hasText: "外す" }).click(); await wait(p, 600);
  ok(await p.isHidden("#rec10KeptList") && (await kept()).length === 0 && (await toast(p)).includes("のコピーを外しました"), "④ let go of", await toast(p));
  await p.locator(".toast.show .toast-undo").click(); await wait(p, 800);
  ok((await rows(p, "#rec10KeptList li")).length === 1 && (await kept()).length === 1, "④ 元に戻す: kept again");

  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
