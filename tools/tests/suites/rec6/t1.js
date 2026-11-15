// 記録 その6 ①〜⑩ (on the hook build at 8841: 同期 and 端末の中のコピー opened by window.__rec6)
process.env.URL0 = process.env.URL0 || "http://localhost:8841/";
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
const DATA = {
  meals: [
    { id: "m1", date: today, slot: "昼食", text: "カレー", kcal: 800, p: 20, f: 25, c: 110, createdAt: T(today, "12:15") },
    { id: "m2", date: today, slot: "夕食", text: "サラダ", kcal: 300, p: 10, createdAt: T(today, "19:00") },
    { id: "m3", date: "2026-11-14", slot: "夕食", text: "ラーメン", kcal: 900, createdAt: T("2026-11-14", "19:00") },
    { id: "m4", date: "2026-11-13", slot: "昼食", text: "うどん", kcal: 500, createdAt: T("2026-11-13", "12:00") },
    { id: "m5", date: "2025-12-31", slot: "夕食", text: "宴会", kcal: 1200, createdAt: T("2025-12-31", "19:00") },
  ],
  journal: [{ id: today, date: today, text: "きょうの日記", createdAt: T(today, "21:00") }, { id: "2026-11-14", date: "2026-11-14", text: "長い日記の日。たくさん書いた。", createdAt: T("2026-11-14", "22:00") }],
  study: [1, 2, 3].map((i) => ({ id: `s${i}`, date: `2026-11-0${i + 1}`, minutes: 120, note: "英語", createdAt: T(`2026-11-0${i + 1}`, "20:00") })),
  todos: [
    { id: "t1", text: "レポート提出", due: today, createdAt: 1 },
    { id: "t2", text: "本を返す", due: "2026-11-14", done: true, doneAt: T(today, "10:00"), createdAt: 2 },
    { id: "t3", text: "部屋の掃除", due: "2026-11-14", createdAt: 3 },
    { id: "t4", text: "買い物", due: "2026-11-14", done: true, doneAt: T("2026-11-14", "17:00"), createdAt: 4 },
  ],
  routines: [{ id: "r1", name: "朝の散歩", order: 0, createdAt: T("2026-10-01", "09:00") }, { id: "r2", name: "ストレッチ", order: 1, createdAt: T("2026-10-01", "09:00") }],
  routineDays: [{ id: today, date: today, done: ["r1"] }],
  deleted: [
    { id: "meals/z1", store: "meals", rid: "z1", at: T("2026-10-18", "09:00"), data: { id: "z1", date: "2026-10-17", slot: "夕食", text: "そば", kcal: 500, createdAt: 1 } },
    { id: "meals/z2", store: "meals", rid: "z2", at: T("2026-11-14", "09:00"), data: { id: "z2", date: "2026-11-12", slot: "夕食", text: "うどん", kcal: 500, createdAt: 1 } },
  ],
};

