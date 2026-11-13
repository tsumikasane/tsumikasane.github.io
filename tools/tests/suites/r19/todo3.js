// ToDo ⑧⑨⑩ and the focus timer, and a repeat carrying the new fields on
process.env.URL0 = process.env.URL0 || "http://localhost:8768/";
const { chromium } = require("playwright");
const fs = require("fs");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10"; // a Tuesday
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
const pressMenu = async (p, words) => { const b = p.locator("#todoMenuGroup .ask-btn", { hasText: words }).first(); await b.dispatchEvent("pointerdown"); await b.click(); await p.waitForTimeout(400); };
const todo = (id, text, extra = {}) => ({ id, text, done: false, createdAt: T(today) + id.charCodeAt(0), ...extra });
const SPLIT = [{ id: "todoListSplit", at: 1, updatedAt: 1 }, { id: "todoLabelSplit", at: 1, updatedAt: 1 }];
const editRow = async (p, text) => { await p.locator("#todoList li", { hasText: text }).locator(".row-link").first().click(); await p.waitForTimeout(600); };
// a small JPEG, made in the page
const jpeg = async (p) => Buffer.from(await p.evaluate(() => { const c = document.createElement("canvas"); c.width = 40; c.height = 30; const g = c.getContext("2d"); g.fillStyle = "#3a7"; g.fillRect(0, 0, 40, 30); return c.toDataURL("image/jpeg").split(",")[1]; }), "base64");

