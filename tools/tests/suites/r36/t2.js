// ToDo その6: the edges (other days and clocks, odd input, what else counts them)
process.env.URL0 = process.env.URL0 || "http://localhost:8781/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const todo = async (p, id) => (await ls(p, "todos")).find((t) => t.id === id);
const flat = (s) => (s ?? "").replace(/[\s   ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const status = (p) => p.evaluate(() => [document.getElementById("status")?.textContent || "", document.getElementById("sheetStatus").textContent].join("｜")).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td6[f](...a), { f, a });
const menu = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(300); await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(600); };
const hold = async (p, id) => { await p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).closest("li").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), id); await p.waitForTimeout(300); };
const items = (p) => p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent));
const press = async (p, words) => { await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(500); };
const at = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const T = D.T;
// a page at a time, with the example and more
async function open(b, when, more = {}, hash = "todo") {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  const data = D.all();
  if (more.todos) data.todos = more.replace ? more.todos : [...data.todos.filter((t) => !more.todos.some((x) => x.id === t.id)), ...more.todos];
  if (more.settings) data.settings = [...data.settings, ...more.settings];
  await seed(p, data, hash); await p.waitForTimeout(1200);
  return p;
}
(async () => {
  const b = await chromium.launch();
  const errs = [];

  // ---- ④ the edges of a rest: a monthly one ending before; one N days after done; back on its day; 休みをやめる when it was past
  {
    const p = await open(b, "2026-11-11T08:30:00+09:00", { todos: [
      { id: "m1", text: "家賃を払う", due: "2026-11-25", repeat: "monthly", repeatUntil: "2026-12-31", createdAt: T("2026-10-01") },
      { id: "n1", text: "シーツを洗う", due: "2026-11-11", repeat: "after1w", createdAt: T("2026-10-01") },
      { id: "o1", text: "ストレッチ", due: "2026-11-09", repeat: "daily", createdAt: T("2026-10-01") }] });
    ok((await W(p, "turnFrom", "m1", "2027-01-10")) === null && (await W(p, "turnFrom", "m1", "2026-12-01")) === "2026-12-25", "④ monthly: its turn after, none past its いつまで");
    await hold(p, "m1"); await press(p, "繰り返しを休む");
    await p.fill("#todoMenuGroup input[type=date]", "2027-01-10"); await p.locator("#todoMenuGroup button", { hasText: "この日から再開" }).click(); await p.waitForTimeout(500);
    ok((await todo(p, "m1")).due === "2026-11-25" && !(await todo(p, "m1")).rest && (await status(p)).includes("「家賃を払う」の繰り返しは、1/10（日）より前に終わります".replace("1/10（日）", "2027/1/10（日）")), "④ past its いつまで: not rested, said", await status(p));
    const afterKind = await p.evaluate(() => typeof window.__td6.get("n1").repeat);
    await hold(p, "n1"); await press(p, "繰り返しを休む"); await press(p, "2週間");
    const n1 = await todo(p, "n1");
    ok(afterKind === "string" && n1.due === "2026-11-25" && n1.rest.until === "2026-11-25", "④ one that comes again N days after it is done: from the day it starts again", n1);
    // ストレッチ, past its 期限 (11/9), rested a week then let go: today, a turn of it
    await hold(p, "o1"); await press(p, "繰り返しを休む"); await press(p, "1週間");
    ok((await todo(p, "o1")).due === "2026-11-18", "④ daily: on the day it starts again");
    await p.locator("#todoList li.dayhead button", { hasText: "表示する" }).click(); await p.waitForTimeout(300);
    await hold(p, "o1"); await press(p, "繰り返しの休みをやめる");
    ok((await todo(p, "o1")).due === "2026-11-11" && !(await todo(p, "o1")).rest, "④ 休みをやめる, it was past: today's turn", await todo(p, "o1"));
    ok((await todo(p, "n1")).rest?.until === "2026-11-25" && !!(await p.$('#todoList [data-edit="n1"]')), "④ (シーツを洗う resting, あとで open)");
    await p.click('#todoList [data-edit="n1"]'); await p.waitForTimeout(700);
    await p.fill("#reDue", "2026-11-13"); await p.dispatchEvent("#reDue", "change"); await p.click("#recSave"); await p.waitForTimeout(600);
    ok((await todo(p, "n1")).due === "2026-11-13" && !(await todo(p, "n1")).rest && (await W(p, "section", "n1")) === "これから", "④ its 期限 changed in its sheet: the rest is over", await todo(p, "n1"));
    await p.context().close();
    // the day it starts again: back in the list
    const q = await open(b, "2026-11-18T08:30:00+09:00", { todos: [{ id: "r1", text: "ゴミ出し", due: "2026-11-19", repeat: "weekly", repeatDays: [1, 4], rest: { until: "2026-11-18", due: "2026-11-12" }, createdAt: T("2026-10-01") }] });
    ok((await W(q, "section", "r1")) === "あした" && !(await q.$('#todoList li:has([data-check="r1"]) .td6-rest')), "④ its day come: back, nothing said");
    errs.push(...p.errs, ...q.errs);
    await q.context().close();
  }

  // ---- ③ the times offered by the day and hour; one put aside out of the counts; done, nothing more
  {
    const p = await open(b, "2026-11-13T19:45:00+09:00"); // a Friday evening
    const t = (await W(p, "snoozeTimes")).map((x) => x[1]);
    ok(JSON.stringify(t) === JSON.stringify(["1時間後", "あしたの朝（09:00）"]), "③ Friday 19:45: no 今夜, and 週末 is tomorrow", t);
    await p.context().close();
    const q = await open(b, "2026-11-15T10:00:00+09:00"); // a Sunday
    const u = (await W(q, "snoozeTimes")).map((x) => flat(x[1]));
    ok(u.includes("週末（11/21（土）09:00）") && u.includes("今夜（20:00）"), "③ Sunday: 週末 is next Saturday", u);
    errs.push(...q.errs);
    await q.context().close();
    const r = await open(b, "2026-11-11T08:30:00+09:00");
    const badge = () => r.evaluate(() => document.querySelector('button[data-tab="todo"] .badge')?.textContent ?? "");
    const before = await badge();
    await r.evaluate(({ P }) => { const k = P + "todos", xs = JSON.parse(localStorage.getItem(k)); xs.find((x) => x.id === "c").snooze = Date.parse("2026-11-11T12:00:00+09:00"); localStorage.setItem(k, JSON.stringify(xs)); }, { P });
    await r.reload(); await r.waitForTimeout(1200);
    const after = await badge();
    ok(before === "3" && after === "3", "③ one put aside: still in ToDo's number (期限切れ・きょう: it is due)", [before, after]);
    // looked for, it is found (あとで open while looking)
    await r.fill("#todoSearch", "メール"); await r.waitForTimeout(400);
    ok(!!(await r.$('#todoList [data-check="c"]')), "③ found when looked for");
    await r.click('#todoList [data-check="c"]'); await r.waitForTimeout(2200);
    ok((await todo(r, "c")).done && !(await W(r, "alarms", Date.parse("2026-11-11T08:30:00+09:00"))).some((a) => a.tag.startsWith("todo-snooze:c")), "③ done: no notification to come");
    await r.fill("#todoSearch", ""); await r.waitForTimeout(300);
    errs.push(...r.errs);
    await r.context().close();
  }

  // ---- ⑤ one with steps: no 進み具合 (its steps say it), even one kept from before
  {
    const p = await open(b, "2026-11-11T08:30:00+09:00", { todos: [{ id: "s1", text: "引っ越しの準備", due: "2026-11-30", pct: 50, mins: 120, steps: [{ id: "x1", text: "箱を買う", done: true }, { id: "x2", text: "荷造り" }], createdAt: T("2026-10-01") }] });
    ok(!(await p.$('#todoList li:has([data-check="s1"]) .td6-pct')) && (await W(p, "left", "s1")) === 120, "⑤ with steps: no bar, all of it counted");
    await hold(p, "s1");
    ok(!(await items(p)).some((x) => x.startsWith("進み具合")), "⑤ none in its menu");
    await p.click("#todoMenuNo"); await p.waitForTimeout(300);
    await p.click('#todoList [data-edit="s1"]'); await p.waitForTimeout(700);
    ok(!(await p.$("#reProg")), "⑤ none in its sheet");
    await p.click("#sheetCancel"); await p.waitForTimeout(400);
    // ⑥ its steps still to do go with it
    ok((await W(p, "askText", "s1")) === "「引っ越しの準備」をお願いできますか？\n期限：11/30（月）\n・荷造り", "⑥ the steps still to do, sent too", await W(p, "askText", "s1"));
    // ⑥ neither the share sheet nor copying: said, and not waiting
    await p.evaluate(() => { navigator.share = undefined; navigator.clipboard.writeText = async () => { throw new Error("no"); }; document.execCommand = () => false; });
    await hold(p, "s1"); await press(p, "人に頼む"); await p.locator("#todoMenuGroup button", { hasText: "送る" }).click(); await p.waitForTimeout(500);
    ok(!(await todo(p, "s1")).wait && (await status(p)).includes("頼む文を送れませんでした"), "⑥ nothing sent: said, not waiting");
    // a checklist's: no あとで nor 進み具合 (人に頼む still)
    await p.locator("#todoTabs button", { hasText: "持ち物" }).click(); await p.waitForTimeout(400);
    await hold(p, "p3");
    const ck = await items(p);
    ok(!ck.some((x) => x.startsWith("あとで") || x.startsWith("進み具合") || x.startsWith("今週やる")) && ck.includes("人に頼む（送って返事待ちに）"), "②③⑤ not for a checklist's", ck);
    await p.click("#todoMenuNo"); await p.waitForTimeout(300);
    errs.push(...p.errs);
    await p.context().close();
  }

  // ---- ⑧ across midnight (23:00〜7:00): one at 23:30 comes at 7:00 the next day, one at 6:00 at 7:00; 朝のまとめ on its own; the timer's not moved
  {
    const p = await open(b, "2026-11-11T08:30:00+09:00", { todos: [
      { id: "l1", text: "夜の薬", due: "2026-11-11", time: "23:30", remind: true, createdAt: T("2026-10-01") },
      { id: "l2", text: "朝のゴミ出し", due: "2026-11-12", time: "06:00", remind: true, createdAt: T("2026-10-01") }],
      settings: [{ id: "todoQuiet", on: true, from: "23:00", to: "07:00", updatedAt: 1 }, { id: "tdMorning", on: true, at: "06:30", updatedAt: 1 }] });
    const n = Date.parse("2026-11-11T08:30:00+09:00");
    ok((await W(p, "inQuiet", at("2026-11-11", "23:30"))) && (await W(p, "inQuiet", at("2026-11-12", "06:59"))) && !(await W(p, "inQuiet", at("2026-11-12", "07:00"))) && !(await W(p, "inQuiet", at("2026-11-11", "22:59"))), "⑧ in the hours: 23:00 up to 7:00");
    ok((await W(p, "quietEnd", at("2026-11-11", "23:30"))) === at("2026-11-12", "07:00") && (await W(p, "quietEnd", at("2026-11-12", "06:00"))) === at("2026-11-12", "07:00"), "⑧ their end: the next morning, or the same");
    const al = await W(p, "alarms", n), seven = at("2026-11-12", "07:00");
    const mg = al.find((a) => a.tag === `todo-quiet:${seven}`), mo = al.find((a) => a.tag.startsWith("td-morning:2026-11-12"));
    ok(mg && mg.title === "ToDoのお知らせ 2件" && mg.body === "夜の薬、朝のゴミ出し", "⑧ 23:30 and 6:00 at 7:00 as one", al.filter((a) => a.at === seven).map((a) => [a.tag, a.title, a.body]));
    ok(mo && mo.at === seven, "⑧ 朝のまとめ (6:30) at 7:00, on its own (with the icon's number)", mo);
    errs.push(...p.errs);
    await p.context().close();
    // from = to: none quiet
    const q = await open(b, "2026-11-11T08:30:00+09:00", { settings: [{ id: "todoQuiet", on: true, from: "22:00", to: "22:00", updatedAt: 1 }] });
    ok(!(await W(q, "inQuiet", at("2026-11-11", "22:00"))) && (await W(q, "alarms", n)).some((a) => a.tag === "todo:h:2026-11-11" && a.at === at("2026-11-11", "20:00")), "⑧ the same start and end: nothing quiet");
    errs.push(...q.errs);
    await q.context().close();
  }

  // ---- ⑩ odd input: nothing, only done ones, commas that aren't a table, a table by tabs, 500 at most
  {
    const p = await open(b, "2026-11-11T08:30:00+09:00");
    const r1 = await W(p, "read", "");
    ok(r1.items.length === 0, "⑩ nothing: nothing");
    const r2 = await W(p, "read", "☑ 済んだこと\n- [x] これも\n✓ あれも");
    ok(r2.items.length === 0 && r2.skipped === 3, "⑩ only done ones", r2);
    const r3 = await W(p, "read", "牛乳, 卵, パン\nコーヒー豆");
    ok(!r3.table && r3.items.length === 2 && r3.items[0].text === "牛乳, 卵, パン", "⑩ a comma that isn't a table: lines", r3);
    const r4 = await W(p, "read", "名前\t期限\tメモ\n請求書を送る\t2026-11-19 15:00\t経理へ\n");
    ok(r4.table && r4.items.length === 1 && r4.items[0].due === "2026-11-19" && r4.items[0].time === "15:00" && r4.items[0].memo === "経理へ", "⑩ by tabs, a time with its day", r4);
    const r5 = await W(p, "read", "請求書を送る,2026/11/19\n資料を印刷,11/20,カラーで\n");
    ok(r5.table && r5.items.length === 2 && r5.items[1].due === "2026-11-20" && r5.items[1].memo === "カラーで", "⑩ 名前,期限,メモ with no heading", r5);
    const r6 = await W(p, "read", "1. 予約を取る\n2) 電話する 金曜\n* メモを書く !\n");
    ok(r6.items.map((x) => x.text).join("|") === "予約を取る|電話する|メモを書く" && r6.items[1].due === "2026-11-13" && r6.items[2].flag === true, "⑩ numbers and marks taken off; 金曜, ! read", r6.items);
    await menu(p, "ほかのアプリから取り込む");
    await p.fill(".td6-imp-ta", Array.from({ length: 520 }, (_, i) => `たくさん${i + 1}`).join("\n")); await p.waitForTimeout(500);
    ok((await txt(p, ".td6-imp-out .td-pick-count")) === "500件を読みました" && (await txt(p, ".td6-imp-out .group-foot")).includes("500件をこえる20件"), "⑩ 500 at most, said", [await txt(p, ".td6-imp-out .td-pick-count"), await txt(p, ".td6-imp-out .group-foot")]);
    await p.fill(".td6-imp-ta", "- [x] 済\n"); await p.waitForTimeout(300);
    ok((await txt(p, ".td6-imp-out .td-pick-count")) === "取り込めるToDoがありません" && !(await p.$(".td6-imp-out button")), "⑩ nothing to put in: said, no button");
    await p.fill(".td6-imp-ta", ""); await p.waitForTimeout(300);
    ok(await p.isHidden(".td6-imp-out"), "⑩ emptied: nothing under it");
    errs.push(...p.errs);
    await p.context().close();
  }

  // ---- ② the next week: last week's left over offered, the card gone; a week from Monday
  {
    const p = await open(b, "2026-11-16T08:30:00+09:00");
    ok((await W(p, "weekKey")) === "2026-11-15" && await p.isHidden("#td6WeekCard") && !(await p.$("#todoList .td6-week")), "② a new week: none yet");
    await menu(p, "今週やるを選ぶ");
    ok(!!(await p.$('#tdPanelBody .chip-btn:has-text("先週の残り 2 件を入れる")')), "② last week's 2 left over offered");
    await p.locator("#tdPanelBody .chip-btn", { hasText: "先週の残り 2 件を入れる" }).click(); await p.waitForTimeout(400);
    ok((await todo(p, "a")).week === "2026-11-15" && (await todo(p, "g")).week === "2026-11-15", "② into this week");
    await p.click("#sheetDone"); await p.waitForTimeout(400);
    ok((await txt(p, "#td6WeekCard .td-fc-n")) === "0/2", "② the card: 0 of 2");
    errs.push(...p.errs);
    await p.context().close();
    const q = await open(b, "2026-11-15T08:30:00+09:00", { settings: [{ id: "calendar", weekStart: 1, updatedAt: 1 }] });
    ok((await W(q, "weekKey")) === "2026-11-09", "② 週のはじまり Monday: Sunday is still the week from 11/9");
    errs.push(...q.errs);
    await q.context().close();
  }

  // ---- ① when: the time to the next plan said; in a checklist's tab, none; one alone, none
  {
    const p = await open(b, "2026-11-11T10:00:00+09:00");
    const why = await p.evaluate(() => [...document.querySelectorAll("#td6NowCard .td6-now-why .phrase")].map((x) => x.textContent.replace(/[\s   ]+/g, "")));
    ok(why.includes("次の予定まで3時間"), "① 10:00: 3 hours to バイト (13:00), said", why);
    await p.locator("#todoTabs button", { hasText: "持ち物" }).click(); await p.waitForTimeout(400);
    ok(await p.isHidden("#td6NowCard"), "① not in a checklist's tab");
    errs.push(...p.errs);
    await p.context().close();
    const q = await open(b, "2026-11-11T10:00:00+09:00", { replace: true, todos: D.todos().filter((t) => t.done || t.listId === "l-pack").concat([{ id: "solo", text: "ひとつだけ", createdAt: T("2026-11-01") }]) });
    ok(await q.isHidden("#td6NowCard"), "① one alone: none (the list is enough)");
    errs.push(...q.errs);
    await q.context().close();
  }

  // ---- ⑨ the last one done counts (not one cancelled)
  {
    const p = await open(b, "2026-11-11T08:30:00+09:00", { todos: [
      { id: "k1", text: "週報を書く", done: true, doneAt: T("2026-10-28", 18), focus: 40, createdAt: T("2026-10-20") },
      { id: "k2", text: "週報を書く", done: true, doneAt: T("2026-11-04", 18), focus: 33, createdAt: T("2026-10-29") },
      { id: "k3", text: "週報を書く", done: true, cancelled: true, doneAt: T("2026-11-10", 18), focus: 90, createdAt: T("2026-11-05") }] });
    ok(JSON.stringify(await W(p, "last", "週報を書く")) === JSON.stringify({ mins: 33, day: "2026-11-04" }) && JSON.stringify(await W(p, "last", "しゅうほうをかく")) === "null", "⑨ the last done (not one cancelled)", await W(p, "last", "週報を書く"));
    errs.push(...p.errs);
    await p.context().close();
  }

  ok(!errs.length, "no errors", errs);
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  await b.close();
})();
