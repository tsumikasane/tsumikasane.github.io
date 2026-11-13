// ToDo その12 ①〜④⑧, through the hook build at 8820 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8820/";
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
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td12[f](...a), { f, a });
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

  // ---- ① いちばん上に固定
  await hold(p, "f");
  ok((await items(p)).includes("いちばん上に固定"), "① its menu has いちばん上に固定", await items(p));
  await press(p, "いちばん上に固定");
  ok((await todo(p, "f")).pin === true && (await W(p, "section", "f")) === "固定", "① pinned: under 固定");
  ok((await heads(p))[0]?.startsWith("固定") && (await firstRows(p, 1))[0] === "f", "① 固定 first, the row at the top", [await heads(p), await firstRows(p, 2)]);
  ok((await status(p)).includes("いちばん上に固定しました"), "① said", await status(p));
  await undo(p);
  ok(!(await todo(p, "f")).pin && (await W(p, "section", "f")) !== "固定", "① 元に戻す: not pinned");
  await hold(p, "f"); await press(p, "いちばん上に固定");
  await hold(p, "f");
  ok((await items(p)).includes("固定をはずす"), "① then 固定をはずす");
  await p.click("#todoMenuNo"); await p.waitForTimeout(300);
  // a repeat pinned: its next turn is pinned too
  await W(p, "update", "r1", { pin: true }); await p.waitForTimeout(300);
  await p.click('#todoList [data-check="r1"]'); await p.waitForTimeout(2200);
  const r1n = (await byText(p, "ゴミ出し")).find((t) => !t.done);
  ok(r1n && r1n.pin === true && r1n.id !== "r1", "① a repeat's next turn pinned too", r1n);

  // ---- ② 自動で振り分け: a rule in 編集, a new ToDo put by it
  await W(p, "setting", "td12", { rules: [{ w: "買う", list: "l-job", label: "", flag: true }], carry: false, updatedAt: Date.now() }); await p.waitForTimeout(300);
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.fill("#todoText", "電池を買う"); await p.dispatchEvent("#todoText", "input");
  await p.click("#todoSave"); await p.waitForTimeout(700);
  ok((await status(p)).includes("振り分け：「バイト」・重要"), "② said where it went", await status(p));
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  const nb = (await byText(p, "電池を買う"))[0];
  ok(nb && nb.listId === "l-job" && nb.flag === true, "② put in the list, 重要", nb);
  // a list picked in the form stays
  await W(p, "tab", "l-uni"); await p.waitForTimeout(300);
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.fill("#todoText", "本を買う"); await p.dispatchEvent("#todoText", "input");
  await p.click("#todoSave"); await p.waitForTimeout(700);
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  const nb2 = (await byText(p, "本を買う"))[0];
  ok(nb2 && nb2.listId === "l-uni" && nb2.flag === true, "② the list picked stays (重要 still put)", nb2);
  await W(p, "tab", ""); await p.waitForTimeout(300);
  // the rules in 編集
  await p.click("#todoSettings"); await p.waitForTimeout(800);
  const rw = await p.evaluate(() => [...document.querySelectorAll(".td12-rule-w")].map((x) => x.value));
  ok(rw.length === 1 && rw[0] === "買う", "② the rule in 編集", rw);
  await p.click("#td12RuleAdd"); await p.waitForTimeout(400);
  await p.locator(".td12-rule-w").nth(1).fill("洗う"); await p.locator(".td12-rule-w").nth(1).dispatchEvent("change"); await p.waitForTimeout(200);
  await p.locator(".td12-rule-label").nth(1).selectOption({ index: 0 }); await p.waitForTimeout(200);
  ok((await W(p, "set")).rules.map((r) => r.w).join(",") === "買う,洗う", "② a rule added", (await W(p, "set")).rules);
  await p.locator(".td12-rule-del").nth(1).click(); await p.waitForTimeout(300);
  ok((await W(p, "set")).rules.length === 1, "② a rule deleted", (await W(p, "set")).rules);
  await p.locator("#td12CarryOn").click({ force: true }); await p.waitForTimeout(200);
  ok((await W(p, "set")).carry === true, "⑩ the switch in 編集");
  await p.locator("#td12CarryOn").click({ force: true }); await p.waitForTimeout(200);
  await p.click("#sheetDone"); await p.waitForTimeout(700);

  // ---- ③ 読み上げ
  const said = await W(p, "speak");
  ok(/^きょうのToDoは\d+件です。/.test(flat(said)) && said.includes("期限切れが 1 件") && said.includes("資料を読む、期限切れ") && said.includes("薬を飲む、20時"), "③ what is read", said);
  ok((await p.evaluate(() => { document.getElementById("todoMore").click(); return [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent); })).includes("きょうのToDoを読み上げる"), "③ in その他");
  await p.evaluate(() => { window.__said = []; speechSynthesis.speak = (u) => window.__said.push(u.text); });
  await press(p, "きょうのToDoを読み上げる");
  ok((await p.evaluate(() => window.__said.length)) === 1 && (await status(p)).includes("読み上げています") && (await status(p)).includes("とめる"), "③ spoken, とめる", await status(p));

  // ---- ④ 数える: in the new form, on the row, ＋1 to the end
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.fill("#todoText", "腕立て10回"); await p.dispatchEvent("#todoText", "input");
  ok(await p.isVisible("#td12Goal"), "④ 数える in the new form");
  await p.fill("#td12Goal", "3");
  await p.click("#todoSave"); await p.waitForTimeout(700);
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  const ct = (await byText(p, "腕立て10回"))[0];
  ok(ct && ct.goalN === 3 && !ct.cnt, "④ added with 3 回", ct);
  ok((await rowSub(p, ct.id)).includes("0/3回＋1"), "④ on its row", await rowSub(p, ct.id));
  const plus = async () => { await p.locator(`#todoList [data-check="${ct.id}"]`).locator("xpath=..").locator(".td12-plus").click({ timeout: 3000 }); await p.waitForTimeout(400); };
  await plus(); await plus();
  ok((await todo(p, ct.id)).cnt === 2 && (await rowSub(p, ct.id)).includes("2/3回"), "④ ＋1 twice: 2/3", await todo(p, ct.id));
  await plus();
  ok((await todo(p, ct.id)).done === true && (await status(p)).includes("3回で完了にしました"), "④ the third: done", [await todo(p, ct.id), await status(p)]);
  await undo(p);
  ok(!(await todo(p, ct.id)).done && (await todo(p, ct.id)).cnt === 2, "④ 元に戻す: to do, 2 回", await todo(p, ct.id));
  // in its sheet: changed to 5, the count to 4
  await p.waitForTimeout(1600);
  await p.click(`#todoList [data-edit="${ct.id}"]`); await p.waitForTimeout(800);
  ok((await p.inputValue("#reGoal12")) === "3" && (await p.inputValue("#reCnt12")) === "2", "④ its sheet: 3 and 2");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  ok(!(await p.evaluate(() => document.getElementById("discardAsk").open)), "④ nothing changed: no question as it closes");
  await p.evaluate(() => { if (document.getElementById("discardAsk").open) document.getElementById("discardYes").click(); });
  await p.waitForTimeout(500);
  await p.click(`#todoList [data-edit="${ct.id}"]`); await p.waitForTimeout(800);
  await p.fill("#reGoal12", "5"); await p.fill("#reCnt12", "4");
  await p.click("#recSave"); await p.waitForTimeout(700);
  ok((await todo(p, ct.id)).goalN === 5 && (await todo(p, ct.id)).cnt === 4, "④ saved from its sheet", await todo(p, ct.id));

  // ---- ⑧ 関連するToDo
  await p.click('#todoList [data-edit="a"]'); await p.waitForTimeout(800);
  ok(!!(await p.$("#reRel12Pick")), "⑧ 関連するToDo in its sheet");
  await p.selectOption("#reRel12Pick", "g"); await p.waitForTimeout(500);
  ok((await todo(p, "a")).rel?.includes("g") && (await todo(p, "g")).rel?.includes("a"), "⑧ joined both ways", [(await todo(p, "a")).rel, (await todo(p, "g")).rel]);
  ok((await txt(p, "#reRel12")).includes("プレゼン準備はずす"), "⑧ shown in the sheet", await txt(p, "#reRel12"));
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  ok(!(await p.evaluate(() => document.getElementById("discardAsk").open)), "⑧ joining asks nothing as it closes");
  await p.evaluate(() => { if (document.getElementById("discardAsk").open) document.getElementById("discardYes").click(); });
  await p.waitForTimeout(500);
  ok((await rowSub(p, "a")).includes("関連1"), "⑧ on the row", await rowSub(p, "a"));
  // opened from there: the other's sheet
  await p.click('#todoList [data-edit="a"]'); await p.waitForTimeout(800);
  await p.locator(".td12-rel-open").first().click(); await p.waitForTimeout(900);
  ok((await p.inputValue("#reText")) === "プレゼン準備", "⑧ the joined one opened", await p.inputValue("#reText"));
  await p.locator(".td12-rel-off").first().click(); await p.waitForTimeout(400);
  ok(!(await todo(p, "a")).rel && !(await todo(p, "g")).rel, "⑧ はずす: both let go", [(await todo(p, "a")).rel, (await todo(p, "g")).rel]);
  await p.click("#sheetCancel"); await p.waitForTimeout(600);

  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
