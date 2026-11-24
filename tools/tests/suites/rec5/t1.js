// 記録 その5 ①〜⑩
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-15"; // a Sunday
const T = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const rows = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((li) => li.innerText.replace(/\s+/g, " ").trim()), sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const tab = (p) => p.evaluate(() => document.documentElement.dataset.tab);
const wait = (p, ms = 300) => p.waitForTimeout(ms);
const LONG = "あ".repeat(60) + "きょうはカレーを作った。" + "い".repeat(60) + "また作りたい。カレーはおいしい。";
const DATA = {
  journal: [{ id: today, date: today, text: "きょうの日記", createdAt: T(today, "21:00") }, { id: "2026-11-10", date: "2026-11-10", text: LONG, createdAt: T("2026-11-10", "22:00") },
    { id: "2025-11-15", date: "2025-11-15", text: "1年前の日記", createdAt: T("2025-11-15", "22:00") }, { id: "2024-11-15", date: "2024-11-15", text: "2年前の日記", createdAt: T("2024-11-15", "22:00") }],
  meals: [
    { id: "m1", date: today, slot: "昼食", text: "カレー", kcal: 800, createdAt: T(today, "12:15") },
    { id: "m2", date: "2026-11-14", slot: "夕食", text: "カレー", kcal: 700, createdAt: T("2026-11-14", "19:00") },
    { id: "m3", date: "2026-11-09", slot: "昼食", text: "カレーうどん", kcal: 600, createdAt: T("2026-11-09", "12:30") },
    { id: "m4", date: "2026-11-11", slot: "朝食", text: "パン", kcal: 300, createdAt: T("2026-11-11", "07:30") },
  ],
  weights: [{ id: today, date: today, kg: 60, createdAt: T(today, "07:00") }],
  bodyDays: [{ id: today, date: today, water: 1200, bed: "23:30", wake: "07:00", steps: 8000, cond: "good", note: "すっきり", temp: 36.4, sys: 118, dia: 76, veg: 3, alc: 1, caf: 2, updatedAt: 1 }],
  expenses: [{ id: "x1", date: today, kind: "out", category: "食費", amount: 900, memo: "カレー", createdAt: T(today, "12:20") }],
  deleted: [
    ...["そば", "うどん", "ラーメン"].map((text, i) => ({ id: `meals/z${i}`, store: "meals", rid: `z${i}`, at: T(today, "09:00") + i * 1000, data: { id: `z${i}`, date: "2026-11-12", slot: "夕食", text, kcal: 500, createdAt: 1 } })),
    ...["ざるそば", "天ぷらそば"].map((text, i) => ({ id: `meals/y${i}`, store: "meals", rid: `y${i}`, at: T(today, "08:00"), data: { id: `y${i}`, date: "2026-11-13", slot: "昼食", text, kcal: 450, createdAt: 1 } })),
  ],
};

