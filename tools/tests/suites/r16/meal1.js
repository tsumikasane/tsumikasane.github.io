// 食事 ①〜⑩
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed } = require("./lib");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10";
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
let i = 0;
const M = (date, slot, text, kcal, extra = {}) => ({ id: "m" + ++i, date, slot, text, kcal, createdAt: T(date, 23) + i, ...extra });
const DATA = {
  weights: [{ id: "2026-11-01", date: "2026-11-01", kg: 60, createdAt: T("2026-11-01") }],
  meals: [
    M("2026-11-03", "昼食", "牛丼（並）", 650, { p: 20, f: 23, c: 90, at: "12:30" }), M("2026-11-05", "昼食", "牛丼（並）", 650, { p: 20, f: 23, c: 90, at: "12:40" }),
    M("2026-11-07", "間食", "プロテイン", 115, { p: 22, f: 1.5, c: 3 }), M("2026-11-08", "間食", "プロテイン", 115, { p: 22, f: 1.5, c: 3 }),
    M("2026-11-09", "朝食", "トースト", 200, { at: "07:30" }), M("2026-11-09", "朝食", "ヨーグルト（無糖 100g）", 56, { at: "07:30" }), M("2026-11-09", "夕食", "ラーメン（とんこつ）", 650, { at: "22:15" }),
    M(today, "朝食", "コーヒー（ブラック）", 8, { at: "07:00" }),
  ],
};
(async () => {
  const b = await chromium.launch();
  let p = await phone(b, at("12:00", today));
  await p.goto(URL0); await p.evaluate((P) => localStorage.setItem(P + "dietPart", "meal"), P);
  await seed(p, DATA, "diet");
  await p.evaluate((P) => localStorage.setItem(P + "dietPart", "meal"), P); await p.reload(); await p.waitForTimeout(800);
  ok(await p.isVisible("#part-meal") && (await p.getAttribute("#wtSettings", "aria-label")) === "食事の設定", "食事 shows, the gear is 食事's");
  // ④ the day against 2,500
  let g = await txt(p, "#mealGoalCard");
  ok(g.startsWith("きょうの食事 8 / 2,500 kcal") && g.includes("あと 2,492 kcal"), "④ " + g);
  // ⑧ the form's time is now
  ok((await p.inputValue("#mealAt")) === "12:00", "⑧ the time: " + await p.inputValue("#mealAt"));
  // ② よく食べる
  let often = await txt(p, "#mealOften");
  ok(often === "よく食べる プロテイン 115 kcal 牛丼（並） 650 kcal", "② " + often);
  await p.locator('#mealOften button:has-text("プロテイン")').click(); await p.waitForTimeout(300);
  let ms = (await ls(p, "meals")).filter((m) => m.date === today && m.text === "プロテイン");
  ok(ms.length === 1 && ms[0].slot === "昼食" && ms[0].kcal === 115 && ms[0].p === 22 && ms[0].at === "12:00", "② added to 昼食 now: " + JSON.stringify(ms[0]));
  ok((await p.evaluate(() => document.querySelector("#status").textContent)).startsWith("「プロテイン」を昼食に追加しました"), "② said");
  // ③ きのうと同じ: 夕食 (朝食 is in today already)
  let yd = await txt(p, "#mealYesterday");
  ok(yd === "きのうと同じ 夕食 1品", "③ " + yd);
  await p.locator("#mealYesterday button").click(); await p.waitForTimeout(300);
  ms = (await ls(p, "meals")).filter((m) => m.date === today && m.slot === "夕食");
  ok(ms.length === 1 && ms[0].text === "ラーメン（とんこつ）" && ms[0].kcal === 650 && ms[0].at === "22:15", "③ copied with its time: " + JSON.stringify(ms[0]));
  ok(await p.isHidden("#mealYesterday"), "③ offered no more once there");
  // ① the last time's kcal
  await p.locator("#mealText").fill("牛丼（並）"); await p.waitForTimeout(150);
  ok((await p.inputValue("#mealKcal")) === "650" && (await p.inputValue("#mealP")) === "20" && (await p.inputValue("#mealC")) === "90" && (await txt(p, "#mealFillNote")) === "前回の 650 kcal を入れました", "① from the last: " + await txt(p, "#mealFillNote"));
  await p.locator("#mealText").fill("カツカレー"); await p.waitForTimeout(150);
  ok((await p.inputValue("#mealKcal")) === "1000" && (await txt(p, "#mealFillNote")) === "料理の目安 約 1,000 kcal を入れました", "①⑥ from the dishes, the last's taken away: " + await p.inputValue("#mealKcal"));
  // ⑥ words typed: what was eaten first, then dishes
  await p.locator("#mealText").fill("ラーメン"); await p.waitForTimeout(150);
  const sug = await p.evaluate(() => [...document.querySelectorAll("#mealSuggest button")].map((b) => b.innerText.replace(/\s+/g, " ").trim()));
  ok(sug[0] === "ラーメン（とんこつ） 650 kcal" && sug.includes("ラーメン（みそ） 約 600 kcal") && sug.includes("カップラーメン 約 350 kcal") && (await p.inputValue("#mealKcal")) === "", "⑥ " + sug.join(" | "));
  await p.locator('#mealSuggest button:has-text("ラーメン（みそ）")').click(); await p.waitForTimeout(150);
  ok((await p.inputValue("#mealText")) === "ラーメン（みそ）" && (await p.inputValue("#mealKcal")) === "600" && (await p.inputValue("#mealP")) === "22", "⑥ picked: its name, kcal, PFC");
  // ⑨ with a price: into 家計簿 too
  await p.locator("#mealText").fill("ランチ"); await p.fill("#mealKcal", "800"); await p.fill("#mealPrice", "900"); await p.waitForTimeout(100);
  ok(await p.isVisible("#mealPriceNote"), "⑨ says it goes into 家計簿");
  await p.locator("#mealForm button[type=submit]").click(); await p.waitForTimeout(400);
  let lunch = (await ls(p, "meals")).find((m) => m.text === "ランチ"), ex = (await ls(p, "expenses")).find((e) => e.meal === lunch?.id);
  ok(lunch && lunch.exId === ex?.id && ex.amount === 900 && ex.category === "食費" && ex.memo === "ランチ" && ex.date === today && lunch.at === "12:00", "⑨ kept both: " + JSON.stringify([lunch, ex]));
  const lrow = await p.evaluate(() => [...document.querySelectorAll("#mealList li")].find((li) => li.textContent.includes("ランチ"))?.querySelector(".sub")?.textContent.replace(/[\s\u2060]+/g, " ").trim());
  ok(lrow === "12:00・家計簿 900 円", "⑨⑧ the row", lrow);
  // ⑥ hiragana as typed before it is turned into katakana
  await p.locator("#mealText").fill("かれー"); await p.waitForTimeout(150);
  const kana = await p.evaluate(() => [...document.querySelectorAll("#mealSuggest button")].map((b) => b.querySelector(".meal-pick-name").textContent));
  ok(kana.includes("カレーライス") && kana.every((n) => n.includes("カレー")), "⑥ かれー finds カレー", kana);
  await p.locator("#mealText").fill(""); await p.waitForTimeout(100);
  // ⑨ changed in its sheet: 1,000 円; emptied: gone from 家計簿
  await p.locator('#mealList [data-edit]:has-text("ランチ")').click(); await p.waitForTimeout(500);
  ok((await p.inputValue("#rePrice")) === "900" && (await p.inputValue("#reAt")) === "12:00", "⑨ its sheet has the price and time");
  await p.fill("#rePrice", "1000"); await p.locator("#recSave").click(); await p.waitForTimeout(500);
  ex = (await ls(p, "expenses")).find((e) => e.id === lunch.exId);
  ok(ex && ex.amount === 1000, "⑨ 家計簿 follows: " + JSON.stringify(ex));
  await p.locator('#mealList [data-edit]:has-text("ランチ")').click(); await p.waitForTimeout(500);
  await p.fill("#rePrice", ""); await p.locator("#recSave").click(); await p.waitForTimeout(500);
  lunch = (await ls(p, "meals")).find((m) => m.text === "ランチ");
  ok(!(await ls(p, "expenses")).some((e) => e.meal === lunch.id) && !lunch.exId, "⑨ emptied: taken from 家計簿");
  // ⑨ deleted with its 食費, and back
  await p.locator('#mealList [data-edit]:has-text("ランチ")').click(); await p.waitForTimeout(500);
  await p.fill("#rePrice", "700"); await p.locator("#recSave").click(); await p.waitForTimeout(500);
  lunch = (await ls(p, "meals")).find((m) => m.text === "ランチ");
  ok((await ls(p, "expenses")).some((e) => e.id === lunch.exId && e.amount === 700), "⑨ put in again from its sheet");
  const del = p.locator("#mealList li", { hasText: "ランチ" }).locator(".del");
  await del.click(); await del.click(); await p.waitForTimeout(400);
  ok(!(await ls(p, "meals")).some((m) => m.text === "ランチ") && !(await ls(p, "expenses")).some((e) => e.memo === "ランチ") && (await p.evaluate(() => document.querySelector("#status").textContent)).startsWith("食事を削除しました。家計簿の食費も消しました"), "⑨ deleted with its 食費");
  await p.evaluate(() => document.querySelector("#status .toast-undo")?.click()); await p.waitForTimeout(400);
  ok((await ls(p, "meals")).some((m) => m.text === "ランチ") && (await ls(p, "expenses")).some((e) => e.memo === "ランチ"), "⑨ 元に戻す: both back");
  // ⑤ the day's PFC, then a protein goal
  g = await txt(p, "#mealGoalCard");
  ok(g.includes("たんぱく質 22 g") && g.includes("脂質 1.5 g・炭水化物 3 g"), "⑤ " + g);
  await p.locator("#wtSettings").click(); await p.waitForTimeout(600);
  ok(await p.isVisible("#mealSetGroup") && (await p.getAttribute("#proteinGoal", "placeholder")) === "96" && (await txt(p, "#proteinFoot")).includes("96 g"), "⑤ settings: the goal's 目安 from the weight");
  await p.fill("#proteinGoal", "100"); await p.fill("#mealKcalGoal", "2200");
  await p.locator("#mealRemindOn").check(); await p.waitForTimeout(300);
  ok((await p.inputValue("#mealRemindB")) === "" && (await p.inputValue("#mealRemindL")) === "14:00" && (await p.inputValue("#mealRemindD")) === "21:00", "⑩ the times at first");
  await p.fill("#mealRemindB", "09:30"); await p.locator("#mealRemindB").dispatchEvent("change"); await p.waitForTimeout(200);
  await p.locator("#sheetDone").click(); await p.waitForTimeout(600);
  const st = await ls(p, "settings");
  ok(st.find((x) => x.id === "pfcGoal")?.p === 100 && st.find((x) => x.id === "kcalGoal")?.target === 2200 && JSON.stringify(st.find((x) => x.id === "mealRemind")?.at) === JSON.stringify({ 朝食: "09:30", 昼食: "14:00", 夕食: "21:00" }) && st.find((x) => x.id === "mealRemind")?.on === true, "⑤⑩ kept: " + JSON.stringify(st.filter((x) => /pfc|kcal|meal/.test(x.id))));
  g = await txt(p, "#mealGoalCard");
  ok(g.includes("/ 2,200 kcal") && g.includes("たんぱく質 22 g / 100 g"), "④⑤ with the goals: " + g);
  // ⑦ the week (11/4〜11/10)
  await p.locator("#mealWeekCard").scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  const wn = await txt(p, "#mealWeekNote");
  ok(wn.includes("目安超え 0 日") && wn.includes("21時以降の食事 2 回") && (await p.locator("#mealWeekChart .meal-bar").count()) === 5, "⑦ " + wn + " bars " + await p.locator("#mealWeekChart .meal-bar").count());
  const tb = await p.evaluate(() => [...document.querySelectorAll("#mealWeekTable tr")].map((r) => r.textContent));
  ok(tb.length === 7 && tb[1].includes("11/9（月）") && tb[1].includes("906 kcal") && tb[6].includes("—"), "⑦ table: " + tb.join(" | "));
  const bx = await p.locator("#mealWeekChart").boundingBox();
  await p.mouse.move(bx.x + bx.width * 0.66, bx.y + bx.height / 2); await p.waitForTimeout(150);
  ok(await p.isVisible("#mealWeekTip"), "⑦ the tip: " + await txt(p, "#mealWeekTip"));
  await p.screenshot({ path: out + "/meal-week.png" });
  // ⑧ yesterday's late one
  await p.locator("#sec-diet .datenav .navbtn").first().click(); await p.waitForTimeout(400);
  const row = await p.evaluate(() => [...document.querySelectorAll("#mealList li")].find((li) => li.textContent.includes("ラーメン"))?.innerText.replace(/\s+/g, " "));
  ok(row.includes("22:15（21時以降）"), "⑧ " + row);
  ok((await p.inputValue("#mealAt")) === "", "⑧ another day: no time put in");
  ok(!p.errs.length, "no page errors: " + p.errs.join(" | "));
  await p.locator("#sec-diet .datenav .chip-btn").click(); await p.waitForTimeout(300);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({ path: out + "/meal-top.png", fullPage: true });
  const d = await phone(b, at("12:00", today), { colorScheme: "dark" });
  await d.goto(URL0); await d.evaluate((P) => localStorage.setItem(P + "dietPart", "meal"), P);
  await seed(d, DATA, "diet"); await d.evaluate((P) => localStorage.setItem(P + "dietPart", "meal"), P); await d.reload(); await d.waitForTimeout(800);
  await d.screenshot({ path: out + "/meal-dark.png", fullPage: true });
  ok(!d.errs.length, "dark: no page errors: " + d.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
