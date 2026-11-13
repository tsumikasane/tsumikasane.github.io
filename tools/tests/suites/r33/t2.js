// ToDo その4: the edges — its own sheet's rows, no weather place yet, きょうやるだけ, a split with nothing set, 分けるのをやめる,
// 記録しないで終える, a filter kept, and older data with none of these
process.env.URL0 = process.env.URL0 || "http://localhost:8776/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const todo = async (p, id) => (await ls(p, "todos")).find((t) => t.id === id);
const rows = (p) => p.evaluate(() => [...document.querySelectorAll("#todoList > li [data-check]")].map((b) => b.dataset.check));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const status = (p) => p.evaluate(() => [document.getElementById("status")?.textContent || "", document.getElementById("sheetStatus").textContent].join("｜"));
const menu = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(300); await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(500); };
const hold = (p, id) => p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).closest("li").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), id);
const WHEN = new Date("2026-11-11T08:30:00+09:00");
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  // no weather place yet: the card asks for it
  await seed(p, { todos: D.todos(), todoLists: D.lists(), events: D.events() }, "todo"); await p.waitForTimeout(900);
  ok((await txt(p, "#td4WxCard")).startsWith("天気で出すToDoがあります。") && (await txt(p, "#td4WxCard button")) === "天気を出す", "⑤ no place yet: 天気を出す", await txt(p, "#td4WxCard"));

  // its own sheet: 時間帯, 天気 (a 買い物 one: 数量, 値段), read back
  await p.click('#todoList [data-edit="g"]'); await p.waitForTimeout(700);
  ok(!!(await p.$("#reSlot")) && !!(await p.$("#reWx")) && !(await p.$("#reQty")), "④⑤ in its sheet; no 数量 off a 買い物リスト");
  await p.selectOption("#reSlot", "noon"); await p.selectOption("#reWx", "rain");
  await p.click("#recSave"); await p.waitForTimeout(600);
  let g = await todo(p, "g");
  ok(g.slot === "noon" && g.wx === "rain", "④⑤ saved from its sheet", g);
  await p.locator("#todoTabs button", { hasText: "買い物" }).click(); await p.waitForTimeout(300);
  await p.click('#todoList [data-edit="s3"]'); await p.waitForTimeout(700);
  ok(!!(await p.$("#reQty")) && !!(await p.$("#rePrice")), "⑥ a 買い物 one's sheet: 数量, 値段");
  await p.fill("#reQty", "2"); await p.fill("#rePrice", "160"); await p.click("#recSave"); await p.waitForTimeout(600);
  const s3 = await todo(p, "s3");
  ok(s3.qty === 2 && s3.price === 160, "⑥ saved", s3);
  // 記録しないで終える: none with a price in the basket
  await p.click('#todoList [data-check="s3"]'); await p.waitForTimeout(1800);
  await p.evaluate(({ P }) => {}, { P });
  ok((await txt(p, "#td4ShopCard")).includes("カゴ 2 件・440 円"), "⑥ the basket", await txt(p, "#td4ShopCard"));
  await p.locator("#td4ShopCard button", { hasText: "買い物を終える" }).click(); await p.waitForTimeout(600);
  await p.locator("#tdPanelBody button", { hasText: "記録しないで終える" }).click(); await p.waitForTimeout(600);
  ok((await todo(p, "s3")).paid === true && !(await ls(p, "expenses")).length && (await status(p)).includes("買い物を終えました"), "⑥ 記録しないで終える: paid, nothing in 家計簿");
  await p.locator("#status button").click(); await p.waitForTimeout(500);
  ok(!(await todo(p, "s3")).paid, "⑥ 元に戻す");
  await p.locator("#todoTabs button", { hasText: "すべて" }).click(); await p.waitForTimeout(300);

  // a filter kept as the app opens again; under きょうやるだけ, neither it nor its line
  await p.click("#td4View"); await p.waitForTimeout(500);
  await p.locator("#tdPanelBody .td4-opt", { hasText: "期限なしだけ" }).click(); await p.waitForTimeout(300);
  await p.click("#sheetDone"); await p.waitForTimeout(400);
  await p.reload(); await p.waitForTimeout(1200);
  ok((await txt(p, "#td4ViewBar")) === "絞り込み：期限なしだけ" && !(await rows(p)).includes("b"), "① kept as the app opens again", await txt(p, "#td4ViewBar"));
  await p.click('#todoList [data-check="g"]'); await p.waitForTimeout(400); // (into today's done)
  await p.evaluate(() => document.querySelector("#todoMore"));
  await hold(p, "c"); await p.waitForTimeout(300);
  await p.locator("#todoMenuGroup button", { hasText: "きょうやるに入れる" }).click(); await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector("#tdFocusCard .btn").click()); await p.waitForTimeout(500);
  ok(await p.evaluate(() => getComputedStyle(document.getElementById("td4ViewBar")).display === "none") && (await rows(p)).includes("c"), "① under きょうやるだけ: no line, its own list", await rows(p));
  await p.evaluate(() => document.querySelector("#tdFocusCard .td-fc-back").click()); await p.waitForTimeout(400);
  await p.locator("#td4ViewBar button").click(); await p.waitForTimeout(300);

  // ③ one with no かかる時間 nor 期限: 2時間 by a week on, at first; 分けるのをやめる
  await hold(p, "d"); await p.waitForTimeout(300);
  await p.locator("#todoMenuGroup button", { hasText: "日に分ける" }).click(); await p.waitForTimeout(600);
  ok((await p.inputValue("#td4SplitTotal")) === "120" && (await p.inputValue("#td4SplitDue")) === "2026-11-18", "③ nothing set: 2時間 by a week on", [await p.inputValue("#td4SplitTotal"), await p.inputValue("#td4SplitDue")]);
  await p.selectOption("#td4SplitTotal", "180"); await p.waitForTimeout(300);
  const n3 = await p.evaluate(() => document.querySelectorAll(".td4-split li").length);
  await p.locator("#tdPanelBody .btn", { hasText: "この案で" }).click(); await p.waitForTimeout(700);
  let d = await todo(p, "d");
  ok(d.parts?.length === n3 && d.due === "2026-11-18" && d.mins === 180, "③ made; the whole one given the 期限 and time picked", [d.parts?.length, n3, d.due, d.mins]);
  await hold(p, "d"); await p.waitForTimeout(300);
  await p.locator("#todoMenuGroup button", { hasText: "日に分けた様子を見る" }).click(); await p.waitForTimeout(600);
  await p.locator("#tdPanelBody button", { hasText: "分けるのをやめる" }).click(); await p.waitForTimeout(600);
  d = await todo(p, "d");
  ok(!d.parts && !(await ls(p, "todos")).some((t) => t.part?.of === "d"), "③ 分けるのをやめる: the parts gone");

  // older data, none of these: as before, no cards, no errors
  const q = await phone(b, WHEN, { deviceScaleFactor: 1 });
  await seed(q, { todos: [{ id: "x", text: "ふつうのToDo", done: false, due: "2026-11-11", createdAt: Date.parse("2026-11-01T09:00:00+09:00") }] }, "todo"); await q.waitForTimeout(900);
  ok(await q.evaluate(() => ["td4ViewBar", "td4ShopCard", "td4WxCard", "td4RepCard"].every((id) => document.getElementById(id).hidden)) && (await rows(q)).join(",") === "x", "older data: as before");
  ok(p.errs.length === 0 && q.errs.length === 0, "no errors on the page", [...p.errs, ...q.errs]);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
