// 家計簿 ④⑩①: 費目, 支払い方法, 固定費 (and まとめ)
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed, T0 } = require("./lib");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10";
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const opts = (p, sel) => p.evaluate((sel) => [...document.querySelector(sel).options].map((o) => o.value), sel);
(async () => {
  const b = await chromium.launch();
  let p = await phone(b, at("12:00", today));
  await seed(p, { expenses: [
    { id: "x1", date: "2026-11-02", kind: "out", category: "食費", amount: 800, createdAt: T0 },
    { id: "x2", date: "2026-11-03", kind: "out", category: "交通費", amount: 400, method: "qr", createdAt: T0 },
  ] }, "money");
  // ⑩ the form: 支払い for 支出, not for 収入
  ok(await p.isVisible("#exMethod") && JSON.stringify(await opts(p, "#exMethod")) === JSON.stringify(["", "cash", "card", "qr"]), "⑩ 支払い in the form");
  await p.locator('input[name="exKind"][value="in"]').check({ force: true }); await p.waitForTimeout(200);
  ok(!(await p.isVisible("#exMethod")), "⑩ not for 収入");
  await p.locator('input[name="exKind"][value="out"]').check({ force: true }); await p.waitForTimeout(200);
  await p.selectOption("#exMethod", "card"); await p.fill("#exAmount", "3000"); await p.selectOption("#exCat", "衣服"); await p.fill("#exMemo", "シャツ");
  await p.locator('#exForm button[type="submit"]').click(); await p.waitForTimeout(500);
  let ex = (await ls(p, "expenses")).find((e) => e.memo === "シャツ");
  ok(ex && ex.method === "card" && ex.amount === 3000, "⑩ recorded with カード: " + JSON.stringify(ex));
  ok(await p.evaluate(() => document.getElementById("exMethod").value) === "card", "⑩ the next one starts at カード (the last picked)");
  const row = await p.evaluate(() => [...document.querySelectorAll("#exList li")].find((li) => li.textContent.includes("シャツ"))?.innerText.replace(/\s+/g, " "));
  ok(row && row.includes("カード"), "⑩ 明細 says カード: " + row);
  // its edit sheet: 支払い there, gone for 収入
  await p.evaluate(() => [...document.querySelectorAll("#exList li")].find((li) => li.textContent.includes("シャツ")).querySelector("[data-edit], .row-link, button")?.click()); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById("reMethod")?.value) === "card", "⑩ the edit sheet has カード");
  await p.locator('#recForm input[name="reKind"][value="in"]').check({ force: true }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById("reMethod").closest(".form-rows").hidden), "⑩ hidden when changed to 収入");
  await p.locator("#sheetCancel").click(); await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById("discardYes")?.offsetParent && document.getElementById("discardYes").click()); await p.waitForTimeout(400);
  // ④ 費目の設定
  await p.locator("#moneySettings").click(); await p.waitForTimeout(500);
  let cats = await p.evaluate(() => [...document.querySelectorAll("#catEditList li")].map((li) => li.dataset.cat));
  ok(cats.length === 11 && cats[0] === "食費", "④ 支出's 11: " + cats.join(","));
  await p.fill("#catAddName", "サブスク"); await p.locator('#catAddForm button[type="submit"]').click(); await p.waitForTimeout(300);
  cats = await p.evaluate(() => [...document.querySelectorAll("#catEditList li")].map((li) => li.dataset.cat));
  ok(cats[cats.length - 1] === "サブスク", "④ added at the end");
  await p.locator('#catEditList li[data-cat="美容"] input.switch').click(); await p.waitForTimeout(300);
  await p.locator('#catEditList li[data-cat="交通費"] .up').click(); await p.waitForTimeout(300);
  cats = await p.evaluate(() => [...document.querySelectorAll("#catEditList li")].map((li) => li.dataset.cat + (li.classList.contains("off") ? "(off)" : "")));
  ok(cats.join(",") === "食費,日用品,衣服,美容(off),交際費,医療費,教育費,交通費,水道光熱費,通信費,雑費,サブスク", "④ 美容 off, 交通費 up: " + cats.join(","));
  await p.locator("#catKinds button[data-kind=in]").click(); await p.waitForTimeout(200);
  ok((await p.evaluate(() => [...document.querySelectorAll("#catEditList li")].map((li) => li.dataset.cat))).join(",") === "給与,副収入,おこづかい,その他", "④ 収入's");
  await p.locator("#catKinds button[data-kind=out]").click(); await p.waitForTimeout(200);
  // ① a 固定費: 家賃 50,000 on the 5th from 10/1; サブスク 980 on the 25th from today
  await p.locator("#fixedAdd").click(); await p.waitForTimeout(300);
  let box = p.locator(".fixed-edit").last();
  await box.locator('[data-f="name"]').fill("家賃"); await box.locator('[data-f="amount"]').fill("50000");
  await box.locator('[data-f="category"]').selectOption("雑費"); await box.locator('[data-f="day"]').selectOption("5"); await box.locator('[data-f="since"]').fill("2026-10-01");
  await p.waitForTimeout(900);
  ok((await box.locator(".fixed-when").innerText()).includes("毎月5日に支出 50,000"), "① its line: " + await box.locator(".fixed-when").innerText());
  await p.locator("#fixedAdd").click(); await p.waitForTimeout(300);
  box = p.locator(".fixed-edit").last();
  await box.locator('[data-f="name"]').fill("動画サブスク"); await box.locator('[data-f="amount"]').fill("980");
  await box.locator('[data-f="category"]').selectOption("サブスク"); await box.locator('[data-f="method"]').selectOption("card"); await box.locator('[data-f="day"]').selectOption("25");
  await p.waitForTimeout(900);
  await p.locator("#sheetDone").click(); await p.waitForTimeout(800);
  ex = (await ls(p, "expenses")).filter((e) => e.fixed);
  ok(ex.length === 2 && ex.every((e) => e.memo === "家賃" && e.amount === 50000 && e.category === "雑費") && ex.map((e) => e.date).sort().join() === "2026-10-05,2026-11-05", "① 家賃 put in for 10/5 and 11/5 (サブスク not yet): " + ex.map((e) => e.id + ":" + e.date).join(" "));
  // the form's menu: 美容 off, サブスク on
  const menu = await opts(p, "#exCat");
  ok(!menu.includes("美容") && menu.includes("サブスク") && menu.indexOf("交通費") < menu.indexOf("水道光熱費"), "④ the form's menu: " + menu.join(","));
  // ① the 11/5 one deleted: not put in again as the app opens
  const id115 = ex.find((e) => e.date === "2026-11-05").id;
  await p.evaluate(() => [...document.querySelectorAll("#exList li")].find((li) => li.textContent.includes("家賃"))?.querySelector(".del")?.click());
  await p.evaluate(() => [...document.querySelectorAll("#exList li")].find((li) => li.textContent.includes("家賃"))?.querySelector(".del")?.click());
  await p.waitForTimeout(600);
  ok(!(await ls(p, "expenses")).some((e) => e.id === id115), "① 11/5's deleted");
  await p.reload(); await p.waitForTimeout(800);
  ok(!(await ls(p, "expenses")).some((e) => e.id === id115), "① and not put in again on opening");
  // the 明細 row says 固定費 (10月's: 11月's was deleted above)
  await p.locator("#monthNav .navbtn").first().click(); await p.waitForTimeout(400);
  ok((await p.evaluate(() => document.getElementById("exList").innerText)).includes("固定費"), "① 明細 says 固定費");
  await p.locator("#monthNav .chip-btn").click(); await p.waitForTimeout(400);
  // まとめ
  await p.locator('#moneyParts button[data-part="stats"]').click(); await p.waitForTimeout(500);
  const pay = await p.evaluate(() => document.getElementById("payList").innerText.replace(/\s+/g, " "));
  ok(/カード 3,000 ?円/.test(pay) && /QR決済 400 ?円/.test(pay) && /指定なし 800 ?円/.test(pay) && pay.includes("12月ごろに引き落とされる"), "⑩ まとめ by method: " + pay);
  const fx = await p.evaluate(() => document.getElementById("fixedList").innerText.replace(/\s+/g, " "));
  ok(fx.includes("家賃") && fx.includes("毎月5日") && fx.includes("動画サブスク") && fx.includes("毎月25日・カード") && /支出 50,980 ?円/.test(fx), "① まとめ's 固定費: " + fx);
  await p.screenshot({ path: out + "/stats-393.png", fullPage: true });
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  await b.close();
  console.log(fails ? `${fails} FAILED` : "all OK");
})();
