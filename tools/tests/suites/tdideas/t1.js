// ToDo, the new ToDo's form after the user's five calls of 2026-11-23: ① 予定から選ぶ; ② 重要, ③ お知らせ・再通知・前もって
// and ④ まとめて書く not there; ⑤ 候補から選ぶ's sets the user's own (候補を編集 in the panel and in ToDo's 編集, いまのサブタスク
// を候補に入れる, kept with the account as td8Ideas)
process.env.URL0 = process.env.URL0 || "http://localhost:8765/";
const { chromium } = require("playwright");
const { URL0, P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const kept = async (p) => (await ls(p, "settings")).find((x) => x.id === "td8Ideas") || null;
const toast = (p) => p.evaluate(() => [document.getElementById("status")?.textContent || "", document.getElementById("sheetStatus")?.textContent || ""].join("｜"));
const undo = async (p) => { await p.locator("#sheetStatus button:visible, #status button:visible").first().click(); await p.waitForTimeout(400); };
const sets = (p, scope) => p.evaluate((scope) => [...document.querySelectorAll(`${scope} .td8-ed-name`)].map((x) => x.textContent), scope);
const picks = (p) => p.evaluate(() => [...document.querySelectorAll("#todoForm .td8-idea-set summary")].map((x) => x.textContent));
const T = Date.parse("2026-11-20T09:00:00+09:00");
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-23T10:00:00+09:00"), { deviceScaleFactor: 1 });
  const todos = [{ id: "t1", text: "レポートを書く", done: false, due: "2026-11-25", flag: true, remind: true, time: "18:00", nag: 30, pre: 1440, createdAt: T }];
  await seed(p, { todos }, "todo"); await p.waitForTimeout(500);

  // the new ToDo's form: ① 予定から選ぶ; ②③④ none
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  const labels = await p.evaluate(() => [...document.querySelectorAll("#todoForm .flabel")].filter((x) => x.offsetParent).map((x) => x.textContent.trim()));
  ok(labels.includes("予定 任意") && !labels.some((x) => /授業|重要|お知らせ|再通知|前もって/.test(x)), "the form's rows: 予定, no 重要・お知らせ・再通知・前もって", labels);
  ok((await p.textContent("#todoByBox button")) === "予定から選ぶ" && (await p.getAttribute("#todoByList", "aria-label")) === "予定から選ぶ", "① 予定から選ぶ");
  ok(!(await p.$("#todoFlag, #todoRemind, #todoNag, #todoPre")) && !(await p.locator("#todoForm button", { hasText: "まとめて書く" }).count()), "②③④ no switch, no select, no まとめて書く");

  // ⑤ the panel: the eight at first, the name's fit first (おすすめ)
  await p.fill("#todoText", "引越しの準備");
  await p.click("#todoForm .td8-ideas-btn"); await p.waitForTimeout(300);
  let ps = await picks(p);
  ok(ps.length === 8 && ps[0] === "引っ越しおすすめ", "⑤ the eight, 引っ越し first by its words (引越)", ps);
  ok(await p.isVisible("#todoForm .td8-ideas-edit") && !(await p.$("#todoForm .td8-ideas-keep")), "⑤ 候補を編集 under them (no steps yet: nothing to keep)");
  // 候補を編集: a set of one's own added (the return key adding no ToDo), then picked from
  await p.click("#todoForm .td8-ideas-edit"); await p.waitForTimeout(300);
  ok((await sets(p, "#todoForm")).length === 8 && !(await p.$("#todoForm .td8-ed-reset")), "⑤ 候補を編集: the eight, no はじめの候補に戻す yet");
  await p.click("#todoForm .td8-ed-add"); await p.waitForTimeout(200);
  await p.fill("#todoForm .td8-ed-title", "バイトの準備");
  await p.press("#todoForm .td8-ed-title", "Enter"); await p.waitForTimeout(300);
  ok((await ls(p, "todos")).length === 1 && await p.isVisible("#todoForm .td8-ed-title"), "⑤ the return key: no ToDo added, still writing");
  await p.fill("#todoForm .td8-ed-words", "バイト、シフト");
  await p.fill("#todoForm .td8-ed-steps", "制服を洗う\n・名札を入れる\n\n交通費を用意する");
  await p.click("#todoForm .td8-ed-save"); await p.waitForTimeout(400);
  let k = await kept(p);
  ok(k && k.sets.length === 9 && JSON.stringify(k.sets[8].words) === '["バイト","シフト"]' && JSON.stringify(k.sets[8].steps) === '["制服を洗う","名札を入れる","交通費を用意する"]' && k.sets[8].title === "バイトの準備",
    "⑤ added, kept with the account (its words, its steps without their marks)", k?.sets?.[8]);
  ok((await toast(p)).includes("候補「バイトの準備」を追加しました") && await p.isVisible("#todoForm .td8-ed-reset"), "⑤ said; はじめの候補に戻す now there");
  // ↑ moves it; 編集 writes it over; 削除 with 元に戻す
  await p.locator('#todoForm .td8-ed-set[data-set] .td8-ed-up').last().click(); await p.waitForTimeout(300);
  ok((await sets(p, "#todoForm"))[7] === "バイトの準備", "⑤ ↑: one up", await sets(p, "#todoForm"));
  await p.locator("#todoForm .td8-ed-set", { hasText: "レポート・課題" }).locator(".td8-ed-open").click(); await p.waitForTimeout(200);
  await p.fill("#todoForm .td8-ed-steps", "テーマを決める\n書く\n出す");
  await p.click("#todoForm .td8-ed-save"); await p.waitForTimeout(300);
  ok((await kept(p)).sets.find((x) => x.title === "レポート・課題")?.steps.join("・") === "テーマを決める・書く・出す", "⑤ 編集: written over");
  await p.locator("#todoForm .td8-ed-set", { hasText: "就活・応募" }).locator(".td8-ed-del").click(); await p.waitForTimeout(300);
  ok(!(await sets(p, "#todoForm")).includes("就活・応募") && (await toast(p)).includes("候補「就活・応募」を削除しました"), "⑤ 削除");
  await undo(p);
  ok((await kept(p)).sets.some((x) => x.title === "就活・応募") && (await sets(p, "#todoForm")).includes("就活・応募"), "⑤ 元に戻す: back");
  // できた: back to picking; the set picked from goes in as steps
  await p.click("#todoForm .td8-ed-done"); await p.waitForTimeout(300);
  await p.fill("#todoText", "シフトの前に"); await p.dispatchEvent("#todoText", "input");
  await p.click("#todoForm .td8-ideas-btn"); await p.waitForTimeout(200); await p.click("#todoForm .td8-ideas-btn"); await p.waitForTimeout(300); // (drawn again for the name)
  ps = await picks(p);
  ok(ps[0] === "バイトの準備おすすめ", "⑤ one's own, by its words (シフト), first", ps);
  await p.locator("#todoForm .td8-idea-set", { hasText: "バイトの準備" }).locator(".td8-idea-go").click(); await p.waitForTimeout(300);
  ok(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll("#todoSteps .td-step-name")].map((x) => x.value))) === '["制服を洗う","名札を入れる","交通費を用意する"]', "⑤ picked: its steps in");
  // いまのサブタスクを候補に入れる: the steps there, first, by the name
  await p.fill("#todoText", "ジムの準備"); await p.dispatchEvent("#todoText", "input");
  await p.click("#todoForm .td8-ideas-btn"); await p.waitForTimeout(300);
  await p.click("#todoForm .td8-ideas-keep"); await p.waitForTimeout(300);
  k = await kept(p);
  ok(k.sets[0].title === "ジムの準備" && JSON.stringify(k.sets[0].words) === '["ジムの準備"]' && k.sets[0].steps.length === 3 && (await picks(p))[0] === "ジムの準備おすすめ", "⑤ いまのサブタスクを候補に入れる: first, by its name", k.sets[0]);
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  if (await p.evaluate(() => document.getElementById("daySheet").open)) { await p.keyboard.press("Escape"); await p.waitForTimeout(600); }

  // ToDo's 編集: サブタスクの候補, the same sets, drawn again as it opens; はじめの候補に戻す with 元に戻す
  await p.click("#todoSettings"); await p.waitForTimeout(800);
  const fields = await p.evaluate(() => [...document.querySelectorAll("#td11FieldList li")].map((x) => x.innerText.trim()));
  ok(fields.includes("予定") && !fields.some((x) => /重要|お知らせ|授業/.test(x)), "ToDoの画面に出す欄: 予定, no 重要 nor お知らせ", fields);
  ok((await p.textContent("#td8IdeasHead")) === "サブタスクの候補" && (await sets(p, "#td8IdeasSet"))[0] === "ジムの準備" && (await sets(p, "#td8IdeasSet")).length === 10, "編集: サブタスクの候補, as kept", await sets(p, "#td8IdeasSet"));
  await p.click("#td8IdeasSet .td8-ed-reset"); await p.waitForTimeout(300);
  ok((await sets(p, "#td8IdeasSet")).length === 8 && (await sets(p, "#td8IdeasSet"))[0] === "レポート・課題" && !(await kept(p)).sets, "はじめの候補に戻す: the eight again");
  await undo(p);
  ok((await kept(p)).sets?.length === 10, "元に戻す: one's own again");
  await p.click("#sheetDone"); await p.waitForTimeout(600);

  // a ToDo's own sheet: 予定から選ぶ, no 重要・お知らせ; kept as it was on 保存
  await p.locator("#todoList [data-edit]", { hasText: "レポートを書く" }).first().click(); await p.waitForTimeout(800);
  const sl = await p.evaluate(() => [...document.querySelectorAll("#recForm .flabel")].filter((x) => x.offsetParent).map((x) => x.textContent.trim()));
  ok(sl.includes("予定 任意") && !sl.some((x) => /授業|重要|お知らせ|再通知|前もって/.test(x)) && (await p.textContent("#reByBox button")) === "予定から選ぶ", "its sheet: 予定から選ぶ, no 重要・お知らせ・再通知・前もって", sl);
  ok(!!(await p.$("#reSteps .td8-ideas-btn")) && !(await p.locator("#recForm button", { hasText: "まとめて書く" }).count()), "its sheet: 候補から選ぶ, no まとめて書く");
  await p.fill("#reText", "レポートを書く（第2章）"); await p.click("#recSave"); await p.waitForTimeout(700);
  const t1 = (await ls(p, "todos")).find((t) => t.id === "t1");
  ok(t1.text === "レポートを書く（第2章）" && t1.flag === true && t1.remind === true && t1.nag === 30 && t1.pre === 1440 && t1.time === "18:00", "saved: 重要, お知らせ, 再通知, 前もって kept as they were", t1);
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
