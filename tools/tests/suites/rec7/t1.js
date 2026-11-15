// 記録 その7 ①〜⑩ (on the hook build at 8842: 端末の中のコピー opened by window.__rec7)
process.env.URL0 = process.env.URL0 || "http://localhost:8842/";
const { chromium } = require("playwright");
const fs = require("fs");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-15"; // a Sunday
const T = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const rows = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].filter((x) => x.offsetParent !== null).map((li) => li.innerText.replace(/\s+/g, " ").trim()), sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const tab = (p) => p.evaluate(() => document.documentElement.dataset.tab);
const wait = (p, ms = 300) => p.waitForTimeout(ms);
const DATA = {
  journal: [
    { id: today, date: today, text: "きょうの日記\n2行目", wx: { word: "晴れ", icon: "sun", hi: 18, lo: 9 }, createdAt: T(today, "21:00") },
    { id: "2025-11-15", date: "2025-11-15", text: "1年前のきょう\n公園に行った\n3行目", wx: { word: "雨", icon: "rain" }, createdAt: T("2025-11-15", "21:00") },
    { id: "2024-11-15", date: "2024-11-15", text: "2年前のきょう", wx: { word: "雨", icon: "rain", hand: true }, createdAt: T("2024-11-15", "21:00") },
    { id: "2026-11-10", date: "2026-11-10", text: "雨の日記", wx: { word: "雨", icon: "rain" }, createdAt: T("2026-11-10", "21:00") },
    { id: "2026-11-12", date: "2026-11-12", text: "旅行の準備", createdAt: T("2026-11-12", "21:00") },
  ],
  meals: [
    { id: "m1", date: today, slot: "昼食", text: "カレー", kcal: 800, createdAt: T(today, "12:15") },
    { id: "m2", date: today, slot: "朝食", text: "パン", kcal: 300, createdAt: T(today, "08:00") },
    { id: "m3", date: "2026-11-12", slot: "夕食", text: "旅行先のごはん", kcal: 900, createdAt: T("2026-11-12", "19:00") },
    { id: "m4", date: "2026-11-14", slot: "昼食", text: "カレー", kcal: 700, createdAt: T("2026-11-14", "12:00") },
  ],
  expenses: [
    { id: "x1", date: today, kind: "out", category: "食費", amount: 900, memo: "カレー", createdAt: T(today, "12:20") },
    { id: "x2", date: "2026-11-12", kind: "out", category: "交通費", amount: 3000, memo: "旅行 電車", createdAt: T("2026-11-12", "09:00") },
    { id: "x3", date: "2026-11-12", kind: "out", category: "食費", amount: 2000, memo: "旅行 お土産", createdAt: T("2026-11-12", "15:00") },
    { id: "x4", date: "2026-11-13", kind: "out", category: "交通費", amount: 500, memo: "バス", createdAt: T("2026-11-13", "08:00") },
  ],
  todos: [{ id: "t1", text: "旅行の荷物", done: true, doneAt: T("2026-11-12", "18:00"), createdAt: 1 }],
  goals: [{ id: "g1", title: "TOEIC 800点", criterion: "TOEIC 800点", deadline: "2027-01-31", depth: 2, done: false, createdAt: T("2026-10-01", "09:00"),
    mandala: [{ t: "単語", c: [{ t: "単語帳1周", d: true, at: T(today, "20:00") }, null, null, null, null, null, null, null] }, null, null, null, null, null, null, null] }],
};