(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("21:30", today), { deviceScaleFactor: 1 });
  await seed(p, DATA, "records"); await wait(p, 1200);
  await p.evaluate(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); navigator.clipboard.writeText = async (t) => { window.__copied = t; }; });

  // ① ② 記録's search: -うどん left out; a long 日記, round where the words are
  await p.fill("#recAll", "かれー -うどん"); await wait(p, 400);
  ok((await txt(p, "#recFound .rec-found-say")) === "「かれー -うどん」の記録 4 件", "① -うどん left out (日記 1, 食事 2, 家計簿 1)", await txt(p, "#recFound .rec-found-say"));
  const marks = await rows(p, "#recFound mark.rec4-hit");
  ok(marks.length > 0 && marks.every((m) => m === "カレー"), "① the word left out is not marked", marks);
  const jn = await p.evaluate(() => [...document.querySelectorAll("#recFound .rec-text")].map((x) => x.textContent));
  ok(jn.length === 1 && jn[0] === "…" + "あ".repeat(20) + "きょうはカレーを作った。" + "い".repeat(51) + "…（ほか 1 か所）", "② the long 日記, round where the word is", jn);
  await p.fill("#recAll", "かれー"); await wait(p, 400);
  ok((await txt(p, "#recFound .rec-found-say")) === "「かれー」の記録 5 件", "① without -: カレーうどん too", await txt(p, "#recFound .rec-found-say"));
  await p.click("#recAllClear"); await wait(p, 300);

  // ⑨ ふりかえる日 (a week ago or more: 2025/11/15 or 2024/11/15), another at べつの日
  const pick1 = await txt(p, '#sumCards [data-card="pick"] .rec-row-btn');
  ok(!!pick1 && /^(2025年11月15日（土）・365 日前 1年前の日記|2024年11月15日（金）・730 日前 2年前の日記)/.test(pick1), "⑨ a day gone by", pick1);
  await p.locator('#sumCards [data-card="pick"] .link-btn.more').click(); await wait(p, 400);
  const pick2 = await txt(p, '#sumCards [data-card="pick"] .rec-row-btn');
  ok(!!pick2 && pick2 !== pick1, "⑨ べつの日: the other", { pick1, pick2 });
  await p.locator('#sumCards [data-card="pick"] .rec-row-btn').click(); await wait(p, 800);
  ok(await tab(p) === "recday" && ["2025年11月15日（土）", "2024年11月15日（金）"].includes(await txt(p, "#recDayTitle")), "⑨ pressed: that day", await txt(p, "#recDayTitle"));
  await p.click("#backBtn"); await wait(p, 800);

  // ① ③ ④ ⑤ 食事's list
  await p.locator('#sumCards .sum-open[data-kind="meal"]').click(); await wait(p, 800);
  await p.fill("#recSearch", "カレー"); await wait(p, 400);
  ok((await txt(p, "#recListNote")) === "「カレー」の記録 3 件・3 日分・合計 2,100 kcal・平均 700 kcal", "⑤ the average", await txt(p, "#recListNote"));
  await p.fill("#recSearch", "カレー -うどん"); await wait(p, 400);
  ok((await txt(p, "#recListNote")) === "「カレー -うどん」の記録 2 件・2 日分・合計 1,500 kcal・平均 750 kcal", "① in the list too", await txt(p, "#recListNote"));
  await p.fill("#recSearch", ""); await wait(p, 300);
  ok((await txt(p, "#rec4SpanBtn")) === "期間・曜日でしぼる" && await p.isHidden("#rec5DowBox") && await p.isHidden("#rec5TextBtn"), "④ the button; whole: no 文字で送る");
  await p.click("#rec4SpanBtn"); await wait(p, 300);
  ok(JSON.stringify(await rows(p, "#rec5DowBox .chip-btn")) === JSON.stringify(["日", "月", "火", "水", "木", "金", "土"]) && await p.isVisible("#rec4SpanBox"), "④ the days of the week, with the span", await rows(p, "#rec5DowBox .chip-btn"));
  await p.locator("#rec5DowBox .chip-btn", { hasText: "日" }).click(); await wait(p, 300);
  ok((await txt(p, "#recListNote")) === "日曜の記録 1 件・1 日分・合計 800 kcal" && (await p.getAttribute('#rec5DowBox .chip-btn[aria-label="日曜日"]', "aria-pressed")) === "true", "④ Sundays (one: no average)", await txt(p, "#recListNote"));
  await p.locator("#rec5DowBox .chip-btn", { hasText: "土" }).click(); await wait(p, 300);
  ok((await txt(p, "#recListNote")) === "日・土曜の記録 2 件・2 日分・合計 1,500 kcal・平均 750 kcal", "④ and Saturdays", await txt(p, "#recListNote"));
  await p.locator("#rec5DowBox .chip-btn", { hasText: "月" }).click(); await wait(p, 300);
  ok((await txt(p, "#recListNote")) === "日・月・土曜の記録 3 件・3 日分・合計 2,100 kcal・平均 700 kcal", "④ and Mondays, in the week's order", await txt(p, "#recListNote"));
  ok(await p.isVisible("#rec5TextBtn") && (await txt(p, "#rec4CsvBtn")) === "3 件を表にして書き出す", "③ 文字で送る, beside the table");
  await p.click("#rec5TextBtn"); await wait(p, 500);
  const copied = await p.evaluate(() => window.__copied);
  ok(copied === "日・月・土曜の食事 3 件・3 日分・合計 2,100 kcal・平均 700 kcal\n\n11月15日（日）\n・昼食 カレー 800 kcal\n\n11月14日（土）\n・夕食 カレー 700 kcal\n\n11月9日（月）\n・昼食 カレーうどん 600 kcal"
    && (await toast(p)).includes("見つかった記録を文字でコピーしました"), "③ as words (copied, with no share sheet)", copied);
  await p.click("#rec4SpanBtn"); await wait(p, 300);
  ok((await txt(p, "#recListNote")) === "4 日分・新しい順" && await p.isHidden("#rec5DowBox"), "④ put away: whole again", await txt(p, "#recListNote"));

  // ⑥ ⑦ ⑧ today's page
  await p.locator("#recList .rec-day-open").first().click(); await wait(p, 900);
  ok((await txt(p, "#recDayTitle")) === "11月15日（日）", "today's page");
  ok((await txt(p, "#recDayBody .rec5-body")) === "体調 よい「すっきり」・睡眠 7 時間 30 分・水分 1,200 ml・歩数 8,000 歩・体温 36.4℃・血圧 118/76・野菜 3 皿", "⑥ からだのこと (お酒 and コーヒー・お茶 taken off at the user's call (2026-11-24, tools/REMOVED.md))", await txt(p, "#recDayBody .rec5-body"));
  ok(await p.evaluate(() => { const w = document.querySelector('#recDayBody ul[data-kind="weight"]'), b = document.querySelector("#recDayBody .rec5-body"); return !!(w && b && w.nextElementSibling?.nextElementSibling === b); }), "⑥ right after 体重");
  ok((await txt(p, "#rec3Ago")) === "1年前（2025/11/15） 2年前（2024/11/15）", "⑦ the years before", await txt(p, "#rec3Ago"));
  await p.click("#rec3DayJn"); await wait(p, 800);
  const jt = (await ls(p, "journal")).find((j) => j.id === today)?.text || "";
  ok(jt.includes("【からだのこと】\n・体調 よい「すっきり」・睡眠 7 時間 30 分・水分 1,200 ml") && jt.indexOf("【からだのこと】") < jt.indexOf("【家計簿】"), "⑥ onto its 日記 too, after 体重", jt);
  await wait(p, 3000);
  await p.locator("#recDayBody .rec5-body button").click(); await wait(p, 900);
  ok(await tab(p) === "diet", "⑥ pressed: からだ's page", await tab(p));
  await p.goBack().catch(() => {}); await wait(p, 300);
  await p.evaluate(() => { location.hash = ""; });
  await p.locator('.tabbar button, nav button', { hasText: "つみかさね" }).first().click().catch(() => {}); await wait(p, 900);
  await p.locator('#sumCards .sum-open[data-kind="meal"]').click(); await wait(p, 800);
  await p.locator("#recList .rec-day-open").first().click(); await wait(p, 900);
  await p.keyboard.press("ArrowLeft"); await wait(p, 300);
  ok((await txt(p, "#recDayTitle")) === "11月14日（土）", "⑧ ←: the day before", await txt(p, "#recDayTitle"));
  await p.keyboard.press("ArrowRight"); await wait(p, 300);
  await p.keyboard.press("ArrowRight"); await wait(p, 300);
  ok((await txt(p, "#recDayTitle")) === "11月15日（日）", "⑧ →: the day after, not past today", await txt(p, "#recDayTitle"));

  // ⑩ 最近削除した項目 picked: two put back, one deleted for good, those found all at once
  await p.click("#backBtn"); await wait(p, 600);
  await p.click("#backBtn"); await wait(p, 800);
  await p.click("#trashBtn"); await wait(p, 800);
  ok((await txt(p, "#rec5TrashPick")) === "選んで戻す・削除" && await p.isHidden("#rec5TrashBar"), "⑩ the button");
  // those found by words, all of them at once
  await p.fill("#rec2TrashFind", "そば"); await wait(p, 300);
  await p.click("#rec5TrashPick"); await wait(p, 200);
  await p.click("#rec5TrashAll"); await wait(p, 200);
  ok((await txt(p, "#rec5TrashSay")) === "3 件を選んでいます" && (await rows(p, "#trashList mark.rec4-hit")).length === 3, "⑩ those found, all of them", await txt(p, "#rec5TrashSay"));
  await p.click("#rec5TrashCancel"); await wait(p, 200);
  ok(await p.isHidden("#rec5TrashBar") && (await p.locator("#trashList .rec5-pick").count()) === 0, "⑩ やめる");
  await p.click("#rec2TrashClear"); await wait(p, 300);
  // picked one by one, and a group's all at once; put back
  await p.click("#rec5TrashPick"); await wait(p, 300);
  ok((await p.locator("#trashList .rec5-pick").count()) === 6 && await p.isVisible("#rec5TrashBar") && (await txt(p, "#rec5TrashSay")) === "戻すか削除する項目を押して選びます" && await p.isDisabled("#rec5TrashBack") && await p.isHidden("#trashFoot"), "⑩ picking: a ring a row (and the group's), the bar", await p.locator("#trashList .rec5-pick").count());
  await p.locator("#trashList li[data-key]", { hasText: "ラーメン" }).click();
  await p.locator("#trashList li[data-key]", { hasText: "そば" }).first().click(); await wait(p, 200);
  ok((await txt(p, "#rec5TrashSay")) === "2 件を選んでいます" && (await p.locator("#trashList li.rec3-on").count()) === 2, "⑩ two picked", await txt(p, "#rec5TrashSay"));
  await p.locator("#trashList li.trash-group").click(); await wait(p, 200);
  ok((await txt(p, "#rec5TrashSay")) === "4 件を選んでいます" && (await p.getAttribute("#trashList li.trash-group .rec5-pick", "aria-checked")) === "true", "⑩ a group pressed: its two", await txt(p, "#rec5TrashSay"));
  await p.click("#rec5TrashBack"); await wait(p, 700);
  let meals = await ls(p, "meals");
  ok(meals.length === 8 && ["z0", "z2", "y0", "y1"].every((id) => meals.some((m) => m.id === id)) && (await toast(p)).includes("4 件を戻しました") && await p.isHidden("#rec5TrashBar"), "⑩ 戻す: the four back", await toast(p));
  // one deleted for good (pressed twice)
  await p.click("#rec5TrashPick"); await wait(p, 300);
  await p.locator("#trashList li[data-key]", { hasText: "うどん" }).click(); await wait(p, 200);
  await p.click("#rec5TrashDel"); await wait(p, 200);
  ok((await txt(p, "#rec5TrashDel")) === "もう一度押すと、1 件を完全に削除します" && (await ls(p, "deleted")).find((t) => t.id === "meals/z1")?.data, "⑩ 完全に削除: asked again, nothing gone yet");
  await p.click("#rec5TrashDel"); await wait(p, 700);
  const gone = (await ls(p, "deleted")).find((t) => t.id === "meals/z1");
  ok(gone && !gone.data && !(await txt(p, "#trashList")).includes("うどん"), "⑩ deleted for good", gone);
  ok(!p.errs.length, "no errors: " + p.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
