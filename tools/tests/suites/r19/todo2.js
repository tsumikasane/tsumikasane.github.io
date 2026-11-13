// ToDo ④⑤⑥⑦: a free time for it, several at once, いつものセット, the done ones looked back on
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
const menu = (p) => p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup .ask-btn")].map((x) => x.textContent));
const pressMenu = async (p, words) => { const b = p.locator("#todoMenuGroup .ask-btn", { hasText: words }).first(); await b.dispatchEvent("pointerdown"); await b.click(); await p.waitForTimeout(400); };
const todo = (id, text, extra = {}) => ({ id, text, done: false, createdAt: T(today) + id.charCodeAt(0), ...extra });
const DATA = {
  todos: [
    todo("a", "レポート", { due: addDays(today, 2), mins: 90, labelId: "tl1" }),
    todo("b", "牛乳を買う", { due: today, listId: "L1" }),
    todo("c", "卵を買う", { due: today, listId: "L1", moved: 1 }),
    todo("d", "申込書", { due: addDays(today, -1) }),
    todo("e", "本を読む"),
  ],
  todoLists: [{ id: "L1", name: "買い物", createdAt: 1 }, { id: "L2", name: "大学", createdAt: 2 }],
  todoLabels: [{ id: "tl1", name: "大学", color: "blue", createdAt: 1 }],
  labels: [{ id: "tl1", name: "大学", color: "blue", createdAt: 1 }],
  events: [{ id: "e1", date: today, title: "授業", time: "10:00", endTime: "12:30", createdAt: 1 }, { id: "e2", date: today, title: "ゼミ", time: "13:00", endTime: "15:00", createdAt: 1 }],
  shifts: [{ id: "s1", date: today, start: "17:00", end: "21:00", rest: 0, jobId: "j1", createdAt: 1 }],
  settings: [{ id: "jobs", items: [{ id: "j1", name: "コンビニ", wage: 1100, fare: 0, cutoff: 0, payday: 25 }], updatedAt: 1 }, { id: "todoListSplit", at: 1, updatedAt: 1 }, { id: "todoLabelSplit", at: 1, updatedAt: 1 }],
};
async function open(b, when = "08:30", data = DATA) {
  const p = await phone(b, at(when, today), { deviceScaleFactor: 1 });
  await seed(p, data, "todo");
  return p;
}
const editRow = async (p, text) => { await p.locator("#todoList li", { hasText: text }).locator(".row-link").first().click(); await p.waitForTimeout(600); };

