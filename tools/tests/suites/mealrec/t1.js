// 食事の記録画面 (the user's call, 2026-11-18: like the picture sent), as a user would: the 区分 on the page, a 区分's screen
// (its title, tiles, the past foods by 区分 or all and looked for, one put in and taken back, a new one typed and 追加,
// a photo picked, 食べなかった and its taking back, × to close)
process.env.URL0 = process.env.URL0 || "http://localhost:8765/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const T = (d, h) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const DAY = "2026-11-18", WHEN = new Date(`${DAY}T08:00:00+09:00`);
const M = (id, date, slot, text, kcal) => ({ id, date, slot, text, kcal, createdAt: T(date, slot === "朝食" ? 8 : 19) + Number(id.slice(1)) });
const DATA = { meals: [M("m1", "2026-11-16", "朝食", "トースト", 180), M("m2", "2026-11-16", "朝食", "ゆで卵", 80), M("m3", "2026-11-17", "朝食", "ヨーグルト", 90), M("m4", "2026-11-17", "夕食", "カレー", 700)], settings: [] };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const open = (p) => p.evaluate(() => document.getElementById("mealRec").open);
const rows = (p) => p.evaluate(() => [...document.querySelectorAll("#mealRecHistList .mr-h-name > span")].map((e) => e.textContent));
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.goto(process.env.URL0);
  await seed(p, DATA, "diet");
  await p.evaluate((P) => localStorage.setItem(P + "dietPart", "meal"), P); await p.reload(); await p.waitForTimeout(1000);

  // the 区分 on the page
  ok((await txt(p, "#mealSlots")) === "きょうの記録 朝食 まだ記録していません 昼食 まだ記録していません 夕食 まだ記録していません 間食 まだ記録していません", "the 区分", await txt(p, "#mealSlots"));
  // 朝食's screen: the title, the 区分, the tiles, 朝食's past foods, 0 kcal and 食べなかった
  await p.click('#mealSlots button[data-slot="朝食"]'); await p.waitForTimeout(400);
  ok(await open(p) && (await txt(p, "#mealRecTitle")) === "11/18（水） 朝食の記録" && (await p.getAttribute('#mealRecSlots button:has-text("朝食")', "aria-pressed")) === "true", "朝食's screen");
  ok((await txt(p, "#mealRecTiles")) === "写真を撮る 画像を選ぶ 成分表示から よく食べる いつもの組み合わせ 手作り料理" && await p.isVisible("#mealText") && !(await p.isVisible("#mealKcal")) && (await p.getAttribute("#mealText", "placeholder")) === "料理名・食材名で検索", "the search and the tiles", await txt(p, "#mealRecTiles"));
  ok(JSON.stringify(await rows(p)) === '["ヨーグルト","ゆで卵","トースト"]' && (await txt(p, "#mealRecFoot")) === "0 kcal 食べなかった" && await p.isVisible("#mealRecBulk"), "朝食's past foods, the bottom", [await rows(p), await txt(p, "#mealRecFoot")]);
  // every past food, then looked for
  await p.click('#mealRecHist .mr-h-tab:has-text("ぜんぶの履歴")'); await p.waitForTimeout(200);
  ok(JSON.stringify(await rows(p)) === '["カレー","ヨーグルト","ゆで卵","トースト"]', "every past food", await rows(p));
  await p.click("#mealRecHist .mr-h-find"); await p.waitForTimeout(200);
  await p.fill("#mealRecHist .mr-h-q", "カ"); await p.waitForTimeout(200);
  ok(JSON.stringify(await rows(p)) === '["カレー"]', "looked for", await rows(p));
  await p.fill("#mealRecHist .mr-h-q", "パン"); await p.waitForTimeout(200);
  ok((await txt(p, "#mealRecHistList")) === "見つかりませんでした。", "none found");
  await p.fill("#mealRecHist .mr-h-q", "カ"); await p.waitForTimeout(200);
  // カレー put in 朝食 at a press; what it has, 700 kcal and 記録をおえる; the toast over the screen, 元に戻す
  await p.click('#mealRecHist button[aria-label="「カレー」を朝食に追加"]'); await p.waitForTimeout(400);
  let ms = (await ls(p, "meals")).filter((m) => m.date === DAY);
  ok(ms.length === 1 && ms[0].text === "カレー" && ms[0].slot === "朝食" && ms[0].kcal === 700, "put in", ms);
  ok((await txt(p, "#mealRecDone")) === "この朝食に入れたもの カレー 700 kcal" && (await txt(p, "#mealRecFoot")) === "700 kcal 記録をおえる", "what 朝食 has", [await txt(p, "#mealRecDone"), await txt(p, "#mealRecFoot")]);
  ok(await p.evaluate(() => document.getElementById("status").parentElement.id === "mealRec") && await p.isVisible(".toast-undo"), "the toast over the screen");
  await p.click(".toast-undo >> visible=true"); await p.waitForTimeout(400);
  ok(!(await ls(p, "meals")).some((m) => m.date === DAY) && (await txt(p, "#mealRecFoot")) === "0 kcal 食べなかった", "taken back");
  // a new one typed: the fields shown, the bottom 追加
  await p.fill("#mealText", "バナナ"); await p.waitForTimeout(150);
  ok(await p.isVisible("#mealKcal") && (await txt(p, "#mealRecFoot")) === "0 kcal 追加" && !(await p.isVisible("#mealRecBulk")), "typing: the fields and 追加", await txt(p, "#mealRecFoot"));
  await p.fill("#mealKcal", "90"); await p.click("#mealRecAdd"); await p.waitForTimeout(400);
  ms = (await ls(p, "meals")).filter((m) => m.date === DAY);
  ok(ms.length === 1 && ms[0].text === "バナナ" && ms[0].kcal === 90 && ms[0].slot === "朝食" && (await p.inputValue("#mealText")) === "" && (await txt(p, "#mealRecFoot")) === "90 kcal 記録をおえる" && !(await p.isVisible("#mealKcal")), "追加", [ms, await txt(p, "#mealRecFoot")]);
  // a photo picked: the field shown with it
  const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.click('#mealRecTiles button[data-tile="pic"]')]);
  await fc.setFiles({ name: "a.png", mimeType: "image/png", buffer: PNG }); await p.waitForTimeout(800);
  ok(await p.isVisible("#dt4PhotoField img") && (await txt(p, "#mealRecFoot")) === "90 kcal 追加", "a photo with it");
  await p.click('#dt4PhotoField button:has-text("外す")'); await p.waitForTimeout(300);
  ok((await txt(p, "#mealRecFoot")) === "90 kcal 記録をおえる", "the photo taken off");
  // 昼食: 食べなかった, the screen closed, the page says so; taken back
  await p.click('#mealRecSlots button:has-text("昼食")'); await p.waitForTimeout(300);
  ok((await txt(p, "#mealRecHist .mr-h-tab")) === "昼食の履歴" && JSON.stringify(await rows(p)) === '["カレー"]', "the tab and the words kept", await rows(p));
  await p.click("#mealRecHist .mr-h-find"); await p.click('#mealRecHist .mr-h-tab:has-text("昼食の履歴")'); await p.waitForTimeout(200);
  ok((await txt(p, "#mealRecTitle")) === "11/18（水） 昼食の記録" && JSON.stringify(await rows(p)) === "[]" && (await txt(p, "#mealRecHistList")) === "履歴がありません。" && (await txt(p, "#mealRecFoot")) === "0 kcal 食べなかった", "昼食's screen", await txt(p, "#mealRecFoot"));
  await p.click('#mealRecFoot button:has-text("食べなかった")'); await p.waitForTimeout(400);
  const bd = (await ls(p, "bodyDays")).find((x) => x.id === DAY);
  ok(!(await open(p)) && JSON.stringify(bd?.skipMeal) === '["昼食"]' && /昼食 食べなかった/.test(await txt(p, "#mealSlots")) && /朝食 バナナ 90 kcal/.test(await txt(p, "#mealSlots")), "食べなかった", [bd, await txt(p, "#mealSlots")]);
  await p.click('#mealSlots button[data-slot="昼食"]'); await p.waitForTimeout(300);
  ok((await txt(p, "#mealRecFoot")) === "0 kcal 「食べなかった」を取り消す", "its taking back offered");
  await p.click('#mealRecFoot button:has-text("取り消す")'); await p.waitForTimeout(400);
  ok(!((await ls(p, "bodyDays")).find((x) => x.id === DAY)?.skipMeal) && (await txt(p, "#mealRecFoot")) === "0 kcal 食べなかった", "taken back");
  // × closes; the toast at home again
  await p.click("#mealRecClose"); await p.waitForTimeout(300);
  ok(!(await open(p)) && await p.evaluate(() => document.getElementById("status").parentElement.id !== "mealRec"), "× closes, the toast at home");
  // a page left closes it
  await p.click('#mealSlots button[data-slot="夕食"]'); await p.waitForTimeout(300);
  await p.evaluate(() => { location.hash = "#home"; }); await p.waitForTimeout(300);
  ok(!(await open(p)), "another page: closed");

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