(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("21:30", today), { deviceScaleFactor: 1 });
  await p.route("**/www.gstatic.com/**", (r) => r.abort()); // (no Firebase: what waits to go up stays)
  await seed(p, DATA, "records");
  // ⑨ waiting to go up; ⑩ a copy from yesterday: today's 日記 as it was, and a 食事 not here
  await p.evaluate(async ({ P, today, T }) => {
    localStorage.setItem(P + "sync", JSON.stringify({ uid: "u1", device: "dv", pending: { "meals~m1": T.m1, [`journal~${today}`]: T.jn, "meals~gone1": T.gone } }));
    const db = await new Promise((res, rej) => { const r = indexedDB.open("tsumikasane-copies", 1); r.onupgradeneeded = () => r.result.createObjectStore("copies", { keyPath: "day" }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    await new Promise((res, rej) => {
      const tx = db.transaction("copies", "readwrite");
      tx.objectStore("copies").put({ day: "2026-11-14", savedAt: T.copy, count: 2, data: { journal: [{ id: today, date: today, text: "書きかけの日記", createdAt: T.jn }], meals: [{ id: "old1", date: "2026-11-10", slot: "朝食", text: "トースト", kcal: 250, createdAt: 5 }] } });
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
    db.close();
  }, { P, today, T: { m1: T(today, "21:00"), jn: T(today, "20:00"), gone: T(today, "19:00"), copy: T("2026-11-14", "23:00") } });
  await p.reload(); await wait(p, 1500);

  // ③ a search kept, and looked for again
  await p.fill("#recAll", "カレー"); await wait(p, 400);
  ok(await p.isVisible("#rec6Save") && (await p.getAttribute("#rec6Save", "aria-pressed")) === "false", "③ ♡ in the field");
  await p.click("#rec6Save"); await wait(p, 400);
  ok((await p.getAttribute("#rec6Save", "aria-pressed")) === "true" && (await toast(p)).includes("「カレー」を保存しました") && JSON.stringify((await ls(p, "settings")).find((x) => x.id === "recSearches")?.list) === JSON.stringify(["カレー"]), "③ kept, with the account", await toast(p));
  await p.click("#recAllClear"); await wait(p, 300);
  await p.evaluate(() => document.getElementById("recAll").blur()); await wait(p, 200);
  ok(await p.isVisible("#rec6Saved") && (await rows(p, "#rec6Saved .chip-btn")).join(",") === "カレー" && await p.isHidden("#rec6Save"), "③ under the empty field", await rows(p, "#rec6Saved .chip-btn"));
  await p.locator("#rec6Saved .chip-btn").click(); await wait(p, 400);
  ok(await p.inputValue("#recAll") === "カレー" && (await txt(p, "#recFound .rec-found-say")) === "「カレー」の記録 1 件", "③ pressed: looked for again", await txt(p, "#recFound .rec-found-say"));
  await p.click("#rec6Save"); await wait(p, 300);
  ok((await p.getAttribute("#rec6Save", "aria-pressed")) === "false" && (await toast(p)).includes("外しました"), "③ pressed again: let go");
  await p.click("#recAllClear"); await wait(p, 300);
  ok(await p.isHidden("#rec6Saved"), "③ none kept: none shown");

  // ⑦ the next milestone at this pace (勉強 6 時間 in 30 days: 10 時間 in 20 days)
  const ms = await rows(p, '#sumCards [data-card="milestone"] .rec-row-plain');
  const st = ms.find((r) => r.startsWith("勉強 10 時間まで"));
  ok(!!st && st.includes("このペースで 12/5ごろ") && st.endsWith("あと 4 時間"), "⑦ 勉強 10 時間: about 12/5", ms);

  // ① ② 食事's list by kcal, the kinds over it
  await p.locator('#sumCards .sum-open[data-kind="meal"]').click(); await wait(p, 800);
  ok((await rows(p, "#rec6Kinds .chip-btn")).join(",") === "日記,食事,運動,からだ,勉強,ルーティーン,家計簿" && (await p.getAttribute('#rec6Kinds [aria-current="page"]', "aria-current")) === "page" && (await txt(p, '#rec6Kinds [aria-current="page"]')) === "食事", "② the kinds, 食事 now", await rows(p, "#rec6Kinds .chip-btn"));
  ok((await txt(p, "#rec6RankBtn")) === "kcal の多い順にする" && await p.isVisible("#rec2Order"), "① the button");
  await p.click("#rec6RankBtn"); await wait(p, 400);
  const heads = await rows(p, "#recList li.dayhead");
  ok(JSON.stringify(heads) === JSON.stringify(["2025年12月31日（水） 合計 1,200 kcal", "きょう・11月15日（日） 合計 1,100 kcal", "きのう・11月14日（土） 合計 900 kcal", "11月13日（金） 合計 500 kcal"]) && (await rows(p, "#recList h3.group-head")).join(",") === "kcal の多い順"
    && (await txt(p, "#rec6RankBtn")) === "日付の順にもどす" && await p.isHidden("#rec2Order"), "① the most first, one list, with years and totals", { heads, h3: await rows(p, "#recList h3.group-head") });
  await p.fill("#recSearch", "カレー"); await wait(p, 300);
  ok((await rows(p, "#recList li.dayhead")).join(" | ") === "きょう・11月15日（日） 合計 800 kcal", "① with words: the found ones' totals", await rows(p, "#recList li.dayhead"));
  await p.fill("#recSearch", ""); await wait(p, 300);
  await p.locator("#rec6Kinds .chip-btn", { hasText: "日記" }).click(); await wait(p, 600);
  ok(await tab(p) === "reclist" && (await txt(p, '#rec6Kinds [aria-current="page"]')) === "日記" && (await txt(p, "#rec6RankBtn")) === "長い順にする" && (await txt(p, "#recListNote")) === "2 日分・新しい順", "② pressed: 日記's list, whole", await txt(p, "#recListNote"));
  await p.click("#rec6RankBtn"); await wait(p, 300);
  ok(JSON.stringify(await rows(p, "#recList li.dayhead")) === JSON.stringify(["きのう・11月14日（土） 15 字", "きょう・11月15日（日） 6 字"]), "① 日記: the longest first, with its length", await rows(p, "#recList li.dayhead"));
  await p.locator("#rec6Kinds .chip-btn", { hasText: "食事" }).click(); await wait(p, 600);
  ok((await txt(p, "#rec6RankBtn")) === "kcal の多い順にする", "① another kind: by its days again");

  // ④ ⑥ today's page: the nutrients, the routine not done (まだ), ⑤ the ToDo due today
  await p.locator("#recList .rec-day-open").first().click(); await wait(p, 900);
  ok((await txt(p, "#recDayBody .rec6-pfc")) === "たんぱく質 30 g・脂質 25 g・炭水化物 110 g", "④ the day's nutrients", await txt(p, "#recDayBody .rec6-pfc"));
  ok((await txt(p, '#recDayBody ul[data-kind="routine"] .rec6-rt')) === "まだ：ストレッチ", "⑥ today: まだ", await txt(p, '#recDayBody ul[data-kind="routine"] .rec6-rt'));
  ok((await txt(p, "#recDayBody .rec6-due")) === "レポート提出 まだ" && (await rows(p, "#recDayBody .rec-day-head")).some((h) => h.startsWith("期限がきょうのToDo 1 件")), "⑤ due today, still to do", await txt(p, "#recDayBody .rec6-due"));
  await p.click("#recDayPrev"); await wait(p, 400);
  ok(JSON.stringify(await rows(p, "#recDayBody .rec6-due li")) === JSON.stringify(["部屋の掃除 未完了", "本を返す 11/15に完了"]) && (await rows(p, "#recDayBody .rec-day-head")).some((h) => h.startsWith("期限がこの日だったToDo 2 件")), "⑤ due that day: not done, done later (not the one done that day)", await rows(p, "#recDayBody .rec6-due li"));
  ok((await txt(p, "#recDayBody .rec6-rt")) === "できなかった：朝の散歩・ストレッチ", "⑥ a day gone: できなかった, a group of its own", await txt(p, "#recDayBody .rec6-rt"));
  await p.locator("#recDayBody .rec6-due button", { hasText: "部屋の掃除" }).click(); await wait(p, 800);
  ok(await p.evaluate(() => document.getElementById("daySheet").open), "⑤ pressed: open to put right");
  await p.keyboard.press("Escape"); await wait(p, 800);

  // ⑧ 最近削除した項目: what goes within three days
  await p.click("#backBtn"); await wait(p, 600); await p.click("#backBtn"); await wait(p, 800);
  await p.click("#trashBtn"); await wait(p, 800);
  ok((await txt(p, "#trashNote")) === "2 件・新しい順・3日以内に消える 1 件" && (await p.locator("#trashList li.rec6-soon").count()) === 1 && (await txt(p, "#trashList li.rec6-soon")).includes("そば"), "⑧ the one going soon", await txt(p, "#trashNote"));

  // ⑨ 同期: what waits to go up
  await p.evaluate(() => window.__rec6.open("sync")); await wait(p, 800);
  const pend = await rows(p, "#rec6Pend li"), recs = pend.filter((r) => !r.includes("設定・"));
  ok(await p.isVisible("#rec6PendHead") && pend.some((r) => r === "保存した探し方 設定・いまに変更") && recs.length === 3 && recs[0] === "11月15日（日） 昼食 カレー 食事・30 分前に変更" && recs[1] === "11月15日（日） きょうの日記 日記・きょう 20:00に変更" && recs[2] === "（削除した記録） 食事・きょう 19:00に変更", "⑨ the records waiting (the search kept too), the latest first", pend);

  // ⑩ 端末の中のコピー: yesterday's copy, its records one by one
  await p.evaluate(() => window.__rec6.open("copies")); await wait(p, 900);
  await p.locator("#copiesList button", { hasText: "11月14日" }).first().click(); await wait(p, 900);
  ok(await p.isVisible("#copyAsk") && await p.isVisible("#rec6Copy") && (await txt(p, "#rec6CopyHead")) === "1件ずつ戻す（2 件）", "⑩ the copy opened: its records one by one", await txt(p, "#rec6CopyHead"));
  const cr = await rows(p, "#rec6CopyList li");
  ok(cr.length === 2 && cr.includes("11月15日（日） 書きかけの日記 日記・いまの内容とちがう 戻す") && cr.includes("11月10日（火） 朝食 トースト 食事・この端末にない 戻す"), "⑩ not as here, not here", cr);
  await p.fill("#rec6CopyFind", "日記"); await wait(p, 300);
  ok((await rows(p, "#rec6CopyList li")).length === 1 && (await rows(p, "#rec6CopyList mark.rec4-hit")).length >= 1, "⑩ looked for", await rows(p, "#rec6CopyList li"));
  await p.locator("#rec6CopyList li button", { hasText: "戻す" }).click(); await wait(p, 800);
  let jn = (await ls(p, "journal")).find((j) => j.id === today);
  ok(jn?.text === "書きかけの日記" && (await ls(p, "deleted")).some((t) => t.store === "journal" && t.data?.text === "きょうの日記") && (await toast(p)).includes("このコピーのときに戻しました"), "⑩ brought back alone; the one here to 最近削除した項目", jn?.text);
  ok((await ls(p, "meals")).every((m) => m.id !== "old1"), "⑩ the other left as it was");
  await p.locator(".toast.show button").first().click(); await wait(p, 800);
  jn = (await ls(p, "journal")).find((j) => j.id === today);
  ok(jn?.text === "きょうの日記", "⑩ 元に戻す: as before", jn?.text);
  await p.fill("#rec6CopyFind", "トースト"); await wait(p, 300);
  await p.locator("#rec6CopyList li button", { hasText: "戻す" }).click(); await wait(p, 800);
  ok((await ls(p, "meals")).some((m) => m.id === "old1" && m.text === "トースト"), "⑩ one not here: added");
  ok(!p.errs.length, "no errors: " + p.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
