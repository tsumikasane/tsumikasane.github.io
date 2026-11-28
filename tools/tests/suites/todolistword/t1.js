// ToDoの設定の「リスト」の下の文字 (the user's call, 2026-11-28): 「ToDoページの上に並ぶタブです。ラベルとは別に作れます。
// リストを消すと、入っていたToDoは「ぜんぶ」にだけ出ます。」 taken off. Not in the settings; the lists' rows and リストを追加
// as before, the words under ラベル and いつものセット kept (not among them); a list still added; no errors
const { chromium } = require("playwright");
const { P, at, phone, seed, T0 } = require("./lib");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const GONE = /ToDoページの上に並ぶタブです|ラベルとは別に作れます|リストを消すと、入っていたToDoは/;
const DATA = {
  todoLists: [{ id: "l-uni", name: "大学", order: 0, createdAt: T0 }, { id: "l-job", name: "バイト", order: 1, createdAt: T0 }],
  todos: [{ id: "t1", title: "レポートを出す", list: "l-uni", createdAt: T0 }],
};
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", "2026-11-28"), { deviceScaleFactor: 1 });
  await seed(p, DATA, "todo");
  await p.click("#todoSettings"); await p.waitForTimeout(800);
  const g = await txt(p, "#todoLabelsGroup");
  ok(await p.isVisible("#todoLabelsGroup") && !GONE.test(g), "the words under リスト: gone", g?.match(GONE)?.[0]);
  const rows = await p.evaluate(() => [...document.querySelectorAll("#todoListRows li input:not([type]), #todoListRows li input[type=text]")].map((i) => i.value)); // (each name in its box)
  ok(g.startsWith("リスト") && rows.join() === "大学,バイト" && await p.isVisible("#todoListAdd"), "リスト kept: its rows and リストを追加", [g.slice(0, 40), rows]);
  ok(g.includes("ToDoに付けて色分けできます。") && g.includes("ラベルを消すと、付いていたToDoは「ラベルなし」になります。") && g.includes("「旅行の持ち物」のような決まった何件かを、"), "the words under ラベル and いつものセット: kept");
  // the head of ラベル right under the lists' card, the space between them as between the others
  const gap = await p.evaluate(() => { const card = document.getElementById("todoListRows").closest(".card"), head = card.nextElementSibling; return { head: head?.tagName === "H3" ? head.textContent : null, gap: head ? Math.round(head.getBoundingClientRect().top - card.getBoundingClientRect().bottom) : null }; });
  ok(gap.head === "ラベル" && gap.gap >= 0 && gap.gap <= 40, "ラベル's head under the lists' card", gap);
  await p.locator("#todoLabelsGroup").screenshot({ path: out + "/todo-lists-393.png" });
  // a list added as before
  await p.click("#todoListAdd"); await p.waitForTimeout(600);
  const lists = await ls(p, "todoLists");
  ok(lists.length === 3 && !GONE.test(await txt(p, "#todoLabelsGroup")), "a list added; the words not back", lists.map((l) => l.name));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "all OK");
})();