(async () => {
  const b = await chromium.launch();
  let p = await phone(b, at("08:30", today), { deviceScaleFactor: 1 });
  await seed(p, { todos: [
    todo("a", "申込書", { due: addDays(today, -1), moved: 2 }),
    todo("b", "年末調整", { due: "2026-12-10", start: "2026-12-01" }),
    todo("c", "ゴミ出し", { due: today, repeat: "weekly", repeatDays: [2, 5], time: "07:30", remind: true, mins: 10, steps: [{ id: "x", text: "分ける", done: true }, { id: "y", text: "出す", done: true }], start: addDays(today, -1) }),
    todo("d", "本を読む"),
  ], settings: SPLIT }, "todo");
  // ⑨ waiting for its 開始日: folded under あとで, not counted
  let list = await txt(p, "#todoList");
  ok(/あとで 表示する 1 件/.test(list) && !list.includes("年末調整"), "⑨ under あとで, folded", list);
  ok(await p.evaluate(() => document.querySelector(".td-tab").textContent) === "すべて3", "⑨ not counted on the tab", await p.evaluate(() => document.querySelector(".td-tab").textContent));
  await p.locator("#todoList .dayhead-btn.later").click(); await p.waitForTimeout(200);
  list = await txt(p, "#todoList");
  ok(list.includes("年末調整") && list.includes("12/1（火）から") && !/本を読む 0/.test(list) && /あとで 隠す 1 件/.test(list), "⑨ opened: from when", list);
  await p.fill("#todoSearch", "年末"); await p.waitForTimeout(200);
  ok((await txt(p, "#todoList")).includes("年末調整"), "⑨ found when looked for");
  await p.fill("#todoSearch", ""); await p.waitForTimeout(200);

  // ⑧ put off again: the swipe's あした (via its menu) makes 3, the row says so, its sheet offers what to do
  ok((await txt(p, "#todoList")).includes("2回先送り"), "⑧ the row says twice");
  await p.locator("#todoList li", { hasText: "申込書" }).dispatchEvent("contextmenu"); await p.waitForTimeout(300);
  ok((await p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup .ask-btn")].map((x) => x.textContent))).includes("集中タイマーを始める"), "the timer in a row's menu");
  await pressMenu(p, "あしたに移す");
  let a = (await ls(p, "todos")).find((t) => t.id === "a");
  ok(a.due === addDays(today, 1) && a.moved === 3, "⑧ moved later: 3", a);
  ok((await txt(p, "#todoList")).includes("3回先送り"), "⑧ the row says 3");
  await editRow(p, "申込書");
  ok(await p.isVisible(".td-moved-card") && (await txt(p, ".td-moved-card")).includes("3 回先送りしています"), "⑧ its sheet: what to do with it");
  await p.click(".td-moved-card .link-btn:nth-child(1)"); // 小さく分ける
  ok(await p.evaluate(() => document.activeElement?.classList.contains("td-step-name")), "⑧ 小さく分ける: a step to write");
  await p.locator(".td-moved-card .link-btn", { hasText: "期限なしにする" }).click(); await p.waitForTimeout(500);
  a = (await ls(p, "todos")).find((t) => t.id === "a");
  ok(a.due === "" && a.moved === undefined && (await toast(p)).includes("期限なしにしました"), "⑧ 期限なしにする: and counted afresh", a);
  // ⑧ its edit form's 期限 put later counts too
  await editRow(p, "本を読む");
  await p.fill("#reDue", addDays(today, 3)); await p.dispatchEvent("#reDue", "change");
  await p.click("#recSave"); await p.waitForTimeout(400);
  await editRow(p, "本を読む");
  await p.fill("#reDue", addDays(today, 5)); await p.dispatchEvent("#reDue", "change");
  // ⑨ a 開始日 after the 期限 comes back to it
  await p.fill("#reStart", addDays(today, 9)); await p.dispatchEvent("#reStart", "change");
  await p.click("#recSave"); await p.waitForTimeout(400);
  const d = (await ls(p, "todos")).find((t) => t.id === "d");
  ok(d.due === addDays(today, 5) && d.moved === 1 && d.start === addDays(today, 5), "⑧ the form: 期限 later is put off (none to a day isn't); ⑨ 開始日 after it comes back", d);

  // ⑩ a photo in its sheet, on its row, large at a press, deleted with 元に戻す
  const img = await jpeg(p);
  await editRow(p, "ゴミ出し");
  await p.setInputFiles("#rePhotos input[type=file]", { name: "a.jpg", mimeType: "image/jpeg", buffer: img }); await p.waitForTimeout(800);
  ok(await p.locator("#rePhotos .td-thumb").count() === 1 && (await toast(p)).includes("写真を追加しました"), "⑩ added in its sheet");
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  ok(await p.locator("#todoList li", { hasText: "ゴミ出し" }).locator(".td-thumb").count() === 1, "⑩ small on its row");
  await p.locator("#todoList li", { hasText: "ゴミ出し" }).locator(".td-thumb").click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById("tdPhotoView").open && document.getElementById("tdPhotoImg").naturalWidth > 0), "⑩ large at a press");
  await p.click("#tdPhotoDel"); await p.click("#tdPhotoDel"); await p.waitForTimeout(500);
  ok(await p.locator("#todoList li", { hasText: "ゴミ出し" }).locator(".td-thumb").count() === 0 && (await toast(p)).includes("写真を削除しました"), "⑩ deleted (a second press)");
  await p.click(".toast.show .toast-undo"); await p.waitForTimeout(600);
  ok(await p.locator("#todoList li", { hasText: "ゴミ出し" }).locator(".td-thumb").count() === 1, "⑩ 元に戻す: back");
  // a repeat checked off: the next turn has its time, お知らせ, how long, its steps all to do, its 開始日 as far before, its photo
  await p.locator("#todoList li", { hasText: "ゴミ出し" }).locator(".check").click(); await p.waitForTimeout(2200);
  const td = await ls(p, "todos"), was = td.find((t) => t.id === "c"), next = td.find((t) => t.id === was.next);
  ok(was.done && next && next.due === "2026-11-13" && next.time === "07:30" && next.remind === true && next.mins === 10 && next.steps.every((s) => !s.done) && next.steps.length === 2 && next.start === "2026-11-12", "repeat: the next turn carries them on", next);
  ok(await p.locator("#todoList li", { hasText: "ゴミ出し" }).locator(".td-thumb").count() === 1 && await p.evaluate(async ({ id }) => {
    const db = await new Promise((r) => { const q = indexedDB.open("tsumikasane-photos", 1); q.onsuccess = () => r(q.result); });
    const all = await new Promise((r) => { const q = db.transaction("photos").objectStore("photos").getAll(); q.onsuccess = () => r(q.result); });
    return all.length === 1 && all[0].todoId === id;
  }, { id: next.id }), "⑩ its photo goes on with the next turn");
  // taken back: the photo back with it
  await p.locator("#todoList li.done", { hasText: "ゴミ出し" }).locator(".check").click(); await p.waitForTimeout(600);
  ok(await p.evaluate(async () => {
    const db = await new Promise((r) => { const q = indexedDB.open("tsumikasane-photos", 1); q.onsuccess = () => r(q.result); });
    const all = await new Promise((r) => { const q = db.transaction("photos").objectStore("photos").getAll(); q.onsuccess = () => r(q.result); });
    return all.length === 1 && all[0].todoId === "c";
  }) && (await ls(p, "todos")).find((t) => t.id === "c").time === "07:30", "repeat taken back: the photo and the fields back on it");
  // ⑩ a new ToDo with a photo
  await p.click("#todoAdd"); await p.waitForTimeout(500);
  await p.fill("#todoText", "プリント");
  await p.setInputFiles("#todoPhotos input[type=file]", { name: "b.jpg", mimeType: "image/jpeg", buffer: img }); await p.waitForTimeout(800);
  ok(await p.locator("#todoPhotos .td-thumb").count() === 1, "⑩ in the new ToDo's form");
  await p.click("#todoSave"); await p.waitForTimeout(800);
  ok(await p.locator("#todoPhotos .td-thumb").count() === 0, "⑩ the form cleared");
  await p.keyboard.press("Escape"); await p.waitForTimeout(700);
  ok(await p.locator("#todoList li", { hasText: "プリント" }).locator(".td-thumb").count() === 1, "⑩ the new ToDo has it");

  // the timer: from a row's menu, counting down over every page
  await p.locator("#todoList li", { hasText: "ゴミ出し" }).dispatchEvent("contextmenu"); await p.waitForTimeout(300);
  await pressMenu(p, "集中タイマーを始める");
  ok(await p.isVisible("#focusBar") && (await txt(p, "#focusBar")).startsWith("集中 25:00") && (await txt(p, "#focusBar")).includes("ゴミ出し"), "timer: 集中 25:00 with its ToDo", await txt(p, "#focusBar"));
  const f0 = await p.evaluate(({ P }) => JSON.parse(localStorage.getItem(P + "focus")), { P });
  ok(f0.kind === "work" && f0.todoId === "c" && f0.len === 25 && f0.end - (await p.evaluate(() => Date.now())) > 24 * 60e3, "timer: kept on this device", f0);
  const fa = await p.evaluate(() => window.__focusAlarms(Date.now()));
  ok(fa.length === 2 && fa[0].at === f0.end && fa[1].at === f0.end + 5 * 60e3 && !(await p.evaluate(() => window.__alarmTimes(Date.now()).some((a) => a.tag.startsWith("focus")))), "timer: its end to this device only", fa);
  await p.click("#focusPause"); await p.waitForTimeout(300);
  ok((await txt(p, "#focusBar")).startsWith("一時停止中") && (await txt(p, "#focusPause")) === "再開" && (await p.evaluate(() => window.__focusAlarms(Date.now()))).length === 0, "timer: paused, no alarm");
  await p.click("#focusPause"); await p.waitForTimeout(300);
  ok((await txt(p, "#focusBar")).startsWith("集中") && (await txt(p, "#focusPause")) === "一時停止", "timer: on again");
  // 12 minutes in, ended: those minutes kept
  await p.evaluate(({ P }) => { const v = JSON.parse(localStorage.getItem(P + "focus")); v.end = Date.now() + 13 * 60e3; localStorage.setItem(P + "focus", JSON.stringify(v)); }, { P });
  await p.click("#focusStop"); await p.waitForTimeout(500);
  let c = (await ls(p, "todos")).find((t) => t.id === "c"), log = (await ls(p, "settings")).find((x) => x.id === "focusLog");
  ok(await p.isHidden("#focusBar") && c.focus === 12 && log.days[today] === 12 && (await toast(p)).includes("集中した 12 分を記録しました"), "timer: ended at 12 minutes, kept", { focus: c.focus, log, t: await toast(p) });
  ok((await txt(p, "#todoList")).includes("集中 12 分"), "timer: the minutes on its row");
  // over while the app was away: 25 minutes kept, then 休憩, then done
  await p.evaluate(({ P }) => localStorage.setItem(P + "focus", JSON.stringify({ kind: "work", todoId: "c", len: 25, end: Date.now() - 2 * 60e3, left: null, at: Date.now() - 27 * 60e3 })), { P });
  await p.reload(); await p.waitForTimeout(900);
  c = (await ls(p, "todos")).find((t) => t.id === "c");
  ok(c.focus === 37 && await p.isVisible("#focusBar") && (await txt(p, "#focusBar")).startsWith("休憩 3:"), "timer: over while away: kept, 休憩 going on", { focus: c.focus, bar: await txt(p, "#focusBar") });
  await p.click("#focusPause"); await p.waitForTimeout(300); // 集中する: 休憩 cut short
  ok((await txt(p, "#focusBar")).startsWith("集中 25:00"), "timer: 休憩 cut short, the next 集中");
  await p.evaluate(({ P }) => localStorage.setItem(P + "focus", JSON.stringify({ kind: "work", todoId: null, len: 25, end: Date.now() - 40 * 60e3, left: null, at: Date.now() - 65 * 60e3 })), { P });
  await p.reload(); await p.waitForTimeout(900);
  ok(await p.isHidden("#focusBar") && (await toast(p)).includes("集中タイマーが終わっていました（25分を記録）"), "timer: both over while away: said, with もう1回", await toast(p));
  log = (await ls(p, "settings")).find((x) => x.id === "focusLog");
  ok(log.days[today] === 12 + 25 + 25, "timer: the day's minutes (one without a ToDo too)", log.days);
  // the length from 編集
  await p.click("#todoSettings"); await p.waitForTimeout(500);
  await p.selectOption("#focusWork", "50"); await p.waitForTimeout(200);
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  await p.click("#todoMore"); await p.waitForTimeout(300); await pressMenu(p, "集中タイマーを始める");
  ok((await txt(p, "#focusBar")).startsWith("集中 50:00") && (await txt(p, "#focusName")) === "", "timer: 50 分 from 編集, without a ToDo from その他", await txt(p, "#focusBar"));
  await p.goto(URL0 + "#home"); await p.reload(); await p.waitForTimeout(800);
  ok(await p.isVisible("#focusBar"), "timer: over another page, after the app opened again");
  await p.screenshot({ path: __dirname + "/shots/t-timer.png" });
  ok(!p.errs.length, "no errors: " + p.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
