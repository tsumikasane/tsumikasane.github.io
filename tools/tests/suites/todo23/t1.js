// ToDo その23 ①〜⑩, through the hook build at 8886 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8886/";
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
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td23[f](...a), { f, a });
const menu = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(300); await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(600); };
const hold = async (p, id) => { await p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).closest("li").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), id); await p.waitForTimeout(300); };
const items = (p) => p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent));
const press = async (p, words) => { await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(500); };
const undo = async (p) => { await p.locator("#sheetStatus button:visible, #status button:visible").first().click(); await p.waitForTimeout(500); };
const heads = (p) => p.evaluate(() => [...document.querySelectorAll("#todoList .dayhead [role=heading]")].map((x) => x.textContent.replace(/⁠/g, "")));
const row = (p, id) => p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`)?.closest("li")?.innerText ?? null, id).then(flat);
const { T } = D;
const NOW = Date.parse("2026-11-11T08:30:00+09:00"), MIN = 60e3;
async function open(b, when, o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, ...o });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  const data = D.all();
  // ② ジョギング (30 minutes); ⑤ a span with a step's 期限
  data.todos = [...data.todos,
    { id: "ja", text: "ジョギング", due: "2026-11-12", mins: 30, createdAt: T("2026-11-08") },
    { id: "pj", text: "中間発表の準備", start: "2026-11-13", due: "2026-11-24", flag: true, listId: "l-uni", steps: [{ id: "q1", text: "スライド", due: "2026-11-18" }, { id: "q2", text: "練習" }], createdAt: T("2026-11-08") }];
  await seed(p, data, "todo"); await p.waitForTimeout(1200);
  return p;
}
const sheetTitle = (p) => p.evaluate(() => document.getElementById("sheetTitle").textContent);
const closeSheet = async (p) => { await p.evaluate(() => { const b = ["sheetDone", "sheetCancel"].map((id) => document.getElementById(id)).find((x) => x && !x.hidden); b?.click(); }); await p.waitForTimeout(700); await p.evaluate(() => { if (document.getElementById("discardAsk")?.open) document.querySelector("#discardAsk .danger, #discardAsk button")?.click(); }); await p.waitForTimeout(400); };
const moreItems = async (p) => { await p.click("#todoMore"); await p.waitForTimeout(300); const xs = await items(p); await p.keyboard.press("Escape"); await p.waitForTimeout(300); return xs.map(flat); };
const tab = async (p, name) => { await p.locator("#todoTabs button", { hasText: name }).first().click(); await p.waitForTimeout(400); };
const saveSheet = async (p) => { await p.click("#recSave"); await p.waitForTimeout(800); };
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-11T08:30:00+09:00");

  // ---- ① 行に出すもの
  ok((await moreItems(p)).includes("行に出すものを選ぶ"), "① in その他");
  ok(await p.locator('#todoList [data-check="c"]').locator("xpath=ancestor::li[1]").locator(".td-mins").isVisible(), "① かかる時間 on a row at first");
  await menu(p, "行に出すものを選ぶ");
  ok((await sheetTitle(p)) === "行に出すもの" && (await p.locator(".td23-rows input").count()) === 17, "① a switch each", await p.locator(".td23-rows input").count());
  await p.locator("#td23Row-mins").uncheck(); await p.waitForTimeout(200);
  await closeSheet(p);
  ok(await p.locator('#todoList [data-check="c"]').locator("xpath=ancestor::li[1]").locator(".td-mins").isHidden(), "① off: not on the rows");
  ok(JSON.stringify((await ls(p, "td23Row")).off) === '["mins"]', "① kept (this device)", await ls(p, "td23Row"));
  await menu(p, "行に出すものを選ぶ"); await p.locator(".td-plan-go button", { hasText: "すべて出す" }).click(); await p.waitForTimeout(300);
  await closeSheet(p);
  ok(await p.locator('#todoList [data-check="c"]').locator("xpath=ancestor::li[1]").locator(".td-mins").isVisible(), "① すべて出す: back");

  // ---- ② 運動とつなぐ
  await W(p, "edit", "ja"); await p.waitForTimeout(900);
  ok(await p.isVisible("#reMove23"), "② 運動に記録 in its sheet");
  await p.selectOption("#reMove23", "ランニング"); await saveSheet(p);
  ok((await todo(p, "ja")).move === "ランニング" && (await row(p, "ja")).includes("運動：ランニング"), "② kept, on its row", await row(p, "ja"));
  await p.click('#todoList [data-check="ja"]'); await p.waitForTimeout(1200);
  const wo = (await W(p, "wo")).find((w) => w.note === "ジョギング");
  ok(wo?.type === "ランニング" && wo.minutes === 30 && wo.date === "2026-11-11" && (await todo(p, "ja")).woMade === wo.id, "② done: in 運動, 30 minutes", wo);
  ok((await status(p)).includes("運動（ランニング）に30分を記録しました"), "② said", await status(p));
  await undo(p); await p.waitForTimeout(400);
  ok(!(await W(p, "wo")).some((w) => w.note === "ジョギング") && !(await todo(p, "ja")).done, "② 元に戻す: taken back");
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  ok(await p.isHidden("#td23MoveRow"), "② the new ToDo's row: not for any name");
  await p.fill("#todoText", "朝ラン"); await p.dispatchEvent("#todoText", "input"); await p.waitForTimeout(200);
  ok(await p.isVisible("#td23MoveRow"), "② a 運動's name: offered");
  await p.selectOption("#td23Move", "ランニング"); await p.click("#todoSave"); await p.waitForTimeout(800);
  ok((await byText(p, "朝ラン"))[0]?.move === "ランニング", "② added with it", (await byText(p, "朝ラン"))[0]);

  // ---- ⑥ @リスト
  await p.fill("#todoText", "資料を印刷 @大"); await p.dispatchEvent("#todoText", "input"); await p.waitForTimeout(200);
  ok((await txt(p, "#td23AtNote")) === "リスト「大学」に入れます", "⑥ said under the name (the start of one)", await txt(p, "#td23AtNote"));
  await p.click("#todoSave"); await p.waitForTimeout(800);
  const pr = (await byText(p, "資料を印刷"))[0];
  ok(pr?.listId === "l-uni", "⑥ in that list, the word out of its name", pr);
  await p.fill("#todoText", "発表 @ゼミ"); await p.dispatchEvent("#todoText", "input"); await p.waitForTimeout(200);
  ok((await txt(p, "#td23AtNote")) === "「@ゼミ」というリストはありません（名前にそのまま入ります）", "⑥ no such list: said", await txt(p, "#td23AtNote"));
  await closeSheet(p);

  // ---- ③ リストの見出し
  await tab(p, "大学");
  const h0 = await heads(p);
  await hold(p, "a"); await press(p, "見出しを決める");
  await p.fill("#todoMenuGroup .ask-field input", "レポート"); await p.locator("#todoMenuGroup .ask-go").click(); await p.waitForTimeout(600);
  ok((await todo(p, "a")).sec === "レポート" && (await W(p, "group")) === "sec", "③ kept, the list under its headings", [await todo(p, "a"), await W(p, "group")]);
  ok((await status(p)).includes("リストを見出しごとにまとめて表示します"), "③ said", await status(p));
  let hs = await heads(p);
  ok(hs.includes("見出しなし") && hs.includes("レポート") && hs.indexOf("見出しなし") < hs.indexOf("レポート") && JSON.stringify(hs) !== JSON.stringify(h0), "③ the headings on the page", hs);
  await hold(p, "b"); await press(p, "見出しを決める");
  ok((await items(p)).map(flat).includes("レポート"), "③ those there offered");
  await p.fill("#todoMenuGroup .ask-field input", "試験勉強"); await p.locator("#todoMenuGroup .ask-go").click(); await p.waitForTimeout(600);
  hs = await heads(p);
  ok(hs.indexOf("レポート") < hs.indexOf("試験勉強"), "③ in the order made", hs);
  await menu(p, "見出しの順番を変える");
  await p.locator('.td22-map-move[aria-label="見出し「試験勉強」を上へ"]').click(); await p.waitForTimeout(500);
  await closeSheet(p);
  hs = await heads(p);
  ok(JSON.stringify((await W(p, "lists")).find((l) => l.id === "l-uni").secs) === '["試験勉強","レポート"]' && hs.indexOf("試験勉強") < hs.indexOf("レポート"), "③ 見出しの順番", hs);
  await W(p, "edit", "e"); await p.waitForTimeout(900);
  await p.fill("#reSec23", "レポート"); await saveSheet(p);
  ok((await todo(p, "e")).sec === "レポート", "③ from its sheet too", await todo(p, "e"));
  await tab(p, "すべて");
  ok(!(await heads(p)).includes("レポート") && (await W(p, "group")) === "", "③ not on すべて", await heads(p));

  // ---- ⑤ 期間で見る
  await menu(p, "期間で見る");
  ok((await sheetTitle(p)) === "期間で見る" && (await p.locator(".td23-span-row").count()) >= 5, "⑤ the ToDos of the four weeks", await p.locator(".td23-span-row").count());
  const bar = await p.evaluate(() => [...document.querySelectorAll(".td23-span-row")].find((r) => r.textContent.includes("中間発表の準備")));
  const st = await p.evaluate(() => { const r = [...document.querySelectorAll(".td23-span-row")].find((x) => x.textContent.includes("中間発表の準備")); return [r.querySelector(".td23-span-bar").getAttribute("style"), r.querySelector(".td23-span-bar").className, r.querySelector(".td23-span-dot")?.getAttribute("style")]; });
  ok(flat(st[0]) === "left:7.14%;width:42.86%;" && st[1].includes("flag") && flat(st[2]) === "left:26.79%;", "⑤ its bar from 開始日 to 期限, the step's 期限 a dot", st);
  ok(bar !== null, "⑤ found");
  await p.locator(".td23-span-row", { hasText: "中間発表の準備" }).click(); await p.waitForTimeout(900);
  ok((await sheetTitle(p)) === "ToDoを編集" && (await p.inputValue("#reText")) === "中間発表の準備", "⑤ pressed: its sheet");
  await closeSheet(p);

  // ---- ⑧ サブタスクをぜんぶ終えたら完了
  await W(p, "step", "b", "s2"); await p.waitForTimeout(300);
  await W(p, "step", "b", "s3"); await p.waitForTimeout(600);
  ok(!(await todo(p, "b")).done && (await status(p)).includes("サブタスクがすべて終わりました"), "⑧ off at first: offered as before", await status(p));
  await p.click("#todoSettings"); await p.waitForTimeout(900);
  ok(!(await p.isChecked("#td23AutoDone")), "⑧ in 編集, off at first");
  await p.locator("#td23AutoDone").check(); await p.waitForTimeout(400);
  await closeSheet(p);
  ok((await W(p, "set")).autoDone === true, "⑧ kept");
  await W(p, "step", "b", "s3"); await p.waitForTimeout(300); // (taken off again)
  await W(p, "step", "b", "s3"); await p.waitForTimeout(900);
  ok((await todo(p, "b")).done === true && (await status(p)).includes("サブタスクがぜんぶ終わったので、「英単語を覚える」も完了にしました"), "⑧ on: the ToDo done too", await status(p));
  await undo(p);
  ok(!(await todo(p, "b")).done, "⑧ 元に戻す");

  // ---- ⑩ 集中中に離れた回数, ④ 集中した時間帯
  await W(p, "put", { kind: "work", todoId: "c", len: 25, end: NOW + 10 * MIN, left: null, at: NOW - 15 * MIN }); await p.waitForTimeout(300);
  await W(p, "vis", "hidden"); await p.waitForTimeout(100);
  await p.evaluate(({ P, at, set }) => localStorage.setItem(P + "td23Hide", JSON.stringify({ at, set })), { P, at: NOW - MIN, set: NOW - 15 * MIN });
  await W(p, "vis", "visible"); await p.waitForTimeout(400);
  let v = await W(p, "now");
  ok(v.away === 1 && v.awayMs === MIN, "⑩ left for a minute while it counted down: counted", v);
  await W(p, "vis", "hidden"); await W(p, "vis", "visible"); await p.waitForTimeout(200);
  ok((await W(p, "now")).away === 1, "⑩ a moment (under 3 seconds): not counted");
  await W(p, "put", { ...(await W(p, "now")), end: NOW - 1000, away: 2, awayMs: 3 * MIN }); await p.waitForTimeout(700);
  ok((await status(p)).includes("とちゅうでアプリを離れたのは2回（3分）でした"), "⑩ said as the set is over", await status(p));
  const ss = await W(p, "sess");
  ok(ss.length === 1 && ss[0][2] === 25 && ss[0][3] === "c" && ss[0][4] === 2 && ss[0][1] === NOW - 1000, "④ the time kept, with the count", ss);
  await W(p, "stop"); await p.waitForTimeout(300);
  await menu(p, "ToDoの記録");
  const fb = await txt(p, ".td23-focus");
  ok(fb.includes("8時台") && fb.includes("きょうの集中1回") && fb.includes("8:04〜8:29") && fb.includes("メールに返信・25分・離れた2回"), "④ in ToDoの記録: the hour, today's times", fb);
  await closeSheet(p);

  // ---- ⑦ きょうのToDoを画像で送る
  ok((await moreItems(p)).includes("きょうのToDoを画像で送る"), "⑦ in その他");
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }).catch(() => null), menu(p, "きょうのToDoを画像で送る")]);
  ok(dl && dl.suggestedFilename() === "ToDo-2026-11-11.png", "⑦ a picture to keep (no share sheet here)", dl && dl.suggestedFilename());
  if (dl) { const fs = require("fs"), path = await dl.path(); ok(fs.statSync(path).size > 10000, "⑦ it has something in it", fs.statSync(path).size); }
  await p.waitForTimeout(400);
  ok((await status(p)).includes("きょうのToDoの画像を保存しました"), "⑦ said", await status(p));

  // ---- ⑨ 下の＋
  await p.waitForTimeout(6500); // (the message gone)
  ok(await p.isVisible("#td23Fab"), "⑨ ＋ at the foot, on a phone");
  await p.click("#td23Fab"); await p.waitForTimeout(800);
  ok((await p.evaluate(() => document.getElementById("todoForm")?.closest("dialog")?.open)) === true && (await p.isHidden("#td23Fab")), "⑨ pressed: a new ToDo, ＋ out of the way");
  await closeSheet(p);
  await p.click("#todoSettings"); await p.waitForTimeout(900);
  ok(await p.isChecked("#td23FabOn"), "⑨ in 編集, on at first");
  await p.locator("#td23FabOn").uncheck(); await p.waitForTimeout(300);
  await closeSheet(p);
  ok(await p.isHidden("#td23Fab"), "⑨ off: not there");

  // ---- the guide
  const gd = await W(p, "guide");
  ok(["行に出すもの", "運動とつなぐ", "リストの見出し", "集中した時間帯", "期間で見る", "@リスト名", "きょうのToDoを画像で送る", "サブタスクをぜんぶ終えたら完了", "片手で追加", "集中中に離れた回数"].every((w) => gd.includes(w)), "the guide has them");

  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
