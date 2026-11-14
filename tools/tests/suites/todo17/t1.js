// ToDo その17 ①〜⑩, through the hook build at 8825 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8825/";
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
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td17[f](...a), { f, a });
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
  const data = D.all();
  data.settings = [...data.settings, { id: "focusLog", days: { "2026-11-10": 50, "2026-11-11": 25 }, updatedAt: 1 }];
  await seed(p, data, "todo"); await p.waitForTimeout(1200);
  return p;
}
const sheetTitle = (p) => p.evaluate(() => document.getElementById("sheetTitle").textContent);
const closeSheet = async (p) => { await p.evaluate(() => { const b = ["sheetDone", "sheetCancel"].map((id) => document.getElementById(id)).find((x) => x && !x.hidden); b?.click(); }); await p.waitForTimeout(700); await p.evaluate(() => { if (document.getElementById("discardAsk").open) document.getElementById("discardYes").click(); }); await p.waitForTimeout(300); };
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-11T08:30:00+09:00");

  // ---- ① 授業ごとのToDo
  await W(p, "add", { id: "en1", text: "英語の単語テストの勉強", due: "2026-11-12", createdAt: 5 }); await p.waitForTimeout(300);
  const cs = await W(p, "classes");
  ok(cs.map((c) => c.n).join(",") === "英語,統計学,ゼミ" && cs[0].d === "2026-11-12" && cs[0].time === "10:40", "① the classes at their next turns", cs);
  ok(cs[0].xs.includes((await byText(p, "英語の単語テストの勉強"))[0].id), "① a ToDo with its name under it", cs[0]);
  await menu(p, "授業ごとのToDo");
  ok((await sheetTitle(p)) === "授業ごとのToDo" && (await txt(p, "#tdPanelBody")).includes("英語次は あした 11/12（木）10:40".replace(/ /g, "")), "① its panel", await txt(p, "#tdPanelBody"));
  await p.locator(".td17-cls-add button", { hasText: "「英語」の宿題を足す" }).click(); await p.waitForTimeout(900);
  ok((await p.inputValue("#todoText")) === "英語の宿題：" && (await p.inputValue("#todoDue")) === "2026-11-12", "① 宿題を足す: a new one for that day");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  await p.evaluate(() => { if (document.getElementById("discardAsk")?.open) document.getElementById("discardYes").click(); }); await p.waitForTimeout(300);

  // ---- ② 予定の準備
  await menu(p, "予定の準備を足す");
  ok((await sheetTitle(p)) === "予定の準備" && (await txt(p, "#tdPanelBody")).includes("面接"), "② the plans", await txt(p, "#tdPanelBody"));
  await p.locator(".td17-plans li", { hasText: "面接" }).locator("button", { hasText: "準備を足す" }).click(); await p.waitForTimeout(500);
  const prep = (await byText(p, "「面接」の準備"))[0];
  ok(prep && prep.due === "2026-11-17" && prep.by?.k === "ev" && prep.by.n === "面接" && prep.by.pre === true && prep.place === "本社ビル 5階", "② due the day before, joined to it", prep);
  ok((await p.locator(".td17-plans li", { hasText: "面接" }).textContent()).includes("準備あり"), "② said so");
  await closeSheet(p);
  ok((await rowSub(p, prep.id)).includes("予定「面接」の前日まで"), "② on its row as その5's", await rowSub(p, prep.id));

  // ---- ③ リストの決まり
  await p.locator("#todoTabs button", { hasText: "大学" }).click(); await p.waitForTimeout(400);
  await menu(p, "「大学」の新しいToDoの決まり");
  await p.selectOption("#td17DefDue", "1"); await p.waitForTimeout(200);
  await p.locator("#td17DefFlag").click({ force: true }); await p.waitForTimeout(200);
  ok(JSON.stringify((await W(p, "lists")).find((l) => l.id === "l-uni").def) === '{"due":"1","flag":true,"label":""}', "③ kept on the list", (await W(p, "lists")).find((l) => l.id === "l-uni").def);
  await closeSheet(p);
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  ok((await txt(p, "#td17DefNote")).includes("「大学」の決まり：期限はあした・重要"), "③ said in the new form", await txt(p, "#td17DefNote"));
  await p.fill("#todoText", "課題を出す"); await p.dispatchEvent("#todoText", "input");
  await p.click("#todoSave"); await p.waitForTimeout(700);
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  const kd = (await byText(p, "課題を出す"))[0];
  ok(kd && kd.listId === "l-uni" && kd.due === "2026-11-12" && kd.flag === true, "③ given what the list says", kd);
  await p.locator("#todoTabs button", { hasText: "すべて" }).click(); await p.waitForTimeout(400);

  // ---- ④ この1週間にやったこと
  const wt = await W(p, "weekText");
  ok(wt.startsWith("11/5（木）〜11/11（水）にやったこと") && flat(wt).includes("11/10（火）（集中50分）"), "④ day by day, with the time focused", wt);
  ok(wt.includes("✓ 洗濯") && wt.includes("集中した時間：合わせて"), "④ the done ones and the total", wt);
  await p.evaluate(() => { window.__sent = []; navigator.share = async (x) => { window.__sent.push(x); }; });
  await menu(p, "この1週間にやったことを送る");
  ok((await p.evaluate(() => window.__sent[0]?.text || "")).includes("✓ 洗濯"), "④ sent");

  // ---- ⑤ かかる時間をまとめて入れる
  await menu(p, "かかる時間をまとめて入れる");
  const n0 = await p.evaluate(() => document.querySelectorAll(".td17-mins > li").length);
  const firstName = await p.evaluate(() => document.querySelector(".td17-mins-name").textContent);
  await p.locator(".td17-mins > li").first().locator("button").filter({ hasText: /^30\s*分$/ }).click(); await p.waitForTimeout(400);
  const got = (await ls(p, "todos")).find((t) => t.text === firstName && !t.done);
  ok(got?.mins === 30 && (await p.evaluate(() => document.querySelectorAll(".td17-mins > li").length)) === n0 - 1, "⑤ 30 minutes, gone from the list", [got, n0]);
  await undo(p);
  ok(!(await ls(p, "todos")).find((t) => t.text === firstName && !t.done).mins, "⑤ 元に戻す");
  await closeSheet(p);

  // ---- ⑥ リストの成績
  const st = await W(p, "stats");
  const uni = st.find((r) => r.name === "大学");
  ok(uni && uni.open >= 4 && st.some((r) => r.name === "リストなし"), "⑥ each list's", st);
  await menu(p, "リストの成績");
  ok((await txt(p, "#tdPanelBody")).includes(`大学まだ${uni.open}件`), "⑥ shown", await txt(p, "#tdPanelBody"));
  await p.locator(".td17-stat-name", { hasText: "大学" }).click(); await p.waitForTimeout(600);
  ok((await p.evaluate(() => document.querySelector('#todoTabs [aria-pressed="true"]')?.textContent || "")).includes("大学"), "⑥ pressed: its tab");
  await p.locator("#todoTabs button", { hasText: "すべて" }).click(); await p.waitForTimeout(400);

  // ---- ⑦ いつかやるから1つ
  await W(p, "add", { id: "sd3", text: "陶芸をやってみる", someday: true, someAt: 5, createdAt: 5 }); await p.waitForTimeout(300);
  await menu(p, "いつかやるから1つ選んでもらう");
  const asked = await p.evaluate(() => document.getElementById("todoMenuMsg")?.textContent || "");
  const pickedName = (asked.match(/「(.+)」はどうですか/) || [])[1];
  ok(!!pickedName && (await items(p)).includes("きょうやってみる"), "⑦ one offered", asked);
  await press(p, "きょうやってみる");
  const pk = (await ls(p, "todos")).find((t) => t.text === pickedName);
  ok(pk && !pk.someday && pk.due === "2026-11-11" && pk.today === "2026-11-11", "⑦ back for today, in きょうやる", pk);

  // ---- ⑧ なぜやる
  await p.click('#todoList [data-edit="a"]'); await p.waitForTimeout(800);
  await p.fill("#reWhy17", "単位を落とさないため");
  await p.click("#recSave"); await p.waitForTimeout(700);
  ok((await todo(p, "a")).why === "単位を落とさないため", "⑧ kept");
  await hold(p, "a"); await press(p, "このToDoに集中する"); await p.waitForTimeout(500);
  ok((await txt(p, ".td17-why")) === "なぜやる単位を落とさないため", "⑧ in 1件に集中する画面", await txt(p, ".td17-why"));
  await p.evaluate(() => document.getElementById("focusStop")?.click()); await p.waitForTimeout(300);
  await closeSheet(p);

  // ---- ⑨ 期限なしを整理する
  await W(p, "add", { id: "nd1", text: "本棚を買う", createdAt: Date.parse("2026-10-01T09:00:00+09:00") }); await p.waitForTimeout(300);
  await menu(p, "期限なしを整理する");
  const firstId = await p.evaluate(() => document.querySelector(".td12-late-name").dataset.edit);
  await p.locator(".td12-late-acts button", { hasText: "あした" }).click(); await p.waitForTimeout(400);
  ok((await todo(p, firstId)).due === "2026-11-12" && (await txt(p, "#tdPanelBody")).includes("整理し終わりました（1件）"), "⑨ あした, and done (the only one)", await todo(p, firstId));
  await closeSheet(p);

  // ---- ⑩ 最近探した言葉
  await p.focus("#todoSearch"); await p.fill("#todoSearch", "英語"); await p.press("#todoSearch", "Enter"); await p.waitForTimeout(200);
  await p.fill("#todoSearch", ""); await p.dispatchEvent("#todoSearch", "input"); await p.waitForTimeout(200);
  await p.evaluate(() => document.getElementById("todoSearch").blur()); await p.waitForTimeout(300);
  await p.focus("#todoSearch"); await p.waitForTimeout(200);
  ok(await p.isVisible("#td17FindHist") && (await txt(p, "#td17FindHist")).includes("英語"), "⑩ under the field while it is empty", await txt(p, "#td17FindHist"));
  await p.locator("#td17FindHist .chip-btn", { hasText: "英語" }).click(); await p.waitForTimeout(300);
  ok((await p.inputValue("#todoSearch")) === "英語" && !(await p.isVisible("#td17FindHist")), "⑩ pressed: looked for again");

  ok((await W(p, "guide")).includes("授業ごとのToDo") && (await W(p, "guide")).includes("最近探した言葉"), "the guide says them");
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
