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
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const pick = (p) => p.setInputFiles("#jn2PhotoFile", { name: "a.png", mimeType: "image/png", buffer: PNG });
async function open(b, when) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "journal"); await p.waitForTimeout(1000);
  return p;
}
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-14T21:00:00+09:00");

  // ③ the day's weather: shown before anything is written, kept with it once it is
  ok((await txt(p, "#jn2Wx")) === "晴れ18°/9°（書くと日記に残ります）", "③ today's weather, to be kept", await txt(p, "#jn2Wx"));
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
  await p.click("#jn2Bullet"); await p.waitForTimeout(150);
  ok((await val(p)).endsWith("\n・メモ") && (await p.evaluate(() => document.activeElement.id)) === "journalText", "⑤ the button: ・ at the head of the line, the field kept", await val(p));
  await p.click("#jn2Bullet"); await p.waitForTimeout(150);
  ok((await val(p)).endsWith("\nメモ"), "⑤ pressed again: taken off", await val(p));
  ok(await p.evaluate(() => { const t = document.getElementById("journalText"); return t.selectionStart === t.value.length; }), "⑤ the caret where it was");

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

  // ③ kept as it is saved; ② ★ for today
  const e = await H(p, "entry", D.DAY);
  ok(e.wx && e.wx.word === "晴れ" && e.wx.hi === 18 && e.wx.lo === 9 && e.text.startsWith("きょうのこと"), "③ kept with the 日記", e);
  ok((await txt(p, "#jn2Wx")) === "晴れ18°/9°", "③ shown as kept", await txt(p, "#jn2Wx"));
  ok(await shown(p, "#jn2Fav") && (await txt(p, "#jn2Fav")) === "☆お気に入り", "② ☆ once written", await txt(p, "#jn2Fav"));
  await p.click("#jn2Fav"); await p.waitForTimeout(500);
  ok((await H(p, "entry", D.DAY)).fav === true && (await txt(p, "#jn2Fav")) === "★お気に入り", "② ★", await H(p, "entry", D.DAY));
  const favs = await p.evaluate(() => [...document.querySelectorAll("#jn2FavList .jn-back-head strong")].map((x) => x.textContent));
  ok(favs.join() === "きょう,きのう", "② the list, the latest first", favs);
  await undo(p);
  ok((await H(p, "entry", D.DAY)).fav === false, "② 元に戻す", await H(p, "entry", D.DAY));

  // ① 写真: one put in, large at a press, deleted (twice) and back; three at most
  await pick(p); await p.waitForTimeout(800);
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
  await pick(p); await p.waitForTimeout(600); await pick(p); await p.waitForTimeout(600);
  ok((await p.locator("#jn2Photos .td-thumb").count()) === 3 && !(await shown(p, "#jn2PhotoPick")), "① three, then no more");

  // ④ 広げて書く
  await p.click("#jn2Wide"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => getComputedStyle(document.getElementById("jnCard")).position === "fixed" && document.activeElement.id === "journalText"), "④ over the screen, the field in use");
  ok(await shown(p, "#jn2FullDone"), "④ 完了 shows");
  await p.screenshot({ path: "journal2-full.png" });
  await p.click("#jn2FullDone"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => getComputedStyle(document.getElementById("jnCard")).position !== "fixed"), "④ 完了: back");

  // ⑦ 月の日記を読む
  ok((await txt(p, "#jn2Read")).startsWith("5日"), "⑦ the month's days", await txt(p, "#jn2Read"));
  await p.locator("#jn2Read button", { hasText: "続けて読む" }).click(); await p.waitForTimeout(300);
  const arts = await p.evaluate(() => [...document.querySelectorAll("#jn2Read .jn2-day")].map((a) => a.querySelector(".jn2-day-date").textContent + (a.querySelector(".jn2-star") ? "★" : "") + (a.querySelector(".jn2-wx-in") ? "晴" : "") + a.querySelectorAll(".td-thumb").length));
  ok(arts.join() === "11月1日（日）0,11月10日（火）0,11月12日（木）0,11月13日（金）★0,11月14日（土）晴3", "⑦ the first day first, ★, weather, photos", arts);
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

  // ⑨ 思い出のお知らせ and ⑩ のぞき見防止, under the gear
  await p.click("#jnSettings"); await p.waitForTimeout(800);
  await p.click("#jn2MemOn"); await p.waitForTimeout(300);
  const st = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "settings")).find((s) => s.id === "jnMemory"), P);
  ok(st && st.on === true && st.at === "08:00", "⑨ on", st);
  const al = await H(p, "alarms", Date.parse("2026-11-14T21:00:00+09:00"));
  ok(al.length === 0, "⑨ none tomorrow on (no 日記 a year before 11/15)", al);
  const al2 = await H(p, "alarms", Date.parse("2026-11-14T06:00:00+09:00"));
  ok(al2.length === 1 && al2[0].title === "1年前のきょう" && al2[0].body.startsWith("1年前のきょう。紅葉") && al2[0].url === "./#journal", "⑨ today's at 8:00 (asked at 6:00)", al2);
  await p.click("#jn2BlurOn"); await p.waitForTimeout(300);
  const al3 = await H(p, "alarms", Date.parse("2026-11-14T06:00:00+09:00"));
  ok(al3[0]?.body === "1年前のきょうの日記があります", "⑩ with のぞき見防止: no words in it", al3);
  await p.click("#sheetDone"); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.getElementById("sec-journal").classList.contains("jn2-blur")) && (await txt(p, "#jn2Veil")).includes("見る"), "⑩ blurred, 見る");
  ok(await p.evaluate(() => getComputedStyle(document.querySelector("#jnBack .jn-snip, #jn2FavList .jn-snip")).filter.includes("blur")), "⑩ the readbacks blurred");
  await p.locator("#jn2Veil button", { hasText: "見る" }).click(); await p.waitForTimeout(200);
  ok(!(await p.evaluate(() => document.getElementById("sec-journal").classList.contains("jn2-blur"))), "⑩ 見る: shown");
  await p.screenshot({ path: "journal2-cards.png", fullPage: true });

  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails} failed` : "ALL OK");
})().catch((e) => { console.log("FAIL " + e.message); process.exit(1); });
