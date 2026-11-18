// 家計簿の入力 (the user's call, 2026-11-18, as the picture they sent): 支出・収入 on top, 日付 with the day before and after,
// メモ, the amount large, the 費目 as tiles with pictures, and a large button
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.textContent.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const tiles = (p) => p.evaluate(() => [...document.querySelectorAll("#exTiles .ex2-tile")].map((b) => [b.textContent.trim(), b.getAttribute("aria-pressed"), b.querySelector("use")?.getAttribute("href")]));
const OUT = ["食費", "日用品", "衣服", "美容", "交際費", "医療費", "教育費", "水道光熱費", "交通費", "通信費", "雑費", "推し活", "サブスク"];
const DATA = { settings: [{ id: "exCats", out: OUT, in: ["給与", "副収入", "おこづかい", "その他"], updatedAt: 1 }] };
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:50", "2026-11-18"));
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "book"), P); await p.reload(); await p.waitForTimeout(900);
  // the 入力 first on the page, 支出 picked, today written out
  ok(await p.evaluate(() => document.querySelector("#moneyBook > *").id === "exForm"), "the 入力 comes first");
  ok((await txt(p, "#exDateText")) === "2026年11月18日(水)" && (await txt(p, "#exAmountLabel")) === "支出" && (await txt(p, "#exGo")) === "支出を入力する", "支出, today: " + (await txt(p, "#exDateText")));
  // the tiles: each 費目 with its picture, the user's own by their words (推し活) or a tag (サブスク), and 編集・追加
  const t0 = await tiles(p);
  ok(JSON.stringify(t0.map((x) => x[0])) === JSON.stringify([...OUT, "編集・追加 ›"]) && t0[0][1] === "true" && t0.slice(1, -1).every((x) => x[1] === "false"), "the tiles: " + JSON.stringify(t0.map((x) => x[0])));
  ok(JSON.stringify(t0.map((x) => x[2])) === JSON.stringify(["#i-ex-food", "#i-ex-daily", "#i-ex-clothes", "#i-ex-beauty", "#i-ex-social", "#i-ex-medical", "#i-ex-study", "#i-ex-utility", "#i-ex-train", "#i-ex-phone", "#i-ex-misc", "#i-ex-fun", "#i-ex-tag", "#i-plus"]), "the pictures: " + JSON.stringify(t0.map((x) => x[2])));
  // 交通費 pressed; the day after, then two days back
  await p.click('#exTiles [data-cat="交通費"]'); await p.waitForTimeout(200);
  ok((await p.evaluate(() => document.getElementById("exCat").value)) === "交通費" && JSON.stringify((await tiles(p)).filter((x) => x[1] === "true").map((x) => x[0])) === '["交通費"]', "交通費 picked");
  await p.click("#exDateNext"); await p.waitForTimeout(150);
  ok((await txt(p, "#exDateText")) === "2026年11月19日(木)" && (await p.inputValue("#exDate")) === "2026-11-19", "the day after");
  await p.click("#exDatePrev"); await p.click("#exDatePrev"); await p.waitForTimeout(150);
  ok((await txt(p, "#exDateText")) === "2026年11月17日(火)", "two days back");
  // put in with the large button
  await p.fill("#exMemo", "バス"); await p.fill("#exAmount", "230");
  await p.click("#exGo"); await p.waitForTimeout(500);
  const e = (await ls(p, "expenses")).find((x) => x.memo === "バス");
  ok(e && e.kind === "out" && e.category === "交通費" && e.amount === 230 && e.date === "2026-11-17", "put in: " + JSON.stringify(e));
  // 収入: its 費目, said as 収入, no 支払い
  await p.click('.ex2-kind input[value="in"] + span'); await p.waitForTimeout(200);
  const t1 = await tiles(p);
  ok(JSON.stringify(t1.map((x) => x[0])) === JSON.stringify(["給与", "副収入", "おこづかい", "その他", "編集・追加 ›"]) && JSON.stringify(t1.map((x) => x[2])) === JSON.stringify(["#i-ex-salary", "#i-ex-side", "#i-ex-gift", "#i-ex-other", "#i-plus"]), "収入's tiles: " + JSON.stringify(t1));
  ok((await txt(p, "#exAmountLabel")) === "収入" && (await txt(p, "#exGo")) === "収入を入力する" && (await p.isHidden("#exMethodRow")), "said as 収入");
  // what something else sets shows (as 収入に入れる does)
  await p.evaluate(() => { document.getElementById("exCat").value = "その他"; document.getElementById("exDate").value = "2026-12-01"; });
  ok(JSON.stringify((await tiles(p)).filter((x) => x[1] === "true").map((x) => x[0])) === '["その他"]' && (await txt(p, "#exDateText")) === "2026年12月1日(火)", "set from elsewhere");
  // 編集・追加: the settings' 費目, 収入's, its name ready to type
  await p.click("#exTiles .ex2-more"); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.activeElement?.id === "catAddName" && document.querySelector('#catKinds [data-kind="in"]').getAttribute("aria-pressed") === "true"), "編集・追加 opens the 費目");
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
