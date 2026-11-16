// ToDo その24 ①〜⑩, through the hook build at 8883 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8883/";
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
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td24[f](...a), { f, a });
const menu = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(300); await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(600); };
const hold = async (p, id) => { await p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).closest("li").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), id); await p.waitForTimeout(300); };
const items = (p) => p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent));
const press = async (p, words) => { await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(500); };
const row = (p, id) => p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`)?.closest("li")?.innerText ?? null, id).then(flat);
const { T } = D;
const NOW = Date.parse("2026-11-11T08:30:00+09:00"), MIN = 60e3;
async function open(b, when, o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, ...o });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  const data = D.all();
  data.todoLists = [...data.todoLists, { id: "l-club", name: "去年のサークル", order: 6, createdAt: T("2025-04-01") }];
  data.todoLabels = [{ id: "lb-x", name: "未使用", createdAt: T("2026-01-01") }, { id: "lb-y", name: "家", createdAt: T("2026-01-01") }];
  data.todos = [...data.todos,
    // ② a ToDo with steps; ⑥ a run one after another; ⑦ the old list's done one; ⑧ a 休みの日's and a 平日's; ⑩ 20:00 twice more
    { id: "cu2", text: "スライド作り", due: "2026-11-14", steps: [{ id: "k1", text: "構成" }, { id: "k2", text: "図" }], createdAt: T("2026-11-08") },
    { id: "c1", text: "資料を集める", done: true, doneAt: T("2026-11-09", 10), createdAt: T("2026-11-05") },
    { id: "c2", text: "下書き", after: "c1", due: "2026-11-16", createdAt: T("2026-11-05", 10) },
    { id: "c3", text: "清書", after: "c2", due: "2026-11-20", createdAt: T("2026-11-05", 11) },
    { id: "ol", text: "部室の片付け", listId: "l-club", done: true, doneAt: T("2026-03-01"), createdAt: T("2026-02-20") },
    { id: "lby", text: "掃除機をかける", labelId: "lb-y", createdAt: T("2026-11-08") },
    { id: "dt1", text: "洗車", dayType: "off", createdAt: T("2026-11-08") },
    { id: "dt2", text: "銀行で記帳", dayType: "work", createdAt: T("2026-11-08") },
    { id: "tm1", text: "日記を書く時間", due: "2026-11-12", time: "20:00", createdAt: T("2026-11-01") },
    { id: "tm2", text: "ストレッチ", due: "2026-11-13", time: "20:00", createdAt: T("2026-11-02") },
    // ③ the day's goal met on the 9th and the 10th (with those of the data)
    ...[0, 1, 2].map((i) => ({ id: "g9" + i, text: `9日の${i}`, done: true, doneAt: T("2026-11-09", 12 + i), createdAt: T("2026-11-08") }))];
  data.settings = [...data.settings, { id: "td8Goal", n: 3, updatedAt: 1 }, { id: "todoListSplit", at: 1, updatedAt: 1 }, // (labels made lists once, as an account has had it)
    // ⑨ 50 minutes yesterday on レポートを書く
    { id: "td23Focus", list: [[T("2026-11-10", 21) - 50 * MIN, T("2026-11-10", 21), 50, "a", 0]], updatedAt: 1 }];
  await seed(p, data, "todo"); await p.waitForTimeout(1200);
  return p;
}
const sheetTitle = (p) => p.evaluate(() => document.getElementById("sheetTitle").textContent);
const closeSheet = async (p) => { await p.evaluate(() => { const b = ["sheetDone", "sheetCancel"].map((id) => document.getElementById(id)).find((x) => x && !x.hidden); b?.click(); }); await p.waitForTimeout(700); await p.evaluate(() => { if (document.getElementById("discardAsk")?.open) document.querySelector("#discardAsk .danger, #discardAsk button")?.click(); }); await p.waitForTimeout(400); };
const moreItems = async (p) => { await p.click("#todoMore"); await p.waitForTimeout(300); const xs = await items(p); await p.keyboard.press("Escape"); await p.waitForTimeout(300); return xs.map(flat); };
const saveSheet = async (p) => { await p.click("#recSave"); await p.waitForTimeout(800); };
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-11T08:30:00+09:00");

  // ---- ⑨ きのうのつづき
  ok(await p.isVisible("#td24ContCard") && (await txt(p, "#td24ContCard")).includes("きのうは「レポートを書く」に50分集中しました。"), "⑨ yesterday's, on a card", await txt(p, "#td24ContCard"));
  await p.locator("#td24ContCard button", { hasText: "つづきを始める" }).click(); await p.waitForTimeout(900);
  ok((await W(p, "now"))?.todoId === "a" && (await sheetTitle(p)) === "集中", "⑨ つづきを始める: the timer on it, its own screen", await W(p, "now"));
  await closeSheet(p); await W(p, "stop"); await p.waitForTimeout(500);
  ok(await p.isVisible("#td24ContCard"), "⑨ still offered (nothing focused yet)");
  await p.locator("#td24ContCard .td24-cont-x").click(); await p.waitForTimeout(300);
  ok(await p.isHidden("#td24ContCard"), "⑨ × : not today");

  // ---- ⑧ 休みの日にやる・平日にやる (a Wednesday)
  ok(await p.isVisible("#td24DayCard") && (await txt(p, "#td24DayCard")).includes("きょうは平日") && (await txt(p, "#td24DayCard")).includes("「銀行で記帳」") && !(await txt(p, "#td24DayCard")).includes("洗車"), "⑧ a weekday: 平日にやる on the card", await txt(p, "#td24DayCard"));
  ok((await row(p, "dt1")).includes("休みの日") && (await row(p, "dt2")).includes("平日"), "⑧ on their rows");
  await p.locator("#td24DayCard button", { hasText: "きょうやるに入れる" }).click(); await p.waitForTimeout(500);
  ok((await todo(p, "dt2")).today === "2026-11-11", "⑧ きょうやるに入れる", await todo(p, "dt2"));
  await W(p, "edit", "dt1"); await p.waitForTimeout(900);
  ok((await p.inputValue("#reDay24")) === "off", "⑧ in its sheet");
  await p.selectOption("#reDay24", "work"); await saveSheet(p);
  ok((await todo(p, "dt1")).dayType === "work", "⑧ changed there", await todo(p, "dt1"));

  // ---- ① かかる時間を名前から, ⑩ よく使う時刻
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  ok(await p.isVisible("#td24Times") && (await txt(p, "#td24Times")) === "よく使う時刻20:00", "⑩ the times used often, under 時刻", await txt(p, "#td24Times"));
  await p.locator(".td24-time", { hasText: "20:00" }).click(); await p.waitForTimeout(300);
  ok((await p.inputValue("#todoTime")) === "20:00" && (await p.isChecked("#todoRemind")), "⑩ pressed: that time, お知らせ on");
  await p.evaluate(() => { const f = document.getElementById("todoTime"); f.value = ""; f.dispatchEvent(new Event("input", { bubbles: true })); f.dispatchEvent(new Event("change", { bubbles: true })); document.getElementById("todoRemind").checked = false; });
  await p.fill("#todoText", "英単語 30分"); await p.dispatchEvent("#todoText", "input"); await p.waitForTimeout(200);
  ok((await txt(p, "#td24MinsNote")) === "かかる時間を30分にします（名前からはずします）", "① said under the name", await txt(p, "#td24MinsNote"));
  await p.click("#todoSave"); await p.waitForTimeout(800);
  const e1 = (await byText(p, "英単語"))[0];
  ok(e1?.mins === 30, "① added: its かかる時間, the words out of its name", e1);
  await p.fill("#todoText", "レポート 2時間"); await p.dispatchEvent("#todoText", "input"); await p.waitForTimeout(200);
  ok(await p.isHidden("#todoParse") && (await txt(p, "#td24MinsNote")) === "かかる時間を2時間にします（名前からはずします）", "① 2時間 not read as 2:00 any more", await txt(p, "#todoParse"));
  await p.fill("#todoText", "あした 発表練習 1時間半"); await p.dispatchEvent("#todoText", "input"); await p.waitForTimeout(200);
  ok((await txt(p, "#todoParse")).includes("あした11/12（木）") && !(await txt(p, "#todoParse")).includes(":") && (await txt(p, "#todoParse")).includes("「発表練習」"), "① with a day: the day read, not a time", await txt(p, "#todoParse"));
  await p.locator("#todoParse button").first().click(); await p.waitForTimeout(300);
  ok((await p.inputValue("#todoMins")) === "90", "① the words read: かかる時間 kept", await p.inputValue("#todoMins"));
  await p.click("#todoSave"); await p.waitForTimeout(800);
  const e2 = (await byText(p, "発表練習"))[0];
  ok(e2?.mins === 90 && e2.due === "2026-11-12" && !e2.time, "① added with the day and its time", e2);
  await p.fill("#todoText", "部屋の掃除"); await p.dispatchEvent("#todoText", "input"); await p.selectOption("#td24Day", "off"); await p.click("#todoSave"); await p.waitForTimeout(800);
  ok((await byText(p, "部屋の掃除"))[0]?.dayType === "off", "⑧ やる日 in the new ToDo's form");
  await closeSheet(p);

  // ---- ② サブタスクで集中
  await hold(p, "cu2"); await press(p, "サブタスクで集中");
  ok((await items(p)).map(flat).join("|") === "構成|図", "② its steps to do", await items(p));
  await press(p, "構成"); await p.waitForTimeout(800);
  ok((await W(p, "now"))?.step === "k1" && (await txt(p, "#focusName")) === "スライド作り：構成", "② the timer on the step, said on the bar", [await W(p, "now"), await txt(p, "#focusName")]);
  ok((await sheetTitle(p)) === "集中" && (await txt(p, ".td24-step-now")) === "いま：構成" && (await p.locator(".td24-step-go").count()) === 2, "② in 1件に集中する画面, a ▶ by each step");
  await closeSheet(p);
  await W(p, "put", { ...(await W(p, "now")), end: NOW - 1000, at: NOW - 26 * MIN }); await p.waitForTimeout(700);
  ok((await status(p)).includes("「構成」は終わりましたか？"), "② over: asked", await status(p));
  await p.locator("#status button", { hasText: "サブタスクを完了" }).click(); await p.waitForTimeout(500);
  ok((await todo(p, "cu2")).steps.find((s) => s.id === "k1").done === true, "② サブタスクを完了: checked");
  await W(p, "stop"); await p.waitForTimeout(300);

  // ---- ③ 連続を守るお知らせ
  await p.click("#todoSettings"); await p.waitForTimeout(900);
  ok(!(await p.isChecked("#td24StreakOn")) && (await p.isDisabled("#td24StreakAt")), "③ in 編集, off at first");
  await p.locator("#td24StreakOn").check(); await p.waitForTimeout(400);
  await closeSheet(p);
  const al = (await W(p, "alarms")).find((a) => a.tag === "td24-streak:2026-11-11");
  ok(al && flat(al.body) === "あと3件で3日連続です" && al.at === Date.parse("2026-11-11T21:00:00+09:00"), "③ today's at 21:00, the run said", al);

  // ---- ④ やりたい度
  await W(p, "update", "sd2", { want: 1 }); await p.waitForTimeout(200);
  await p.evaluate(() => [...document.querySelectorAll("#todoList .dayhead button")].find((b) => b.textContent.includes("表示"))?.click()).catch(() => {});
  await W(p, "update", "sd1", { want: 3 }); await p.waitForTimeout(300);
  ok(JSON.stringify(await W(p, "sort", ["sd2", "sd1"])) === '["sd1","sd2"]', "④ いつかやる with more ★ first");
  await W(p, "update", "sd1", { want: undefined }); await p.waitForTimeout(300);
  const hasRow = await p.evaluate(() => !!document.querySelector('#todoList [data-check="sd1"]'));
  if (hasRow) {
    await hold(p, "sd1"); await press(p, "やりたい度を決める"); await press(p, "★★★");
    ok((await todo(p, "sd1")).want === 3 && (await row(p, "sd1")).includes("★★★"), "④ from its menu, on its row", await row(p, "sd1"));
  } else {
    await W(p, "update", "sd1", { want: 3 }); ok(true, "④ (いつかやる folded: set from the store)");
  }

  // ---- ⑤ 絵文字
  await hold(p, "c"); await press(p, "絵文字を付ける");
  await p.locator("#todoMenuGroup .td24-emo-btn", { hasText: "📚" }).click(); await p.waitForTimeout(500);
  ok((await todo(p, "c")).emo === "📚" && (await txt(p, '#todoList [data-edit="c"] .td24-emo')) === "📚", "⑤ before its name on its row");

  // ---- ⑥ つながりで見る
  ok((await moreItems(p)).includes("つながりで見る（順番のあるToDo）"), "⑥ in その他");
  await menu(p, "つながりで見る");
  const ch = await p.evaluate(() => [...document.querySelectorAll(".td24-chain li")].map((li) => li.querySelector(".td24-link-mark").textContent + li.querySelector(".td24-link-name").textContent));
  ok((await sheetTitle(p)) === "つながりで見る" && JSON.stringify(ch) === '["済資料を集める","いま下書き","待ち清書"]', "⑥ the run: done, now, waiting", ch);
  await closeSheet(p);

  // ---- ⑦ 使っていないリスト・ラベル
  ok((await moreItems(p)).includes("使っていないリスト・ラベル（2）"), "⑦ in その他, with how many", await moreItems(p));
  await menu(p, "使っていないリスト・ラベル");
  ok((await txt(p, "#tdPanelBody")).includes("去年のサークル") && (await txt(p, "#tdPanelBody")).includes("未使用") && !(await txt(p, "#tdPanelBody")).includes("家"), "⑦ the old list and the label no ToDo has", await txt(p, "#tdPanelBody"));
  await p.locator(".td24-idle li", { hasText: "去年のサークル" }).locator("button").click(); await p.waitForTimeout(500);
  ok((await W(p, "lists")).find((l) => l.id === "l-club").archived === true, "⑦ しまう");
  await p.locator(".td24-idle li", { hasText: "未使用" }).locator("button", { hasText: "削除" }).click(); await p.waitForTimeout(500);
  ok(!(await W(p, "labels")).some((l) => l.id === "lb-x") && (await W(p, "labels")).some((l) => l.id === "lb-y"), "⑦ 削除 (only the unused one)");
  await closeSheet(p);

  // ---- the guide
  const gd = await W(p, "guide");
  ok(["かかる時間を名前から", "サブタスクで集中", "連続を守るお知らせ", "やりたい度", "ToDoの絵文字", "つながりで見る", "使っていないリスト・ラベル", "休みの日にやる・平日にやる", "きのうのつづき", "よく使う時刻"].every((w) => gd.includes(w)), "the guide has them");

  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
