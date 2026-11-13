// ToDo その7 ①〜⑩, through the hook build at 8782 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8782/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const todo = async (p, id) => (await ls(p, "todos")).find((t) => t.id === id);
const byText = async (p, text) => (await ls(p, "todos")).filter((t) => t.text === text);
const flat = (s) => (s ?? "").replace(/[\s   ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const status = (p) => p.evaluate(() => [document.getElementById("status")?.textContent || "", document.getElementById("sheetStatus").textContent].join("｜")).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td7[f](...a), { f, a });
const menu = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(300); await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(600); };
const hold = async (p, id) => { await p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).closest("li").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), id); await p.waitForTimeout(300); };
const items = (p) => p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent));
const press = async (p, words) => { await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(500); };
const title = (p) => p.evaluate(() => document.getElementById("sheetTitle").textContent);
const undo = async (p) => { await p.locator("#sheetStatus button:visible, #status button:visible").first().click(); await p.waitForTimeout(500); };
const at = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const cols = (p) => p.evaluate(() => Object.fromEntries([...document.querySelectorAll(".td7-col")].map((c) => [c.className.match(/c-(\w+)/)[1], [...c.querySelectorAll("[data-card]")].map((x) => x.dataset.card).join(",")])));
async function open(b, when) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "todo"); await p.waitForTimeout(1200);
  return p;
}
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-11T08:30:00+09:00");

  // ---- ① ボード: three columns; 始める, まだに戻す, 完了, 戻す; やっている on a row and from a row's menu
  await menu(p, "ボードで見る");
  let c = await cols(p);
  ok((await title(p)) === "ボード" && c.todo === "h,c,a,r1,b,f,lw" && c.doing === "e,g" && c.done === "w1,z3,z9,z6", "① the three columns (begun: 40% and doing; one put aside not shown; a checklist's not)", c);
  ok(flat(await txt(p, ".td7-col.c-doing .td7-col-head")) === "やっている2" && (await txt(p, '.td7-card[data-card="e"] .td7-card-sub')) === "期限切れ（11/10（火））・40%・1時間12分・大学", "① a column's count, a card's words", await txt(p, '.td7-card[data-card="e"] .td7-card-sub'));
  await p.locator('.td7-card[data-card="c"] .td7-move', { hasText: "始める" }).click(); await p.waitForTimeout(500);
  c = await cols(p);
  ok((await todo(p, "c")).doing === "2026-11-11" && c.doing.split(",").includes("c") && !c.todo.split(",").includes("c") && (await p.evaluate(() => document.activeElement?.closest(".td7-card")?.dataset.card)) === "c" && (await status(p)).includes("「メールに返信」を「やっている」にしました"), "① 始める: into やっている, the press kept on it", c);
  await p.locator('.td7-card[data-card="c"] .td7-move', { hasText: "まだに戻す" }).click(); await p.waitForTimeout(500);
  ok(!(await todo(p, "c")).doing && (await cols(p)).todo.split(",").includes("c"), "① まだに戻す");
  await p.locator('.td7-card[data-card="c"] .td7-move', { hasText: "完了" }).click(); await p.waitForTimeout(700);
  ok((await todo(p, "c")).done && (await cols(p)).done.split(",")[0] === "c", "① 完了: done, first in 完了");
  await p.locator('.td7-card[data-card="c"] .td7-move', { hasText: "戻す" }).click(); await p.waitForTimeout(700);
  ok(!(await todo(p, "c")).done && (await cols(p)).todo.split(",").includes("c"), "① 戻す: to do again");
  await p.click('.td7-card[data-card="a"] .td7-card-name'); await p.waitForTimeout(700);
  ok((await p.inputValue("#reText")) === "レポートを書く", "① a card's name opens it");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  ok((await txt(p, '#todoList li:has([data-check="g"]) .td7-doing')) === "やっている" && !(await p.$('#todoList li:has([data-check="e"]) .td7-doing')), "① やっている on a row (not with その6's bar)");
  await hold(p, "a");
  ok((await items(p)).includes("やっているにする") && (await items(p)).includes("このToDoに集中する"), "①⑥ in a row's menu", await items(p));
  await press(p, "やっているにする");
  ok((await todo(p, "a")).doing === "2026-11-11", "① やっているにする from the menu");
  await hold(p, "a"); await press(p, "「まだ」に戻す");
  ok(!(await todo(p, "a")).doing, "① and back");

  // ---- ② リストの期限: 大学's card, its pace, its 期限 changed, its notifications
  await p.locator("#todoTabs button", { hasText: "大学" }).click(); await p.waitForTimeout(500);
  ok(await p.isVisible("#td7ListCard") && (await txt(p, "#td7ListCard .td-fc-n")) === "1/5" && (await txt(p, "#td7ListCard .td-fc-text")) === "12/20（日）まで、あと39日。のこり4件。この2週間に終えたものは、まだありません。", "② 大学's card", await txt(p, "#td7ListCard"));
  await p.click('#todoList [data-check="a"]'); await p.waitForTimeout(2000);
  ok((await txt(p, "#td7ListCard .td-fc-n")) === "2/5" && (await txt(p, "#td7ListCard .td-fc-text")).endsWith("このペースだと12/23（水）ごろになり、期限に間に合いません。") && !!(await p.$("#td7ListCard .td7-warn")), "② one done: the pace (3 left at 1 in 14 days), late, said", await txt(p, "#td7ListCard .td-fc-text"));
  await p.click('#todoList [data-check="a"]'); await p.waitForTimeout(1800);
  await menu(p, "「大学」の期限を変える（12/20）");
  await p.fill("#todoMenuGroup input[type=date]", "2026-12-31"); await p.locator("#todoMenuGroup button", { hasText: "この日にする" }).click(); await p.waitForTimeout(500);
  ok((await ls(p, "todoLists")).find((l) => l.id === "l-uni").due === "2026-12-31" && (await txt(p, "#td7ListCard .td-fc-text")).startsWith("12/31（木）まで、あと50日。"), "② its 期限 changed from その他");
  await undo(p);
  ok((await ls(p, "todoLists")).find((l) => l.id === "l-uni").due === "2026-12-20", "② 元に戻す");
  const la = (await W(p, "alarms", at("2026-11-11", "08:30"))).filter((a) => a.tag.startsWith("td-list:"));
  ok(la.length === 2 && la[0].tag === "td-list:l-uni:7" && la[0].at === at("2026-12-13", "09:00") && la[0].title === "リスト「大学」" && la[0].body === "期限まで、あと7日です（12/20・1 / 5 完了）" && la[1].at === at("2026-12-19", "09:00"), "② told a week before and the day before", la);
  await p.locator("#todoTabs button", { hasText: "すべて" }).click(); await p.waitForTimeout(400);
  ok(await p.isHidden("#td7ListCard"), "② none under すべて");

  // ---- ⑤ サブタスクをToDoに, 1つにまとめる
  await hold(p, "b"); await press(p, "サブタスクをToDoにする");
  ok(JSON.stringify(await items(p)) === JSON.stringify(["単語帳 2章", "小テスト", "まだのサブタスク 2 件をぜんぶ"]), "⑤ its steps still to do", await items(p));
  await press(p, "小テスト");
  let q = (await byText(p, "小テスト"))[0];
  ok(q && q.due === "2026-11-20" && q.listId === "l-uni" && !q.done && (await todo(p, "b")).steps.map((s) => s.text).join("/") === "単語帳 1章/単語帳 2章" && (await status(p)).includes("「小テスト」をToDoにしました"), "⑤ a step made a ToDo (its 期限 and list)", q);
  await undo(p);
  ok(!(await byText(p, "小テスト")).length && (await todo(p, "b")).steps.length === 3, "⑤ 元に戻す");
  await menu(p, "選択して、まとめて変える");
  for (const id of ["c", "f"]) { await p.click(`#todoList [data-check="${id}"]`); await p.waitForTimeout(120); }
  await p.click("#tdSelMore"); await p.waitForTimeout(300); await press(p, "1つのToDoにまとめる");
  ok((await p.inputValue("#todoMenuGroup input[type=text]")) === "メールに返信", "⑤ まとめる: its name asked (the first's at first)");
  await p.fill("#todoMenuGroup input[type=text]", "用事"); await p.locator("#todoMenuGroup button", { hasText: "まとめる" }).click(); await p.waitForTimeout(700);
  q = (await byText(p, "用事"))[0];
  ok(q && q.due === "2026-11-11" && q.steps.map((s) => s.text + (s.done ? "✓" : "")).join("/") === "メールに返信/銀行で振り込み" && q.mins === 15 && !(await todo(p, "c")) && !(await todo(p, "f")) && (await status(p)).includes("2件を「用事」にまとめました"), "⑤ two made one: as its steps, the soonest 期限, their time", q);
  await undo(p);
  ok(!(await byText(p, "用事")).length && (await todo(p, "c")) && (await todo(p, "f")), "⑤ 元に戻す: both back");

  // ---- ⑥ 集中: from a row's menu; 始める, 一時停止, 完了にする, the next
  await hold(p, "a"); await press(p, "このToDoに集中する");
  ok((await title(p)) === "集中" && (await txt(p, ".td7-focus-name")) === "レポートを書く" && (await txt(p, ".td7-focus-sub")) === "期限11/12（木）・かかる時間5時間" && (await txt(p, ".td7-focus-time")) === "25:00", "⑥ the screen: its name, 期限, time", await txt(p, ".td7-focus-sub"));
  await p.locator(".td7-focus-acts button", { hasText: "始める" }).click(); await p.waitForTimeout(500);
  ok((await W(p, "focus"))?.todoId === "a" && (await txt(p, ".td7-focus-kind")) === "集中" && !!(await p.$('.td7-focus-acts button:has-text("一時停止")')), "⑥ 始める: the timer on it");
  await p.locator(".td7-focus-acts button", { hasText: "一時停止" }).click(); await p.waitForTimeout(500);
  ok((await txt(p, ".td7-focus-kind")) === "一時停止中" && !!(await p.$('.td7-focus-acts button:has-text("再開")')), "⑥ 一時停止");
  await p.locator(".td-pick-go button", { hasText: "完了にする" }).click(); await p.waitForTimeout(900);
  ok((await todo(p, "a")).done && !(await W(p, "focus")) && (await txt(p, ".td7-focus-done strong")) === "完了しました！" && !!(await p.$('.td7-focus-done button:has-text("次は「資料を読む」")')), "⑥ 完了にする: the timer ended, done, the next offered");
  await p.locator(".td7-focus-done button", { hasText: "次は" }).click(); await p.waitForTimeout(500);
  ok((await txt(p, ".td7-focus-name")) === "資料を読む", "⑥ on to the next");
  await p.click("#sheetDone"); await p.waitForTimeout(500);
  await p.click('#todoList [data-check="a"]'); await p.waitForTimeout(1800);
  // いまやるなら's 始める: the screen, the timer started
  const top = (await p.evaluate(() => document.querySelector("#td6NowCard .td6-now-name")?.textContent));
  await p.locator("#td6NowCard button", { hasText: "始める" }).click(); await p.waitForTimeout(700);
  ok((await title(p)) === "集中" && (await txt(p, ".td7-focus-name")) === top && (await txt(p, ".td7-focus-kind")) === "集中", "⑥ いまやるなら's 始める: the screen, its timer running", top);
  await p.locator(".td7-focus-acts button", { hasText: "終わる" }).click(); await p.waitForTimeout(400);
  await p.click("#sheetDone"); await p.waitForTimeout(500);

  // ---- ⑦ 追加と完了 in 完了のふりかえり
  await menu(p, "完了のふりかえり");
  const flow = await W(p, "flow");
  const add = flow.reduce((s, x) => s + x.add, 0), done = flow.reduce((s, x) => s + x.done, 0);
  ok(!!(await p.$(".td7-flow")) && (await txt(p, ".td7-legend")) === "追加完了" && (await p.$$(".td7-flow .td7-bar.add")).length === flow.filter((x) => x.add).length && (await p.$$(".td7-flow .td7-bar.done")).length === flow.filter((x) => x.done).length, "⑦ the chart: a legend, a bar for each week's", flow);
  ok((await txt(p, ".td7-flow-say")).startsWith(`この8週で、追加${add}件・完了${done}件。まだのToDoは`), "⑦ said in words", await txt(p, ".td7-flow-say"));
  await p.focus(".td7-flow svg"); await p.keyboard.press("ArrowRight"); await p.waitForTimeout(200);
  ok((await txt(p, ".td7-flow .tip")).startsWith(`${Number(flow[0].w.slice(5, 7))}/${Number(flow[0].w.slice(8))}〜`) && (await txt(p, ".td7-flow .tip")).includes(`追加${flow[0].add}件・完了${flow[0].done}件`), "⑦ a week's numbers (keys)", await txt(p, ".td7-flow .tip"));
  await p.click("#sheetDone"); await p.waitForTimeout(500);

  // ---- ⑧ 完了したときの音 (counted by the tones made)
  await p.evaluate(() => { window.__osc = 0; const A = window.AudioContext || window.webkitAudioContext, o = A.prototype.createOscillator; A.prototype.createOscillator = function () { window.__osc++; return o.call(this); }; });
  await p.click('#todoList [data-check="f"]'); await p.waitForTimeout(400);
  ok((await p.evaluate(() => window.__osc)) === 0, "⑧ none at first");
  await p.click('#todoList [data-check="f"]'); await p.waitForTimeout(1800);
  await p.click("#todoSettings"); await p.waitForTimeout(800);
  ok((await p.inputValue("#td7Sound")) === "" && (await p.inputValue("#td7TidyDays")) === "0", "④⑧ in 編集, off at first");
  await p.selectOption("#td7Sound", "chime"); await p.waitForTimeout(300);
  ok((await p.evaluate(({ P }) => JSON.parse(localStorage.getItem(P + "td7Sound")), { P })) === "chime" && (await p.evaluate(() => window.__osc)) === 2, "⑧ チャイム picked (kept on this device; played as picked)");
  await p.click("#sheetDone"); await p.waitForTimeout(500);
  await p.click('#todoList [data-check="f"]'); await p.waitForTimeout(400);
  ok((await p.evaluate(() => window.__osc)) === 4, "⑧ as one is checked off");
  await p.click('#todoList [data-check="f"]'); await p.waitForTimeout(1800);
  ok((await p.evaluate(() => window.__osc)) === 4, "⑧ not as one is checked back on");

  // ---- ④ 整理: 30 days; 履修登録 (done 10/1) to 最近削除, with 元に戻す
  await p.click("#todoSettings"); await p.waitForTimeout(800);
  await p.selectOption("#td7TidyDays", "30"); await p.waitForTimeout(700);
  ok(((await ls(p, "settings")).find((x) => x.id === "todoTidy") || {}).days === 30 && !(await todo(p, "old1")) && (await status(p)).includes("完了してから30日たったToDoを1件、最近削除に移しました"), "④ 30 days: 履修登録 to 最近削除, said");
  ok((await txt(p, "#td7TidyFoot")).startsWith("完了してから30日たったToDoを、自動で「最近削除」に移します"), "④ said in 編集");
  await undo(p);
  ok(!!(await todo(p, "old1")), "④ 元に戻す");
  await p.click("#sheetDone"); await p.waitForTimeout(500);

  // ---- ⑨ 見通しで期限を動かす: メールに返信 to tomorrow; 部屋の片付け (no 期限) to Saturday; 終わる
  await p.click("#todoWeek"); await p.waitForTimeout(600);
  await p.locator("#tdPanelBody .td7-week-move").click(); await p.waitForTimeout(400);
  ok((await txt(p, "#tdPanelBody .td-panel-lead")).startsWith("動かすToDoを押してから") && (await p.$$(".td7-here")).length === 0, "⑨ 期限を動かす: what to do");
  await p.click('.td7-piece[data-piece="c"]'); await p.waitForTimeout(300);
  ok((await p.getAttribute('.td7-piece[data-piece="c"]', "aria-pressed")) === "true" && (await p.$$(".td7-here")).length === 6, "⑨ picked: ここへ on the other 6 days");
  await p.locator(".td7-here", { hasText: "ここへ" }).first().click(); await p.waitForTimeout(500);
  ok((await todo(p, "c")).due === "2026-11-12" && (await status(p)).includes("「メールに返信」をあしたに移しました") && (await p.evaluate(() => document.activeElement?.dataset?.piece)) === "c", "⑨ moved to tomorrow; the press on it again");
  await undo(p);
  ok((await todo(p, "c")).due === "2026-11-11", "⑨ 元に戻す");
  await p.click('.td7-piece[data-piece="d"]'); await p.waitForTimeout(300);
  await p.locator(".td7-move-day", { hasText: "11月14日" }).locator(".td7-here").click(); await p.waitForTimeout(500);
  ok((await todo(p, "d")).due === "2026-11-14", "⑨ one with no 期限 put on Saturday");
  await p.locator("#tdPanelBody .td7-move-top button", { hasText: "終わる" }).click(); await p.waitForTimeout(400);
  ok(!!(await p.$("#tdPanelBody .td7-week-move")) && !(await p.$(".td7-piece")), "⑨ 終わる: 見通し as it was");
  await p.click("#sheetDone"); await p.waitForTimeout(500);

  // ---- ⑩ ファイル: attached in its sheet, on its row, opened, taken off, kept after a reload
  await p.click('#todoList [data-edit="g"]'); await p.waitForTimeout(800);
  ok(!!(await p.$("#reFiles .td7-file-add")) && (await txt(p, "#reFiles .td-note")) === "この端末だけに残ります（同期やバックアップには入りません）。", "⑩ in its sheet");
  await p.setInputFiles("#reFiles input[type=file]", { name: "発表資料.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n" + "x".repeat(3000)) });
  await p.waitForTimeout(800);
  ok((await txt(p, "#reFiles .td7-file-name")) === "発表資料.pdf" && (await txt(p, "#reFiles .td7-file-size")) === "3KB" && (await status(p)).includes("ファイルを1個付けました"), "⑩ attached, its name and size", await txt(p, "#reFiles"));
  await p.evaluate(() => { window.__dlName = null; const c = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) window.__dlName = this.download; return c.call(this); }; });
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 5000 }).catch(() => null), p.click("#reFiles .td7-file-open")]);
  const dlSize = dl ? require("fs").statSync(await dl.path()).size : -1;
  // (this test browser names any download with letters past ASCII "download"; the link's own name is what a phone uses)
  ok(dl && dlSize === 3009 && (await p.evaluate(() => window.__dlName)) === "発表資料.pdf", "⑩ opened: the file itself, by its name", [dl && dl.suggestedFilename(), dlSize]);
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  ok((await txt(p, '#todoList li:has([data-check="g"]) .td7-files')) === "ファイル1", "⑩ counted on its row");
  await p.reload(); await p.waitForTimeout(1500);
  ok(JSON.stringify(await W(p, "files", "g")) === JSON.stringify([{ name: "発表資料.pdf", size: 3009, type: "application/pdf" }]) && (await txt(p, '#todoList li:has([data-check="g"]) .td7-files')) === "ファイル1", "⑩ kept on this device (after a reload)");
  await p.click('#todoList [data-edit="g"]'); await p.waitForTimeout(800);
  await p.click("#reFiles .td7-file-del"); await p.waitForTimeout(500);
  ok(!(await p.$("#reFiles .td7-file-name")) && (await W(p, "files", "g")).length === 0, "⑩ taken off");
  await undo(p); await p.waitForTimeout(300);
  ok((await W(p, "files", "g")).length === 1 && (await txt(p, "#reFiles .td7-file-name")) === "発表資料.pdf", "⑩ 元に戻す");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  const errs = [...p.errs];
  await p.context().close();

  // ---- ③ きょうのしめくくり (21:30): the card, あしたに回す, one by one, ×
  const e = await open(b, "2026-11-11T21:30:00+09:00");
  ok(await e.isVisible("#td7CloseCard") && (await txt(e, "#td7CloseCard .td-fc-text")) === "きょう終えたものは、まだありません。残り3件：「資料を読む」「薬を飲む」「メールに返信」", "③ the evening's card (a checklist's checks not counted)", await txt(e, "#td7CloseCard .td-fc-text"));
  await e.locator("#td7CloseCard button", { hasText: "残りをあしたに回す" }).click(); await e.waitForTimeout(600);
  let xs = await ls(e, "todos"), due = (id) => xs.find((t) => t.id === id).due;
  ok(due("e") === "2026-11-12" && due("h") === "2026-11-12" && due("c") === "2026-11-12" && xs.find((t) => t.id === "c").moved === 1 && await e.isHidden("#td7CloseCard") && (await status(e)).includes("3件をあしたに回しました"), "③ the rest to tomorrow (put off once), the card gone");
  await undo(e);
  xs = await ls(e, "todos");
  ok(due("e") === "2026-11-10" && due("c") === "2026-11-11" && await e.isVisible("#td7CloseCard"), "③ 元に戻す");
  await e.locator("#td7CloseCard button", { hasText: "1件ずつ見直す" }).click(); await e.waitForTimeout(600);
  ok((await title(e)) === "きょうのしめくくり" && (await e.$$("#tdPanelBody .td7-close-row")).length === 3, "③ one by one");
  await e.locator('.td7-close-row button[aria-label="「メールに返信」を週末"]').click(); await e.waitForTimeout(500);
  ok((await todo(e, "c")).due === "2026-11-14" && (await e.$$("#tdPanelBody .td7-close-row")).length === 2, "③ 週末: Saturday, out of the rest");
  await e.locator('.td7-close-row button[aria-label="「薬を飲む」をやめる"]').click(); await e.waitForTimeout(600);
  ok((await todo(e, "h")).cancelled === true && (await e.$$("#tdPanelBody .td7-close-row")).length === 1, "③ やめる");
  await e.click("#sheetDone"); await e.waitForTimeout(500);
  await e.click('#td7CloseCard button[aria-label="きょうは出さない"]'); await e.waitForTimeout(400);
  ok(await e.isHidden("#td7CloseCard") && (await status(e)).includes("「きょうのしめくくり」は、きょうは出しません"), "③ ×: not for today");
  errs.push(...e.errs);

  ok(!errs.length, "no errors", errs);
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  await b.close();
})();
