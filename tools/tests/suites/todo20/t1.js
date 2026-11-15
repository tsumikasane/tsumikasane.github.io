// ToDo その20 ①〜⑩, through the hook build at 8828 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8828/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const todo = async (p, id) => (await ls(p, "todos")).find((t) => t.id === id);
const byText = async (p, text) => (await ls(p, "todos")).filter((t) => t.text === text);
const flat = (s) => (s ?? "").replace(/[\s   ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const status = (p) => p.evaluate(() => [document.getElementById("status")?.textContent || "", document.getElementById("sheetStatus").textContent].join("｜")).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td20[f](...a), { f, a });
const menu = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(300); await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(600); };
const hold = async (p, id) => { await p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).closest("li").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), id); await p.waitForTimeout(300); };
const items = (p) => p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent));
const press = async (p, words) => { await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(500); };
const undo = async (p) => { await p.locator("#sheetStatus button:visible, #status button:visible").first().click(); await p.waitForTimeout(500); };
const heads = (p) => p.evaluate(() => [...document.querySelectorAll("#todoList .dayhead [role=heading]")].map((x) => x.textContent));
const rowSub = (p, id) => p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`)?.closest("li")?.querySelector(".sub.due")?.innerText ?? null, id).then(flat);
const firstRows = (p, n) => p.evaluate((n) => [...document.querySelectorAll("#todoList [data-check]")].slice(0, n).map((x) => x.dataset.check), n);
const { T } = D;
async function open(b, when, o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, ...o });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  const data = D.all();
  // ① a lunch tomorrow with 山田さん and 佐藤さん, a shift with 田中 on Friday; ⑩ a ToDo for 英語 (Thursdays)
  data.events = [...data.events, { id: "ev-lu", title: "ランチ", date: "2026-11-12", time: "12:00", endTime: "13:00", with: "山田さん、佐藤さん", createdAt: T("2026-11-01") }];
  data.shifts = [{ id: "sh2", date: "2026-11-13", start: "17:00", end: "22:00", with: ["田中"], createdAt: T("2026-11-01") }];
  data.todos = [...data.todos, { id: "en1", text: "英語の単語テストの勉強", due: "2026-11-12", createdAt: T("2026-11-05") }];
  await seed(p, data, "todo"); await p.waitForTimeout(1200);
  return p;
}
const sheetTitle = (p) => p.evaluate(() => document.getElementById("sheetTitle").textContent);
const closeSheet = async (p) => { await p.evaluate(() => { const b = ["sheetDone", "sheetCancel"].map((id) => document.getElementById(id)).find((x) => x && !x.hidden); b?.click(); }); await p.waitForTimeout(700); await p.evaluate(() => { if (document.getElementById("discardAsk").open) document.getElementById("discardYes").click(); }); await p.waitForTimeout(300); };
const moreItems = async (p) => { await p.click("#todoMore"); await p.waitForTimeout(300); const xs = await items(p); await p.keyboard.press("Escape"); await p.waitForTimeout(300); return xs.map(flat); };
const shown = (p) => p.evaluate(() => [...document.querySelectorAll("#todoList [data-check]")].map((x) => x.dataset.check).sort().join(","));
const at = (s) => Date.parse(`${s}+09:00`);
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-11T08:30:00+09:00");

  // ---- ① 次に会う日
  await W(p, "update", "g", { with: "山田さん" }); await W(p, "update", "a", { from: "田中先生" }); await p.waitForTimeout(400);
  ok((await rowSub(p, "g")).includes("あしたに会う"), "① the day one meets them next, on its row", await rowSub(p, "g"));
  ok((await rowSub(p, "a")).includes("11/13（金）に会う"), "① a shift with them too (田中先生 as 田中)", await rowSub(p, "a"));
  ok(!(await rowSub(p, "c")).includes("会う"), "① none with no one");
  await menu(p, "人ごとのToDo");
  let body = await txt(p, "#tdPanelBody");
  ok(body.includes("山田さん（1件）次に会うあした・ランチ12:00"), "① by each name in 人ごとのToDo", body);
  await closeSheet(p);

  // ---- ② 保存した探し方
  await p.focus("#todoSearch"); await p.fill("#todoSearch", "! @大学"); await p.waitForTimeout(400);
  ok(await p.locator("#td19Chips .td20-save").isVisible(), "② ＋ この探し方を保存 among the buttons");
  await p.locator("#td19Chips .td20-save").click(); await p.waitForTimeout(400);
  ok((await p.inputValue("#todoMenuGroup .ask-field input")) === "! @大学", "② its words as its name at first");
  await p.fill("#todoMenuGroup .ask-field input", "大学の重要"); await p.locator("#todoMenuGroup .ask-go").click(); await p.waitForTimeout(500);
  let set = await W(p, "set");
  ok(set.views.length === 1 && set.views[0].name === "大学の重要" && set.views[0].q === "! @大学", "② kept with the account", set.views);
  await p.fill("#todoSearch", ""); await p.focus("#todoSearch"); await p.waitForTimeout(300);
  ok((await p.locator("#td19Chips button").first().textContent()) === "★ 大学の重要", "② first among the buttons");
  await p.locator("#td19Chips .td20-view").click(); await p.waitForTimeout(400);
  ok((await p.inputValue("#todoSearch")) === "! @大学 " && (await shown(p)) === "a,b,e,g", "② pressed: its words looked for", [await p.inputValue("#todoSearch"), await shown(p)]);
  await p.fill("#todoSearch", ""); await p.click("#todoMore"); await p.waitForTimeout(300); await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  await menu(p, "保存した探し方を消す"); await press(p, "大学の重要");
  ok((await W(p, "set")).views.length === 0, "② taken off");
  await undo(p);
  ok((await W(p, "set")).views.length === 1, "② 元に戻す");

  // ---- ③ 時間の使いかた
  await W(p, "update", "a", { focus: 30 }); await p.waitForTimeout(300);
  await menu(p, "時間の使いかた");
  body = await txt(p, "#tdPanelBody");
  ok((await sheetTitle(p)) === "時間の使いかた" && body.includes("あわせて1時間22分です"), "③ all of it", body);
  ok(/リストごとの集中した時間リストなし.*52分大学30分/.test(body), "③ by list", body);
  ok(!body.includes("ラベルごと"), "③ not by label with none");
  ok(/残りのかかる時間リストなし8時間15分大学8時間12分/.test(body), "③ what is left, by list", body);
  await closeSheet(p);

  // ---- ④ ほかのToDoのサブタスクにする
  await hold(p, "r1");
  ok(!(await items(p)).includes("ほかのToDoのサブタスクにする"), "④ not for a repeat");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await hold(p, "b"); await press(p, "ほかのToDoのサブタスクにする");
  ok((await status(p)).includes("サブタスクのあるToDoは、ほかのToDoのサブタスクにできません"), "④ not one with steps", await status(p));
  await hold(p, "e"); await press(p, "ほかのToDoのサブタスクにする");
  const ps = (await items(p)).map(flat);
  ok(ps[0] === "レポートを書く" && !ps.includes("資料を読む"), "④ the ToDos of its list first", ps);
  await press(p, "レポートを書く");
  let a = await todo(p, "a");
  ok(!(await todo(p, "e")) && a.steps?.length === 1 && a.steps[0].text === "資料を読む" && a.steps[0].due === "2026-11-10" && a.memo === "テーマは環境問題", "④ it goes in as the last step", a.steps);
  ok((await status(p)).includes("「資料を読む」を「レポートを書く」のサブタスクにしました"), "④ said so", await status(p));
  await undo(p); await p.waitForTimeout(300);
  a = await todo(p, "a");
  ok((await todo(p, "e"))?.pct === 40 && !a.steps, "④ 元に戻す: both as they were", a);

  // ---- ⑤ 今月やる
  await hold(p, "f"); await press(p, "今月やる");
  ok((await todo(p, "f")).month === "2026-11" && (await rowSub(p, "f")).includes("今月"), "⑤ kept and on its row", await rowSub(p, "f"));
  await W(p, "update", "j1", { month: "2026-10" }); await p.waitForTimeout(300);
  ok((await moreItems(p)).includes("今月やる（0/1）"), "⑤ in その他, how far along");
  await menu(p, "今月やる");
  body = await txt(p, "#tdPanelBody");
  ok(body.startsWith("11月にやる0/1") && body.includes("銀行で振り込み") && body.includes("先月の残り1件を今月へ"), "⑤ its panel", body);
  await p.locator("#tdPanelBody button", { hasText: "先月の残り" }).click(); await p.waitForTimeout(500);
  ok((await todo(p, "j1")).month === "2026-11" && (await txt(p, "#tdPanelBody")).startsWith("11月にやる0/2"), "⑤ last month's left over, into this one", await txt(p, "#tdPanelBody"));
  await closeSheet(p);
  await p.click('#todoList [data-check="f"]'); await p.waitForTimeout(900);
  ok((await moreItems(p)).includes("今月やる（1/2）"), "⑤ a done one counted");

  // ---- ⑥ 名前の#タグ
  await W(p, "update", "c", { memo: "返信は #連絡 で" }); await W(p, "update", "h", { text: "薬を飲む #健康" }); await p.waitForTimeout(300);
  ok(JSON.stringify((await W(p, "tags")).map(([k]) => k).sort()) === JSON.stringify(["健康", "連絡"]), "⑥ the tags of names and memos", await W(p, "tags"));
  await p.fill("#todoSearch", "#連絡"); await p.waitForTimeout(400);
  ok((await shown(p)) === "c" && (await txt(p, "#td18OpsLine")) === "条件：ラベル・タグ「連絡」", "⑥ looked for as a label", [await shown(p), await txt(p, "#td18OpsLine")]);
  await p.fill("#todoSearch", ""); await p.focus("#todoSearch"); await p.waitForTimeout(300);
  const chips = await p.evaluate(() => [...document.querySelectorAll("#td19Chips button")].map((x) => x.textContent));
  ok(chips.includes("#健康") && chips.includes("#連絡"), "⑥ among the buttons", chips);
  await p.click("#todoMore"); await p.waitForTimeout(300); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await menu(p, "タグの一覧");
  ok((await txt(p, "#tdPanelBody")).includes("#健康1") && (await txt(p, "#tdPanelBody")).includes("#連絡1"), "⑥ タグの一覧", await txt(p, "#tdPanelBody"));
  await p.locator(".td20-tag", { hasText: "#健康" }).click(); await p.waitForTimeout(800);
  ok((await p.inputValue("#todoSearch")) === "#健康" && (await shown(p)) === "h", "⑥ a tag pressed: looked for", [await p.inputValue("#todoSearch"), await shown(p)]);
  await p.fill("#todoSearch", ""); await p.waitForTimeout(300);

  // ---- ⑦ 返事をうながす
  await W(p, "update", "lw", { wait: { since: "2026-11-09", who: "佐藤さん", days: 3 } }); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__shared = null; navigator.share = async (x) => { window.__shared = x; }; });
  await hold(p, "lw"); await press(p, "返事をうながす");
  const shared = await p.evaluate(() => window.__shared);
  ok(shared && shared.title === "佐藤さんへ" && shared.text.startsWith("先日お願いした「本を返す」の件、その後いかがでしょうか？") && shared.text.includes("11月14日（土）までに"), "⑦ a polite word, to LINE and the like", shared);
  ok((await todo(p, "lw")).wait.nudge === "2026-11-11" && (await rowSub(p, "lw")).includes("きょううながした"), "⑦ the day kept, on its row", await rowSub(p, "lw"));
  ok((await rowSub(p, "lw")).includes("あしたに会う"), "① 佐藤さん, whom one meets at lunch tomorrow", await rowSub(p, "lw"));

  // ---- ⑧ 前の晩のまとめ
  await p.click("#todoSettings"); await p.waitForTimeout(900);
  ok((await p.locator("#td20EveOn").count()) === 1 && !(await p.isChecked("#td20EveOn")), "⑧ in ToDo's 編集, off at first");
  await p.locator("#td20EveOn").check(); await p.waitForTimeout(300);
  ok((await W(p, "set")).eve.on === true && (await p.inputValue("#td20EveAt")) === "21:00", "⑧ on, at 21:00");
  await closeSheet(p);
  let al = await W(p, "alarms"), eve = al.find((x) => x.tag === "td-eve2:2026-11-11");
  ok(eve && eve.at === at("2026-11-11T21:00:00") && /^あしたが期限のToDo（\d+ 件）$/.test(eve.title) && eve.body.includes("レポートを書く") && eve.body.includes("プレゼン準備") && !eve.body.includes("前期のレポート"), "⑧ the evening before, the next day's", eve);
  ok((await W(p, "bell", "td-eve2:2026-11-11")) === "前の晩のまとめ", "⑧ its kind");

  // ---- ⑩ 授業の前のお知らせ
  await W(p, "put", { cls: { on: true, min: 10 } }); await p.waitForTimeout(300);
  al = await W(p, "alarms");
  const cl = al.find((x) => x.tag === "td-cls:2026-11-12:ev-en");
  ok(cl && cl.at === at("2026-11-12T10:30:00") && cl.title === "英語（10:40〜）の前に" && cl.body === "この授業のToDo：英語の単語テストの勉強", "⑩ before the class, its ToDos", cl);
  ok(!al.some((x) => String(x.tag).startsWith("td-cls:2026-11-16")), "⑩ none for a class with none");
  ok((await W(p, "bell", cl.tag)) === "授業の前", "⑩ its kind");

  // ---- ⑨ 授業・バイト・予定の最中
  const h0 = al.find((x) => x.url === "./#todo:h" && x.at === at("2026-11-11T20:00:00"));
  ok(!!h0, "⑨ 薬を飲む told at 20:00 as it is", al.filter((x) => x.url === "./#todo:h"));
  await W(p, "put", { busy: true }); await p.waitForTimeout(300);
  al = await W(p, "alarms");
  const h1 = al.find((x) => x.tag === "todo-busy:" + h0.tag);
  ok(h1 && h1.at === at("2026-11-11T21:50:00"), "⑨ in the middle of バイト (13:00〜21:50): as it ends", h1);
  const eve2 = al.find((x) => x.tag === "todo-busy:td-eve2:2026-11-11");
  ok(eve2 && eve2.at === at("2026-11-11T21:50:00") && (await W(p, "bell", eve2.tag)) === "前の晩のまとめ（予定のあと）", "⑨ ⑧'s too, said so", eve2);
  ok(al.some((x) => x.tag === "td-cls:2026-11-12:ev-en" && x.at === at("2026-11-12T10:30:00")), "⑨ ⑩'s not moved");

  // ---- the guide
  const g = await W(p, "guide");
  ok(["前の晩のまとめ", "授業の前のお知らせ", "授業・バイト・予定の最中", "今月やる", "ほかのToDoのサブタスクにする", "名前の#タグ", "保存した探し方", "時間の使いかた", "次に会う日", "返事をうながす"].every((w) => g.includes(`"${w}"`)), "the guide has them");

  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
