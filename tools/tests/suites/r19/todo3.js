// ToDo ⑧⑨ (⑩ 写真 taken off 2026-11-18, the user's call) and the focus timer (勉強's and 目標's since ToDo's 集中 went,
// 2026-11-21), and a repeat carrying the new fields on
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
  ok(await p.evaluate(() => document.querySelector(".td-tab").textContent) === "ぜんぶ3", "⑨ not counted on the tab", await p.evaluate(() => document.querySelector(".td-tab").textContent));
  await p.locator("#todoList .dayhead-btn.later").click(); await p.waitForTimeout(200);
  list = await txt(p, "#todoList");
  ok(list.includes("年末調整") && list.includes("12/1（火）から") && !/本を読む 0/.test(list) && /あとで 隠す 1 件/.test(list), "⑨ opened: from when", list);
  await p.fill("#todoSearch", "年末"); await p.waitForTimeout(200);
  ok((await txt(p, "#todoList")).includes("年末調整"), "⑨ found when looked for");
  await p.fill("#todoSearch", ""); await p.waitForTimeout(200);

  // ⑧ put off again: the swipe's あした (via its menu) makes 3, the row says so, its sheet offers what to do
  ok((await txt(p, "#todoList")).includes("2回先送り"), "⑧ the row says twice");
  await p.locator("#todoList li", { hasText: "申込書" }).dispatchEvent("contextmenu"); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup .ask-btn")].map((x) => x.textContent))).some((w) => w.includes("集中")), "no timer in a row's menu (taken out, 2026-11-21)");
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

  // a repeat checked off: the next turn has its time, お知らせ, how long, its steps all to do, its 開始日 as far before
  await p.locator("#todoList li", { hasText: "ゴミ出し" }).locator(".check").click(); await p.waitForTimeout(2200);
  const td = await ls(p, "todos"), was = td.find((t) => t.id === "c"), next = td.find((t) => t.id === was.next);
  ok(was.done && next && next.due === "2026-11-13" && next.time === "07:30" && next.remind === true && next.mins === 10 && next.steps.every((s) => !s.done) && next.steps.length === 2 && next.start === "2026-11-12", "repeat: the next turn carries them on", next);
  // taken back (in 完了, the bar at the foot's other half): the fields back on it
  await p.click('#todoParts button[data-part="done"]'); await p.waitForTimeout(300);
  await p.locator("#todoList li.done", { hasText: "ゴミ出し" }).locator(".check").click(); await p.waitForTimeout(600);
  await p.click('#todoParts button[data-part="open"]'); await p.waitForTimeout(300);
  ok((await ls(p, "todos")).find((t) => t.id === "c").time === "07:30", "repeat taken back: the fields back on it");

  // the timer (going on, as 勉強's or 目標's would be; one without a ToDo): counting down over every page
  await p.evaluate(({ P }) => localStorage.setItem(P + "focus", JSON.stringify({ kind: "work", todoId: null, len: 25, end: Date.now() + 25 * 60e3, left: null, at: Date.now() })), { P });
  await p.reload(); await p.waitForTimeout(900);
  ok(await p.isVisible("#focusBar") && /^集中 (25:00|24:5\d)/.test(await txt(p, "#focusBar")), "timer: 集中 25:00", await txt(p, "#focusBar"));
  const f0 = await p.evaluate(({ P }) => JSON.parse(localStorage.getItem(P + "focus")), { P });
  const fa = await p.evaluate(() => window.__focusAlarms(Date.now()));
  ok(fa.length === 2 && fa[0].at === f0.end && fa[1].at === f0.end + 5 * 60e3 && !(await p.evaluate(() => window.__alarmTimes(Date.now()).some((a) => a.tag.startsWith("focus")))), "timer: its end to this device only", fa);
  await p.click("#focusPause"); await p.waitForTimeout(300);
  ok((await txt(p, "#focusBar")).startsWith("一時停止中") && (await txt(p, "#focusPause")) === "再開" && (await p.evaluate(() => window.__focusAlarms(Date.now()))).length === 0, "timer: paused, no alarm");
  await p.click("#focusPause"); await p.waitForTimeout(300);
  ok((await txt(p, "#focusBar")).startsWith("集中") && (await txt(p, "#focusPause")) === "一時停止", "timer: on again");
  // 12 minutes in, ended: those minutes kept
  await p.evaluate(({ P }) => { const v = JSON.parse(localStorage.getItem(P + "focus")); v.end = Date.now() + 13 * 60e3; localStorage.setItem(P + "focus", JSON.stringify(v)); }, { P });
  await p.click("#focusStop"); await p.waitForTimeout(500);
  let log = (await ls(p, "settings")).find((x) => x.id === "focusLog");
  ok(await p.isHidden("#focusBar") && log.days[today] === 12 && (await toast(p)).includes("集中した 12 分を記録しました"), "timer: ended at 12 minutes, kept", { log, t: await toast(p) });
  ok(!(await txt(p, "#todoList")).includes("集中"), "timer: nothing of it on ToDo's rows");
  // over while the app was away: 25 minutes kept, then 休憩, then done
  await p.evaluate(({ P }) => localStorage.setItem(P + "focus", JSON.stringify({ kind: "work", todoId: null, len: 25, end: Date.now() - 2 * 60e3, left: null, at: Date.now() - 27 * 60e3 })), { P });
  await p.reload(); await p.waitForTimeout(900);
  ok(await p.isVisible("#focusBar") && (await txt(p, "#focusBar")).startsWith("休憩 3:"), "timer: over while away: kept, 休憩 going on", await txt(p, "#focusBar"));
  await p.click("#focusPause"); await p.waitForTimeout(300); // 集中する: 休憩 cut short
  ok((await txt(p, "#focusBar")).startsWith("集中 25:00"), "timer: 休憩 cut short, the next 集中");
  await p.evaluate(({ P }) => localStorage.setItem(P + "focus", JSON.stringify({ kind: "work", todoId: null, len: 25, end: Date.now() - 40 * 60e3, left: null, at: Date.now() - 65 * 60e3 })), { P });
  await p.reload(); await p.waitForTimeout(900);
  ok(await p.isHidden("#focusBar") && (await toast(p)).includes("集中タイマーが終わっていました（25分を記録）"), "timer: both over while away: said, with もう1回", await toast(p));
  log = (await ls(p, "settings")).find((x) => x.id === "focusLog");
  ok(log.days[today] === 12 + 25 + 25, "timer: the day's minutes", log.days);
  // the lengths as kept (編集's 集中タイマー went with ToDo's 集中): 50 分, started as 目標's cells start it (勉強's
  // 集中タイマーを始める: taken out at the user's call, 2026-11-25, tools/REMOVED.md)
  await p.click("#todoSettings"); await p.waitForTimeout(500);
  ok(!(await p.$("#focusWork")) && !(await p.$("#focusForm")), "timer: its lengths not in ToDo's 編集");
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  await p.evaluate(({ P }) => { const s = JSON.parse(localStorage.getItem(P + "settings")); s.push({ id: "focus", work: 50, rest: 10, updatedAt: 1 }); localStorage.setItem(P + "settings", JSON.stringify(s)); }, { P });
  await p.goto(URL0 + "#study"); await p.reload(); await p.waitForTimeout(900);
  ok(!(await p.$("#stFocusGo")) && !(await txt(p, "#studyForm")).includes("集中"), "timer: no 集中タイマーを始める on 勉強 (taken out 2026-11-25)", await txt(p, "#studyForm"));
  await p.evaluate(() => window.__focusStart(null, null, null)); await p.waitForTimeout(400);
  ok((await txt(p, "#focusBar")).startsWith("集中 50:00"), "timer: 50 分 as kept", await txt(p, "#focusBar"));
  await p.goto(URL0 + "#home"); await p.reload(); await p.waitForTimeout(800);
  ok(await p.isVisible("#focusBar"), "timer: over another page, after the app opened again");
  // one begun from 勉強 before its button went (2026-11-25) ends as it did: its minutes in 勉強 (focus: true)
  await p.evaluate(({ P }) => localStorage.setItem(P + "focus", JSON.stringify({ kind: "work", todoId: null, study: { sub: "" }, len: 25, end: Date.now() + 13 * 60e3, left: null, at: Date.now() - 12 * 60e3 })), { P });
  await p.reload(); await p.waitForTimeout(900);
  ok((await txt(p, "#focusName")) === "勉強", "timer: one begun from 勉強 before, on the bar as 勉強", await txt(p, "#focusBar"));
  await p.click("#focusStop"); await p.waitForTimeout(500);
  const fs1 = (await ls(p, "study")).filter((x) => x.focus);
  ok(fs1.length === 1 && fs1[0].minutes === 12 && fs1[0].date === today && !fs1[0].subjectId && await p.isHidden("#focusBar"), "timer: its 12 minutes in 勉強, as before", fs1);
  await p.screenshot({ path: __dirname + "/shots/t-timer.png" });
  ok(!p.errs.length, "no errors: " + p.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
