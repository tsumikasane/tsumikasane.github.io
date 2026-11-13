// ToDo ①②③: the time and お知らせ, the steps, a ToDo from a few words (on the hooked copy at 8768)
process.env.URL0 = process.env.URL0 || "http://localhost:8768/";
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10"; // a Tuesday
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
async function open(b, data, when = "08:30") {
  const p = await phone(b, at(when, today), { deviceScaleFactor: 1 });
  await seed(p, data, "todo");
  return p;
}
const newTodo = async (p) => { await p.click("#todoAdd"); await p.waitForTimeout(500); };
const todoBy = async (p, text) => (await ls(p, "todos")).find((t) => t.text === text);

(async () => {
  const b = await chromium.launch();
  // ③ the words read
  let p = await open(b, {});
  const pt = (s) => p.evaluate(({ s, today }) => window.__parseTodo(s, today), { s, today });
  let r = await pt("あした15時 レポート提出");
  ok(r && r.date === "2026-11-11" && r.time === "15:00" && r.title === "レポート提出", "③ あした15時", r);
  r = await pt("毎週月・木 ゴミ出し");
  ok(r && r.repeat === "weekly" && JSON.stringify(r.repeatDays) === "[1,4]" && r.date === "2026-11-12" && r.title === "ゴミ出し", "③ 毎週月・木: from the next of them", r);
  r = await pt("金曜までに 申込書を出す !");
  ok(r && r.date === "2026-11-13" && r.flag && r.title === "申込書を出す", "③ 金曜までに … !", r);
  r = await pt("毎月第2土曜 部屋の掃除");
  ok(r && r.repeat === "monthlyNth" && r.date === "2026-11-14" && r.title === "部屋の掃除", "③ 毎月第2土曜", r);
  r = await pt("毎月25日 家賃を払う");
  ok(r && r.repeat === "monthly" && r.date === "2026-11-25" && r.title === "家賃を払う", "③ 毎月25日", r);
  r = await pt("今月中に 書類を出す");
  ok(r && r.date === "2026-11-30" && !r.repeat && r.title === "書類を出す", "③ 今月中に", r);
  r = await pt("毎週日本語の授業の予習");
  ok(r && r.repeat === "weekly" && !r.repeatDays && r.title === "日本語の授業の予習", "③ 毎週 + a name starting with 日", r);
  r = await pt("平日 薬を飲む");
  ok(r && r.repeat === "weekdays" && r.date === today, "③ 平日 (today a weekday)", r);
  r = await pt("【重要】ゼミの資料");
  ok(r && r.flag && !r.date && r.title === "ゼミの資料", "③ 【重要】 alone", r);
  r = await pt("重要書類を出す");
  ok(r === null, "③ 重要 inside a word is a name", r);
  r = await pt("牛乳を買う");
  ok(r === null, "③ nothing to read: no chip", r);

  // ③ in the form: the chip, pressed
  await newTodo(p);
  await p.fill("#todoText", "毎週月・木 ゴミ出し");
  ok(await p.isVisible("#todoParse") && (await txt(p, "#todoParse")).includes("「ゴミ出し」にする"), "③ the chip under the name", await txt(p, "#todoParse"));
  await p.click("#todoParse button");
  ok(await p.inputValue("#todoText") === "ゴミ出し" && await p.inputValue("#todoDue") === "2026-11-12" && await p.inputValue("#todoRepeat") === "weekly"
    && JSON.stringify(await p.evaluate(() => [...document.querySelectorAll("#todoDays input:checked")].map((x) => +x.value))) === "[1,4]" && await p.isHidden("#todoParse"), "③ pressed: name, 期限, 毎週 月・木");
  await p.click("#todoSave"); await p.waitForTimeout(400);
  const gomi = await todoBy(p, "ゴミ出し");
  ok(gomi && gomi.repeat === "weekly" && JSON.stringify(gomi.repeatDays) === "[1,4]" && gomi.due === "2026-11-12", "③ saved so", gomi);

  // ① a time with no 期限: today, お知らせ on
  await p.fill("#todoText", "電話する");
  await p.click("#todoDueClear").catch(() => {});
  await p.evaluate(() => { const d = document.getElementById("todoDue"); d.value = ""; d.dispatchEvent(new Event("change", { bubbles: true })); });
  await p.fill("#todoTime", "18:30"); await p.dispatchEvent("#todoTime", "change");
  ok(await p.inputValue("#todoDue") === today && await p.isChecked("#todoRemind") && await p.isVisible("#todoRemindNote"), "① a time: 期限 today, お知らせ on");
  ok((await txt(p, "#todoRemindNote")).length > 5, "① what お知らせ will do, said", await txt(p, "#todoRemindNote"));
  // ② steps: 改行 makes the next one
  await p.locator("#todoSteps .link-btn", { hasText: "サブタスクを追加" }).click(); // (its first link-btn is その10's 並べ替える, hidden with no steps)
  await p.locator("#todoSteps .td-step-name").last().fill("番号を調べる");
  await p.locator("#todoSteps .td-step-name").last().press("Enter");
  await p.locator("#todoSteps .td-step-name").last().fill("かける");
  ok(await p.locator("#todoSteps li").count() === 2, "② Enter: the next step");
  // ④ how long
  await p.selectOption("#todoMins", "30");
  await p.click("#todoSave"); await p.waitForTimeout(400);
  let tel = await todoBy(p, "電話する");
  ok(tel && tel.due === today && tel.time === "18:30" && tel.remind === true && tel.mins === 30 && tel.steps?.map((s) => s.text).join(",") === "番号を調べる,かける", "① ② ④ saved", tel);
  ok(await p.inputValue("#todoTime") === "" && !(await p.isChecked("#todoRemind")) && await p.locator("#todoSteps li").count() === 0 && await p.inputValue("#todoMins") === "", "the form cleared for the next (its 期限 kept)");
  // 期限 emptied: the time and お知らせ go
  await p.fill("#todoTime", "09:00"); await p.dispatchEvent("#todoTime", "change");
  await p.click("#todoDueClear");
  ok(await p.inputValue("#todoTime") === "" && !(await p.isChecked("#todoRemind")), "① 期限なし takes the time and お知らせ");
  // ② the first line the name, the rest steps
  await p.fill("#todoText", "旅行の準備\n切符\n宿\n着替え");
  ok(await p.isVisible("#todoAsSteps"), "② the lines note offers steps");
  await p.click("#todoAsSteps");
  ok(await p.inputValue("#todoText") === "旅行の準備" && await p.locator("#todoSteps li").count() === 3, "② 1行目を名前、残りをサブタスク");
  await p.click("#todoSave"); await p.waitForTimeout(400);
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);

  // ① the list: the time, ④ how long, ② the count; the heading's total
  const list = await txt(p, "#todoList");
  ok(list.includes("電話する") && list.includes("18:30") && list.includes("30 分") && list.includes("0/2"), "① ② ④ on the row", list);
  ok(/きょう 1 件・30 分/.test(list), "④ the heading's total", list);
  // ② open the steps, check both: offered to be done
  const row = p.locator("#todoList li", { hasText: "電話する" });
  await row.locator(".td-steps-btn").click(); await p.waitForTimeout(200);
  ok(await row.locator(".td-step").count() === 2, "② opened under the row");
  await row.locator(".td-step").nth(0).click(); await p.waitForTimeout(200);
  await p.locator("#todoList li", { hasText: "電話する" }).locator(".td-step").nth(1).click(); await p.waitForTimeout(300);
  ok((await toast(p)).includes("サブタスクがすべて終わりました"), "② the last one: offered", await toast(p));
  await p.click(".toast.show .toast-undo"); await p.waitForTimeout(2200);
  tel = await todoBy(p, "電話する");
  ok(tel.done && tel.steps.every((s) => s.done), "② ToDoも完了にする", tel);

  // ① the alarms: one at its time, a day's without one in one at 9:00, opening the ToDo
  await p.evaluate(({ P, T, today }) => {
    const td = JSON.parse(localStorage.getItem(P + "todos"));
    td.push({ id: "m1", text: "ゼミの準備", done: false, due: "2026-11-12", remind: true, createdAt: T }, { id: "m2", text: "本を返す", done: false, due: "2026-11-12", remind: true, createdAt: T + 1 },
      { id: "m3", text: "課題", done: false, due: "2026-11-11", time: "21:00", remind: true, memo: "第3回", createdAt: T + 2 }, { id: "m4", text: "お知らせなし", done: false, due: "2026-11-11", time: "10:00", createdAt: T + 3 });
    localStorage.setItem(P + "todos", JSON.stringify(td));
  }, { P, T: T(today), today });
  await p.reload(); await p.waitForTimeout(800);
  const al = await p.evaluate(() => window.__alarmTimes(Date.now()).filter((a) => a.tag.startsWith("todo")));
  const a3 = al.find((a) => a.tag.startsWith("todo:m3")), day = al.find((a) => a.tag === "todo-day:2026-11-12");
  ok(a3 && a3.at === Date.parse("2026-11-11T21:00:00+09:00") && a3.title === "課題" && a3.body.includes("21:00") && a3.body.includes("第3回") && a3.url === "./#todo:m3", "① at its time", a3);
  ok(day && day.at === Date.parse("2026-11-12T09:00:00+09:00") && day.title === "きょうのToDo 2件" && day.body === "ゼミの準備、本を返す", "① a day's without a time, in one at 9:00", day);
  ok(!al.some((a) => a.tag.includes("m4")) && !al.some((a) => a.tag.includes("電話")), "① none without お知らせ, none for one done");
  const sig1 = await p.evaluate(() => window.__pushSig());
  await p.evaluate(({ P }) => { localStorage.setItem(P + "settings", JSON.stringify([{ id: "todoRemind", at: "07:45", updatedAt: 1 }])); }, { P });
  await p.reload(); await p.waitForTimeout(700);
  const day2 = await p.evaluate(() => window.__alarmTimes(Date.now()).find((a) => a.tag === "todo-day:2026-11-12"));
  ok(day2.at === Date.parse("2026-11-12T07:45:00+09:00") && (await p.evaluate(() => window.__pushSig())) !== sig1, "① the morning's time from 編集, and the alarms sent again", day2);
  // the link opens the ToDo
  await p.evaluate(() => { location.hash = ""; });
  await p.goto(URL0 + "#todo:m3"); await p.reload(); await p.waitForTimeout(900);
  ok(await p.evaluate(() => document.getElementById("daySheet").open) && await p.inputValue("#reText") === "課題" && await p.inputValue("#reTime") === "21:00" && await p.isChecked("#reRemind"), "① a notification pressed: its ToDo, open");
  ok(!p.errs.length, "no errors: " + p.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