(async () => {
  const b = await chromium.launch();
  let p = await open(b, "11:00");
  // ④ a free time: レポート (90 min, due in 2 days) — today 12:30〜13:00 too short, 15:00〜17:00 fits
  await editRow(p, "レポート");
  ok(await p.isVisible("#recSlot") && await p.isVisible("#recFocus"), "④ and the timer in its sheet");
  await p.click("#recSlot"); await p.waitForTimeout(300);
  const slots = await p.evaluate(() => [...document.querySelectorAll("#recSlots .chip-btn")].map((x) => x.textContent));
  ok(slots[0] === "きょう 15:00〜16:30" && slots[1] === "あした 08:00〜09:30" && !slots.some((x) => x.includes("12:30")), "④ the free times that hold 1 時間 30 分 (授業 till 12:30, 30 分 to ゼミ too short)", slots);
  await p.locator("#recSlots .chip-btn").nth(0).click(); await p.waitForTimeout(600);
  let ev = (await ls(p, "events")).find((e) => e.title === "レポート");
  ok(ev && ev.date === today && ev.time === "15:00" && ev.endTime === "16:30" && ev.labelId === "tl1", "④ made a plan there, with its label", ev);
  ok((await toast(p)).includes("きょう 15:00〜16:30に予定を入れました"), "④ said, with 元に戻す", await toast(p));
  await p.click(".toast.show .toast-undo"); await p.waitForTimeout(400);
  ok(!(await ls(p, "events")).some((e) => e.title === "レポート"), "④ 元に戻す: the plan gone");
  // ④ the calendar's free hours turned off: still offered here
  await p.evaluate(({ P }) => { const s = JSON.parse(localStorage.getItem(P + "settings")); s.push({ id: "calendar", free: false, updatedAt: 1 }); localStorage.setItem(P + "settings", JSON.stringify(s)); }, { P });
  await p.reload(); await p.waitForTimeout(700);
  await editRow(p, "牛乳を買う");
  await p.click("#recSlot"); await p.waitForTimeout(300);
  ok((await txt(p, "#recSlots")).includes("かかる時間が決まっていないので、30 分で探しました") && await p.locator("#recSlots .chip-btn").count() > 0, "④ none set: 30 分, while the calendar hides them", await txt(p, "#recSlots"));
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);

  // ⑤ picking: from その他
  await p.click("#todoMore"); await p.waitForTimeout(300);
  ok((await menu(p)).join("|").includes("選択して、まとめて変える") && (await menu(p)).includes("完了のふりかえり") && (await menu(p)).includes("集中タイマーを始める"), "⑤⑦ and the timer in その他", await menu(p));
  await pressMenu(p, "選択して");
  ok(await p.isVisible("#tdSelBar") && await p.isVisible("#tdSelHead") && await p.isHidden("#sec-todo .td-tools") && await txt(p, "#tdSelN") === "ToDoを選んでください" && await p.isDisabled("#tdSelDue"), "⑤ picking: the bar, nothing picked yet");
  await p.locator("#todoList li", { hasText: "牛乳を買う" }).locator(".check").click();
  await p.locator("#todoList li", { hasText: "卵を買う" }).locator(".row-link").click();
  ok(await txt(p, "#tdSelN") === "2 件を選択" && await p.locator("#todoList li.picked").count() === 2 && !(await p.evaluate(() => document.getElementById("daySheet").open)), "⑤ a ring or a name picks (no sheet)");
  ok(!(await ls(p, "todos")).find((t) => t.id === "b").done, "⑤ the ring picks, doesn't check off");
  // their 期限 to あした, with 元に戻す
  await p.click("#tdSelDue"); await p.waitForTimeout(300);
  await pressMenu(p, "あした");
  let td = await ls(p, "todos");
  ok(td.find((t) => t.id === "b").due === addDays(today, 1) && td.find((t) => t.id === "c").due === addDays(today, 1) && td.find((t) => t.id === "c").moved === 2, "⑤ both to あした (⑧ put off once more)", td.filter((t) => "bc".includes(t.id)));
  ok(await p.isHidden("#tdSelBar") && (await toast(p)).includes("2 件の期限をあしたにしました"), "⑤ done picking, said", await toast(p));
  await p.click(".toast.show .toast-undo"); await p.waitForTimeout(400);
  td = await ls(p, "todos");
  ok(td.find((t) => t.id === "b").due === today && td.find((t) => t.id === "c").moved === 1, "⑤ 元に戻す");
  // into a list, 重要, checked off, deleted
  await p.click("#todoMore"); await p.waitForTimeout(300); await pressMenu(p, "選択して");
  await p.click("#tdSelAll");
  ok(await txt(p, "#tdSelN") === "5 件を選択" && await txt(p, "#tdSelAll") === "選択を外す", "⑤ すべて選択");
  await p.click("#tdSelAll");
  for (const n of ["本を読む", "申込書"]) await p.locator("#todoList li", { hasText: n }).locator(".check").click();
  await p.click("#tdSelList"); await p.waitForTimeout(300);
  await pressMenu(p, "大学");
  td = await ls(p, "todos");
  ok(td.find((t) => t.id === "e").listId === "L2" && td.find((t) => t.id === "d").listId === "L2", "⑤ into a list", td.map((t) => t.id + ":" + t.listId + ":" + t.text));
  await p.click("#todoMore"); await p.waitForTimeout(300); await pressMenu(p, "選択して");
  for (const n of ["本を読む", "申込書"]) await p.locator("#todoList li", { hasText: n }).locator(".check").click();
  await p.click("#tdSelMore"); await p.waitForTimeout(300);
  await pressMenu(p, "重要にする");
  td = await ls(p, "todos");
  ok(td.find((t) => t.id === "e").flag && td.find((t) => t.id === "d").flag, "⑤ 重要");
  await p.click("#todoMore"); await p.waitForTimeout(300); await pressMenu(p, "選択して");
  for (const n of ["本を読む", "申込書"]) await p.locator("#todoList li", { hasText: n }).locator(".check").click();
  await p.click("#tdSelCheck"); await p.waitForTimeout(500);
  td = await ls(p, "todos");
  ok(td.find((t) => t.id === "e").done && td.find((t) => t.id === "d").done && (await toast(p)).includes("2 件を完了にしました"), "⑤ checked off at once", await toast(p));
  await p.click(".toast.show .toast-undo"); await p.waitForTimeout(500);
  td = await ls(p, "todos");
  ok(!td.find((t) => t.id === "e").done && !td.find((t) => t.id === "d").done, "⑤ 元に戻す: to do again");
  // ⑥ made a set from them
  await p.click("#todoMore"); await p.waitForTimeout(300); await pressMenu(p, "選択して");
  for (const n of ["牛乳を買う", "卵を買う"]) await p.locator("#todoList li", { hasText: n }).locator(".check").click();
  await p.click("#tdSelMore"); await p.waitForTimeout(300);
  await pressMenu(p, "いつものセットにする");
  await p.fill("#todoMenuGroup .ask-field input", "買い出し");
  await p.click("#todoMenuGroup .ask-go"); await p.waitForTimeout(500);
  let sets = (await ls(p, "settings")).find((x) => x.id === "todoSets");
  ok(sets && sets.list.length === 1 && sets.list[0].name === "買い出し" && sets.list[0].items.map((x) => x.text).join(",") === "牛乳を買う,卵を買う" && sets.list[0].items[0].listId === "L1", "⑥ a set from the two picked", sets);
  // deleted at once (asked first)
  await p.click("#todoMore"); await p.waitForTimeout(300); await pressMenu(p, "選択して");
  await p.locator("#todoList li", { hasText: "本を読む" }).locator(".check").click();
  await p.click("#tdSelDel"); await p.waitForTimeout(300);
  await pressMenu(p, "1 件を削除");
  ok(!(await ls(p, "todos")).some((t) => t.id === "e") && (await toast(p)).includes("ToDoを 1 件削除しました"), "⑤ deleted, asked first");
  // picking ends with the page
  await p.click("#todoMore"); await p.waitForTimeout(300); await pressMenu(p, "選択して");
  await p.locator("nav button[data-tab='home'], .menu button[data-tab='home']").first().click(); await p.waitForTimeout(500);
  ok(await p.isHidden("#tdSelBar") && !(await p.evaluate(() => document.documentElement.classList.contains("td-selecting"))), "⑤ another page ends picking");
  await p.goto(URL0 + "#todo"); await p.reload(); await p.waitForTimeout(700);

  // ⑥ in the new ToDo's sheet: the set's chip, its 期限 going with them
  await p.click("#todoAdd"); await p.waitForTimeout(500);
  ok(await p.isVisible("#todoSetPick") && (await txt(p, "#todoSetPick")).includes("買い出し 2件"), "⑥ the set offered while nothing is typed", await txt(p, "#todoSetPick"));
  await p.click("#todoQuick button:nth-child(2)"); // あした
  await p.click("#todoSetPick .chip-btn"); await p.waitForTimeout(500);
  td = (await ls(p, "todos")).filter((t) => !"abcde".includes(t.id));
  ok(td.length === 2 && td.every((t) => t.due === addDays(today, 1) && t.listId === "L1") && (await toast(p)).includes("「買い出し」の 2 件を追加しました"), "⑥ added with あした, in their list", td);
  await p.fill("#todoText", "x");
  ok(await p.isHidden("#todoSetPick"), "⑥ gone once typing");
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  // ⑥ in 編集: put right
  await p.click("#todoSettings"); await p.waitForTimeout(500);
  ok((await txt(p, "#tdSetRows")).includes("買い出し 2 件"), "⑥ in 編集", await txt(p, "#tdSetRows"));
  await p.click("#tdSetRows .row-btn"); await p.waitForTimeout(200);
  await p.fill("#tdSetRows textarea", "牛乳を買う\n卵を買う\n・パン");
  await p.click("#tdSetRows .td-set-acts .link-btn:last-child"); await p.waitForTimeout(400);
  sets = (await ls(p, "settings")).find((x) => x.id === "todoSets");
  ok(sets.list[0].items.map((x) => x.text).join(",") === "牛乳を買う,卵を買う,パン" && sets.list[0].items[0].listId === "L1", "⑥ put right: a line more (its mark dropped), the others kept", sets.list[0].items);
  await p.click("#tdSetAdd"); await p.waitForTimeout(200);
  await p.fill("#tdSetRows .td-set-edit input", "テスト前");
  await p.fill("#tdSetRows .td-set-edit textarea", "過去問\nノート整理");
  await p.click("#tdSetRows .td-set-edit .td-set-acts .link-btn:last-child"); await p.waitForTimeout(400);
  sets = (await ls(p, "settings")).find((x) => x.id === "todoSets");
  ok(sets.list.length === 2 && sets.list[1].name === "テスト前", "⑥ a new one made there");
  ok(await p.isVisible("#tdRemindAt") && await p.inputValue("#focusWork") === "25" && await p.inputValue("#focusRest") === "5", "① and the timer's settings in 編集");
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);

  // ⑦ looked back on: this week (Sun 11/8 – Sat 11/14), the week before, this month
  const done = (id, d, due, labelId, listId) => ({ id, text: id, done: true, doneAt: T(d, 12), due, labelId, listId, createdAt: 1 });
  await p.evaluate(({ P, list }) => { const td = JSON.parse(localStorage.getItem(P + "todos")); td.push(...list); localStorage.setItem(P + "todos", JSON.stringify(td)); }, { P, list: [
    done("x1", "2026-11-09", "2026-11-09", "tl1", "L2"), done("x2", "2026-11-09", "2026-11-08", "tl1"), done("x3", today, undefined, undefined, "L1"),
    done("x4", "2026-11-03", "2026-11-05"), done("x5", "2026-11-02"),
  ] });
  await p.evaluate(({ P }) => { const s = JSON.parse(localStorage.getItem(P + "settings")); s.push({ id: "focusLog", days: { "2026-11-09": 50, "2026-11-10": 25, "2026-11-01": 30 }, updatedAt: 1 }); localStorage.setItem(P + "settings", JSON.stringify(s)); }, { P });
  await p.reload(); await p.waitForTimeout(700);
  await p.click("#todoMore"); await p.waitForTimeout(300); await pressMenu(p, "完了のふりかえり"); await p.waitForTimeout(400);
  let rev = await txt(p, "#tdRevBody");
  ok(rev.includes("11/8〜11/14") && /3 件 完了 （先週は 2 件・\+1）/.test(rev) && rev.includes("期限までに完了 1/2 件（50%）") && rev.includes("集中した時間 1 時間 15 分"), "⑦ this week: 3, the week before 2, by the 期限 1 of 2, focused", rev);
  ok(rev.includes("リストごと") && /大学 1 件/.test(rev) && /リストなし 1 件/.test(rev) && /ラベルごと/.test(rev) && /大学 2 件/.test(rev), "⑦ by list and by label", rev);
  ok(await p.locator("#tdRevBody path.td-bar").count() === 2, "⑦ a bar a day with any");
  await p.locator("#tdRevBody .seg button", { hasText: "今月" }).click(); await p.waitForTimeout(300);
  rev = await txt(p, "#tdRevBody");
  ok(rev.includes("11/1〜11/30") && /5 件 完了/.test(rev) && rev.includes("集中した時間 1 時間 45 分"), "⑦ this month", rev);
  ok(await p.evaluate(() => document.getElementById("sheetTitle").textContent) === "完了のふりかえり", "⑦ in the sheet, titled");
  await p.screenshot({ path: __dirname + "/shots/t-review.png" });
  ok(!p.errs.length, "no errors: " + p.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
