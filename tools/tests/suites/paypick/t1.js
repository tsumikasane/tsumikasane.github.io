// 家計簿の入力の「支払い」 (the user's call, 2026-11-27, asked twice): the way of paying picked in 家計簿's form taken out.
// No 支払い in the form (支出 nor 収入); a 支出 put in from it has none, though the device kept one picked before and
// though a メモ of before fills its amount and 費目; ひとことで追加 and a meal's price (食費) none either, the device's one
// being read no more. What stays stays: the edit sheet's 支払い (and its picking), the 明細's names of them, a way of paying
// written in ひとことで追加's line, まとめ's 支払い方法ごと, 設定's 支払い方法, the 固定費's 支払い; the records' as they were
const { chromium } = require("playwright");
const { P, at, phone, seed, T0 } = require("./lib");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-27";
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const X = (id, date, category, amount, memo, extra = {}) => ({ id, date, kind: "out", category, amount, memo, createdAt: T0, ...extra });
const DATA = {
  expenses: [X("x1", "2026-11-20", "交通費", 400, "バス", { method: "qr" }), X("x2", "2026-11-21", "食費", 900, "ランチ", { method: "card" })],
  settings: [{ id: "fixed", items: [{ id: "f1", name: "スマホ", kind: "out", category: "通信費", amount: 2500, day: 23, method: "card", since: "2026-11-01" }], updatedAt: T0 }],
};
const labels = (p) => p.evaluate(() => [...document.querySelectorAll("#exForm .ex2-label")].filter((x) => x.offsetParent).map((x) => x.textContent.trim()));
const formSays = (p) => p.evaluate(() => ({ text: document.getElementById("exForm").innerText, sel: document.querySelectorAll("#exForm select:not(#exCat)").length, ids: ["exMethod", "exMethodRow", "exMethodField", "exMethodLabel"].filter((id) => document.getElementById(id)) }));
const byMemo = async (p, memo) => (await ls(p, "expenses")).filter((e) => e.memo === memo);
async function open(b, hash) {
  const p = await phone(b, at("12:00", today));
  await seed(p, DATA, hash);
  // the way of paying this device kept from before (picked カード in the form): read no more
  await p.evaluate(({ P }) => { localStorage.setItem(P + "exMethod", "card"); localStorage.setItem(P + "dietPart", "meal"); }, { P }); // (食事 shown on its page)
  await p.reload(); await p.waitForTimeout(800);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, "money");
  // 1. the form: no 支払い, for 支出 and for 収入
  let f = await formSays(p), l = await labels(p);
  ok(!f.ids.length && !f.sel && !/支払い|指定なし|現金|QR決済/.test(f.text), "1. no 支払い in the form (支出)", f);
  ok(JSON.stringify(l) === JSON.stringify(["日付", "メモ", "支出"]), "1. the form's rows: 日付, メモ, 支出", l);
  await p.click('.ex2-kind input[value="in"] + span'); await p.waitForTimeout(200);
  f = await formSays(p); l = await labels(p);
  ok(!f.ids.length && !f.sel && JSON.stringify(l) === JSON.stringify(["日付", "メモ", "収入"]), "1. none for 収入 either", [f, l]);
  await p.click('.ex2-kind input[value="out"] + span'); await p.waitForTimeout(200);
  await p.screenshot({ path: out + "/paypick-form.png" });
  // 2. a 支出 put in: no way of paying (the device's カード not given)
  await p.fill("#exMemo", "シャツ"); await p.fill("#exAmount", "3000"); await p.locator('#exTiles button[data-cat="衣服"]').click();
  await p.click("#exGo"); await p.waitForTimeout(500);
  let e = await byMemo(p, "シャツ");
  ok(e.length === 1 && e[0].amount === 3000 && e[0].category === "衣服" && !("method" in e[0]), "2. put in with no way of paying", e);
  // 3. a メモ of before: its amount and 費目 filled, no way of paying with them
  await p.fill("#exMemo", "ランチ"); await p.locator("#exMemo").dispatchEvent("change"); await p.waitForTimeout(200);
  ok((await p.inputValue("#exAmount")) === "900" && (await p.evaluate(() => document.getElementById("exCat").value)) === "食費", "3. ランチ fills 900 and 食費", [await p.inputValue("#exAmount")]);
  await p.click("#exGo"); await p.waitForTimeout(500);
  e = (await byMemo(p, "ランチ")).filter((x) => x.id !== "x2");
  ok(e.length === 1 && e[0].amount === 900 && !("method" in e[0]), "3. put in with no way of paying (the last time's カード not given)", e);
  // 4. ひとことで追加: none given; one written in its line still goes with it
  await p.fill("#mo2QuickText", "お茶 150"); await p.waitForTimeout(200);
  const said = await txt(p, "#mo2QuickSay");
  ok(said && said.includes("150 円") && !/カード|現金|QR決済/.test(said), "4. said with no way of paying", said);
  await p.press("#mo2QuickText", "Enter"); await p.waitForTimeout(500);
  e = await byMemo(p, "お茶");
  ok(e.length === 1 && e[0].amount === 150 && !("method" in e[0]), "4. put in with none", e);
  await p.fill("#mo2QuickText", "現金 300 パン"); await p.press("#mo2QuickText", "Enter"); await p.waitForTimeout(500);
  e = await byMemo(p, "パン");
  ok(e.length === 1 && e[0].amount === 300 && e[0].method === "cash", "4. 現金 written in the line: kept", e);
  // 5. the 明細 say the ways of paying of before; the edit sheet's 支払い stays and picks
  const row = await p.evaluate(() => [...document.querySelectorAll("#exList li")].find((li) => li.textContent.includes("バス"))?.innerText.replace(/\s+/g, " "));
  ok(row && row.includes("QR決済"), "5. the 明細 says QR決済", row);
  await p.evaluate(() => [...document.querySelectorAll("#exList li")].find((li) => li.textContent.includes("シャツ")).querySelector("[data-edit], .row-link, button")?.click()); await p.waitForTimeout(500);
  ok(await p.evaluate(() => { const s = document.getElementById("reMethod"); return !!s && s.value === "" && [...s.options].map((o) => o.textContent).join(",") === "指定なし,現金,カード,QR決済"; }), "5. the edit sheet: 支払い kept (指定なし)", await p.evaluate(() => document.getElementById("reMethod")?.outerHTML.slice(0, 200)));
  await p.selectOption("#reMethod", "card"); await p.click("#recSave"); await p.waitForTimeout(500);
  e = await byMemo(p, "シャツ");
  ok(e.length === 1 && e[0].method === "card", "5. picked in the edit sheet: カード", e);
  // 6. まとめ: 支払い方法ごと
  await p.click('#moneyParts button[data-part="stats"]'); await p.waitForTimeout(500);
  const pay = await txt(p, "#payCard");
  ok(pay && pay.startsWith("支払い方法ごと") && pay.includes("カード") && pay.includes("QR決済") && pay.includes("現金") && pay.includes("指定なし"), "6. まとめ's 支払い方法ごと kept", pay);
  // 7. 設定: 支払い方法 and the 固定費's 支払い
  await p.locator("#moneySettings").click(); await p.waitForTimeout(600);
  const pays = await p.evaluate(() => [...document.querySelectorAll("#mo2PayList li input.mo2-pay-name")].map((x) => x.value));
  ok(JSON.stringify(pays) === JSON.stringify(["現金", "カード", "QR決済"]) && await p.isVisible("#mo2PayAdd"), "7. 設定's 支払い方法 kept", pays);
  ok(await p.evaluate(() => document.querySelector('.fixed-edit [data-f="method"]')?.value) === "card", "7. the 固定費's 支払い kept");
  // 8. the records of before as they were
  const all = await ls(p, "expenses");
  ok(all.find((x) => x.id === "x1")?.method === "qr" && all.find((x) => x.id === "x2")?.method === "card", "8. the ways of paying of before kept", all.filter((x) => x.id.startsWith("x")));
  ok(await p.evaluate(({ P }) => localStorage.getItem(P + "exMethod"), { P }) === "card", "8. what the device kept left as it was");
  ok(!p.errs.length, "no errors (家計簿)", p.errs);
  await p.context().close();
  // 9. a meal with its price: its 食費 with no way of paying (the device's カード not given)
  p = await open(b, "diet");
  await p.click('#mealSlots button[data-slot="昼食"]'); await p.waitForTimeout(400);
  await p.locator("#mealText").fill("そば"); await p.fill("#mealPrice", "700"); await p.waitForTimeout(100);
  await p.locator("#mealRecAdd").click(); await p.waitForTimeout(500);
  const meal = (await ls(p, "meals")).find((m) => m.text === "そば"), mex = (await ls(p, "expenses")).find((x) => x.meal === meal?.id);
  ok(meal && mex && mex.amount === 700 && mex.category === "食費" && !("method" in mex), "9. a meal's 食費: no way of paying", [meal, mex]);
  ok(!p.errs.length, "no errors (食事)", p.errs);
  await p.context().close();
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
