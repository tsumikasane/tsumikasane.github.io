// ToDo その12 ①〜⑩, through the hook build at 8821 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8821/";
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
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td13[f](...a), { f, a });
const menu = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(300); await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(600); };
const hold = async (p, id) => { await p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).closest("li").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), id); await p.waitForTimeout(300); };
const items = (p) => p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent));
const press = async (p, words) => { await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(500); };
const undo = async (p) => { await p.locator("#sheetStatus button:visible, #status button:visible").first().click(); await p.waitForTimeout(500); };
const heads = (p) => p.evaluate(() => [...document.querySelectorAll("#todoList .dayhead [role=heading]")].map((x) => x.textContent));
const rowSub = (p, id) => p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`)?.closest("li")?.querySelector(".sub.due")?.innerText ?? null, id).then(flat);
const firstRows = (p, n) => p.evaluate((n) => [...document.querySelectorAll("#todoList [data-check]")].slice(0, n).map((x) => x.dataset.check), n);
async function open(b, when, o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, ...o });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "todo"); await p.waitForTimeout(1200);
  return p;
}
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-11T08:30:00+09:00");

  // ---- ① あとで知らせる
  const ch = await W(p, "choices");
  ok(ch.map((c) => c.name).join(",") === "30分後,1時間後,3時間後,今夜（20:00）,あしたの朝（8:00）" && ch[0].time === "09:00" && ch[4].day === "2026-11-12", "① the choices", ch);
  await hold(p, "f");
  await press(p, "時間をおいて知らせる");
  ok((await items(p)).some((x) => x.startsWith("1時間後")), "① asked when", await items(p));
  await press(p, "1時間後");
  let f = await todo(p, "f");
  ok(f.due === "2026-11-11" && f.time === "09:30" && f.remind === true && (await status(p)).includes("9:30にお知らせします"), "① today 9:30, お知らせ on", [f, await status(p)]);
  await undo(p);
  f = await todo(p, "f");
  ok(f.due === "2026-11-13" && !f.time && !f.remind, "① 元に戻す", f);

  // ---- ② このToDoを送る
  const one = await W(p, "one", "b");
  ok(one.startsWith("□ 英単語を覚える\n期限：") && one.includes("・単語帳 2章") && !one.includes("単語帳 1章"), "② its words", one);
  await p.evaluate(() => { window.__sent = []; navigator.share = async (x) => { window.__sent.push(x); }; });
  await hold(p, "b"); await press(p, "このToDoを送る");
  ok((await p.evaluate(() => window.__sent[0]?.text || "")).includes("小テスト"), "② sent");

  // ---- ③ ひみつ
  await hold(p, "c"); await press(p, "ひみつにする");
  ok((await todo(p, "c")).secret === true, "③ kept");
  ok((await txt(p, '#todoList [data-edit="c"]')) === "ひみつのToDo" && !(await p.evaluate(() => [...document.querySelectorAll("#todoList")].some((l) => l.innerText.includes("メールに返信")))), "③ its name hidden in the list", await txt(p, '#todoList [data-edit="c"]'));
  ok((await W(p, "speak")).includes("ひみつのToDo") && !(await W(p, "speak")).includes("メールに返信") && (await W(p, "printBox")).includes("ひみつのToDo"), "③ read out and printed as such");
  ok((await todo(p, "c")).text === "メールに返信", "③ the name itself kept");
  await p.click('#todoList [data-edit="c"]'); await p.waitForTimeout(800);
  ok((await p.inputValue("#reText")) === "メールに返信", "③ opened: all there");
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  await hold(p, "c"); await press(p, "ひみつをやめる");
  ok(!(await todo(p, "c")).secret && (await txt(p, '#todoList [data-edit="c"]')) === "メールに返信", "③ ひみつをやめる");

  // ---- ④ 文字の大きさ
  await p.click("#todoSettings"); await p.waitForTimeout(800);
  await p.locator("#td13SizeSeg button", { hasText: "特大" }).click(); await p.waitForTimeout(200);
  ok((await p.evaluate(() => document.getElementById("todoList").style.zoom)) === "1.3", "④ 特大");
  // ⑨'s menu, while here
  await p.selectOption("#td13SomeDays", "30"); await p.waitForTimeout(200);
  ok((await W(p, "set")).someDays === 30, "⑨ set in 編集");
  await p.selectOption("#td13SomeDays", "0"); await p.waitForTimeout(200);
  await p.locator("#td13SizeSeg button", { hasText: "ふつう" }).click(); await p.waitForTimeout(200);
  ok((await p.evaluate(() => document.getElementById("todoList").style.zoom)) === "", "④ back to ふつう");
  await p.click("#sheetDone"); await p.waitForTimeout(700);

  // ---- ⑤ 節目: the 50th
  const n0 = await W(p, "doneN");
  for (let i = n0; i < 49; i++) await W(p, "add", { text: `前の${i}`, done: true, doneAt: Date.parse("2026-10-01T09:00:00+09:00"), createdAt: 1 });
  await p.waitForTimeout(300);
  ok((await W(p, "doneN")) === 49, "⑤ 49 done", await W(p, "doneN"));
  await p.click('#todoList [data-check="k8"]'); await p.waitForTimeout(1200);
  ok((await status(p)).includes("50件になりました") && (await W(p, "set")).miles.includes(50), "⑤ the 50th: said, kept", await status(p));
  await menu(p, "ToDoの記録");
  ok((await txt(p, "#tdPanelBody")).includes("節目50件次は100件（あと50件）"), "⑤ in ToDoの記録", await txt(p, "#tdPanelBody"));
  await p.click("#sheetDone"); await p.waitForTimeout(600);

  // ---- ⑥ リストなしを整理する
  const nl = await W(p, "noList");
  ok(nl.length > 3, "⑥ those with no list", nl);
  await menu(p, `リストのないToDoを整理する（${nl.length} 件）`);
  const first = await p.evaluate(() => document.querySelector(".td12-late-name").dataset.edit);
  await p.locator(".td13-lists button", { hasText: "バイト" }).click(); await p.waitForTimeout(400);
  ok((await todo(p, first)).listId === "l-job" && (await txt(p, "#tdPanelBody")).includes(`${nl.length}件のうち2件目`), "⑥ put in バイト, the next", await todo(p, first));
  await p.click("#sheetDone"); await p.waitForTimeout(600);

  // ---- ⑦ 同じ名前
  await W(p, "add", { text: "英単語を覚える", due: "2026-11-25", createdAt: Date.now() }); await p.waitForTimeout(300);
  ok((await W(p, "dups")).length === 1, "⑦ a pair", await W(p, "dups"));
  await menu(p, "同じ名前のToDoをまとめる（1）");
  await p.locator(".td13-keep").first().click(); await p.waitForTimeout(500);
  ok((await byText(p, "英単語を覚える")).filter((t) => !t.done).length === 1 && !!(await todo(p, "b")) && (await W(p, "dups")).length === 0, "⑦ one kept (the one due first)");
  await undo(p);
  ok((await byText(p, "英単語を覚える")).filter((t) => !t.done).length === 2, "⑦ 元に戻す");
  await p.click("#sheetDone").catch(() => {}); await p.waitForTimeout(600);

  // ---- ⑧ きょうのテーマ
  ok(await p.isVisible("#td13ThemeText"), "⑧ over the list");
  await p.fill("#td13ThemeText", "レポートを終わらせる"); await p.press("#td13ThemeText", "Enter"); await p.waitForTimeout(300);
  ok((await W(p, "set")).theme?.text === "レポートを終わらせる" && (await W(p, "set")).theme.day === "2026-11-11", "⑧ kept for the day", await W(p, "set"));

  // ---- ⑨ 長く手つかず → いつかやる
  await W(p, "add", { text: "古いアイデア", createdAt: Date.parse("2026-08-01T09:00:00+09:00") }); await p.waitForTimeout(200);
  await W(p, "setting", "td13", { ...(await W(p, "set")), someDays: 60, updatedAt: Date.now() }); await p.waitForTimeout(1800);
  const old = (await byText(p, "古いアイデア"))[0];
  ok(old.someday === true && (await status(p)).includes("60日以上手つかずのToDo"), "⑨ moved to いつかやる", [old, await status(p)]);
  await undo(p); await p.waitForTimeout(1800);
  ok(!(await byText(p, "古いアイデア"))[0].someday, "⑨ 元に戻す: stays for the day");
  await W(p, "setting", "td13", { ...(await W(p, "set")), someDays: 0, updatedAt: Date.now() });

  // ---- ⑩ 名前を分ける
  ok(JSON.stringify(await W(p, "parts", "牛乳、卵・パン")) === '["牛乳","卵","パン"]' && (await W(p, "parts", "レポートを書く")).length === 0, "⑩ the parts");
  await W(p, "add", { text: "牛乳、卵、パン", due: "2026-11-12", listId: "l-job", flag: true, createdAt: Date.now() }); await p.waitForTimeout(300);
  const mk = (await byText(p, "牛乳、卵、パン"))[0];
  await hold(p, mk.id);
  ok((await items(p)).includes("名前を分ける（3 件に）"), "⑩ in its menu", await items(p));
  await press(p, "名前を分ける");
  const eggs = (await byText(p, "卵"))[0];
  ok((await todo(p, mk.id)).text === "牛乳" && eggs?.due === "2026-11-12" && eggs.listId === "l-job" && eggs.flag === true && (await byText(p, "パン")).length === 1, "⑩ three ToDos", eggs);
  await undo(p);
  ok((await todo(p, mk.id)).text === "牛乳、卵、パン" && !(await byText(p, "卵")).length, "⑩ 元に戻す: one again");

  ok((await W(p, "guide")).includes("時間をおいて知らせる") && (await W(p, "guide")).includes("きょうのテーマ"), "the guide says them");
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
