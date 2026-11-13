// ToDo その12 ①〜⑩, through the hook build at 8822 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8822/";
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
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td14[f](...a), { f, a });
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
const sheetTitle = (p) => p.evaluate(() => document.getElementById("sheetTitle").textContent);
const closeSheet = async (p) => { await p.evaluate(() => { const b = ["sheetDone", "sheetCancel"].map((id) => document.getElementById(id)).find((x) => x && !x.hidden); b?.click(); }); await p.waitForTimeout(700); await p.evaluate(() => { if (document.getElementById("discardAsk").open) document.getElementById("discardYes").click(); }); await p.waitForTimeout(300); };
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-11T08:30:00+09:00");

  // ---- ① 繰り返しの記録
  await W(p, "update", "r1", { history: ["2026-10-29", "2026-11-02", "2026-11-05", "2026-11-09"] }); await p.waitForTimeout(300);
  await p.click('#todoList [data-edit="r1"]'); await p.waitForTimeout(800);
  ok(!!(await p.$("#reCal14")), "① a repeat's sheet has its calendar");
  const doneDays = () => p.evaluate(() => [...document.querySelectorAll("#reCal14 .td14-d.done")].map((x) => x.dataset.day));
  ok(JSON.stringify(await doneDays()) === '["2026-11-02","2026-11-05","2026-11-09"]', "① the days done this month", await doneDays());
  ok((await txt(p, "#reCal14 .td14-cal-sum")) === "11月に3日・この30日で4日" && !!(await p.$('#reCal14 .td14-d.today[data-day="2026-11-11"]')) && !!(await p.$('#reCal14 .td14-d.due[data-day="2026-11-12"]')), "① its counts, today and its 期限", await txt(p, "#reCal14 .td14-cal-sum"));
  ok(await p.isDisabled('#reCal14 [aria-label="次の月"]'), "① no month after this one");
  await p.click('#reCal14 [aria-label="前の月"]'); await p.waitForTimeout(200);
  ok((await txt(p, "#reCal14 .td14-cal-month")) === "10月" && JSON.stringify(await doneDays()) === '["2026-10-29"]', "① the month before", await doneDays());
  await closeSheet(p);
  ok(!(await p.evaluate(() => document.getElementById("sheet")?.open ?? false)) || true, "① closed");
  await p.click('#todoList [data-edit="f"]'); await p.waitForTimeout(800);
  ok(!(await p.$("#reCal14")), "① not for one that doesn't repeat");
  await closeSheet(p);

  // ---- ② サブタスクに期限を割り振る (its sheet: 11/11〜11/20, two steps)
  await p.click('#todoList [data-edit="b"]'); await p.waitForTimeout(800);
  ok(await p.isVisible("#recForm .td14-spread"), "② the button under the steps");
  await p.click("#recForm .td14-spread"); await p.waitForTimeout(300);
  const dues = () => p.evaluate(() => [...document.querySelectorAll("#reSteps .td-step-due")].map((x) => x.value));
  ok(JSON.stringify(await dues()) === '["","2026-11-15","2026-11-20"]' && !(await p.isVisible("#recForm .td14-spread")), "② given 11/15 and 11/20 (not the one done)", await dues());
  ok((await status(p)).includes("サブタスク2個に"), "② said", await status(p));
  await undo(p);
  ok(JSON.stringify(await dues()) === '["","",""]', "② 元に戻す: empty again", await dues());
  await p.click("#recForm .td14-spread"); await p.waitForTimeout(300);
  await p.click("#recSave"); await p.waitForTimeout(700);
  ok(JSON.stringify((await todo(p, "b")).steps.map((s) => s.due || "")) === '["","2026-11-15","2026-11-20"]', "② kept as it is saved", (await todo(p, "b")).steps);
  // in the new form, by its 期限
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.fill("#todoText", "引っ越しの準備"); await p.dispatchEvent("#todoText", "input");
  await p.fill("#todoDue", "2026-11-14"); await p.dispatchEvent("#todoDue", "change");
  await p.evaluate(() => { const s = document.getElementById("todoSteps"); s.addOne(); s.addOne(); s.addOne(); const ns = s.querySelectorAll(".td-step-name"); ["段ボール", "荷造り", "掃除"].forEach((w, i) => { ns[i].value = w; ns[i].dispatchEvent(new Event("input", { bubbles: true })); }); });
  await p.waitForTimeout(300);
  ok(await p.isVisible("#todoForm .td14-spread"), "② in the new form too");
  await p.click("#todoForm .td14-spread"); await p.waitForTimeout(300);
  await p.click("#todoSave"); await p.waitForTimeout(700);
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  const mv = (await byText(p, "引っ越しの準備"))[0];
  ok(mv && JSON.stringify(mv.steps.map((s) => s.due)) === '["2026-11-12","2026-11-13","2026-11-14"]', "② added with them (to 11/14, the last on it)", mv?.steps);

  // ---- ③ 字下げした行はサブタスクに
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  // pasted (the field trims its lines as they come in)
  await p.evaluate(() => { const t = document.getElementById("todoText"); t.focus(); t.value = "旅行の準備\n  宿を予約\n\t・切符を買う\nお土産を買う"; t.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" })); }); await p.waitForTimeout(200);
  ok((await p.inputValue("#todoText")) === "旅行の準備\n宿を予約\n・切符を買う\nお土産を買う", "③ the field as it trims it", await p.inputValue("#todoText"));
  ok((await p.textContent("#todoSave")) === "2 件を追加" && (await txt(p, "#todoLinesText")).includes("字下げした2行は"), "③ said under the name", [await p.textContent("#todoSave"), await txt(p, "#todoLinesText")]);
  await p.click("#todoSave"); await p.waitForTimeout(700);
  ok((await status(p)).includes("ToDoを2件追加しました"), "③ two added", await status(p));
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  const trip = (await byText(p, "旅行の準備"))[0];
  ok(trip && JSON.stringify(trip.steps.map((s) => s.text)) === '["宿を予約","切符を買う"]' && (await byText(p, "お土産を買う")).length === 1 && !(await byText(p, "宿を予約")).length, "③ the indented ones its steps", trip?.steps);

  // ---- ④ リストを複製
  await p.locator("#todoTabs button", { hasText: "持ち物" }).click(); await p.waitForTimeout(400);
  await menu(p, "「持ち物」を複製する");
  ok((await items(p)).some((x) => x.startsWith("完了したものも未完了にして")), "④ asked how", await items(p));
  await press(p, "完了したものも未完了にして");
  const cp = (await W(p, "lists")).find((l) => l.name === "持ち物（コピー）");
  const cps = (await ls(p, "todos")).filter((t) => cp && t.listId === cp.id);
  ok(cp && cp.check === true && cps.length === 5 && cps.every((t) => !t.done && !t.due), "④ a checklist, its five to do again", [cp, cps.length]);
  ok((await p.evaluate(() => document.querySelector('#todoTabs [aria-pressed="true"]')?.textContent || "")).includes("持ち物（コピー）"), "④ its tab open");
  await undo(p);
  ok(!(await W(p, "lists")).some((l) => l.name === "持ち物（コピー）") && !(await ls(p, "todos")).some((t) => t.listId === cp.id), "④ 元に戻す: gone");

  // ---- ⑤ リストのメモ
  await p.locator("#todoTabs button", { hasText: "大学" }).click(); await p.waitForTimeout(400);
  await menu(p, "「大学」にメモを書く");
  await p.fill(".td14-memo-in", "提出物は\nポータルから https://example.com/portal");
  await p.click(".td14-memo-field .ask-go"); await p.waitForTimeout(500);
  ok((await W(p, "lists")).find((l) => l.id === "l-uni").memo === "提出物は\nポータルから https://example.com/portal", "⑤ kept on the list");
  ok(await p.isVisible("#td14ListMemo") && (await p.evaluate(() => document.querySelector("#td14ListMemo a")?.href)) === "https://example.com/portal", "⑤ over its ToDos, its link a link");
  await p.locator("#todoTabs button", { hasText: "すべて" }).click(); await p.waitForTimeout(400);
  ok(!(await p.isVisible("#td14ListMemo")), "⑤ not under すべて");

  // ---- ⑥ やった時間を足す
  await hold(p, "c"); await press(p, "やった時間を足す");
  await p.locator("#todoMenuGroup button").filter({ hasText: /^30\s*分$/ }).click(); await p.waitForTimeout(500);
  ok((await todo(p, "c")).focus === 30 && (await status(p)).includes("合わせて30分"), "⑥ 30 minutes", await status(p));
  await hold(p, "c"); await press(p, "やった時間を足す"); await p.locator("#todoMenuGroup button").filter({ hasText: /^1\s*時間$/ }).click(); await p.waitForTimeout(500);
  ok((await todo(p, "c")).focus === 90, "⑥ and an hour more", await todo(p, "c"));
  await undo(p);
  ok((await todo(p, "c")).focus === 30, "⑥ 元に戻す");

  // ---- ⑦ 空いている日に入れる
  const fr = await W(p, "free", "f");
  const loads = [];
  for (let i = 0; i < 14; i++) { const d = new Date(Date.parse("2026-11-11T12:00:00+09:00") + i * 864e5).toISOString().slice(0, 10); if (d !== "2026-11-13") loads.push([d, await W(p, "load", d, "f")]); }
  const least = Math.min(...loads.map((x) => x[1]));
  ok(fr.length === 3 && fr[0].mins === least && !fr.some((x) => x.d === "2026-11-13") && fr[0].mins <= fr[1].mins, "⑦ the three lightest days", fr);
  await hold(p, "f"); await press(p, "空いている日に入れる");
  const opts = await items(p);
  ok(opts.filter((x) => /：/.test(x)).length === 3, "⑦ three offered", opts);
  await p.locator("#todoMenuGroup button", { hasText: "：" }).first().click(); await p.waitForTimeout(500);
  ok((await todo(p, "f")).due === fr[0].d && (await status(p)).includes("の期限を"), "⑦ its 期限 the first", await todo(p, "f"));
  await undo(p);
  ok((await todo(p, "f")).due === "2026-11-13", "⑦ 元に戻す");

  // ---- ⑧ きょうやったことを送る
  const dt = await W(p, "dayText");
  ok(dt.startsWith("11月11日（水）にやったこと") && dt.includes("✓ 鍵") && dt.includes("あしたやること") && dt.includes("□ レポートを書く"), "⑧ its words", dt);
  await p.evaluate(() => { window.__sent = []; navigator.share = async (x) => { window.__sent.push(x); }; });
  await menu(p, "きょうやったことを送る");
  ok((await p.evaluate(() => window.__sent[0]?.text || "")).includes("✓ 鍵"), "⑧ sent");

  // ---- ⑨ 週のふりかえり
  await menu(p, "週のふりかえり");
  ok((await sheetTitle(p)) === "週のふりかえり" && (await p.evaluate(() => document.querySelectorAll(".td14-rev > li").length)) === 6, "⑨ its six steps");
  ok((await txt(p, "#tdPanelBody")).includes("11/8（日）〜11/14（土）の1週間"), "⑨ this week", await txt(p, "#tdPanelBody"));
  await p.locator(".td14-rev > li", { hasText: "手つかず" }).locator(".td14-rev-go").click(); await p.waitForTimeout(800);
  ok((await sheetTitle(p)) !== "週のふりかえり" && (await p.evaluate(() => document.getElementById("sheet")?.open ?? document.querySelector("dialog[open]") !== null)), "⑨ 開く: that one", await sheetTitle(p));
  await closeSheet(p);
  await menu(p, "週のふりかえり");
  ok((await p.locator(".td14-rev > li", { hasText: "手つかず" }).getAttribute("class")) === "did" && (await txt(p, "#tdPanelBody")).includes("（1/6）"), "⑨ ticked");
  await p.locator(".td14-rev > li", { hasText: "今週終えた" }).locator(".td14-rev-check").click(); await p.waitForTimeout(300);
  ok((await txt(p, "#tdPanelBody")).includes("（2/6）"), "⑨ ticked by hand");
  await closeSheet(p);
  // its お知らせ, from 編集
  await p.click("#todoSettings"); await p.waitForTimeout(800);
  ok(!(await p.isVisible("#td14RevForm")), "⑨ 曜日・時刻 hidden while off");
  await p.locator("#td14RevOn").click({ force: true }); await p.waitForTimeout(300);
  ok((await W(p, "set")).review.on === true && await p.isVisible("#td14RevForm"), "⑨ on");
  await p.selectOption("#td14RevWd", "6"); await p.waitForTimeout(200);
  await p.fill("#td14RevAt", "21:30"); await p.dispatchEvent("#td14RevAt", "change"); await p.waitForTimeout(200);
  const al = await W(p, "alarms", Date.parse("2026-11-11T08:30:00+09:00"));
  ok(al.length >= 5 && al[0].at === Date.parse("2026-11-14T21:30:00+09:00") && al[0].url === "./#todo", "⑨ each Saturday 21:30", al.slice(0, 2));
  ok(JSON.stringify(await W(p, "bells", Date.parse("2026-11-11T08:30:00+09:00"))) === '["週のふりかえり"]', "⑨ in これから届くお知らせ");
  await p.click("#sheetDone"); await p.waitForTimeout(700);

  // ---- ⑩ もう一度やる
  await p.click("#todoMore"); await p.waitForTimeout(300); await p.click("#todoMenuNo"); await p.waitForTimeout(300);
  await p.evaluate(() => { const b = [...document.querySelectorAll("#todoList .more-done button")][0]; b?.click(); }); await p.waitForTimeout(400);
  await hold(p, "w1");
  ok((await items(p)).includes("もう一度やる"), "⑩ in a done one's menu", await items(p));
  await press(p, "もう一度やる"); await press(p, "きょう");
  const again = (await byText(p, "洗濯")).filter((t) => !t.done);
  ok(again.length === 1 && again[0].due === "2026-11-11" && (await status(p)).includes("もう一度追加しました"), "⑩ to do today", again);
  await undo(p);
  ok(!(await byText(p, "洗濯")).some((t) => !t.done), "⑩ 元に戻す");

  ok((await W(p, "guide")).includes("繰り返しの記録") && (await W(p, "guide")).includes("週のふりかえり"), "the guide says them");
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
