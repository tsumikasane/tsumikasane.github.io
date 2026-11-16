// 記録 その9 ①〜⑩
const { chromium } = require("playwright");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-16"; // a Monday
const T = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const rows = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].filter((x) => x.offsetParent !== null).map((li) => li.innerText.replace(/\s+/g, " ").trim()), sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
const tab = (p) => p.evaluate(() => document.documentElement.dataset.tab);
const wait = (p, ms = 300) => p.waitForTimeout(ms);
const DATA = {
  journal: [
    { id: today, date: today, text: "きょうの日記", createdAt: T(today, "21:00") },
    { id: "2026-11-14", date: "2026-11-14", text: "旅行の日記", createdAt: T("2026-11-14", "21:00") },
    { id: "2026-11-03", date: "2026-11-03", text: "祝日の日記", createdAt: T("2026-11-03", "21:00") },
  ],
  meals: [
    { id: "m1", date: today, slot: "昼食", text: "カレー", kcal: 800, createdAt: T(today, "12:15") },
    { id: "m2", date: today, slot: "朝食", text: "パン", kcal: 300, createdAt: T(today, "08:00") },
    { id: "m3", date: "2026-11-14", slot: "昼食", text: "ラーメン", kcal: 700, createdAt: T("2026-11-14", "12:00") },
    { id: "m4", date: "2026-11-13", slot: "夕食", text: "そば", kcal: 500, createdAt: T("2026-11-13", "19:00") },
    { id: "m5", date: "2026-11-12", slot: "夕食", text: "うどん", kcal: 600, createdAt: T("2026-11-12", "19:00") },
  ],
  workouts: [
    { id: "w0", date: "2026-11-12", type: "ランニング", minutes: 40, createdAt: T("2026-11-12", "07:00") },
    { id: "w1", date: "2026-11-14", type: "ランニング", minutes: 30, createdAt: T("2026-11-14", "07:00") },
    { id: "w2", date: "2026-11-15", type: "ランニング", minutes: 20, createdAt: T("2026-11-15", "07:00") },
    { id: "w3", date: today, type: "ランニング", minutes: 20, createdAt: T(today, "07:00") },
  ],
  expenses: [{ id: "x1", date: today, kind: "out", category: "食費", amount: 900, memo: "カレー", createdAt: T(today, "12:20") }],
  todos: [{ id: "t1", text: "書類を出す", done: true, doneAt: T(today, "10:00"), createdAt: 1 }],
  events: [
    { id: "e1", title: "歯医者", date: "2026-11-14", place: "駅前", notes: { "2026-11-14": { mood: "good", text: "痛くなかった", at: T("2026-11-14", "18:00") } }, createdAt: 1 },
    { id: "e2", title: "カフェで勉強", date: today, createdAt: 1 },
    { id: "e3", title: "旅行", date: "2026-11-20", createdAt: 1 },
  ],
  settings: [
    { id: "focusLog", days: { [today]: 80 }, updatedAt: 1 },
    { id: "h5since", items: [{ id: "s1", name: "禁煙", date: "2026-08-08" }], updatedAt: 1 },
    { id: "tsumiAnniv", items: [{ id: "a1", name: "つきあった", md: "11-16" }], updatedAt: 1 },
    { id: "tsumiNotes", words: { "meal:m1": "おいしかった", [`journal:${today}`]: "いい日" }, updatedAt: 1 },
  ],
};
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("21:30", today), { deviceScaleFactor: 1, acceptDownloads: true });
  await seed(p, DATA, "records");
  // photos kept on this device: 日記's (11/14), a meal's, a ToDo's, a plan's; and a voice of 日記 (today)
  await p.evaluate(async ({ PNG, today }) => {
    const png = () => new Blob([Uint8Array.from(atob(PNG), (c) => c.charCodeAt(0))], { type: "image/png" });
    const open = (name) => new Promise((res, rej) => { const r = indexedDB.open(name, 1); r.onupgradeneeded = () => r.result.createObjectStore("photos", { keyPath: "id" }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const put = async (name, xs) => { const db = await open(name); await new Promise((res, rej) => { const tx = db.transaction("photos", "readwrite"); for (const x of xs) tx.objectStore("photos").put(x); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); db.close(); };
    const now = Date.now();
    await put("tsumikasane-photos", [{ id: "jp1", jnDay: "2026-11-14", blob: png(), w: 1, h: 1, createdAt: now }, { id: "mp1", mealId: "m1", blob: png(), w: 1, h: 1, createdAt: now },
      { id: "tp1", todoId: "t1", blob: png(), createdAt: now }, { id: "v1", jnVoiceDay: today, blob: new Blob([new Uint8Array(32)], { type: "audio/mp4" }), createdAt: Date.parse(`${today}T20:05:00+09:00`) }]);
    await put("tsumikasane-plan-photos", [{ id: "pp1", planId: "e2", blob: png(), createdAt: now }]);
  }, { PNG, today });
  await p.reload(); await wait(p, 1200);

  // ⑧ 最近のはじめて, as a card
  ok(JSON.stringify(await rows(p, '#sumCards [data-card="news"] .rec-row-btn')) === JSON.stringify(["きょう・11月16日（月） 食費（家計簿）", "11月12日（木） ランニング（運動）"]), "⑧ the latest firsts, the newest first", await rows(p, '#sumCards [data-card="news"] .rec-row-btn'));
  // ① 予定 in the search: by its name, by its ふりかえり; one ahead of today, not yet
  await p.fill("#recAll", "歯医者"); await wait(p, 400);
  ok((await txt(p, "#recFound .rec-found-say")) === "「歯医者」の記録 1 件" && JSON.stringify(await rows(p, "#recFound .rec9-plans > li")).includes("歯医者") && (await rows(p, "#recFound .rec-found-head")).join() === "予定1 件", "① 予定 found by its name", await rows(p, "#recFound .rec9-plans > li"));
  await p.fill("#recAll", "痛くなかった"); await wait(p, 400);
  ok((await txt(p, "#recFound .rec-found-say")) === "「痛くなかった」の記録 1 件" && (await txt(p, "#recFound .rec9-plans li.dayhead")).startsWith("11月14日（土）"), "① and by its ふりかえり, on its day", await txt(p, "#recFound .rec9-plans"));
  await p.fill("#recAll", "旅行"); await wait(p, 400);
  ok((await rows(p, "#recFound .rec-found-head")).join() === "日記1 件" && (await txt(p, "#recFound .rec-found-say")) === "「旅行」の記録 1 件", "① a plan ahead of today: not found yet", await rows(p, "#recFound .rec-found-head"));
  await p.fill("#recAll", "カフェ 日記"); await wait(p, 300);
  await p.click("#rec8Any"); await wait(p, 400); // (any of them: その8 ⑩)
  ok(JSON.stringify(await rows(p, "#recFound .rec2-kinds .chip-btn")) === JSON.stringify(["ぜんぶ 4", "日記 3", "予定 1"]), "① 予定 among the kinds", await rows(p, "#recFound .rec2-kinds .chip-btn"));
  await p.locator("#recFound .rec2-kinds .chip-btn", { hasText: "予定" }).click(); await wait(p, 400);
  ok((await rows(p, "#recFound .rec-found-head")).join() === "予定1 件", "① 予定 alone", await rows(p, "#recFound .rec-found-head"));
  await p.locator("#recFound .rec2-kinds .chip-btn", { hasText: "ぜんぶ" }).click(); await wait(p, 300);
  await p.click("#rec7ByDay"); await wait(p, 400);
  ok(JSON.stringify(await rows(p, "#recFound .rec7-days li.rec7-kind-li")).includes("予定") && (await txt(p, "#recFound .rec7-days")).includes("カフェで勉強"), "① 予定 in 日ごとに見る too", await rows(p, "#recFound .rec7-days li.rec7-kind-li"));
  await p.click("#rec7ByDay"); await wait(p, 300);
  await p.click("#rec8Any"); await wait(p, 300); // (back to all of them)
  await p.click("#recAllClear"); await wait(p, 300);

  // ⑦ ⑨ the lists: days on end; those with photos
  await p.locator('#sumCards .sum-open[data-kind="workout"]').click(); await wait(p, 800);
  ok(JSON.stringify(await rows(p, "#recList .rec9-run")) === JSON.stringify(["連続 3 日", "連続 2 日"]) && await p.isHidden("#rec9PhChip"), "⑦ the days on end (運動: no photos' chip)", await rows(p, "#recList .rec9-run"));
  await p.locator("#rec6Kinds .chip-btn", { hasText: "日記" }).click(); await wait(p, 900);
  ok((await txt(p, "#rec9PhChip .chip-btn")) === "写真のある日 1" && (await p.getAttribute("#rec9PhChip .chip-btn", "aria-pressed")) === "false", "⑨ 日記: the days with photos, counted", await txt(p, "#rec9PhChip"));
  await p.click("#rec9PhChip .chip-btn"); await wait(p, 400);
  ok((await txt(p, "#recListNote")).startsWith("写真のある日の記録 1 件・1 日分") && (await rows(p, "#recList .rec-what")).join() === "旅行の日記", "⑨ pressed: those alone", await txt(p, "#recListNote"));
  await p.click("#rec9PhChip .chip-btn"); await wait(p, 400);
  ok((await txt(p, "#recListNote")) === "3 日分・新しい順", "⑨ pressed again: all", await txt(p, "#recListNote"));
  await p.locator("#rec6Kinds .chip-btn", { hasText: "食事" }).click(); await wait(p, 900);
  ok((await txt(p, "#rec9PhChip .chip-btn")) === "写真のある食事 1", "⑨ 食事: the meals with one", await txt(p, "#rec9PhChip"));

  // ③ ④ ⑤ ⑥ ② today's page
  await p.locator("#recList .rec-day-open").first().click(); await wait(p, 1200);
  ok((await txt(p, "#recDayNote")) === "きょう・つきあったの記念日・「禁煙」から 100 日・集中 1 時間 20 分", "③ the day itself: 記念日, あの日から, 集中", await txt(p, "#recDayNote"));
  const meal = await p.evaluate(() => document.querySelector('#recDayBody ul[data-kind="meal"]').previousElementSibling.querySelector(".rec-total").innerText.replace(/\s+/g, " "));
  const wo = await p.evaluate(() => document.querySelector('#recDayBody ul[data-kind="workout"]').previousElementSibling.querySelector(".rec-total").innerText.replace(/\s+/g, " "));
  ok(meal.includes("合計 1,100 kcal") && meal.includes("ふだん 600 kcal") && wo.includes("ふだん 30 分"), "⑥ the usual beside the day's totals", [meal, wo]);
  ok(await p.evaluate(() => !document.querySelector('#recDayBody ul[data-kind="money"]').previousElementSibling.querySelector(".rec9-usual")), "⑥ none with fewer than three other days");
  const notes = await rows(p, "#recDayBody .rec9-notes li");
  ok(notes.length === 2 && notes.some((r) => r === "おいしかった 食事「昼食・カレー・800 kcal」のブロック") && notes.some((r) => r === "いい日 日記のブロック"), "⑤ the ひとこと on its blocks", notes);
  ok((await txt(p, "#recDayBody .rec9-media .rec-day-head")) === "食事・ToDo・予定の写真 3 枚" && (await p.locator("#recDayBody .rec9-media .td-thumb").count()) === 3, "② the other photos: a meal's, a ToDo's, a plan's", await txt(p, "#recDayBody .rec9-media"));
  ok((await p.locator("#recDayBody .rec9-voices audio").count()) === 1 && (await txt(p, "#recDayBody .rec9-voices li")) === "20:05", "② 日記's voice, to play", await txt(p, "#recDayBody .rec9-voices"));
  await p.locator("#recDayBody .rec9-media .td-thumb").first().click(); await wait(p, 500);
  ok(await p.evaluate(() => [...document.querySelectorAll("dialog[open], .photo-view, .ts-photo")].some((x) => x.offsetParent !== null || x.open)) || (await p.locator("img[alt*='の写真']").count()) > 0, "② a photo pressed: large");
  await p.keyboard.press("Escape"); await wait(p, 500);
  // ⑩ the day as a picture
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#rec9DayPic")]);
  const png = path.join(os.tmpdir(), "rec9-day.png");
  await dl.saveAs(png);
  const buf = fs.readFileSync(png);
  ok(dl.suggestedFilename() === `tsumikasane-${today}.png` && buf.slice(1, 4).toString() === "PNG" && buf.readUInt32BE(16) === 1080 && buf.readUInt32BE(20) > 600, "⑩ a picture 1080 wide", [dl.suggestedFilename(), buf.readUInt32BE(16), buf.readUInt32BE(20)]);
  // ④ 11/14: its plan's ふりかえり
  await p.click("#recDayPrev"); await wait(p, 400); await p.click("#recDayPrev"); await wait(p, 900);
  ok((await txt(p, "#recDayTitle")) === "11月14日（土）" && (await txt(p, "#recDayBody .rec4-plans .rec9-note")) === "ふりかえり：よかった「痛くなかった」", "④ the plan's ふりかえり", await txt(p, "#recDayBody .rec4-plans"));
  ok((await txt(p, "#recDayNote")) === "2 日前", "③ nothing more on a plain day", await txt(p, "#recDayNote"));
  // ③ a 祝日
  await p.click("#backBtn"); await wait(p, 700); await p.click("#backBtn"); await wait(p, 800);
  await p.fill("#recAll", "祝日の日記"); await wait(p, 400);
  await p.locator("#recFound .rec-day-open").first().click(); await wait(p, 900);
  ok((await txt(p, "#recDayNote")) === "13 日前・文化の日", "③ 文化の日", await txt(p, "#recDayNote"));

  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
