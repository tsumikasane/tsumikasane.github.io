// 家計簿 ②⑧⑤⑥ (and ③'s 前月比): 費目ごとの予算, 給料日, よく使う, 絞り込みと検索
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed, T0 } = require("./lib");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10";
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const X = (id, date, category, amount, memo, method, kind = "out") => ({ id, date, kind, category, amount, ...(memo ? { memo } : {}), ...(method ? { method } : {}), createdAt: T0 });
const DATA = {
  expenses: [
    X("a1", "2026-10-03", "食費", 600, "コンビニ昼", "qr"), X("a2", "2026-10-12", "食費", 1200, "スーパー"), X("a3", "2026-10-20", "交通費", 2000, "定期"),
    X("b1", "2026-11-02", "食費", 600, "コンビニ昼", "qr"), X("b2", "2026-11-05", "食費", 600, "コンビニ昼", "qr"), X("b3", "2026-11-07", "食費", 3000, "外食"),
    X("b4", "2026-11-08", "交際費", 4000, "飲み会", "card"), X("b5", "2026-11-09", "衣服", 5000, "シャツ", "card"), X("c1", "2026-11-01", "給与", 80000, "バイト代", null, "in"),
  ],
  settings: [
    { id: "budget", monthly: 30000, cats: { "食費": 10000, "交際費": 3000, "美容": 2000 }, updatedAt: T0 },
    { id: "jobs", items: [{ id: "j1", name: "カフェ", wage: 1200, fare: 0, night: true, cutoff: 0, payday: 25 }], updatedAt: T0 },
  ],
};
(async () => {
  const b = await chromium.launch();
  let p = await phone(b, at("12:00", today));
  await seed(p, DATA, "money");
  // ⑧ the budget line: the month's, with the days to 給料日
  let bl = await txt(p, "#budgetLine");
  ok(bl.includes("予算 30,000 円 のうち") && bl.includes("残り 16,800 円") && bl.includes("月末まで1日あたり") && bl.includes("給料日（11/25）まで あと 15 日"), "⑧ monthly, with 給料日: " + bl);
  // ② and ③: 費目ごとの支出
  const rows = await p.evaluate(() => [...document.querySelectorAll("#catList .cat-row")].map((r) => r.innerText.replace(/\s+/g, " ").trim()));
  ok(rows[0].startsWith("衣服 5,000 円") && rows[0].includes("前月より +5,000 円"), "③ 衣服: " + rows[0]);
  const food = rows.find((r) => r.startsWith("食費")), party = rows.find((r) => r.startsWith("交際費")), beauty = rows.find((r) => r.startsWith("美容"));
  ok(food.includes("4,200 円") && food.includes("前月より +2,400 円") && food.includes("予算 10,000 円・残り 5,800 円"), "② 食費: " + food);
  ok(party.includes("予算 3,000 円 を 1,000 円 超過") && await p.locator("#catList .cat-note.warn").count() === 1, "② 交際費 over: " + party);
  ok(beauty && beauty.includes("0 円") && beauty.includes("予算 2,000 円・残り 2,000 円"), "② 美容 with a budget, nothing spent: " + beauty);
  // ⑤ よく使う: コンビニ昼 600 (3 times)
  const often = await txt(p, "#exOften");
  ok(often === "よく使う コンビニ昼 600 円", "⑤ よく使う: " + often);
  await p.locator("#exOften .often").first().click(); await p.waitForTimeout(500);
  let ex = (await ls(p, "expenses")).filter((e) => e.memo === "コンビニ昼" && e.date === today);
  ok(ex.length === 1 && ex[0].amount === 600 && ex[0].category === "食費" && ex[0].method === "qr", "⑤ one press: put in today " + JSON.stringify(ex[0]));
  await p.evaluate(() => document.querySelector("#status.show button, #status.show .undo")?.click()); await p.waitForTimeout(500);
  ok(!(await ls(p, "expenses")).some((e) => e.memo === "コンビニ昼" && e.date === today), "⑤ 元に戻す");
  // ⑤ メモ's suggestions and its fill
  const hints = await p.evaluate(() => [...document.querySelectorAll("#exMemoHints option")].map((o) => o.value));
  ok(hints.includes("シャツ") && hints.includes("定期") && hints[0] === "シャツ", "⑤ メモ's suggestions, newest first: " + hints.slice(0, 4).join(","));
  await p.fill("#exMemo", "飲み会"); await p.locator("#exMemo").dispatchEvent("change"); await p.waitForTimeout(200);
  const f = await p.evaluate(() => ({ amount: exAmount.value, cat: exCat.value, method: exMethod.value }));
  ok(f.amount === "4000" && f.cat === "交際費" && f.method === "card", "⑤ 飲み会 fills the last time's: " + JSON.stringify(f));
  await p.fill("#exMemo", ""); await p.fill("#exAmount", "");
  // ⑥ a 費目 pressed: its 明細 alone
  await p.locator('#catList .cat-row:has-text("食費")').click(); await p.waitForTimeout(400);
  let filt = await txt(p, "#exFilter"), entries = await p.evaluate(() => [...document.querySelectorAll("#exList li:not(.dayhead)")].map((li) => li.querySelector(".chip")?.textContent));
  ok(filt.startsWith("食費だけ 3 件・支出 4,200 円") && entries.every((c) => c === "食費") && entries.length === 3, "⑥ 食費 alone: " + filt + " | " + entries.join(","));
  ok(await p.getAttribute('#catList .cat-row:has-text("食費")', "aria-pressed") === "true", "⑥ the row says it is pressed");
  await p.locator("#exFilter .link-btn").click(); await p.waitForTimeout(300);
  ok(await p.isHidden("#exFilter") && (await p.locator("#exList li:not(.dayhead)").count()) === 6, "⑥ すべて表示: " + await p.locator("#exList li:not(.dayhead)").count());
  // ⑥ words: every month
  await p.fill("#exFind", "コンビニ"); await p.waitForTimeout(400);
  filt = await txt(p, "#exFilter");
  const days = await p.evaluate(() => [...document.querySelectorAll("#exList li.dayhead")].map((li) => li.dataset.day));
  ok(filt.startsWith("「コンビニ」3 件・支出 1,800 円") && days.join() === "2026-11-05,2026-11-02,2026-10-03", "⑥ コンビニ in every month: " + filt + " " + days.join());
  await p.fill("#exFind", "カード"); await p.waitForTimeout(400);
  ok((await txt(p, "#exFilter")).startsWith("「カード」2 件"), "⑥ by the way it was paid too: " + await txt(p, "#exFilter"));
  await p.fill("#exFind", "zzz"); await p.waitForTimeout(400);
  ok((await txt(p, "#exList")) === "見つかりませんでした。", "⑥ none found");
  await p.fill("#exFind", ""); await p.waitForTimeout(300);
  // ②⑧ the settings: 費目ごとの予算 and 予算の区切り
  await p.locator("#moneySettings").click(); await p.waitForTimeout(500);
  const fields = await p.evaluate(() => [...document.querySelectorAll("#catBudgetForm input")].map((i) => i.dataset.cat + "=" + i.value));
  ok(fields.includes("食費=10000") && fields.includes("交際費=3000") && fields.includes("美容=2000") && fields.includes("日用品="), "② the fields: " + fields.slice(0, 5).join(" "));
  await p.fill('#catBudgetForm input[data-cat="日用品"]', "3000"); await p.fill('#catBudgetForm input[data-cat="美容"]', "");
  await p.selectOption("#budgetStart", "pay"); await p.waitForTimeout(300);
  await p.locator("#sheetDone").click(); await p.waitForTimeout(700);
  const bud = (await ls(p, "settings")).find((x) => x.id === "budget");
  ok(bud && bud.monthly === 30000 && bud.start === "pay" && JSON.stringify(bud.cats) === JSON.stringify({ "食費": 10000, "日用品": 3000, "交際費": 3000 }), "②⑧ saved: " + JSON.stringify(bud));
  // ⑧ from 給料日: 10/25 to 11/24
  bl = await txt(p, "#budgetLine");
  ok(bl.includes("給料日からの予算 30,000 円 のうち") && bl.includes("残り 16,800 円") && bl.includes("給料日（11/25）まで あと 15 日・1日あたり 1,120 円"), "⑧ from 給料日: " + bl);
  await p.screenshot({ path: out + "/book-393.png", fullPage: true });
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  // no job: 給料日から can't be picked, and the line says nothing of it
  p = await phone(b, at("12:00", today));
  await seed(p, { expenses: DATA.expenses, settings: [{ id: "budget", monthly: 30000, updatedAt: T0 }] }, "money");
  ok(!(await txt(p, "#budgetLine")).includes("給料日"), "⑧ no job: no 給料日 words");
  await p.locator("#moneySettings").click(); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.querySelector('#budgetStart option[value="pay"]').disabled), "⑧ no job: 給料日から can't be picked");
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  await b.close();
  console.log(fails ? `${fails} FAILED` : "all OK");
})();
