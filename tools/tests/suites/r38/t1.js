// ToDo その8 ①〜⑩, through the hook build at 8783 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8783/";
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
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td8[f](...a), { f, a });
const menu = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(300); await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(600); };
const hold = async (p, id) => { await p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).closest("li").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), id); await p.waitForTimeout(300); };
const items = (p) => p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent));
const press = async (p, words) => { await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(500); };
const title = (p) => p.evaluate(() => document.getElementById("sheetTitle").textContent);
const undo = async (p) => { await p.locator("#sheetStatus button:visible, #status button:visible").first().click(); await p.waitForTimeout(500); };
const heads = (p) => p.evaluate(() => [...document.querySelectorAll("#todoList .dayhead [role=heading]")].map((x) => x.textContent));
const rowSub = (p, id) => p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`)?.closest("li")?.querySelector(".sub.due")?.innerText ?? null, id).then(flat);
const shown = (p, id) => p.evaluate((id) => !!document.querySelector(`#todoList [data-check="${id}"]`), id);
const tabs = (p) => p.evaluate(() => [...document.querySelectorAll("#todoTabs .td-tab:not(.add) .td-tab-name")].map((x) => x.textContent));
const at = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
async function open(b, when, o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, ...o });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "todo"); await p.waitForTimeout(1200);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, "2026-11-11T08:30:00+09:00");

  // ---- ① 繰り返しの間隔: the new form's menu, 間隔を決める…, its turns
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.fill("#todoText", "水やり"); await p.dispatchEvent("#todoText", "input");
  await p.fill("#todoDue", "2026-11-11"); await p.dispatchEvent("#todoDue", "change"); await p.waitForTimeout(200);
  ok(await p.evaluate(() => [...document.querySelectorAll("#todoRepeat option")].some((o) => o.textContent === "間隔を決める…")), "① 間隔を決める… in the new form's menu");
  await p.selectOption("#todoRepeat", "td8:pick"); await p.waitForTimeout(300);
  ok(!!(await p.$(".td8-every")) && (await p.inputValue("#todoRepeat")) === "", "① its fields, the menu as it was", await p.inputValue("#todoRepeat"));
  await p.locator(".td8-every button", { hasText: "やめる" }).click(); await p.waitForTimeout(200);
  ok(!(await p.$(".td8-every")) && (await p.inputValue("#todoRepeat")) === "", "① やめる: nothing changed");
  await p.selectOption("#todoRepeat", "td8:pick"); await p.waitForTimeout(300);
  await p.fill(".td8-every-n", "400"); await p.waitForTimeout(100);
  ok((await txt(p, ".td8-every-say")) === "1〜365日で決めてください。", "① too many: said", await txt(p, ".td8-every-say"));
  await p.fill(".td8-every-n", "3"); await p.waitForTimeout(100);
  ok((await txt(p, ".td8-every-say")) === "繰り返しを「3日ごと」にします。", "① said as it will be", await txt(p, ".td8-every-say"));
  await p.locator(".td8-every button", { hasText: "決める" }).click(); await p.waitForTimeout(300);
  ok((await p.inputValue("#todoRepeat")) === "every3d" && (await p.evaluate(() => document.querySelector("#todoRepeat").selectedOptions[0].textContent)) === "3日ごと", "① 決める: 3日ごと picked");
  await p.click("#todoSave"); await p.waitForTimeout(700);
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  const nw = (await byText(p, "水やり"))[0];
  ok(nw && nw.repeat === "every3d" && nw.due === "2026-11-11", "① added with it", nw);
  ok((await rowSub(p, nw.id)).includes("3日ごと"), "① on its row", await rowSub(p, nw.id));
  ok((await W(p, "next", "rp3")) === "2026-11-14" && (await W(p, "next", "ra10")) === "2026-11-21", "① the next turns (3日ごと, 完了から10日後)");
  await p.click('#todoList [data-check="rp3"]'); await p.waitForTimeout(700);
  await p.click('#todoList [data-check="ra10"]'); await p.waitForTimeout(700);
  const rp = (await byText(p, "植物に水やり")).find((t) => !t.done), ra = (await byText(p, "シーツを洗う")).find((t) => !t.done);
  ok(rp?.due === "2026-11-14" && rp.repeat === "every3d" && ra?.due === "2026-11-21" && ra.repeat === "after10d", "① checked off: the next turns come", [rp, ra]);
  // in its own sheet: picked, changed to 2か月ごと
  await p.click(`#todoList [data-edit="${rp.id}"]`); await p.waitForTimeout(800);
  ok((await p.inputValue("#reRepeat")) === "every3d", "① its sheet's menu has it", await p.inputValue("#reRepeat"));
  await p.selectOption("#reRepeat", "td8:pick"); await p.waitForTimeout(300);
  ok((await p.inputValue(".td8-every-n")) === "3" && (await p.inputValue(".td8-every-u")) === "d", "① its fields start from it");
  await p.fill(".td8-every-n", "2"); await p.selectOption(".td8-every-u", "m"); await p.waitForTimeout(100);
  await p.locator(".td8-every button", { hasText: "決める" }).click(); await p.waitForTimeout(300);
  await p.click("#recSave"); await p.waitForTimeout(700);
  ok((await todo(p, rp.id)).repeat === "every2m", "① changed in its sheet: 2か月ごと", (await todo(p, rp.id)).repeat);
  ok((await W(p, "next", rp.id)) === "2027-01-14", "① 2か月ごと's next", await W(p, "next", rp.id));
  // a few words; kept when coming back (最近削除, a file)
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.fill("#todoText", "コンタクトを替える 3か月ごと"); await p.dispatchEvent("#todoText", "input"); await p.waitForTimeout(300);
  ok((await txt(p, "#todoParse")).includes("3か月ごと"), "① a few words: 3か月ごと read", await txt(p, "#todoParse"));
  await p.click("#todoParse button"); await p.waitForTimeout(300);
  ok((await p.inputValue("#todoRepeat")) === "every3m", "① put in the menu", await p.inputValue("#todoRepeat"));
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  ok(await W(p, "fits", { text: "x", repeat: "every3d", due: "2026-11-11" }) && await W(p, "fits", { text: "x", repeat: "after10d" }) && !(await W(p, "fits", { text: "x", repeat: "every999d" })), "① kept as records (fits)");

  // ---- ② いつかやる
  await hold(p, "f");
  ok((await items(p)).includes("いつかやるに移す（期限なし）"), "② in a row's menu", await items(p));
  await press(p, "いつかやるに移す");
  let f = await todo(p, "f");
  ok(f.someday === true && !f.due && (await status(p)).includes("「銀行で振り込み」を「いつかやる」にしました"), "② moved: no 期限, said", f);
  ok((await heads(p)).some((h) => h.startsWith("いつかやる")) && !(await shown(p, "f")), "② under いつかやる, folded", await heads(p));
  await undo(p);
  ok((await todo(p, "f")).due === "2026-11-13" && !(await todo(p, "f")).someday, "② 元に戻す");
  await p.locator("#todoList .dayhead button", { hasText: "表示する" }).last().click(); await p.waitForTimeout(300);
  ok(await shown(p, "sd1") && await shown(p, "sd2"), "② 表示する: they show");
  await hold(p, "sd2");
  ok((await items(p)).includes("いつかやるから戻す"), "② back from the menu", await items(p));
  await press(p, "いつかやるから戻す");
  ok(!(await todo(p, "sd2")).someday && (await W(p, "section", "sd2")) === "期限なし", "② back: 期限なし", await W(p, "section", "sd2"));
  ok(!(await txt(p, "#td8SomeCard")).includes("x") && !(await p.isHidden("#td8SomeCard")), "② the month's card (one from October)");
  await p.locator("#td8SomeCard button", { hasText: "見直す" }).click(); await p.waitForTimeout(700);
  ok((await title(p)) === "いつかやる" && (await p.$$(".td8-some-row")).length === 1, "② its sheet", await title(p));
  await p.locator('.td8-some-row[data-some="sd1"] button', { hasText: "きょうにする" }).click(); await p.waitForTimeout(500);
  const sd1 = await todo(p, "sd1");
  ok(!sd1.someday && sd1.due === "2026-11-11", "② きょうにする: back, due today", sd1);
  await p.click("#sheetDone"); await p.waitForTimeout(500);
  ok(await p.isHidden("#td8SomeCard"), "② gone over: no card this month");
  // nothing of them in the counts, いまやるなら or the お知らせ
  await hold(p, "c"); await press(p, "いつかやるに移す");
  ok(!(await W(p, "dueCount")) || (await W(p, "dueCount")) === 5, "② out of the count (c was due today)", await W(p, "dueCount"));
  ok((await W(p, "later", "c")) === true, "② as あとで for the rest (tdLater)");
  await undo(p);

  // ---- ③ 始めどき
  ok((await rowSub(p, "a")).includes("12:30までに始める"), "③ on its row: 12:30 today", await rowSub(p, "a"));
  ok((await rowSub(p, "g")).includes("あした12:30までに始める"), "③ あした 12:30", await rowSub(p, "g"));
  ok(!(await rowSub(p, "b")).includes("始める"), "③ not yet (more than 3 days off)", await rowSub(p, "b"));
  ok((await rowSub(p, "k8")).includes("すぐ始めましょう") && await p.evaluate(() => !!document.querySelector('#todoList [data-check="k8"]').closest("li").querySelector(".td8-start.warn")), "③ too big for today's free time: すぐ", await rowSub(p, "k8"));
  let al = await W(p, "alarms", at("2026-11-11", "08:30"));
  const st = al.find((a) => a.tag === "td-start:a:2026-11-12");
  ok(st && st.at === at("2026-11-11", "12:30") && st.title === "始めどき：レポートを書く" && st.body.includes("かかる時間 5 時間"), "③ its notification", st);
  await p.click("#todoSettings"); await p.waitForTimeout(800);
  await p.click("#td8StartOn"); await p.waitForTimeout(500);
  await p.click("#sheetDone"); await p.waitForTimeout(500);
  al = await W(p, "alarms", at("2026-11-11", "08:30"));
  ok(!al.some((a) => /^td-start/.test(a.tag)) && !(await rowSub(p, "a")).includes("始める"), "③ off: none");
  await p.click("#todoSettings"); await p.waitForTimeout(800); await p.click("#td8StartOn"); await p.waitForTimeout(500); await p.click("#sheetDone"); await p.waitForTimeout(500);

  // ---- ④ 1日の目標
  ok(await p.isHidden("#td8GoalCard"), "④ none at first");
  await p.click("#todoSettings"); await p.waitForTimeout(800);
  await p.selectOption("#td8Goal", "3"); await p.waitForTimeout(500);
  ok((await txt(p, "#td8GoalFoot")).startsWith("1日に3件終えるのが目標です"), "④ set", await txt(p, "#td8GoalFoot"));
  await p.click("#sheetDone"); await p.waitForTimeout(500);
  ok((await txt(p, "#td8GoalCard .td-fc-n")) === "2/3" && (await txt(p, "#td8GoalCard .td-fc-text")) === "あと1件で達成です。きのうまで1日連続で達成しています。", "④ the card (2 checked off in ①)", await txt(p, "#td8GoalCard"));
  await p.evaluate(() => { window.__said = []; new MutationObserver(() => window.__said.push(document.getElementById("status").textContent)).observe(document.getElementById("status"), { childList: true, subtree: true, characterData: true }); });
  await p.click('#todoList [data-check="c"]'); await p.waitForTimeout(1000);
  ok((await txt(p, "#td8GoalCard .td-fc-n")) === "3/3" && (await txt(p, "#td8GoalCard .td-fc-text")) === "きょうの目標を達成しました！2日連続です。" && (await status(p)).includes("きょうの目標3件を達成しました！（2日連続）"), "④ met: said, 2日連続", [await txt(p, "#td8GoalCard"), await status(p)]);
  ok(await p.evaluate(() => document.getElementById("td8GoalCard").classList.contains("met")), "④ its look when met");
  await p.evaluate(() => { window.__said = []; });
  await p.click('#todoList [data-check="h"]'); await p.waitForTimeout(1000);
  ok((await txt(p, "#td8GoalCard .td-fc-n")) === "4/3" && !(await p.evaluate(() => window.__said.some((s) => s.includes("目標")))), "④ more: counted, not said again", await p.evaluate(() => window.__said));

  // ---- ⑤ 5分だけ
  await hold(p, "f");
  ok((await items(p)).includes("5分だけやってみる（タイマー5分）"), "⑤ in a row's menu");
  await press(p, "5分だけやってみる");
  let v = await W(p, "focus");
  ok(v && v.five && v.len === 5 && v.todoId === "f" && (await txt(p, "#focusKind")) === "5分だけ", "⑤ the timer, five minutes", v);
  al = await W(p, "focusAlarms", at("2026-11-11", "08:31"));
  ok(al.map((a) => a.title + ":" + a.body + "@" + a.at).join() === "5分たちました:「銀行で振り込み」、このまま続けますか？@" + at("2026-11-11", "08:35"), "⑤ its notification (no 休憩's)", al);
  await p.context().clock.setFixedTime(new Date("2026-11-11T08:36:30+09:00")); await p.waitForTimeout(800);
  v = await W(p, "focus");
  ok(!v && !(await p.isHidden("#td8FiveCard")) && (await txt(p, "#td8FiveCard .td-fc-text")) === "「銀行で振り込み」を5分やりました。このまま続けますか？", "⑤ over: no 休憩, the card", [v, await txt(p, "#td8FiveCard")]);
  ok(num((await todo(p, "f")).focus) === 5, "⑤ its five minutes kept", (await todo(p, "f")).focus);
  await p.locator("#td8FiveCard button", { hasText: "続ける" }).click(); await p.waitForTimeout(400);
  v = await W(p, "focus");
  ok(v && !v.five && v.len === 25 && v.todoId === "f" && await p.isHidden("#td8FiveCard"), "⑤ 続ける: the timer's own length", v);
  await p.click("#focusStop"); await p.waitForTimeout(400);
  // again, and ここまで
  await hold(p, "f"); await press(p, "5分だけやってみる");
  await p.context().clock.setFixedTime(new Date("2026-11-11T08:43:00+09:00")); await p.waitForTimeout(800);
  await p.locator("#td8FiveCard button", { hasText: "ここまで" }).click(); await p.waitForTimeout(400);
  ok(await p.isHidden("#td8FiveCard") && (await status(p)).includes("5分でも、前に進みました"), "⑤ ここまで");
  // いまやるなら's 5分だけ
  ok(await p.evaluate(() => !!document.querySelector("#td6NowCard .td8-five-btn")), "⑤ in いまやるなら");

  // ---- ⑥ サブタスクの候補
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.fill("#todoText", "レポートを書く（経済学）"); await p.dispatchEvent("#todoText", "input");
  await p.locator("#todoSteps .td8-ideas-btn, .td-steps-edit .td8-ideas-btn").first().click(); await p.waitForTimeout(300);
  let sets = await p.evaluate(() => [...document.querySelectorAll(".td8-idea-set")].map((d) => ({ t: d.querySelector("summary").textContent, open: d.open })));
  ok(sets[0].t === "レポート・課題おすすめ" && sets[0].open && sets.length === 8 && !sets[1].open, "⑥ the sets, what fits first and open", sets);
  await p.locator(".td8-idea-set[open] .td8-idea-go").first().click(); await p.waitForTimeout(300);
  const stepsNew = await p.evaluate(() => [...document.querySelectorAll(".td-steps-edit .td-step-name")].map((x) => x.value));
  ok(stepsNew.join("/") === "テーマ・条件を確かめる/資料を集める/構成を決める/下書きを書く/見直す/提出する" && !(await p.$(".td8-ideas")), "⑥ put in", stepsNew);
  await p.click("#todoSave"); await p.waitForTimeout(700);
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  ok(((await byText(p, "レポートを書く（経済学）"))[0]?.steps || []).length === 6, "⑥ kept with it");
  // in its own sheet: the last one of the same name's, those there left unchecked
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.fill("#todoText", "レポートを書く（経済学）"); await p.dispatchEvent("#todoText", "input");
  await p.locator(".td-steps-edit .td8-ideas-btn").first().click(); await p.waitForTimeout(300);
  sets = await p.evaluate(() => [...document.querySelectorAll(".td8-idea-set")].map((d) => d.querySelector("summary").textContent));
  ok(sets[0] === "前の「レポートを書く（経済学）」のサブタスクおすすめ", "⑥ the last one of the same name's, first", sets);
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  await p.click('#todoList [data-edit="b"]'); await p.waitForTimeout(800);
  ok(!(await p.$("#todoSteps .td8-ideas")), "⑥ the new form's panel gone with its sheet");
  await p.locator("#reSteps .td8-ideas-btn").click(); await p.waitForTimeout(300);
  ok((await txt(p, "#reSteps .td8-ideas-lead")) === "よくある手順から選んで入れられます。" && !(await p.$("#reSteps .td8-idea-set[open]")), "⑥ nothing fits: all closed", await txt(p, "#reSteps .td8-ideas-lead"));
  await p.locator("#reSteps .td8-idea-set summary", { hasText: "テスト勉強" }).click(); await p.waitForTimeout(200);
  const set2 = p.locator("#reSteps .td8-idea-set", { hasText: "テスト勉強" });
  await set2.locator("input").nth(0).uncheck(); await set2.locator("input").nth(1).uncheck();
  await set2.locator(".td8-idea-go").click(); await p.waitForTimeout(300);
  await p.click("#recSave"); await p.waitForTimeout(700);
  const bs = (await todo(p, "b")).steps.map((s) => s.text);
  ok(bs.length === 7 && bs[3] === "苦手なところを洗い出す" && (await todo(p, "b")).steps[0].done, "⑥ some of a set, after those there (their checks kept)", bs);

  // ---- ⑦ 並べ替えと色, ⑧ しまう (ToDo's 編集)
  ok((await tabs(p)).join() === "すべて,大学,持ち物,バイト", "⑦⑧ the tabs (not 前期の授業)", await tabs(p));
  await p.click("#todoSettings"); await p.waitForTimeout(800);
  ok(await p.evaluate(() => [...document.querySelectorAll("#todoListRows li.td8-list-row")].map((li) => li.querySelector("input").value).join()) === "大学,持ち物,バイト"
    && (await txt(p, "#todoListRows .td8-shelf-head")) === "しまったリスト（1）", "⑦⑧ the lists in 編集");
  await p.click('#todoListRows li[data-id="l-uni"] .td8-down'); await p.waitForTimeout(600);
  ok((await W(p, "lists")).map((l) => l.name).join() === "持ち物,大学,バイト,前期の授業" && await p.evaluate(() => document.activeElement?.matches('#todoListRows li[data-id="l-uni"] .td8-down')), "⑦ ↓: moved, still on it", (await W(p, "lists")).map((l) => l.name));
  await p.selectOption('#todoListRows li[data-id="l-uni"] .td8-list-color', "blue"); await p.waitForTimeout(500);
  ok((await W(p, "lists")).find((l) => l.id === "l-uni").color === "blue", "⑦ its colour");
  await p.click('#todoListRows li[data-id="l-job"] .td8-shelve'); await p.waitForTimeout(600);
  ok((await W(p, "lists")).find((l) => l.id === "l-job").archived && (await txt(p, "#todoListRows .td8-shelf-head")) === "しまったリスト（2）" && (await status(p)).includes("リスト「バイト」をしまいました。まだのToDo1件も"), "⑧ しまう", await status(p));
  await p.click('#todoListRows li[data-id="l-old"] .td8-unshelve'); await p.waitForTimeout(600);
  ok(!(await W(p, "lists")).find((l) => l.id === "l-old").archived, "⑧ 戻す");
  await p.click("#sheetDone"); await p.waitForTimeout(500);
  ok((await tabs(p)).join() === "すべて,持ち物,大学,前期の授業", "⑦⑧ the tabs now", await tabs(p));
  ok(await p.evaluate(() => !!document.querySelector("#todoTabs .td-tab-name .td8-dot")), "⑦ a dot on 大学's tab");
  ok((await rowSub(p, "a")).includes("大学") && await p.evaluate(() => !!document.querySelector('#todoList [data-check="a"]').closest("li").querySelector(".td8-list .td8-dot")), "⑦ under すべて, its list on its row", await rowSub(p, "a"));
  ok(!(await shown(p, "j1")) && await shown(p, "old2"), "⑧ バイト's gone from すべて, 前期の授業's back");
  al = await W(p, "alarms", at("2026-11-11", "08:45"));
  ok(al.some((a) => a.tag === "todo:old2:2026-11-12") && (await W(p, "later", "j1")) === true, "⑧ お知らせ back for 前期の授業's; バイト's as あとで");
  await p.fill("#todoSearch", "シフト"); await p.dispatchEvent("#todoSearch", "input"); await p.waitForTimeout(400);
  ok(await shown(p, "j1") && (await heads(p)).some((h) => h.startsWith("しまったリスト")), "⑧ found when looked for, under しまったリスト", await heads(p));
  await p.fill("#todoSearch", ""); await p.dispatchEvent("#todoSearch", "input"); await p.waitForTimeout(300);

  // ---- ⑨ 自分の絞り込み
  await p.click("#td4View"); await p.waitForTimeout(700);
  await p.locator("#tdPanelBody button", { hasText: "新しい絞り込みを作る" }).click(); await p.waitForTimeout(400);
  await p.fill("#td8ViewName", "大学の急ぎ"); await p.selectOption("#td8ViewList", "l-uni"); await p.check("#td8ViewFlag"); await p.selectOption("#td8ViewDue", "3d");
  await p.locator(".td8-view-form button[type=submit]").click(); await p.waitForTimeout(700);
  await p.click("#sheetDone"); await p.waitForTimeout(500);
  let ids = await p.evaluate(() => [...document.querySelectorAll("#todoList [data-check]")].map((x) => x.dataset.check));
  ok(ids.sort().join() === "a,e,g" && (await txt(p, "#td4ViewBar")).includes("絞り込み：大学の急ぎ"), "⑨ made and picked: those it fits", [ids, await txt(p, "#td4ViewBar")]);
  await p.click("#td4View"); await p.waitForTimeout(700);
  ok((await txt(p, ".td8-views .td8-view-sub")) === "大学・重要・3日以内", "⑨ said in its row", await txt(p, ".td8-views .td8-view-sub"));
  await p.locator(".td8-view-edit").click(); await p.waitForTimeout(300);
  await p.selectOption("#td8ViewDue", ""); await p.locator(".td8-view-form button[type=submit]").click(); await p.waitForTimeout(700);
  await p.click("#sheetDone"); await p.waitForTimeout(500);
  ids = await p.evaluate(() => [...document.querySelectorAll("#todoList [data-check]")].map((x) => x.dataset.check));
  ok(ids.includes("b") && ids.includes("a") && !ids.includes("c"), "⑨ 変える: 期限は問わない", ids);
  await p.click("#td4View"); await p.waitForTimeout(700);
  await p.locator(".td8-view-edit").click(); await p.waitForTimeout(300);
  await p.locator(".td8-view-form button", { hasText: "削除" }).click(); await p.waitForTimeout(600);
  ok(!(await W(p, "views")).length && !(await p.$(".td8-views")), "⑨ 削除");
  await undo(p);
  ok((await W(p, "views")).length === 1, "⑨ 元に戻す");
  await p.click("#sheetDone"); await p.waitForTimeout(500);
  ok(!p.errs.length, "no errors (phone)", p.errs);
  await p.context().close();

  // ---- ⑩ キーボード (a computer's)
  p = await open(b, "2026-11-11T08:30:00+09:00", { viewport: { width: 1280, height: 860 }, isMobile: false, hasTouch: false });
  const focused = () => p.evaluate(() => document.activeElement?.dataset?.check || document.activeElement?.id || document.activeElement?.tagName);
  await p.keyboard.press("j"); await p.waitForTimeout(150);
  const first = await focused();
  await p.keyboard.press("j"); await p.waitForTimeout(150);
  const second = await focused();
  await p.keyboard.press("k"); await p.waitForTimeout(150);
  ok(first === "e" && second !== first && (await focused()) === first, "⑩ J・K row to row (its check)", [first, second]);
  await p.keyboard.press("ArrowDown"); await p.waitForTimeout(150);
  ok((await focused()) === second, "⑩ ↓ once on a row");
  await p.keyboard.press("f"); await p.waitForTimeout(500);
  const fl = await todo(p, second);
  await p.keyboard.press("t"); await p.waitForTimeout(500);
  ok(fl.flag && (await todo(p, second)).due === "2026-11-11", "⑩ F 重要, T きょう", [second, fl.flag, (await todo(p, second)).due]);
  await p.evaluate(() => document.querySelector('#todoList [data-check="f"]').focus());
  await p.keyboard.press("m"); await p.waitForTimeout(500);
  ok((await todo(p, "f")).due === "2026-11-12", "⑩ M あした", (await todo(p, "f")).due);
  await p.evaluate(() => document.querySelector('#todoList [data-check="f"]').focus());
  await p.keyboard.press("Space"); await p.waitForTimeout(600);
  ok((await todo(p, "f")).done, "⑩ Space 完了 (the check's own)");
  await p.evaluate(() => document.querySelector('#todoList [data-check="j1"]').focus());
  await p.keyboard.press("Delete"); await p.waitForTimeout(600);
  ok(!(await todo(p, "j1")) && (await status(p)).includes("削除しました"), "⑩ Delete", await status(p));
  await p.keyboard.press("/"); await p.waitForTimeout(200);
  ok((await focused()) === "todoSearch", "⑩ / 探す");
  await p.keyboard.type("n"); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => document.getElementById("daySheet").open)) && (await p.inputValue("#todoSearch")) === "n", "⑩ not while typing");
  await p.fill("#todoSearch", ""); await p.dispatchEvent("#todoSearch", "input"); await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.press("?"); await p.waitForTimeout(400);
  ok((await txt(p, "#todoMenuMsg")) === "キーボードの操作（ToDoのページ）" && (await p.$$(".td8-keys dt")).length === 12, "⑩ ? the list", await txt(p, "#todoMenuMsg"));
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await p.keyboard.press("]"); await p.waitForTimeout(300);
  ok((await W(p, "tab")) === "l-uni", "⑩ ] the next tab", await W(p, "tab"));
  await p.keyboard.press("["); await p.waitForTimeout(300);
  await p.keyboard.press("n"); await p.waitForTimeout(700);
  ok((await title(p)) === "新しいToDo", "⑩ N 新しいToDo", await title(p));
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('#todoList [data-check="c"]').focus());
  await p.keyboard.press("5"); await p.waitForTimeout(400);
  ok((await W(p, "focus"))?.five && (await W(p, "focus")).todoId === "c", "⑩ 5 5分だけ");
  await p.click("#focusStop"); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('#todoList [data-check="c"]').focus());
  await p.keyboard.press("e"); await p.waitForTimeout(700);
  ok((await title(p)) === "ToDoを編集", "⑩ E 開く", await title(p));
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  await p.click("#todoMore"); await p.waitForTimeout(300);
  ok((await items(p)).includes("キーボードの操作（?）"), "⑩ in その他 (a mouse's pointer)", await items(p));
  await p.click("#todoMenuNo"); await p.waitForTimeout(300);
  ok(!p.errs.length, "no errors (computer)", p.errs);
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  await b.close();
})();
function num(v) { return Number(v) || 0; }
