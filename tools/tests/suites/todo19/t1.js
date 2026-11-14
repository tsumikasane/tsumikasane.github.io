// ToDo その19 ①〜⑩, through the hook build at 8827 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8827/";
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
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td19[f](...a), { f, a });
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
  // ④ ひとこと on some done ones (and a repeat's turn before); ① a shift tomorrow
  const note = { w1: "天気がよかった", x1: "3行だけ書けた", old1: "締め切りギリギリ" };
  data.todos = [...data.todos.map((t) => (note[t.id] ? { ...t, doneNote: note[t.id] } : t)), { id: "r0", text: "ゴミ出し", done: true, doneAt: T("2026-11-09", 8), due: "2026-11-09", next: "r1", doneNote: "袋が足りなかった", createdAt: T("2026-11-02") }];
  data.shifts = [{ id: "sh1", date: "2026-11-12", start: "17:00", end: "22:00", createdAt: T("2026-11-01") }];
  await seed(p, data, "todo"); await p.waitForTimeout(1200);
  return p;
}
const sheetTitle = (p) => p.evaluate(() => document.getElementById("sheetTitle").textContent);
const closeSheet = async (p) => { await p.evaluate(() => { const b = ["sheetDone", "sheetCancel"].map((id) => document.getElementById(id)).find((x) => x && !x.hidden); b?.click(); }); await p.waitForTimeout(700); await p.evaluate(() => { if (document.getElementById("discardAsk").open) document.getElementById("discardYes").click(); }); await p.waitForTimeout(300); };
const moreItems = async (p) => { await p.click("#todoMore"); await p.waitForTimeout(300); const xs = await items(p); await p.keyboard.press("Escape"); await p.waitForTimeout(300); return xs.map(flat); };
const shown = (p) => p.evaluate(() => [...document.querySelectorAll("#todoList [data-check]")].map((x) => x.dataset.check).sort().join(","));
const chip = async (p, words) => { await p.locator("#td19Chips button", { hasText: words }).first().click(); await p.waitForTimeout(400); };
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-11T08:30:00+09:00");

  // ---- ① 予定のあとに知らせる
  const ends = await W(p, "ends");
  ok(ends.map((c) => `${c.n}|${c.d}|${c.time}|${c.k}`).join(",") === "ゼミ|2026-11-11|09:30|授業,バイト|2026-11-11|21:50|予定,英語|2026-11-12|12:10|授業,インターン|2026-11-12|21:00|予定,バイト|2026-11-12|22:00|バイト", "① today's and tomorrow's ends: classes, plans and a shift", ends);
  await hold(p, "f");
  ok((await items(p)).includes("予定のあとに知らせる"), "① in a row's menu");
  await press(p, "予定のあとに知らせる");
  const asks = (await items(p)).map(flat);
  ok(asks.includes("ゼミのあと（9:30）") && asks.includes("英語のあと（あした12:10）") && asks.includes("バイトのあと（あした22:00）"), "① each a choice", asks);
  await press(p, "英語のあと");
  let f = await todo(p, "f");
  ok(f.due === "2026-11-12" && f.time === "12:10" && f.remind === true && f.aft?.n === "英語", "① its 期限 and time the class's end, with お知らせ", f);
  ok((await status(p)).includes("「銀行で振り込み」を、英語のあと（あした12:10）にお知らせします"), "① said so", await status(p));
  ok((await rowSub(p, "f")).includes("英語のあと"), "① on its row", await rowSub(p, "f"));
  ok((await W(p, "alarms")).some((a) => a.url === "./#todo:f" && a.at === Date.parse("2026-11-12T12:10:00+09:00")), "① told then");
  await undo(p);
  f = await todo(p, "f");
  ok(f.due === "2026-11-13" && !f.time && !f.aft, "① 元に戻す", f);

  // ---- ② 期限までのバー
  await W(p, "update", "lw", { start: "2026-11-13" }); await p.waitForTimeout(300);
  await menu(p, "期限までのバー");
  ok((await sheetTitle(p)) === "期限までのバー", "② its panel");
  const bars = await p.evaluate(() => [...document.querySelectorAll(".td19-bars-list li")].map((li) => [li.querySelector(".td19-bar-text").textContent, li.querySelector(".td19-bar").getAttribute("style"), li.querySelector(".td19-bar").className]));
  ok(bars.length === 13, "② the ToDos due in the coming three weeks (and past it)", bars.map((x) => x[0]));
  const bar = (name) => bars.find((x) => x[0] === name) || [];
  ok(/grid-column: 1 \/ 2/.test(bar("資料を読む")[1]) && bar("資料を読む")[2].includes("late"), "② past its 期限: red at the start", bar("資料を読む"));
  ok(/grid-column: 1 \/ 11/.test(bar("英単語を覚える")[1]), "② from today to its 期限", bar("英単語を覚える"));
  ok(/grid-column: 3 \/ 5/.test(bar("本を返す")[1]), "② from its 開始日", bar("本を返す"));
  ok((await p.locator(".td19-bd").count()) === 21 && (await txt(p, ".td19-bd.today")) === "11", "② 21 days, today marked");
  await p.locator(".td19-bar-name", { hasText: "銀行で振り込み" }).click(); await p.waitForTimeout(900);
  ok((await p.inputValue("#reText")) === "銀行で振り込み", "② a name opens it");
  await closeSheet(p);

  // ---- ③ これからかかるお金
  ok(!(await moreItems(p)).includes("これからかかるお金"), "③ not offered with no money");
  await W(p, "update", "f", { amount: 1200 }); await W(p, "update", "j1", { amount: 3000 }); await W(p, "update", "sd2", { price: 500 }); await p.waitForTimeout(300);
  await menu(p, "これからかかるお金");
  let body = await txt(p, "#tdPanelBody");
  ok((await sheetTitle(p)) === "これからかかるお金" && body.startsWith("まだのToDo3件で4,700円"), "③ all of it", body);
  ok(body.includes("今週まで1,200円銀行で振り込み") && body.includes("今月3,000円シフトを出す") && body.includes("期限なし500円読書会に行く"), "③ by when", body);
  await closeSheet(p);

  // ---- ④ ひとことの一覧
  await menu(p, "ひとことの一覧");
  body = await txt(p, "#td19NoteList");
  ok((await sheetTitle(p)) === "ひとことの一覧" && /^11月（3）「3行だけ書けた」.*「天気がよかった」.*「袋が足りなかった」.*10月（1）「締め切りギリギリ」/.test(body), "④ the newest first, by the month", body);
  await p.fill("#td19NoteFind", "天気"); await p.waitForTimeout(300);
  body = await txt(p, "#td19NoteList");
  ok(body.includes("天気がよかった") && !body.includes("袋が足りなかった"), "④ narrowed by its words", body);
  await p.fill("#td19NoteFind", "ゴミ"); await p.waitForTimeout(300);
  ok((await txt(p, "#td19NoteList")).includes("袋が足りなかった"), "④ or its ToDo's name");
  ok((await p.evaluate(() => document.activeElement?.id)) === "td19NoteFind", "④ the field kept as it is drawn again");
  await p.locator(".td19-note", { hasText: "袋が足りなかった" }).click(); await p.waitForTimeout(900);
  ok((await p.inputValue("#reText")) === "ゴミ出し", "④ pressed: its ToDo");
  await closeSheet(p);

  // ---- ⑤ リストの絵文字
  await p.locator("#todoTabs button", { hasText: "大学" }).click(); await p.waitForTimeout(400);
  await menu(p, "「大学」に絵文字を付ける");
  await p.locator("#todoMenuGroup .emo-btn", { hasText: "📚" }).click(); await p.waitForTimeout(500);
  ok((await W(p, "lists")).find((l) => l.id === "l-uni").emo === "📚", "⑤ kept with the list");
  ok((await txt(p, '#todoTabs [data-list="l-uni"]')).startsWith("📚大学"), "⑤ on its tab", await txt(p, '#todoTabs [data-list="l-uni"]'));
  ok(!(await rowSub(p, "a")).includes("📚"), "⑤ not on a row in its own list", await rowSub(p, "a"));
  await p.locator("#todoTabs button", { hasText: "すべて" }).click(); await p.waitForTimeout(400);
  ok((await rowSub(p, "a")).includes("📚大学"), "⑤ on its rows under すべて", await rowSub(p, "a"));
  await p.locator("#todoTabs button", { hasText: "大学" }).click(); await p.waitForTimeout(400);
  ok((await moreItems(p)).includes("「大学」の絵文字を変える（いま📚）"), "⑤ and changed");
  await menu(p, "「大学」の絵文字を変える"); await press(p, "絵文字をはずす");
  ok(!(await W(p, "lists")).find((l) => l.id === "l-uni").emo && !(await txt(p, '#todoTabs [data-list="l-uni"]')).includes("📚"), "⑤ taken off");
  await p.locator("#todoTabs button", { hasText: "すべて" }).click(); await p.waitForTimeout(400);

  // ---- ⑥ 探す条件のボタン
  ok(await p.evaluate(() => !document.getElementById("td19Chips") || document.getElementById("td19Chips").hidden), "⑥ none at first");
  await p.focus("#todoSearch"); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => document.getElementById("td19Chips").hidden)) && (await p.locator("#td19Chips button").count()) >= 13, "⑥ the conditions as the field is pressed");
  await chip(p, "重要");
  ok((await p.inputValue("#todoSearch")) === "! " && (await shown(p)) === "a,b,e,g", "⑥ one pressed: put in", [await p.inputValue("#todoSearch"), await shown(p)]);
  ok((await p.locator('#td19Chips button[data-op="!"]').getAttribute("aria-pressed")) === "true" && (await p.evaluate(() => document.activeElement?.id)) === "todoSearch", "⑥ said pressed, the field still in use");
  await chip(p, "来週");
  ok((await shown(p)) === "b" && (await txt(p, "#td18OpsLine")) === "条件：重要・期限が来週", "⑥ another with it (期限:来週)", [await shown(p), await txt(p, "#td18OpsLine")]);
  await chip(p, "重要");
  ok((await p.inputValue("#todoSearch")).trim() === "期限:来週" && (await shown(p)) === "b,j1", "⑥ pressed again: taken out", [await p.inputValue("#todoSearch"), await shown(p)]);
  await p.fill("#todoSearch", "繰り返し:あり"); await p.waitForTimeout(400);
  ok((await shown(p)) === "r1,ra10,rp3", "⑥ 繰り返し:あり", await shown(p));
  await p.fill("#todoSearch", "サブタスク:あり メモ:あり"); await p.waitForTimeout(400);
  ok((await shown(p)) === "", "⑥ サブタスク and メモ", await shown(p));
  await p.fill("#todoSearch", "期限:今月 @大学"); await p.waitForTimeout(400);
  ok((await shown(p)) === "a,b,e,g", "⑥ 期限:今月", await shown(p));
  await p.fill("#todoSearch", ""); await p.waitForTimeout(300);
  await chip(p, "@大学");
  ok((await shown(p)) === "a,b,e,g,old1", "⑥ a list's button (its done ones too, as words looked for show them)", await shown(p));
  await p.fill("#todoSearch", ""); await p.waitForTimeout(300);
  await p.click("#todoMore"); await p.waitForTimeout(300); await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById("td19Chips").hidden), "⑥ gone as the field is left");

  // ---- ⑦ 1日あたりの目安
  ok((await W(p, "per", "a")) === 150 && (await rowSub(p, "a")).includes("1日約2時間30分"), "⑦ what is left over the days to its 期限", await rowSub(p, "a"));
  ok((await W(p, "per", "g")) === 45 && (await W(p, "per", "b")) === 0 && (await W(p, "per", "k8")) === 0, "⑦ not under ten minutes a day, nor for one due today");
  await W(p, "update", "a", { pct: 50 }); await p.waitForTimeout(300);
  ok((await W(p, "per", "a")) === 75, "⑦ less its 進み具合");
  await W(p, "update", "a", { pct: undefined }); await p.waitForTimeout(300);

  // ---- ⑧ いっしょにやる人
  await hold(p, "g"); await press(p, "いっしょにやる人");
  await p.fill("#todoMenuGroup .ask-field input", "山田さん"); await p.locator("#todoMenuGroup .ask-go").click(); await p.waitForTimeout(500);
  ok((await todo(p, "g")).with === "山田さん" && (await rowSub(p, "g")).includes("山田さんと"), "⑧ kept and on its row", await rowSub(p, "g"));
  ok(JSON.stringify(await W(p, "people")) === JSON.stringify([{ who: "山田さん", from: [], wait: [], with: ["g"] }]), "⑧ in 人ごとのToDo", await W(p, "people"));
  await menu(p, "人ごとのToDo");
  ok((await txt(p, "#tdPanelBody")).includes("山田さん（1件）プレゼン準備いっしょにやる・期限11/12（木）"), "⑧ its row there", await txt(p, "#tdPanelBody"));
  await closeSheet(p);
  await hold(p, "g");
  ok((await items(p)).includes("いっしょにやる人を変える（山田さん）"), "⑧ and changed");
  await press(p, "いっしょにやる人を変える"); await press(p, "いっしょにやる人をはずす");
  ok(!(await todo(p, "g")).with, "⑧ taken off");

  // ---- ⑨ 繰り返しをまとめて休む
  await menu(p, "繰り返しをまとめて休む"); await press(p, "1週間");
  const due = async (id) => (await todo(p, id)).due;
  ok((await due("r1")) === "2026-11-19" && (await due("rp3")) === "2026-11-20" && (await due("ra10")) === "2026-11-18", "⑨ each to its first turn from that day", [await due("r1"), await due("rp3"), await due("ra10")]);
  ok((await todo(p, "r1")).rest?.until === "2026-11-18" && (await todo(p, "r1")).rest?.due === "2026-11-12", "⑨ as その6's 休む");
  ok((await status(p)).includes("繰り返しのToDo3件を休みます。11/18（水）から戻ります"), "⑨ said so", await status(p));
  ok((await moreItems(p)).includes("繰り返しの休みをまとめてやめる（3件）"), "⑨ and back at once");
  await menu(p, "繰り返しの休みをまとめてやめる");
  ok((await due("r1")) === "2026-11-12" && (await due("rp3")) === "2026-11-11" && (await due("ra10")) === "2026-11-11" && !(await todo(p, "r1")).rest, "⑨ the rest taken off", [await due("r1"), await due("rp3"), await due("ra10")]);

  // ---- ⑩ 期限まで毎日知らせる
  await hold(p, "b"); await press(p, "期限まで毎日知らせる"); await press(p, "3日前から");
  ok((await todo(p, "b")).cd === 3 && (await rowSub(p, "b")).includes("毎朝"), "⑩ kept and on its row", await rowSub(p, "b"));
  let cds = (await W(p, "alarms")).filter((a) => String(a.tag).startsWith("td-cd:b:"));
  ok(cds.length === 3 && cds[0].at === Date.parse("2026-11-17T09:00:00+09:00") && cds[0].body === "期限まで、あと3日です（11月20日（金））" && cds[2].body === "期限まで、あと1日です（11月20日（金））" && cds[0].url === "./#todo:b", "⑩ each morning from 3 days before", cds);
  ok((await W(p, "bell", "td-cd:b:2026-11-17")) === "期限まで毎日", "⑩ its kind in これから届くお知らせ");
  await hold(p, "b"); await press(p, "期限まで毎日知らせる（3日前から）"); await press(p, "1週間前から");
  cds = (await W(p, "alarms")).filter((a) => String(a.tag).startsWith("td-cd:b:"));
  ok(cds.length === 7, "⑩ or from a week before", cds.length);
  await hold(p, "b"); await press(p, "期限まで毎日知らせる"); await press(p, "毎日知らせるのをやめる");
  ok(!(await todo(p, "b")).cd && !(await W(p, "alarms")).some((a) => String(a.tag).startsWith("td-cd:")), "⑩ stopped");

  // ---- the guide
  const g = await W(p, "guide");
  ok(["予定のあとに知らせる", "期限まで毎日知らせる", "1日あたりの目安", "期限までのバー", "繰り返しをまとめて休む", "探す条件のボタン", "リストの絵文字", "いっしょにやる人", "ひとことの一覧", "これからかかるお金"].every((w) => g.includes(`"${w}"`)), "the guide has them");

  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
