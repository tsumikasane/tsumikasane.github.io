// 記録 その8 ①〜⑩
const { chromium } = require("playwright");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
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
const DATA = {
  journal: [
    { id: today, date: today, text: "きょうの日記 #英語 を勉強", createdAt: T(today, "21:00") },
    { id: "2026-11-10", date: "2026-11-10", text: "雨の日記 #英語", createdAt: T("2026-11-10", "21:00") },
  ],
  meals: [
    { id: "m1", date: today, slot: "昼食", text: "カレー", kcal: 800, createdAt: T(today, "12:15") },
    { id: "m4", date: "2026-11-14", slot: "昼食", text: "ラーメン", kcal: 700, createdAt: T("2026-11-14", "12:00") },
  ],
  workouts: [
    { id: "w1", date: "2026-11-10", type: "ランニング", minutes: 30, kcal: 200, createdAt: T("2026-11-10", "07:00") },
    { id: "w2", date: today, type: "ランニング", minutes: 20, createdAt: T(today, "07:00") },
    { id: "w3", date: today, type: "筋トレ", exercise: "ベンチプレス", createdAt: T(today, "08:00") },
  ],
  study: [{ id: "s1", date: "2026-11-10", minutes: 60, note: "単語", createdAt: 1 }, { id: "s2", date: today, minutes: 90, note: "文法", createdAt: 2 }],
  expenses: [
    { id: "x1", date: today, kind: "out", category: "食費", amount: 900, memo: "カレー #外食", createdAt: T(today, "12:20") },
    { id: "x2", date: "2026-11-10", kind: "in", category: "給料", amount: 50000, createdAt: T("2026-11-10", "10:00") },
  ],
  weights: [{ id: today, kg: 60.2, createdAt: 1 }, { id: "2026-11-10", kg: 60.8, createdAt: 1 }],
  todos: [{ id: "t1", text: "英語の宿題 #英語", done: true, doneAt: T(today, "18:00"), createdAt: 1 }],
  deleted: [
    // a 日記 written over (the one here now differs), a meal of today deleted yesterday, a 家計簿 of another day
    { id: "journal/2026-11-10", store: "journal", rid: "2026-11-10", at: T(today, "09:00"), data: { id: "2026-11-10", date: "2026-11-10", text: "雨の日記 前の内容 #英語", createdAt: 1 } },
    { id: "meals/m9", store: "meals", rid: "m9", at: T("2026-11-15", "09:00"), data: { id: "m9", date: today, slot: "夕食", text: "消したごはん", kcal: 500, createdAt: T(today, "19:00") } },
    { id: "expenses/x9", store: "expenses", rid: "x9", at: T("2026-11-15", "10:00"), data: { id: "x9", date: "2026-11-12", kind: "out", category: "日用品", amount: 300, memo: "消した支出", createdAt: 1 } },
  ],
};
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("21:30", today), { deviceScaleFactor: 1, acceptDownloads: true });
  await seed(p, DATA, "records");
  // ① what is kept on this device alone: 日記's, からだ's and a ToDo's photos (one of a ToDo not here), a plan's, a shift
  // table's, a ToDo's file
  await p.evaluate(async ({ PNG, today }) => {
    const png = () => new Blob([Uint8Array.from(atob(PNG), (c) => c.charCodeAt(0))], { type: "image/png" });
    const open = (name, store) => new Promise((res, rej) => { const r = indexedDB.open(name, 1); r.onupgradeneeded = () => r.result.createObjectStore(store, { keyPath: "id" }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const put = async (name, store, xs) => { const db = await open(name, store); await new Promise((res, rej) => { const tx = db.transaction(store, "readwrite"); for (const x of xs) tx.objectStore(store).put(x); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); db.close(); };
    const now = Date.now();
    await put("tsumikasane-photos", "photos", [{ id: "jp1", jnDay: today, blob: png(), w: 1, h: 1, createdAt: now }, { id: "bp1", date: today, blob: png(), w: 1, h: 1, createdAt: now },
      { id: "tp1", todoId: "t1", blob: png(), createdAt: now }, { id: "tp2", todoId: "tX", blob: png(), createdAt: now }]);
    await put("tsumikasane-plan-photos", "photos", [{ id: "pp1", planId: "e1", blob: png(), createdAt: now }]);
    await put("tsumikasane-baito-photos", "photos", [{ id: "sp1", ym: "2026-11", at: now, blob: png() }]);
    await put("tsumikasane-files", "files", [{ id: "f1", todoId: "t1", name: "メモ.pdf", type: "application/pdf", size: 9, blob: new Blob(["%PDF-1.4\n"], { type: "application/pdf" }), createdAt: now }]);
  }, { PNG, today });
  await p.reload(); await wait(p, 1200);

  // ⑦ the tags, as a card; pressed, looked for
  ok(JSON.stringify(await rows(p, '#sumCards [data-card="tags"] .rec8-tags .chip-btn')) === JSON.stringify(["#英語 3", "#外食 1"]), "⑦ the tags, the most first", await rows(p, '#sumCards [data-card="tags"] .chip-btn'));
  await p.locator('#sumCards [data-card="tags"] .chip-btn', { hasText: "#英語" }).click(); await wait(p, 500);
  ok((await p.inputValue("#recAll")) === "#英語" && (await txt(p, "#recFound .rec-found-say")) === "「#英語」の記録 3 件", "⑦ pressed: looked for in all the records", await txt(p, "#recFound .rec-found-say"));
  // ⑥ the first and latest days found
  ok((await txt(p, "#recFound .rec8-span")) === "はじめて 11月10日（火）・いちばん最近 11月16日（月）・2 日に", "⑥ the first and latest days", await txt(p, "#recFound .rec8-span"));
  await p.locator("#recFound .rec8-span .rec8-day").first().click(); await wait(p, 800);
  ok((await tab(p)) === "recday" && (await txt(p, "#recDayTitle")) === "11月10日（火）", "⑥ the first day pressed: that day whole", await txt(p, "#recDayTitle"));
  await p.click("#backBtn"); await wait(p, 700);
  // ⑩ any of the words
  await p.fill("#recAll", "カレー ラーメン"); await wait(p, 400);
  ok((await txt(p, "#recFound .rec-found-say")) === "「カレー ラーメン」に合う記録はありません。" && await p.isVisible("#rec8Any") && (await p.getAttribute("#rec8Any", "aria-pressed")) === "false", "⑩ both words: none; どれかをふくむ there", await txt(p, "#recFound .rec-found-say"));
  await p.click("#rec8Any"); await wait(p, 400);
  ok((await txt(p, "#recFound .rec-found-say")) === "「カレー」か「ラーメン」の記録 3 件" && (await p.getAttribute("#rec8Any", "aria-pressed")) === "true"
    && await p.evaluate((P) => localStorage.getItem(P + "recFindAny"), P) === "1", "⑩ any of them, kept on this device", await txt(p, "#recFound .rec-found-say"));
  await p.fill("#recAll", "カレー ラーメン -外食"); await wait(p, 400);
  ok((await txt(p, "#recFound .rec-found-say")) === "「カレー」か「ラーメン」（「外食」をのぞく）の記録 2 件" && (await rows(p, "#recFound mark.rec4-hit")).length >= 2, "⑩ with a word left out, the words marked", await txt(p, "#recFound .rec-found-say"));
  await p.fill("#recAll", "カレー"); await wait(p, 300);
  ok(await p.isHidden("#rec8Any"), "⑩ one word: no choice");
  await p.fill("#recAll", "カレー ラーメン"); await wait(p, 300);
  await p.click("#rec8Any"); await wait(p, 300);
  ok((await p.getAttribute("#rec8Any", "aria-pressed")) === "false" && (await txt(p, "#recFound .rec-found-say")) === "「カレー ラーメン」に合う記録はありません。", "⑩ pressed again: all of them");
  await p.click("#recAllClear"); await wait(p, 300);

  // ⑨ ⑧ ⑩ 運動's list: the totals so far, the firsts marked, any of the words
  await p.locator('#sumCards .sum-open[data-kind="workout"]').click(); await wait(p, 800);
  ok(await p.isVisible("#rec8CumBtn") && (await p.locator("#recList .rec8-cum").count()) === 0, "⑨ off at first");
  await p.click("#rec8CumBtn"); await wait(p, 400);
  ok(JSON.stringify(await rows(p, "#recList .rec8-cum")) === JSON.stringify(["ここまで 50 分", "ここまで 30 分"]) && (await p.getAttribute("#rec8CumBtn", "aria-pressed")) === "true", "⑨ each day's total so far", await rows(p, "#recList .rec8-cum"));
  const firsts = await p.evaluate(() => [...document.querySelectorAll("#recList .rec8-first")].map((x) => x.closest("[data-edit]").dataset.edit).sort());
  ok(JSON.stringify(firsts) === JSON.stringify(["w1", "w3"]), "⑧ the firsts marked (ランニング, 筋トレ・ベンチプレス)", firsts);
  await p.fill("#recSearch", "ランニング 筋トレ"); await wait(p, 400);
  ok((await rows(p, "#recList .rec-what")).length === 0 && await p.isVisible("#rec8AnyList"), "⑩ in a list: both, none", await txt(p, "#recListNote"));
  await p.click("#rec8AnyList"); await wait(p, 400);
  ok((await txt(p, "#recListNote")).startsWith("「ランニング」か「筋トレ」の記録 3 件・2 日分") && (await rows(p, "#recList .rec-what")).length === 3, "⑩ any of them", await txt(p, "#recListNote"));
  await p.fill("#recSearch", "ランニング"); await wait(p, 400);
  ok(JSON.stringify(await rows(p, "#recList .rec8-cum")) === JSON.stringify(["ここまで 50 分", "ここまで 30 分"]), "⑨ of what is found", await rows(p, "#recList .rec8-cum"));
  await p.fill("#recSearch", "ランニング 筋トレ"); await wait(p, 300);
  await p.click("#rec8AnyList"); await wait(p, 300); // (back to all of them)
  await p.fill("#recSearch", ""); await wait(p, 300);
  await p.locator("#rec6Kinds .chip-btn", { hasText: "家計簿" }).click(); await wait(p, 600);
  ok(JSON.stringify(await rows(p, "#recList .rec8-cum")) === JSON.stringify(["ここまで 支出 900 円・収入 50,000 円", "ここまで 収入 50,000 円"]), "⑨ 家計簿: out and in", await rows(p, "#recList .rec8-cum"));
  await p.locator("#rec6Kinds .chip-btn", { hasText: "からだ" }).click(); await wait(p, 600);
  ok(await p.isHidden("#rec8CumBtn"), "⑨ からだ: none");
  await p.locator("#rec6Kinds .chip-btn", { hasText: "運動" }).click(); await wait(p, 600);

  // ⑧ ⑤ ④ today's page
  await p.locator("#recList .rec-day-open").first().click(); await wait(p, 900);
  ok((await txt(p, "#recDayBody .rec8-firsts")) === "この日はじめて 筋トレ（運動）・ベンチプレス（運動）・食費（家計簿）" && await p.evaluate(() => { const f = document.querySelector("#recDayBody .rec8-firsts"); let x = f.previousElementSibling; while (x && (x.classList.contains("rec4-photos") || x.classList.contains("rec9-media"))) x = x.previousElementSibling; return !x; }), "⑧ この日はじめて, at the top (under the day's photos)", await txt(p, "#recDayBody .rec8-firsts"));
  ok(JSON.stringify(await rows(p, "#recDayBody .rec8-day-trash li")) === JSON.stringify(["夕食 消したごはん 食事・きのう削除・あと 29 日 戻す"]) && await p.evaluate(() => document.querySelector("#recDayBody .rec8-day-trash").nextElementSibling?.textContent === "この日に書く"), "⑤ the day's records deleted, before この日に書く", await rows(p, "#recDayBody .rec8-day-trash li"));
  await p.locator("#recDayBody .rec8-day-trash li button", { hasText: "戻す" }).click(); await wait(p, 600);
  ok((await rows(p, '#recDayBody ul[data-kind="meal"] li')).some((r) => r.includes("消したごはん")) && (await p.locator("#recDayBody .rec8-day-trash").count()) === 0 && (await toast(p)).includes("食事を戻しました"), "⑤ 戻す: back on its day", await toast(p));
  ok(await p.isHidden("#rec8With"), "④ put away at first");
  await p.click("#rec8WithBtn"); await wait(p, 300);
  ok((await txt(p, "#rec8WithTable")) === "くらべる日を選んでください。" && (await p.getAttribute("#rec8WithBtn", "aria-expanded")) === "true", "④ opened: a day to choose", await txt(p, "#rec8WithTable"));
  await p.click("#rec8WithPrev"); await wait(p, 300);
  const t1 = await rows(p, "#rec8WithTable tr");
  ok(t1[0] === "記録 11/16（月） 11/14（土） 差" && t1.includes("食事 2 回 1 回 +1 回") && t1.includes("摂取 1,300 kcal 700 kcal +600 kcal") && t1.includes("勉強 1 時間 30 分 — +1 時間 30 分") && t1.includes("体重 60.2 kg —"), "④ 前の記録の日 (11/14) beside it", t1);
  await p.fill("#rec8WithDay", "2026-11-10"); await p.dispatchEvent("#rec8WithDay", "change"); await wait(p, 300);
  const t2 = await rows(p, "#rec8WithTable tr");
  ok(t2.includes("体重 60.2 kg 60.8 kg −0.6 kg") && t2.includes("収入 — 50,000 円 −50,000 円") && t2.includes("運動の時間 20 分 30 分 −10 分"), "④ a day chosen: the levels' gaps, a sum's", t2);
  await p.locator("#rec8WithTable .rec8-with-go button").click(); await wait(p, 600);
  ok((await txt(p, "#recDayTitle")) === "11月10日（火）" && (await rows(p, "#rec8WithTable tr"))[0] === "記録 11/10（火） 11/16（月） 差", "④ 入れかえる: that day, beside the one before", await rows(p, "#rec8WithTable tr"));
  await p.click("#rec8WithClose"); await wait(p, 300);
  ok(await p.isHidden("#rec8With"), "④ とじる");
  await p.screenshot({ path: path.join(os.tmpdir(), "rec8-day.png"), fullPage: true });

  // ② ③ 最近削除した項目
  await p.click("#backBtn"); await wait(p, 600); await p.click("#backBtn"); await wait(p, 800);
  await p.click("#trashBtn"); await wait(p, 800);
  ok(JSON.stringify(await rows(p, "#rec8TrashKinds .chip-btn")) === JSON.stringify(["ぜんぶ 2", "日記 1", "家計簿 1"]), "③ the kinds", await rows(p, "#rec8TrashKinds .chip-btn"));
  await p.locator("#rec8TrashKinds .chip-btn", { hasText: "日記" }).click(); await wait(p, 400);
  ok((await rows(p, "#trashList li[data-key]")).length === 1 && (await txt(p, "#trashNote")).startsWith("日記・1 件") && await p.isHidden("#trashFoot"), "③ 日記 alone, すべて完全に削除 away", await txt(p, "#trashNote"));
  await p.locator("#trashList .rec8-cmp-btn").click(); await wait(p, 400);
  ok((await txt(p, "#trashList .rec8-cmp")).startsWith("削除した内容 雨の日記 前の内容 #英語 いまの日記 雨の日記 #英語")
    && JSON.stringify(await p.evaluate(() => [...document.querySelectorAll("#trashList .rec8-cmp mark")].map((m) => m.className + ":" + m.textContent))) === JSON.stringify(["rec8-del:前の内容 "]), "② beside what is there now, the change marked", await txt(p, "#trashList .rec8-cmp"));
  await p.locator("#trashList .rec8-cmp button", { hasText: "削除した内容に戻す" }).click(); await wait(p, 600);
  const jn = (await ls(p, "journal")).find((x) => x.id === "2026-11-10");
  ok(jn?.text === "雨の日記 前の内容 #英語" && (await toast(p)).includes("いまあったほうは「最近削除した項目」に移しました") && (await txt(p, "#trashList li[data-key]")).includes("雨の日記 #英語"), "② 戻す: the two change places", jn);
  await p.locator("#rec8TrashKinds .chip-btn", { hasText: "ぜんぶ" }).click(); await wait(p, 300);
  ok((await rows(p, "#trashList li[data-key]")).length === 2 && await p.isVisible("#trashFoot"), "③ ぜんぶ again");

  // ① 写真とファイル: written out as a ZIP, then read back on a device without them
  await p.click("#backBtn"); await wait(p, 700);
  await p.click("#recSettings"); await wait(p, 900);
  ok((await txt(p, "#rec8PhFoot")).startsWith("いまこの端末に 7 個（およそ 1 KB）。"), "① how many are kept here", await txt(p, "#rec8PhFoot"));
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#rec8PhOut")]);
  const zipPath = path.join(os.tmpdir(), "rec8-photos.zip");
  await dl.saveAs(zipPath);
  const listed = JSON.parse(execFileSync("python3", ["-c", "import sys, zipfile, json; z = zipfile.ZipFile(sys.argv[1]); print(json.dumps({'bad': z.testzip(), 'names': z.namelist(), 'list': json.loads(z.read('tsumikasane-photos.json'))}))", zipPath]).toString());
  ok(dl.suggestedFilename() === `tsumikasane-photos-${today}.zip` && listed.bad === null && listed.names.length === 8 && listed.names.includes(`日記の写真/${today}_jp1.png`) && listed.names.includes(`ToDoのファイル/${today}_メモ.pdf`)
    && listed.names.includes("シフト表の写真/2026-11_sp1.png") && listed.list.items.length === 7 && listed.list.items.every((it) => !("blob" in it.rec) && it.blobs.blob), "① a ZIP any computer opens: each a file, and the list", listed.names);
  ok((await toast(p)).includes("「tsumikasane-photos-2026-11-16.zip」（写真とファイル 7 個）を書き出しました"), "① said", await toast(p));
  // (another device: none of them)
  await p.evaluate(async () => {
    for (const [name, store] of [["tsumikasane-photos", "photos"], ["tsumikasane-plan-photos", "photos"], ["tsumikasane-baito-photos", "photos"], ["tsumikasane-files", "files"]]) {
      const db = await new Promise((res) => { const r = indexedDB.open(name); r.onsuccess = () => res(r.result); });
      await new Promise((res) => { const tx = db.transaction(store, "readwrite"); tx.objectStore(store).clear(); tx.oncomplete = res; }); db.close();
    }
  });
  await p.setInputFiles("#rec8PhFile", zipPath); await wait(p, 800);
  const ask = await txt(p, "#rec8PhAskText");
  ok(await p.isVisible("#rec8PhAsk") && ask.startsWith("このファイルの 7 個のうち、この端末にない 6 個（") && ask.includes("日記の写真 1") && ask.includes("ToDoのファイル 1") && ask.includes("もとの記録（ToDo・食事・目標）がこの端末にない 1 個は戻しません"), "① read: asked first, the one without its ToDo left out", ask);
  await p.click("#rec8PhGo"); await wait(p, 1200);
  const back = await p.evaluate(async () => {
    const all = async (name, store) => { const db = await new Promise((res) => { const r = indexedDB.open(name); r.onsuccess = () => res(r.result); }); const xs = await new Promise((res) => { const r = db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => res(r.result); }); db.close(); return xs; };
    const ph = await all("tsumikasane-photos", "photos"), f = (await all("tsumikasane-files", "files"))[0];
    return { ph: ph.map((x) => `${x.id}:${x.blob.type}:${x.blob.size}`).sort(), plan: (await all("tsumikasane-plan-photos", "photos")).map((x) => x.planId), shift: (await all("tsumikasane-baito-photos", "photos")).map((x) => x.ym), file: f && `${f.name}:${f.todoId}:${f.blob.type}:${await f.blob.text()}` };
  });
  ok(JSON.stringify(back.ph) === JSON.stringify(["bp1:image/png:70", "jp1:image/png:70", "tp1:image/png:70"]) && back.plan[0] === "e1" && back.shift[0] === "2026-11" && back.file === "メモ.pdf:t1:application/pdf:%PDF-1.4\n", "① back as they were", back);
  ok((await txt(p, "#rec8PhAskText")) === "写真とファイル 6 個を戻しました。アプリを開き直すと、それぞれのページに出ます。" && (await txt(p, "#rec8PhGo")) === "開き直す", "① said, with 開き直す", await txt(p, "#rec8PhAskText"));
  await p.click("#rec8PhCancel"); await wait(p, 300);
  const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.click("#rec8PhIn")]);
  await fc.setFiles(zipPath); await wait(p, 800);
  ok(await p.isHidden("#rec8PhAsk") && (await toast(p)).includes("もとの記録（ToDo・食事・目標）がこの端末にない 1 個は戻しません"), "① again: nothing more but the one without its ToDo", await toast(p));
  await p.setInputFiles("#rec8PhFile", { name: "x.zip", mimeType: "application/zip", buffer: Buffer.from("not a zip") }); await wait(p, 500);
  ok((await toast(p)).includes("このファイルは読み込めません"), "① not one of these: said", await toast(p));

  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
