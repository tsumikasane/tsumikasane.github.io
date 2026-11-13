// ToDo その6 ①〜⑩, through the hook build at 8781 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8781/";
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
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td6[f](...a), { f, a });
const menu = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(300); await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(600); };
const hold = async (p, id) => { await p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).closest("li").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), id); await p.waitForTimeout(300); };
const items = (p) => p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent));
const press = async (p, words) => { await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(500); };
const title = (p) => p.evaluate(() => document.getElementById("sheetTitle").textContent);
const undo = async (p) => { await p.locator("#sheetStatus button:visible, #status button:visible").first().click(); await p.waitForTimeout(500); };
const at = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const WHEN = new Date("2026-11-11T08:30:00+09:00"), WK = "2026-11-08";
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "todo"); await p.waitForTimeout(1200);

  // ---- ① いまやるなら: the best five, the card, ほかの候補, ×, and off in 編集
  const now = await W(p, "now");
  ok(now.map((x) => x.id).join(",") === "e,a,g,c,r1", "① the five, best first (not 薬を飲む at 20:00, nor one put aside or a checklist's)", now);
  ok(JSON.stringify(now[0].why) === JSON.stringify(["期限切れ", "重要", "40%まで進んでいる"]) && now[0].left === 72, "① why, and what is left of it (2時間, 40% done)", now[0]);
  ok(await p.isVisible("#td6NowCard") && (await txt(p, "#td6NowCard .td6-now-name")) === "資料を読む" && (await p.evaluate(() => [...document.querySelectorAll("#td6NowCard .td6-now-why .phrase")].map((x) => x.textContent.replace(/[\s\u00a0\u2009\u202f]+/g, "")).join("・"))) === "期限切れ・重要・40%まで進んでいる・のこり1時間12分", "① the card", await txt(p, "#td6NowCard"));
  await p.click("#td6NowCard .td6-now-next"); await p.waitForTimeout(300);
  ok((await txt(p, "#td6NowCard .td6-now-name")) === "レポートを書く" && (await txt(p, "#td6NowCard .td6-now-next")) === "ほかの候補（2/5）" && (await p.evaluate(() => document.activeElement?.classList.contains("td6-now-next"))), "① ほかの候補: the next, the press kept on it");
  for (let i = 0; i < 4; i++) { await p.click("#td6NowCard .td6-now-next"); await p.waitForTimeout(150); }
  ok((await txt(p, "#td6NowCard .td6-now-name")) === "資料を読む", "① round to the first again");
  await p.click("#td6NowCard .td6-now-name"); await p.waitForTimeout(700);
  ok((await p.inputValue("#reText")) === "資料を読む", "① its name opens it");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  await p.click('#td6NowCard button[aria-label="きょうは出さない"]'); await p.waitForTimeout(400);
  ok(await p.isHidden("#td6NowCard") && (await status(p)).includes("「いまやるなら」は、きょうは出しません"), "① ×: not for today, said");
  await undo(p);
  ok(await p.isVisible("#td6NowCard"), "① 元に戻す");
  await p.click("#todoSettings"); await p.waitForTimeout(800);
  ok(await p.isChecked("#td6NowOn"), "① on in 編集");
  await p.click("#td6NowOn"); await p.waitForTimeout(300);
  await p.click("#sheetDone"); await p.waitForTimeout(500);
  ok(await p.isHidden("#td6NowCard"), "① turned off: none");
  await p.click("#todoSettings"); await p.waitForTimeout(800); await p.click("#td6NowOn"); await p.waitForTimeout(300); await p.click("#sheetDone"); await p.waitForTimeout(500);
  ok(await p.isVisible("#td6NowCard"), "① on again");
  // not while looking for words
  await p.fill("#todoSearch", "資料"); await p.waitForTimeout(400);
  ok(await p.isHidden("#td6NowCard") && await p.isHidden("#td6WeekCard"), "①② not while looking for words");
  await p.fill("#todoSearch", ""); await p.waitForTimeout(400);

  // ---- ② 今週やる: the card, the row's mark, its sheet, the filter, the row's menu, and きょうやるを選ぶ
  ok((await txt(p, "#td6WeekCard .td-fc-n")) === "1/3" && (await txt(p, "#td6WeekCard .td-fc-text")) === "のこり：「レポートを書く」「プレゼン準備」", "② the card: 1 of 3 done, what is left", await txt(p, "#td6WeekCard"));
  const weekMarks = await p.evaluate(() => [...document.querySelectorAll("#todoList .td6-week")].map((x) => x.closest("li").querySelector("[data-check]").dataset.check).join(","));
  ok(weekMarks === "a,g", "② 今週 on their rows", weekMarks);
  await p.locator("#td6WeekCard button", { hasText: "選ぶ" }).click(); await p.waitForTimeout(700);
  ok((await title(p)) === "今週やる", "② its sheet");
  const free = await W(p, "weekFree");
  ok((await txt(p, "#tdPanelBody .td-pick-count")) === "3件を選んでいます（1件完了）" && (await txt(p, "#tdPanelBody .td6-week-free")).startsWith("のこり6時間30分、今週の空き時間は") && free > 0, "② how many, how long, and the week's free time", [await txt(p, "#tdPanelBody .td-pick-count"), await txt(p, "#tdPanelBody .td6-week-free"), free]);
  await p.locator("#tdPanelBody .chip-btn", { hasText: "先週の残り 1 件を入れる" }).click(); await p.waitForTimeout(400);
  ok((await todo(p, "lw")).week === WK && (await status(p)).includes("1件を今週やるに入れました"), "② last week's left over, at a press");
  await undo(p);
  ok((await todo(p, "lw")).week === "2026-11-01", "② 元に戻す");
  await p.click('#tdPanelBody [data-wk="c"]'); await p.waitForTimeout(400);
  ok((await todo(p, "c")).week === WK && (await p.getAttribute('#tdPanelBody [data-wk="c"]', "aria-checked")) === "true" && (await p.evaluate(() => document.activeElement?.dataset.wk)) === "c", "② a row pressed: in, the press kept on it");
  await p.click('#tdPanelBody [data-wk="c"]'); await p.waitForTimeout(400);
  ok(!(await todo(p, "c")).week, "② pressed again: out");
  await p.locator("#tdPanelBody .chip-btn", { hasText: "選んだのをぜんぶ外す" }).click(); await p.waitForTimeout(400);
  ok(!(await todo(p, "a")).week && !(await todo(p, "g")).week, "② all out");
  await undo(p);
  ok((await todo(p, "a")).week === WK && (await todo(p, "g")).week === WK, "② 元に戻す");
  await p.click("#sheetDone"); await p.waitForTimeout(500);
  await p.locator("#td6WeekCard button", { hasText: "今週やるだけを表示" }).click(); await p.waitForTimeout(500);
  const onlyWeek = await p.evaluate(() => [...document.querySelectorAll("#todoList [data-check]")].map((x) => x.dataset.check).join(","));
  ok(onlyWeek === "a,g" && (await txt(p, "#td4ViewBar")).includes("今週やるだけ") && !!(await p.$('#td6WeekCard button:has-text("すべてを表示")')), "② only the week's (the filter's chip), すべてを表示", onlyWeek);
  await p.locator("#td6WeekCard button", { hasText: "すべてを表示" }).click(); await p.waitForTimeout(500);
  await hold(p, "c");
  ok((await items(p)).includes("今週やるに入れる"), "② in a row's menu", await items(p));
  await press(p, "今週やるに入れる");
  ok((await todo(p, "c")).week === WK && (await status(p)).includes("「メールに返信」を今週やるに入れました") && (await txt(p, "#td6WeekCard .td-fc-n")) === "1/4", "② put in from the menu: the card counts it");
  await hold(p, "c"); await press(p, "今週やるから外す");
  ok(!(await todo(p, "c")).week, "② and out");
  await menu(p, "きょうやるを選ぶ");
  const heads = await p.evaluate(() => [...document.querySelectorAll("#tdPanelBody .group-head")].map((x) => x.textContent));
  ok(heads[0] === "今週やる（2）" && !!(await p.$('#tdPanelBody .chip-btn:has-text("今週やるの 2 件を選ぶ")')), "② first in きょうやるを選ぶ, with all of them at a press", heads);
  await p.locator("#tdPanelBody .chip-btn", { hasText: "今週やるの 2 件を選ぶ" }).click(); await p.waitForTimeout(400);
  ok((await todo(p, "a")).today === "2026-11-11" && (await todo(p, "g")).today === "2026-11-11", "② both in きょうやる");
  await undo(p);
  await p.click("#sheetDone"); await p.waitForTimeout(500);

  // ---- ③ あとで: under あとで with when it is back, put aside from a row's menu (1時間後), its notification, and back
  ok((await W(p, "section", "d")) === "あとで", "③ one put aside: under あとで");
  await p.locator("#todoList li.dayhead button", { hasText: "表示する" }).click(); await p.waitForTimeout(400);
  ok((await txt(p, '#todoList li:has([data-check="d"]) .td6-snooze')) === "20:00に戻る", "③ when it is back, on its row", await txt(p, '#todoList li:has([data-check="d"])'));
  await hold(p, "c");
  const snoozeAsk = await items(p);
  ok((await items(p)).includes("あとでにする（しばらく隠す）"), "③ in a row's menu", snoozeAsk);
  await press(p, "あとでにする");
  const opts = (await items(p)).map(flat);
  ok(JSON.stringify(opts) === JSON.stringify(["1時間後", "今夜（20:00）", "あしたの朝（09:00）", "週末（11/14（土）09:00）", "この時刻まで"]), "③ the times", opts);
  await press(p, "1時間後");
  ok(num((await todo(p, "c")).snooze) === at("2026-11-11", "09:30") && (await W(p, "section", "c")) === "あとで" && (await status(p)).includes("「メールに返信」を09:30まで「あとで」に入れました"), "③ put aside to 9:30, said", await todo(p, "c"));
  const alarms = await W(p, "alarms", WHEN.getTime());
  ok(alarms.some((a) => a.tag === `todo-snooze:c:${at("2026-11-11", "09:30")}` && a.at === at("2026-11-11", "09:30") && a.title === "メールに返信" && a.body === "期限11/11（水）・あとでにしていたToDoです".replace("期限", "期限 ")), "③ its notification at 9:30", alarms.filter((a) => /snooze/.test(a.tag)));
  const sig1 = await W(p, "sig");
  await undo(p);
  ok(!(await todo(p, "c")).snooze && (await W(p, "sig")) !== sig1, "③ 元に戻す (and the notifications go again)");
  // a time picked: 薬を飲む to 21:00, its own お知らせ at 20:00 and 再通知 at 20:30 held
  await hold(p, "h"); await press(p, "あとでにする");
  await p.fill("#todoMenuGroup input[type=datetime-local]", "2026-11-11T21:00"); await p.locator("#todoMenuGroup button", { hasText: "この時刻まで" }).click(); await p.waitForTimeout(500);
  const hs = (await W(p, "alarms", WHEN.getTime())).filter((a) => a.tag.includes(":h:") || a.tag.startsWith("todo-snooze:h"));
  ok(num((await todo(p, "h")).snooze) === at("2026-11-11", "21:00") && !hs.some((a) => a.tag === "todo:h:2026-11-11") && !hs.some((a) => a.at === at("2026-11-11", "20:30")) && hs.some((a) => a.tag.startsWith("todo-snooze:h:")) && hs.some((a) => a.tag.startsWith("todo-nag:h:") && a.at === at("2026-11-11", "21:30")),
    "③ to a time picked: its お知らせ and 再通知 held till then", hs.map((a) => [a.tag, new Date(a.at).toISOString()]));
  // the time comes: back in the list
  await p.context().clock.setFixedTime(new Date("2026-11-11T21:01:00+09:00")); await W(p, "render"); await p.waitForTimeout(300);
  ok((await W(p, "section", "h")) === "きょう" && (await W(p, "section", "d")) === "期限なし", "③ its time come: back in the list");
  await p.context().clock.setFixedTime(WHEN); await W(p, "render"); await p.waitForTimeout(300);
  ok((await W(p, "section", "d")) === "あとで" && (await W(p, "wake")), "③ (the clock back; drawn again at its time)");
  await p.locator("#todoList li.dayhead button", { hasText: "表示する" }).click().catch(() => {}); await p.waitForTimeout(300);
  await hold(p, "d"); await press(p, "あとでをやめる");
  ok(!(await todo(p, "d")).snooze && (await W(p, "section", "d")) === "期限なし" && (await status(p)).includes("「部屋の片付け」を一覧に戻しました"), "③ あとでをやめる: back at once");
  await hold(p, "h"); await press(p, "あとでをやめる");

  // ---- ④ 繰り返しを休む: ゴミ出し (月・木) for a week, back on its turn after; a day picked; 休みをやめる
  await hold(p, "r1");
  ok((await items(p)).includes("繰り返しを休む"), "④ a repeat's menu");
  await press(p, "繰り返しを休む");
  ok(JSON.stringify((await items(p)).map(flat)) === JSON.stringify(["1週間", "2週間", "1か月", "この日から再開"]), "④ how long", await items(p));
  await press(p, "1週間");
  let r1 = await todo(p, "r1");
  ok(r1.due === "2026-11-19" && JSON.stringify(r1.rest) === JSON.stringify({ until: "2026-11-18", due: "2026-11-12" }) && (await W(p, "section", "r1")) === "あとで" && (await status(p)).includes("「ゴミ出し」の繰り返しを休みます。11/19（木）の回から戻ります"), "④ a week: its first turn from 11/18 (Thursday 11/19), under あとで", r1);
  ok((await txt(p, '#todoList li:has([data-check="r1"]) .td6-rest')) === "休み中（11/18（水）から）", "④ said on its row", await txt(p, '#todoList li:has([data-check="r1"])'));
  await undo(p);
  r1 = await todo(p, "r1");
  ok(r1.due === "2026-11-12" && !r1.rest, "④ 元に戻す");
  await hold(p, "r1"); await press(p, "繰り返しを休む");
  await p.fill("#todoMenuGroup input[type=date]", "2026-11-30"); await p.locator("#todoMenuGroup button", { hasText: "この日から再開" }).click(); await p.waitForTimeout(500);
  r1 = await todo(p, "r1");
  ok(r1.due === "2026-11-30" && r1.rest.until === "2026-11-30", "④ to a day: 11/30 is a Monday, its turn", r1);
  await hold(p, "r1");
  ok((await items(p)).includes("繰り返しの休みをやめる"), "④ 休みをやめる offered");
  await press(p, "繰り返しの休みをやめる");
  r1 = await todo(p, "r1");
  ok(r1.due === "2026-11-12" && !r1.rest && (await W(p, "section", "r1")) === "あした" && (await status(p)).includes("休みをやめました。次は11/12（木）です"), "④ 休みをやめる: on its turn from today", r1);
  await hold(p, "c");
  ok(!(await items(p)).includes("繰り返しを休む"), "④ not for one that doesn't repeat");
  await p.click("#todoMenuNo"); await p.waitForTimeout(300);

  // ---- ⑤ 進み具合: on a row, from the menu, in its sheet; what is left counts in 間に合うかチェック
  ok((await txt(p, '#todoList li:has([data-check="e"]) .td6-pct')) === "進み具合40%" && (await p.evaluate(() => document.querySelector('#todoList li:has([data-check="e"]) .td6-pct-bar i').style.width)) === "40%", "⑤ on its row: a bar and 40%");
  await hold(p, "c"); await press(p, "進み具合を入れる");
  ok((await p.$$("#todoMenuGroup .td6-pct-opt")).length === 9, "⑤ 10〜90%");
  await p.locator("#todoMenuGroup .td6-pct-opt", { hasText: "30%" }).click(); await p.waitForTimeout(500);
  ok((await todo(p, "c")).pct === 30 && (await status(p)).includes("進み具合を 30% にしました".replace(/\s/g, "")), "⑤ 30%, said", await status(p));
  await hold(p, "c");
  ok((await items(p)).includes("進み具合を変える（30%）"), "⑤ the menu says how far", await items(p));
  await press(p, "進み具合を変える"); await press(p, "進み具合を消す");
  ok(!(await todo(p, "c")).pct, "⑤ 消す");
  ok((await W(p, "est", "e")) === 72, "⑤ 間に合うかチェック counts what is left (72 of 120 minutes)");
  await p.click('#todoList [data-edit="e"]'); await p.waitForTimeout(700);
  ok((await p.inputValue("#reProg")) === "40", "⑤ in its sheet");
  await p.selectOption("#reProg", "60"); await p.click("#recSave"); await p.waitForTimeout(600);
  ok((await todo(p, "e")).pct === 60 && (await W(p, "est", "e")) === 48, "⑤ changed there; 48 minutes left");

  // ---- ⑥ 人に頼む: sent from the share sheet, then 返事待ち on whom; cancelled, nothing; no share sheet, copied
  await p.evaluate(() => { window.__shared = []; navigator.share = async (d) => { window.__shared.push(d); }; });
  await hold(p, "f"); await press(p, "人に頼む");
  await p.fill("#todoMenuGroup input[type=text]", "田中さん"); await p.locator("#todoMenuGroup button", { hasText: "送る" }).click(); await p.waitForTimeout(600);
  const shared = await p.evaluate(() => window.__shared);
  ok(shared.length === 1 && shared[0].text === "「銀行で振り込み」をお願いできますか？\n期限：11/13（金）\n場所：駅前の銀行", "⑥ what is sent", shared);
  let f = await todo(p, "f");
  ok(JSON.stringify(f.wait) === JSON.stringify({ since: "2026-11-11", who: "田中さん", days: 3 }) && (await W(p, "section", "f")) === "待ち" && (await status(p)).includes("「銀行で振り込み」を田中さんに頼んで、返事待ちにしました。3日後に確認のお知らせが届きます"), "⑥ 返事待ち on 田中さん", f);
  const wa = (await W(p, "alarms", WHEN.getTime())).find((a) => a.tag === "td-wait:f:2026-11-14");
  ok(wa && wa.at === at("2026-11-14", "09:00") && wa.body === "田中さんを待って 3 日です。確認してみましょう", "⑥ told to look in 3 days", wa);
  await undo(p);
  ok(!(await todo(p, "f")).wait, "⑥ 元に戻す");
  await p.evaluate(() => { navigator.share = async () => { throw new DOMException("cancelled", "AbortError"); }; });
  await hold(p, "f"); await press(p, "人に頼む"); await p.locator("#todoMenuGroup button", { hasText: "送る" }).click(); await p.waitForTimeout(500);
  ok(!(await todo(p, "f")).wait, "⑥ the share sheet closed: nothing");
  await p.evaluate(() => { navigator.share = undefined; window.__copied = null; navigator.clipboard.writeText = async (t) => { window.__copied = t; }; });
  await hold(p, "a"); await press(p, "人に頼む"); await p.locator("#todoMenuGroup button", { hasText: "送る" }).click(); await p.waitForTimeout(600);
  ok((await p.evaluate(() => window.__copied)) === "「レポートを書く」をお願いできますか？\n期限：11/12（木）\nメモ：テーマは環境問題" && (await todo(p, "a")).wait?.since === "2026-11-11" && !(await todo(p, "a")).wait.who
    && (await status(p)).includes("頼む文をコピーしました"), "⑥ no share sheet: copied, and waiting (on no one named)", await p.evaluate(() => window.__copied));
  await undo(p);

  // ---- ⑦ 期限をまとめてずらす: レポート (11/12), 振り込み (11/13), 英単語 (11/20) and 学生証 (none) a week on, keeping their spacing
  await menu(p, "選択して、まとめて変える");
  for (const id of ["a", "f", "b", "p3"]) { await p.click(`#todoList [data-check="${id}"]`); await p.waitForTimeout(120); }
  await p.click("#tdSelDue"); await p.waitForTimeout(300);
  ok((await items(p)).some((x) => x.startsWith("間隔はそのままでずらす")), "⑦ in the 期限 of those picked", await items(p));
  await press(p, "間隔はそのままでずらす");
  ok(flat(await txt(p, "#todoMenuMsg")) === "期限のある3件を、間隔はそのままでずらします（期限なしなどの1件はそのまま）" && JSON.stringify(await items(p)) === JSON.stringify(["1日あとへ", "2日あとへ", "1週間あとへ", "1日まえへ"]), "⑦ how far", [await txt(p, "#todoMenuMsg"), await items(p)]);
  await press(p, "1週間あとへ");
  let xs = await ls(p, "todos"), due = (id) => xs.find((t) => t.id === id).due;
  ok(due("a") === "2026-11-19" && due("f") === "2026-11-20" && due("b") === "2026-11-27" && !due("p3") && xs.find((t) => t.id === "a").moved === 1 && (await status(p)).includes("3件の期限を1週間あとにずらしました") && await p.isHidden("#tdSelBar"), "⑦ a week on each (put off once), the one with none as it was", xs.filter((t) => "afb".includes(t.id)).map((t) => [t.id, t.due, t.moved]));
  await undo(p);
  xs = await ls(p, "todos");
  ok(due("a") === "2026-11-12" && due("f") === "2026-11-13" && due("b") === "2026-11-20" && !xs.find((t) => t.id === "a").moved, "⑦ 元に戻す");
  await menu(p, "選択して、まとめて変える");
  for (const id of ["a", "e"]) { await p.click(`#todoList [data-check="${id}"]`); await p.waitForTimeout(120); }
  await p.click("#tdSelDue"); await p.waitForTimeout(300); await press(p, "間隔はそのままでずらす");
  ok(!(await items(p)).includes("1日まえへ"), "⑦ none earlier with one past its 期限 already");
  await press(p, "1日あとへ");
  xs = await ls(p, "todos");
  ok(due("a") === "2026-11-13" && due("e") === "2026-11-11", "⑦ a day on");
  await undo(p);

  // ---- ⑧ 通知の静かな時間: in 編集; 19:00〜21:00: 薬を飲む at 20:00 and メールに返信 at 19:30 come at 21:00 as one, 再通知 at 20:30 not sent
  await p.evaluate(({ P }) => { const k = P + "todos", xs = JSON.parse(localStorage.getItem(k)); const c = xs.find((t) => t.id === "c"); c.time = "19:30"; c.remind = true; localStorage.setItem(k, JSON.stringify(xs)); }, { P });
  await p.reload(); await p.waitForTimeout(1200);
  const before = await W(p, "alarms", WHEN.getTime());
  ok(before.some((a) => a.tag === "todo:h:2026-11-11" && a.at === at("2026-11-11", "20:00")) && before.some((a) => a.tag === "todo:c:2026-11-11"), "⑧ (before: at their times)");
  await p.click("#todoSettings"); await p.waitForTimeout(800);
  ok(!(await p.isChecked("#td6QuietOn")) && (await p.isDisabled("#td6QuietFrom")) && (await txt(p, "#td6QuietFoot")).startsWith("決めた時間に入るToDoのお知らせ"), "⑧ in 編集, off at first");
  const sig0 = await W(p, "sig");
  await p.click("#td6QuietOn"); await p.waitForTimeout(300);
  await p.fill("#td6QuietFrom", "19:00"); await p.dispatchEvent("#td6QuietFrom", "change");
  await p.fill("#td6QuietTo", "21:00"); await p.dispatchEvent("#td6QuietTo", "change"); await p.waitForTimeout(300);
  const qs = (await ls(p, "settings")).find((x) => x.id === "todoQuiet");
  ok(qs && qs.on === true && qs.from === "19:00" && qs.to === "21:00" && (await W(p, "sig")) !== sig0, "⑧ kept with the account; the notifications go again", qs);
  const quiet = await W(p, "alarms", WHEN.getTime()), nine = at("2026-11-11", "21:00");
  const one = quiet.find((a) => a.tag === `todo-quiet:${nine}`);
  ok(one && one.at === nine && one.title === "ToDoのお知らせ 2件" && one.body === "メールに返信、薬を飲む" && !quiet.some((a) => a.tag === "todo:h:2026-11-11" || a.tag === "todo:c:2026-11-11"), "⑧ at the end, as one", one);
  ok(!quiet.some((a) => a.tag.startsWith("todo-nag:h:") && a.at === at("2026-11-11", "20:30")) && quiet.some((a) => a.tag.startsWith("todo-nag:h:") && a.at === at("2026-11-11", "21:30")), "⑧ no 再通知 in them; after, as before");
  await p.click("#sheetDone"); await p.waitForTimeout(500);

  // ---- ⑨ 前回の実際の時間: 英単語を覚える (52 minutes last time) in its sheet and in the new form
  await p.click('#todoList [data-edit="b"]'); await p.waitForTimeout(700);
  ok((await txt(p, "#reLastFocus")) === "前回は実際に52分かかりました（11/4（水））50分にする", "⑨ in its sheet", await txt(p, "#reLastFocus"));
  await p.locator("#reLastFocus button").click(); await p.waitForTimeout(300);
  ok((await p.inputValue("#reMins")) === "50" && await p.isHidden("#reLastFocus button"), "⑨ 50分にする");
  await p.click("#recSave"); await p.waitForTimeout(600);
  ok((await todo(p, "b")).mins === 50, "⑨ kept");
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.fill("#todoText", "英単語を覚える"); await p.waitForTimeout(300);
  ok(await p.isVisible("#todoLastFocus") && (await txt(p, "#todoLastFocus")) === "前回は実際に52分かかりました（11/4（水））50分にする", "⑨ in the new form, as the name is typed", await txt(p, "#todoLastFocus"));
  await p.locator("#todoLastFocus button").click(); await p.waitForTimeout(300);
  ok((await p.inputValue("#todoMins")) === "50" && await p.isHidden("#todoLastFocus button"), "⑨ put in");
  await p.selectOption("#todoMins", "30"); await p.waitForTimeout(200);
  ok(await p.isVisible("#todoLastFocus button"), "⑨ another time picked: offered again");
  await p.fill("#todoText", "英単語を覚える\n単語帳を買う"); await p.dispatchEvent("#todoText", "input"); await p.waitForTimeout(300);
  ok(await p.isHidden("#todoLastFocus"), "⑨ not for two");
  await p.fill("#todoText", "部屋の片付け"); await p.dispatchEvent("#todoText", "input"); await p.waitForTimeout(300);
  ok(await p.isHidden("#todoLastFocus"), "⑨ none for a name with no time focused");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  if (await p.isVisible("#todoMenuGroup")) { await p.locator("#todoMenuGroup button", { hasText: "破棄" }).first().click().catch(() => {}); await p.waitForTimeout(400); }

  // ---- ⑩ ほかのアプリから取り込む: lines, then a CSV with its heading, then Todoist's, a file, and 元に戻す
  await menu(p, "ほかのアプリから取り込む");
  ok((await title(p)) === "ToDoを取り込む" && await p.isVisible(".td6-imp-ta"), "⑩ its sheet");
  await p.fill(".td6-imp-ta", "- [ ] 図書館に本を返す 11/20\n- [x] 済んだこと\n・牛乳を買う あした\n毎週月曜 燃えないゴミ\nメールに返信\n"); await p.waitForTimeout(300);
  ok((await txt(p, ".td6-imp-out .td-pick-count")) === "3件を読みました（期限つき3件・繰り返し1件）" && (await txt(p, ".td6-imp-out .group-foot")) === "完了の1件、同じ名前のまだのToDo1件は入れません。", "⑩ lines: 3 (a checked one and one already there left out)", [await txt(p, ".td6-imp-out .td-pick-count"), await txt(p, ".td6-imp-out .group-foot")]);
  const rows = await p.evaluate(() => [...document.querySelectorAll(".td6-imp-list li")].map((x) => x.innerText.replace(/\s+/g, " ").trim()));
  ok(rows[0] === "図書館に本を返す 期限 11/20（金）" && rows[1] === "牛乳を買う 期限 11/12（木）" && rows[2].startsWith("燃えないゴミ 期限 11/16（月）・毎週"), "⑩ the first of them", rows);
  await p.click("#td6ImpSame"); await p.waitForTimeout(200);
  ok((await txt(p, ".td6-imp-out .td-pick-count")).startsWith("4件を読みました"), "⑩ 同じ名前は入れない off: 4");
  await W(p, "render"); await p.waitForTimeout(300);
  ok((await p.inputValue(".td6-imp-ta")).startsWith("- [ ] 図書館"), "⑩ what was pasted stays as the sheet is drawn again");
  await p.selectOption("#td6ImpList", "l-uni");
  await p.locator(".td6-imp-out button", { hasText: "4 件を追加" }).click(); await p.waitForTimeout(700);
  const got = (await ls(p, "todos")).filter((t) => ["図書館に本を返す", "牛乳を買う", "燃えないゴミ"].includes(t.text) || (t.text === "メールに返信" && t.id !== "c"));
  const g1 = got.find((t) => t.text === "燃えないゴミ");
  ok(got.length === 4 && got.every((t) => t.listId === "l-uni" && !t.done) && g1.repeat === "weekly" && !g1.repeatDays && g1.due === "2026-11-16" && got.find((t) => t.text === "図書館に本を返す").due === "2026-11-20"
    && (await status(p)).includes("ToDoを4件取り込みました（「大学」）") && !(await p.evaluate(() => document.getElementById("daySheet").open)), "⑩ 4 in 大学 (the repeat as one), said", got);
  await undo(p);
  ok(!(await ls(p, "todos")).some((t) => t.text === "図書館に本を返す"), "⑩ 元に戻す");
  // a CSV with its heading: a comma and a line break inside quotes, 重要
  await menu(p, "ほかのアプリから取り込む");
  await p.fill(".td6-imp-ta", 'タイトル,期限,メモ,重要\n"報告書, 第2版",2026/11/25,"1行目\n2行目",1\n発表練習,11/18,,\n'); await p.waitForTimeout(300);
  ok((await txt(p, ".td6-imp-out .td-pick-count")) === "2件を読みました（期限つき2件）" && (await txt(p, ".td6-imp-out .group-foot")) === "CSVの表として読みました。", "⑩ a CSV with its heading", await txt(p, ".td6-imp-out .td-pick-count"));
  await p.locator(".td6-imp-out button", { hasText: "2 件を追加" }).click(); await p.waitForTimeout(700);
  const rep = (await byText(p, "報告書, 第2版"))[0];
  ok(rep && rep.due === "2026-11-25" && rep.memo === "1行目\n2行目" && rep.flag === true && (await byText(p, "発表練習"))[0]?.due === "2026-11-18" && !rep.listId, "⑩ its name, 期限, memo and 重要", rep);
  // Todoist's: TYPE, CONTENT, DESCRIPTION, PRIORITY, DATE; a section left out; from a file
  await menu(p, "ほかのアプリから取り込む");
  await p.setInputFiles(".td6-imp-box input[type=file]", { name: "todoist.csv", mimeType: "text/csv", buffer: Buffer.from("﻿TYPE,CONTENT,DESCRIPTION,PRIORITY,INDENT,AUTHOR,RESPONSIBLE,DATE,DATE_LANG,TIMEZONE\nsection,大学,,,,,,,,\ntask,課題を出す,第3章,1,1,,,2026-11-20,ja,Asia/Tokyo\ntask,洗剤を買う,,4,1,,,,ja,Asia/Tokyo\n", "utf-8") });
  await p.waitForTimeout(600);
  ok((await p.inputValue(".td6-imp-ta")).includes("課題を出す") && (await txt(p, ".td6-imp-out .td-pick-count")) === "2件を読みました（期限つき1件）" && (await txt(p, ".td6-imp-out .group-foot")) === "CSVの表として読みました。", "⑩ Todoist's, from a file", await txt(p, ".td6-imp-out .td-pick-count"));
  await p.locator(".td6-imp-out button", { hasText: "2 件を追加" }).click(); await p.waitForTimeout(700);
  const kd = (await byText(p, "課題を出す"))[0];
  ok(kd && kd.due === "2026-11-20" && kd.memo === "第3章" && kd.flag === true && !(await byText(p, "洗剤を買う"))[0]?.flag && !(await byText(p, "大学")).length, "⑩ its task rows (p1 as 重要), not the section", kd);

  // ---- ①③ 始める: the focus timer on it, and the card goes while it runs
  await p.evaluate(({ P }) => { localStorage.removeItem(P + "td6Now"); }, { P });
  await W(p, "render"); await p.waitForTimeout(300);
  const first = await txt(p, "#td6NowCard .td6-now-name");
  await p.locator("#td6NowCard button", { hasText: "始める" }).click(); await p.waitForTimeout(500);
  ok((await status(p)).includes(`集中タイマーを始めました（25分）：「${first}」`) && await p.isHidden("#td6NowCard"), "① 始める: the timer on it; the card goes while it runs", [first, await status(p)]);

  ok(!p.errs.length, "no errors", p.errs);
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  await b.close();
})();
function num(x) { return Number(x) || 0; }