(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("21:30", today), { deviceScaleFactor: 1, acceptDownloads: true });
  await seed(p, DATA, "records");
  // a 日記's photo of today (⑧), and a copy of yesterday (⑩)
  await p.evaluate(async ({ today, T }) => {
    const bytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
    const open = (name, store) => new Promise((res, rej) => { const r = indexedDB.open(name, 1); r.onupgradeneeded = () => r.result.createObjectStore(store, { keyPath: store === "copies" ? "day" : "id" }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const put = (db, store, v) => new Promise((res, rej) => { const tx = db.transaction(store, "readwrite"); tx.objectStore(store).put(v); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    const ph = await open("tsumikasane-photos", "photos");
    await put(ph, "photos", { id: "jp1", jnDay: today, blob: new Blob([bytes], { type: "image/png" }), w: 1, h: 1, createdAt: 1 }); ph.close();
    const cp = await open("tsumikasane-copies", "copies");
    await put(cp, "copies", { day: "2026-11-14", savedAt: T.copy, count: 1, data: { journal: [{ id: today, date: today, text: "コピーの日記", createdAt: 1 }] } }); cp.close();
  }, { today, T: { copy: T("2026-11-14", "23:00") } });
  await p.reload(); await wait(p, 1500);

  // ② ③ 記録's search: by day, within a span
  await p.fill("#recAll", "旅行"); await wait(p, 400);
  ok(await p.isVisible("#rec7FindTools") && (await txt(p, "#recFound .rec-found-say")) === "「旅行」の記録 5 件", "② ③ the tools, while words are looked for", await txt(p, "#recFound .rec-found-say"));
  await p.click("#rec7ByDay"); await wait(p, 400);
  ok((await rows(p, "#recFound .rec7-days li.dayhead")).length === 1 && JSON.stringify(await rows(p, "#recFound .rec7-days li.rec7-kind-li")) === JSON.stringify(["日記", "食事", "家計簿", "完了したToDo"])
    && (await txt(p, "#rec7ByDay")) === "種類ごとに見る" && (await rows(p, "#recFound .rec7-days mark.rec4-hit")).length >= 4, "② by day: 11/12 with its kinds", await rows(p, "#recFound .rec7-days li"));
  await p.click("#rec7ByDay"); await wait(p, 300);
  ok((await p.locator("#recFound .rec7-days").count()) === 0 && (await rows(p, "#recFound .rec-found-head")).length === 4, "② by kind again");
  await p.fill("#recAll", "カレー"); await wait(p, 300);
  await p.click("#rec7SpanBtn"); await wait(p, 300);
  await p.fill("#rec7From", today); await p.fill("#rec7To", today); await p.dispatchEvent("#rec7To", "change"); await wait(p, 400);
  ok((await txt(p, "#recFound .rec-found-say")) === "「カレー」・11/15の記録 2 件", "③ today only", await txt(p, "#recFound .rec-found-say"));
  await p.click("#rec7SpanBtn"); await wait(p, 300);
  ok((await txt(p, "#recFound .rec-found-say")) === "「カレー」の記録 3 件" && await p.isHidden("#rec7SpanBox"), "③ put away: all", await txt(p, "#recFound .rec-found-say"));
  await p.click("#recAllClear"); await wait(p, 300);
  ok(await p.isHidden("#rec7FindTools"), "② ③ no words: no tools");

  // ④ 家計簿's list: 「旅行」 broken down
  await p.locator('#sumCards .sum-open[data-kind="money"]').click(); await wait(p, 800);
  ok(await p.isHidden("#rec7Break"), "④ whole: none");
  await p.fill("#recSearch", "旅行"); await wait(p, 400);
  ok((await txt(p, "#rec7Break")) === "内訳：交通費 3,000 円・食費 2,000 円", "④ by 費目", await txt(p, "#rec7Break"));
  // ⑤ 日記 by its weather
  await p.locator("#rec6Kinds .chip-btn", { hasText: "日記" }).click(); await wait(p, 600);
  ok(JSON.stringify(await rows(p, "#rec7Wx .chip-btn")) === JSON.stringify(["晴れ 1", "雨 3"]), "⑤ the weathers it has", await rows(p, "#rec7Wx .chip-btn"));
  await p.locator("#rec7Wx .chip-btn", { hasText: "雨" }).click(); await wait(p, 400);
  ok((await txt(p, "#recListNote")).startsWith("雨の日の記録 3 件・3 日分") && (await p.getAttribute('#rec7Wx .chip-btn[aria-pressed="true"]', "aria-pressed")) === "true", "⑤ 雨 only", await txt(p, "#recListNote"));
  await p.locator("#rec7Wx .chip-btn", { hasText: "雨" }).click(); await wait(p, 300);
  ok((await txt(p, "#recListNote")) === "5 日分・新しい順", "⑤ pressed again: all", await txt(p, "#recListNote"));
  // (その6 ② the kinds' row: the last one in reach on a phone, the row scrolling, not running past the screen)
  ok(await p.evaluate(() => { const r = document.getElementById("rec6Kinds"); return r.clientWidth <= innerWidth && r.scrollWidth > r.clientWidth; }), "the kinds' row fits the screen and scrolls");
  await p.locator("#rec6Kinds .chip-btn", { hasText: "家計簿" }).click(); await wait(p, 600);
  ok((await txt(p, '#rec6Kinds [aria-current="page"]')) === "家計簿", "the last kind pressed: 家計簿's list", await txt(p, '#rec6Kinds [aria-current="page"]'));

  // ① ⑥ ⑦ today's page
  await p.locator("#recList .rec-day-open").first().click(); await wait(p, 900);
  const years = await rows(p, "#recDayBody .rec7-years .rec-row-btn");
  ok(years.length === 2 && years[0] === "1年前・2025年11月15日（土） 1年前のきょう 公園に行った" && years[1] === "2年前・2024年11月15日（金） 2年前のきょう"
    && await p.evaluate(() => document.querySelector('#recDayBody ul[data-kind="journal"]').nextElementSibling?.classList.contains("rec7-years")), "① the years before, after its 日記", years);
  await p.click("#rec7Mark"); await wait(p, 400);
  ok((await p.getAttribute("#rec7Mark", "aria-pressed")) === "true" && JSON.stringify((await ls(p, "settings")).find((x) => x.id === "recMarks")?.days) === JSON.stringify([today]) && (await toast(p)).includes("しおりを付けました"), "⑦ しおり on today", await toast(p));
  await p.locator("#recDayBody .rec7-day-tools .link-btn").click(); await wait(p, 400);
  const line = await rows(p, "#recDayBody .rec7-time > li");
  ok(JSON.stringify(line) === JSON.stringify(["08:00 食事 朝食 パン 300 kcal", "12:15 食事 昼食 カレー 800 kcal", "12:20 家計簿 食費 カレー 900 円", "20:00 目標 「単語帳1周」を達成（「TOEIC 800点」のマス）", "21:00 日記 きょうの日記 2行目"])
    && await p.evaluate(() => [...document.querySelectorAll("#recDayBody ul[data-kind], #recDayBody ul.rec4-goals")].every((u) => u.hidden)) && (await txt(p, "#recDayBody .rec7-day-tools .link-btn")) === "種類ごとに見る", "⑥ by time, the kinds put away", line);
  await p.locator("#recDayBody .rec7-time button", { hasText: "パン" }).click(); await wait(p, 800);
  ok(await p.evaluate(() => document.getElementById("daySheet").open), "⑥ a row pressed: open to put right");
  await p.keyboard.press("Escape"); await wait(p, 800);
  await p.locator("#recDayBody .rec7-day-tools .link-btn").click(); await wait(p, 400);
  ok((await p.locator("#recDayBody .rec7-time").count()) === 0 && await p.isVisible('#recDayBody ul[data-kind="meal"]'), "⑥ by kind again");
  await p.locator("#recDayBody .rec7-years .rec-row-btn").first().click(); await wait(p, 500);
  ok((await txt(p, "#recDayTitle")) === "2025年11月15日（土）" && (await p.getAttribute("#rec7Mark", "aria-pressed")) === "false", "① pressed: that day (no しおり)", await txt(p, "#recDayTitle"));
  await p.click("#backBtn"); await wait(p, 600); await p.click("#backBtn"); await wait(p, 800);
  ok((await txt(p, '#sumCards [data-card="marks"] .rec-row-btn')).startsWith("きょう・11月15日（日） きょうの日記 2行目"), "⑦ しおりの日", await txt(p, '#sumCards [data-card="marks"]'));

  // ⑧ 日記を1冊に with its photos; ⑨ a file's records one by one
  await p.click("#recSettings"); await wait(p, 700);
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#rec7Book")]);
  const html = fs.readFileSync(await dl.path(), "utf8");
  ok(dl.suggestedFilename() === "tsumikasane-nikki-2026-11-15.html" && (html.match(/<section>/g) || []).length === 5 && html.includes("きょうの日記<br>2行目") && html.includes('<img src="data:image/png;base64,') && html.includes("（5 日・写真 1 枚）") && html.includes("晴れ 18° / 9°"), "⑧ a page: 5 days, the photo in it", { name: dl.suggestedFilename(), len: html.length });
  const file = { app: "tsumikasane", version: 1, exportedAt: new Date(T("2026-11-01", "10:00")).toISOString(), data: { journal: [{ id: today, date: today, text: "ファイルの日記", createdAt: 1 }], meals: [{ id: "f1", date: "2026-11-01", slot: "夕食", text: "ファイルのごはん", kcal: 500, createdAt: 2 }] } };
  await p.setInputFiles("#importFile", { name: "old.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) }); await wait(p, 800);
  ok(await p.isVisible("#importAsk") && await p.isVisible("#rec7File") && (await txt(p, "#rec7FileHead")) === "1件ずつ戻す（2 件）", "⑨ the file's records one by one", await txt(p, "#rec7FileHead"));
  await p.fill("#rec7FileFind", "ごはん"); await wait(p, 300);
  ok(JSON.stringify(await rows(p, "#rec7FileList li")) === JSON.stringify(["11月1日（日） 夕食 ファイルのごはん 食事・この端末にない 戻す"]), "⑨ looked for", await rows(p, "#rec7FileList li"));
  await p.locator("#rec7FileList button", { hasText: "戻す" }).click(); await wait(p, 800);
  ok((await ls(p, "meals")).some((m) => m.id === "f1") && (await ls(p, "journal")).find((j) => j.id === today)?.text === "きょうの日記\n2行目" && (await toast(p)).includes("ファイルのときに戻しました"), "⑨ that one alone, back", await toast(p));
  await p.click("#importCancel"); await wait(p, 300);
  ok(await p.isHidden("#rec7File"), "⑨ やめる: put away");
  await p.keyboard.press("Escape"); await wait(p, 800);

  // ⑩ a copy written out as a file
  await p.evaluate(() => window.__rec7.open("copies")); await wait(p, 900);
  await p.locator("#copiesList button", { hasText: "11月14日" }).first().click(); await wait(p, 900);
  const [cdl] = await Promise.all([p.waitForEvent("download"), p.click("#rec7CopyOut")]);
  const copy = JSON.parse(fs.readFileSync(await cdl.path(), "utf8"));
  ok(cdl.suggestedFilename() === "tsumikasane-copy-2026-11-14.json" && copy.app === "tsumikasane" && copy.version === 1 && copy.exportedAt === new Date(T("2026-11-14", "23:00")).toISOString() && copy.data.journal[0].text === "コピーの日記", "⑩ the copy as a file, as it was then", { name: cdl.suggestedFilename(), at: copy.exportedAt });
  ok(!p.errs.length, "no errors: " + p.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
