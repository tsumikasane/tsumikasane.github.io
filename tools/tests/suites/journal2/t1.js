// 日記 その2 ①〜⑩, through the hook build at 8870 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8870/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s　 ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const shown = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return !!e && !e.closest("[hidden]") && e.getClientRects().length > 0; }, sel);
const H = (p, f, ...a) => p.evaluate(({ f, a }) => window.__jn2[f](...a), { f, a });
const val = (p) => p.inputValue("#journalText");
const undo = async (p) => { await p.locator("#status button:visible, #sheetStatus button:visible").first().click(); await p.waitForTimeout(500); };
const PNG64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
// photos already on this device (写真を付ける taken out, 2026-11-19), put in as the app kept them: { id, jnDay, blob, w, h,
// createdAt }; the page is opened again after, as it reads them once
const putPhotos = (p, days) => p.evaluate(({ days, b64 }) => new Promise((res, rej) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), r = indexedDB.open("tsumikasane-photos", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("photos", { keyPath: "id" });
  r.onerror = () => rej(r.error);
  r.onsuccess = () => {
    const tx = r.result.transaction("photos", "readwrite");
    days.forEach((d, i) => tx.objectStore("photos").put({ id: "t" + i + Math.random().toString(36).slice(2, 8), jnDay: d, blob: new Blob([bytes], { type: "image/png" }), w: 1, h: 1, createdAt: Date.now() + i }));
    tx.oncomplete = () => { r.result.close(); res(); };
    tx.onerror = () => rej(tx.error);
  };
}), { days, b64: PNG64 });
async function open(b, when) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "journal"); await p.waitForTimeout(1000);
  return p;
}
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-14T21:00:00+09:00");

  // ③ the day's weather: taken out (the user's call, 2026-11-19, tools/REMOVED.md): not shown, not kept
  ok(!(await p.$("#jn2Wx")), "③ (taken out) no weather");
  ok(!(await shown(p, "#jn2Fav")), "② no ★ before anything is written");

  // (a newline typed stays through the save after a pause: it was taken off as the field was saved)
  await p.click("#journalText");
  await p.keyboard.type("あ"); await p.keyboard.press("Enter"); await p.waitForTimeout(1800);
  ok((await val(p)) === "あ\n", "(a newline stays through the save)", await val(p));
  await p.keyboard.press("Backspace"); await p.keyboard.press("Backspace"); await p.waitForTimeout(200);

  // ⑤ 箇条書き: 改行 goes on with ・, an empty one ends the list; numbers count on
  await p.keyboard.type("きょうのこと"); await p.keyboard.press("Enter");
  await p.keyboard.type("・りんご"); await p.keyboard.press("Enter");
  ok((await val(p)) === "きょうのこと\n・りんご\n・", "⑤ ・ goes on", await val(p));
  await p.keyboard.type("みかん"); await p.keyboard.press("Enter"); await p.keyboard.press("Enter");
  ok((await val(p)) === "きょうのこと\n・りんご\n・みかん\n", "⑤ an empty ・ ends the list", await val(p));
  await p.keyboard.type("1. 起きる"); await p.keyboard.press("Enter");
  ok((await val(p)).endsWith("1. 起きる\n2. "), "⑤ 1. → 2.", await val(p));
  await p.keyboard.press("Enter");
  await p.keyboard.type("-5度だった"); await p.keyboard.press("Enter");
  ok((await val(p)).endsWith("-5度だった\n"), "⑤ -5度 is no list", await val(p));
  await p.keyboard.type("メモ");
  // ⑤'s ・ 箇条書き button: taken out (the user's call, 2026-11-19); ・ and 1. going on as 改行 is typed stay (above)
  ok(!(await p.$("#jn2Bullet")) && (await val(p)).endsWith("\nメモ"), "⑤ (taken out) no ・ 箇条書き button", await val(p));

  // ⑥ タグの候補: # and a letter offer the tags of before
  await p.keyboard.type(" #カ"); await p.waitForTimeout(200);
  const sug = await p.evaluate(() => [...document.querySelectorAll("#jn2TagSug .jn-tag")].map((b) => b.innerText.replace(/\s+/g, "")));
  ok(sug.length === 1 && sug[0] === "#カフェ1", "⑥ #カ → #カフェ", sug);
  await p.locator("#jn2TagSug .jn-tag").first().click(); await p.waitForTimeout(200);
  ok((await val(p)).endsWith("メモ #カフェ ") && !(await shown(p, "#jn2TagSug")), "⑥ put in whole, a space after", await val(p));
  await p.keyboard.type("#"); await p.waitForTimeout(200);
  const sug2 = await p.evaluate(() => [...document.querySelectorAll("#jn2TagSug .jn-tag")].map((b) => b.innerText.replace(/\s+/g, "")));
  ok(sug2.join() === "#旅行2,#カフェ1,#学校1,#友だち1", "⑥ # alone: all, the most used first", sug2);
  await p.keyboard.press("Backspace"); await p.waitForTimeout(1800);

  // ③ (taken out) saved without the weather; ② ★ for today
  const e = await H(p, "entry", D.DAY);
  ok(!("wx" in e) && e.text.startsWith("きょうのこと"), "③ (taken out) saved without the weather", e);
  ok(await shown(p, "#jn2Fav") && (await txt(p, "#jn2Fav")) === "☆お気に入り", "② ☆ once written", await txt(p, "#jn2Fav"));
  await p.click("#jn2Fav"); await p.waitForTimeout(500);
  ok((await H(p, "entry", D.DAY)).fav === true && (await txt(p, "#jn2Fav")) === "★お気に入り", "② ★", await H(p, "entry", D.DAY));
  const favs = await p.evaluate(() => [...document.querySelectorAll("#jn2FavList .jn-back-head strong")].map((x) => x.textContent));
  ok(favs.join() === "きょう,きのう", "② the list, the latest first", favs);
  await undo(p);
  ok((await H(p, "entry", D.DAY)).fav === false, "② 元に戻す", await H(p, "entry", D.DAY));

  // ① 写真: 写真を付ける (its button and file field) taken out (the user's call, 2026-11-19). One already on this device
  // still shows under the field, large at a press, deleted (twice) and back
  ok(!(await p.$("#jn2PhotoPick")) && !(await p.$("#jn2PhotoFile")), "① (taken out) no 写真を付ける");
  await putPhotos(p, [D.DAY]); await p.reload(); await p.waitForTimeout(1200);
  ok((await p.locator("#jn2Photos .td-thumb").count()) === 1, "① one under the field");
  const ph = await H(p, "photos");
  ok(ph.length === 1 && ph[0].jnDay === D.DAY && !ph[0].date && !ph[0].mealId, "① kept under the day (not as 体型 nor 食事)", ph);
  await p.click("#jn2Photos .td-thumb"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById("jn2PhotoView")?.open === true), "① large at a press");
  await p.locator("#jn2PhotoView button", { hasText: "削除" }).click(); await p.waitForTimeout(200);
  await p.locator("#jn2PhotoView button", { hasText: "もう一度押すと削除" }).click(); await p.waitForTimeout(500);
  ok((await p.locator("#jn2Photos .td-thumb").count()) === 0 && (await H(p, "photos")).length === 0, "① deleted");
  await undo(p);
  ok((await p.locator("#jn2Photos .td-thumb").count()) === 1, "① 元に戻す");
  await putPhotos(p, [D.DAY, D.DAY]); await p.reload(); await p.waitForTimeout(1200);
  ok((await p.locator("#jn2Photos .td-thumb").count()) === 3, "① three of them");

  // ④ 広げて書く: taken out (the user's call, 2026-11-19)
  ok(!(await p.$("#jn2Wide")) && !(await p.$("#jn2FullDone")), "④ (taken out) no 広げて書く");

  // ⑦ 月の日記を読む
  ok((await txt(p, "#jn2Read")).startsWith("5日"), "⑦ the month's days", await txt(p, "#jn2Read"));
  await p.locator("#jn2Read button", { hasText: "続けて読む" }).click(); await p.waitForTimeout(300);
  const arts = await p.evaluate(() => [...document.querySelectorAll("#jn2Read .jn2-day")].map((a) => a.querySelector(".jn2-day-date").textContent + (a.querySelector(".jn2-star") ? "★" : "") + (a.querySelector(".jn2-wx-in") ? "晴" : "") + a.querySelectorAll(".td-thumb").length));
  ok(arts.join() === "11月1日（日）0,11月10日（火）0,11月12日（木）0,11月13日（金）★0,11月14日（土）3", "⑦ the first day first, ★, photos (no weather: taken out)", arts);
  await p.locator("#jn2Read .jn2-day-date", { hasText: "11月12日" }).click(); await p.waitForTimeout(600);
  ok((await val(p)).startsWith("カフェで友だち"), "⑦ a date opens it", await val(p));
  await p.click("#jn2ReadNav [aria-label=前の月]"); await p.waitForTimeout(200);
  ok((await txt(p, "#jn2ReadNav")).includes("2026年10月") && (await p.locator("#jn2Read .jn2-day").count()) === 1, "⑦ ‹: October");

  // ⑧ よく書いた言葉
  const words = await p.evaluate(() => [...document.querySelectorAll("#jn2Words .jn-tag")].map((b) => b.innerText.replace(/\s+/g, "")));
  ok(words.join() === "カフェ3,発表2", "⑧ the words, by days (a #タグ is not one)", words);
  await p.locator("#jn2Words .jn-tag", { hasText: "発表" }).click(); await p.waitForTimeout(200);
  const wl = await p.evaluate(() => [...document.querySelectorAll("#jn2WordList .jn-snip")].map((x) => x.textContent));
  ok(wl.length === 2 && wl[0].includes("発表の練習") && wl[1].includes("発表の準備"), "⑧ the days with it", wl);

  // ⑨ 思い出のお知らせ and ⑩ のぞき見防止: taken out (the user's call, 2026-11-19). Even left on from before (the setting
  // jnMemory and this device's jnBlur, kept), no notification for the 日記 a year before today, nothing blurred, and
  // neither under the gear
  await p.evaluate((P) => { const s = JSON.parse(localStorage.getItem(P + "settings") || "[]"); s.push({ id: "jnMemory", on: true, at: "08:00", updatedAt: 1 }); localStorage.setItem(P + "settings", JSON.stringify(s)); localStorage.setItem(P + "jnBlur", "1"); }, P);
  await p.reload(); await p.waitForTimeout(1200);
  ok((await H(p, "alarms", Date.parse("2026-11-14T06:00:00+09:00"))).length === 0, "⑨ (taken out) no 1年前のきょう notification, though left on", await H(p, "alarms", Date.parse("2026-11-14T06:00:00+09:00")));
  ok(!(await p.evaluate(() => document.getElementById("sec-journal").classList.contains("jn2-blur"))) && !(await p.$("#jn2Veil"))
    && !(await p.evaluate(() => [...document.querySelectorAll("#jnBack .jn-snip, #jn2FavList .jn-snip")].some((x) => getComputedStyle(x).filter.includes("blur")))), "⑩ (taken out) nothing blurred, though left on");
  await p.click("#jnSettings"); await p.waitForTimeout(800);
  ok(!(await p.$("#jn2MemOn")) && !(await p.$("#jn2MemAt")) && !(await p.$("#jn2BlurOn")), "⑨⑩ (taken out) not under the gear");
  await p.click("#sheetDone"); await p.waitForTimeout(700);
  await p.screenshot({ path: "journal2-cards.png", fullPage: true });

  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails} failed` : "ALL OK");
})().catch((e) => { console.log("FAIL " + e.message); process.exit(1); });
