// ToDo その5: the edges — nothing yet (no boxes offered, no card, an empty month), no classes nor plans to pick, a 期限
// picked and let go in its own sheet, 再通知 without お知らせ and with no time, a repeat taking 再通知 and 場所 on, Apple's
// map, a checklist's checks not deleted with the done ones, a card put away yesterday, the ones 間に合うか leaves out,
// すっきり while picking, the calendar's other months, ⑨ under five, sets' words, and older data with none of these
process.env.URL0 = process.env.URL0 || "http://localhost:8780/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const todo = async (p, id) => (await ls(p, "todos")).find((t) => t.id === id);
const byText = async (p, text) => (await ls(p, "todos")).filter((t) => t.text === text);
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const status = (p) => p.evaluate(() => [document.getElementById("status")?.textContent || "", document.getElementById("sheetStatus").textContent].join("｜"));
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td5[f](...a), { f, a });
const title = (p) => p.evaluate(() => document.getElementById("sheetTitle").textContent);
const menuItems = async (p) => { await p.click("#todoMore"); await p.waitForTimeout(300); const xs = await p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent)); await p.click("#todoMenuNo"); await p.waitForTimeout(300); return xs; };
const menu = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(300); await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(600); };
const WHEN = new Date("2026-11-11T08:30:00+09:00");
(async () => {
  const b = await chromium.launch();
  const mk = async (o = {}) => { const p = await phone(b, WHEN, { deviceScaleFactor: 1, ...o }); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); }); return p; };

  // ---- nothing yet: no boxes offered, no card; 間に合うか and the month empty; no classes nor plans to pick
  const e = await mk();
  await seed(e, {}, "todo"); await e.waitForTimeout(1000);
  const items0 = await menuItems(e);
  ok(!items0.some((x) => x.includes("重要と急ぎ")) && items0.includes("間に合うかチェック") && !items0.some((x) => x.includes("チェックリスト")), "nothing yet: no boxes offered; no list to make one", items0);
  ok(await e.isHidden("#td5RiskCard") && await e.isHidden("#td5CheckCard"), "nothing yet: no cards");
  await menu(e, "間に合うかチェック");
  ok((await txt(e, "#tdPanelBody .card.empty")) === "2週間先までに期限のあるToDoはありません。", "⑥ none: said so");
  await e.click("#sheetDone"); await e.waitForTimeout(400);
  await e.click("#todoWeek"); await e.waitForTimeout(600);
  await e.locator(".td5-week-seg button", { hasText: "1か月" }).click(); await e.waitForTimeout(400);
  ok((await txt(e, ".td5-cal-sum")) === "この月に期限のToDoはありません" && (await e.$$(".td5-cal-c")).length === 0, "⑧ an empty month");
  await e.click("#sheetDone"); await e.waitForTimeout(400);
  await e.click("#todoAdd"); await e.waitForTimeout(600);
  await e.locator("#todoByBox button", { hasText: "授業・予定から選ぶ" }).click(); await e.waitForTimeout(300);
  ok((await txt(e, "#todoByList")).startsWith("30日先までに、授業や予定がありません。"), "② nothing to pick: said so", await txt(e, "#todoByList"));
  await e.locator("#todoByBox button", { hasText: "授業・予定から選ぶ" }).click(); await e.waitForTimeout(200);
  ok(await e.isHidden("#todoByList"), "② closed again");
  // ③ 再通知 picked, then お知らせ off: not kept
  await e.fill("#todoText", "ゴミを出す"); await e.fill("#todoDue", "2026-11-12"); await e.dispatchEvent("#todoDue", "change");
  await e.click("#todoRemind"); await e.waitForTimeout(200);
  await e.selectOption("#todoNag", "60"); await e.click("#todoRemind"); await e.waitForTimeout(200);
  ok(await e.isHidden("#todoNagRow"), "③ お知らせ off: 再通知 hidden");
  await e.click("#todoSave"); await e.waitForTimeout(500);
  const g0 = (await byText(e, "ゴミを出す"))[0];
  ok(g0 && !("nag" in g0) && !g0.remind, "③ not kept without お知らせ", g0);
  await e.click("#sheetCancel"); await e.waitForTimeout(500);
  // ⑨ under five
  await menu(e, "完了のふりかえり");
  ok((await e.evaluate(() => [...document.querySelectorAll("#tdRevBody .group-foot")].map((x) => x.textContent).join("|"))).includes("この4週間に終えたToDoが5件以上になると、終えた時間帯と曜日が出ます（いま 0 件）。"), "⑨ under five: said so");
  await e.click("#sheetDone"); await e.waitForTimeout(400);

  // ---- the example: a 期限 picked in its own sheet, and let go
  const p = await mk();
  await seed(p, D.all(), "todo"); await p.waitForTimeout(1200);
  await p.click('#todoList [data-edit="c"]'); await p.waitForTimeout(700);
  ok(!!(await p.$("#reByBox")) && !!(await p.$("#rePlace")), "② ④ in its own sheet");
  await p.locator("#reByBox button", { hasText: "授業・予定から選ぶ" }).click(); await p.waitForTimeout(300);
  await p.locator("#reByList .td5-by-opt", { hasText: "面接" }).click(); await p.waitForTimeout(300);
  ok((await p.inputValue("#reDue")) === "2026-11-18" && (await p.inputValue("#reTime")) === "14:00" && (await p.inputValue("#rePlace")) === "本社ビル 5階", "② picked there: its day, time, place");
  await p.click("#recSave"); await p.waitForTimeout(600);
  let c = await todo(p, "c");
  ok(c.by?.n === "面接" && c.by.k === "ev" && c.due === "2026-11-18" && c.time === "14:00" && c.place === "本社ビル 5階", "② kept from its own sheet", c);
  await p.click('#todoList [data-edit="c"]'); await p.waitForTimeout(700);
  ok((await txt(p, "#reByBox .td5-by-now")) === "予定「面接」（11/18（水） 14:00）まで", "② said there again", await txt(p, "#reByBox .td5-by-now"));
  await p.fill("#reDue", "2026-11-17"); await p.dispatchEvent("#reDue", "change"); await p.waitForTimeout(200);
  await p.click("#recSave"); await p.waitForTimeout(600);
  c = await todo(p, "c");
  ok(!c.by && c.due === "2026-11-17", "② its 期限 changed: let go", c);
  // ③ no time: from the time ToDos are told (9:00), every 30 minutes
  await p.click('#todoList [data-edit="d"]'); await p.waitForTimeout(700);
  await p.fill("#reDue", "2026-11-11"); await p.dispatchEvent("#reDue", "change"); await p.click("#reRemind"); await p.waitForTimeout(300);
  ok(await p.isVisible("#reNagRow"), "③ お知らせ on there: 再通知 shown");
  await p.selectOption("#reNag", "30"); await p.click("#recSave"); await p.waitForTimeout(600);
  const dn = (await W(p, "nag", WHEN.getTime())).filter((a) => a.tag.startsWith("todo-nag:d:")).map((a) => new Date(a.at).toISOString().slice(11, 16));
  ok(JSON.stringify(dn) === '["00:30","01:00","01:30","02:00","02:30"]', "③ no time: after 9:00 (JST 9:30〜11:30)", dn);
  // ③④ a repeat's next turn takes them on
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.fill("#todoText", "植木に水"); await p.fill("#todoDue", "2026-11-11"); await p.dispatchEvent("#todoDue", "change");
  await p.selectOption("#todoRepeat", "daily"); await p.fill("#todoTime", "19:00"); await p.dispatchEvent("#todoTime", "change"); await p.waitForTimeout(200);
  await p.selectOption("#todoNag", "10"); await p.fill("#todoPlace", "ベランダ"); await p.click("#todoSave"); await p.waitForTimeout(600);
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  const w0 = (await byText(p, "植木に水"))[0];
  await p.click(`#todoList [data-check="${w0.id}"]`); await p.waitForTimeout(1800);
  const w1 = (await byText(p, "植木に水")).find((x) => !x.done);
  ok(w1 && w1.due === "2026-11-12" && w1.nag === 10 && w1.place === "ベランダ", "③④ a repeat's next turn: 再通知 and 場所 go on", w1);

  // ---- ⑤ a checklist's checks aren't deleted with the done ones; and ckOff ones stay out under すべて
  await p.locator("#todoTabs button", { hasText: "持ち物" }).click(); await p.waitForTimeout(400);
  const its = await menuItems(p);
  ok(!its.some((x) => /完了した \d+ 件を削除/.test(x)) || its.some((x) => x === "完了した 1 件を削除"), "⑤ その他 in a checklist: its checks not offered to delete", its);
  await p.locator("#todoTabs button", { hasText: "すべて" }).click(); await p.waitForTimeout(400);
  const shownIds = await p.evaluate(() => [...document.querySelectorAll("#todoList [data-check]")].map((x) => x.dataset.check));
  ok(!shownIds.includes("p0") && shownIds.includes("p1"), "⑤ under すべて: the old check out, yesterday's in its place");
  // ⑤ only one item: no 「ぜんぶ」 words
  const q = await mk();
  await seed(q, { todoLists: [{ id: "l1", name: "朝", check: true, order: 0 }], todos: [{ id: "x1", text: "歯みがき", listId: "l1", createdAt: D.T("2026-11-01") }] }, "todo"); await q.waitForTimeout(900);
  await q.locator("#todoTabs button", { hasText: "朝" }).click(); await q.waitForTimeout(300);
  await q.click('#todoList [data-check="x1"]'); await q.waitForTimeout(1700);
  ok(!(await status(q)).includes("ぜんぶチェックしました") && (await txt(q, "#td5CheckCard .td-fc-n")) === "1 / 1", "⑤ a list of one: no words, 1 / 1", await status(q));

  // ---- ⑥ put away yesterday: back today; leaves out a checklist's, a waiting one, one not begun
  await p.evaluate((P) => localStorage.setItem(P.replace(/:$/, ":") + "td5RiskOff", JSON.stringify({ day: "2026-11-10", d: "2026-11-12" })), P);
  await p.reload(); await p.waitForTimeout(1200);
  ok(await p.isVisible("#td5RiskCard"), "⑥ put away yesterday: back today");
  const before = (await W(p, "risk")).find((x) => x.d === "2026-11-12");
  await p.evaluate(() => {});
  await p.evaluate(({ P }) => {
    const k = P + "todos", xs = JSON.parse(localStorage.getItem(k));
    xs.push({ id: "w1", text: "返事を待つ", due: "2026-11-12", mins: 600, wait: { since: "2026-11-10" }, createdAt: 1 }, { id: "w2", text: "あとで始める", due: "2026-11-12", start: "2026-11-12", mins: 600, createdAt: 2 }, { id: "w3", text: "充電器2", listId: "l-pack", due: "2026-11-12", mins: 600, createdAt: 3 });
    localStorage.setItem(k, JSON.stringify(xs));
  }, { P });
  await p.reload(); await p.waitForTimeout(1200);
  const after = (await W(p, "risk")).find((x) => x.d === "2026-11-12");
  ok(after && before && after.work === before.work + 600 && after.n === before.n + 1, "⑥ 返事待ち and a checklist's left out; one not begun yet counted (its 期限 needs the time too)", [before, after]);

  // ---- ⑦ すっきり, but not while picking
  await p.click("#td4View"); await p.waitForTimeout(500);
  await p.locator(".td4-opt", { hasText: "すっきり" }).click(); await p.waitForTimeout(300);
  await p.click("#sheetDone"); await p.waitForTimeout(400);
  await menu(p, "選択して、まとめて変える");
  ok(!(await p.evaluate(() => document.getElementById("todoList").classList.contains("td5-compact"))), "⑦ not while picking");
  await p.evaluate(() => document.getElementById("tdSelDone")?.click() ?? document.querySelector("#tdSelHead button:last-child")?.click()); await p.waitForTimeout(400);

  // ---- ⑧ the calendar's months: October's done ones, December, a day pressed twice
  await p.click("#todoWeek"); await p.waitForTimeout(600);
  await p.locator(".td5-week-seg button", { hasText: "1か月" }).click(); await p.waitForTimeout(300);
  await p.click('.td5-cal-top [aria-label="前の月"]'); await p.waitForTimeout(300);
  const oct = await p.evaluate(() => [document.querySelector(".td5-cal-ym").textContent, document.querySelectorAll(".td5-cal-ok").length, document.querySelector(".td5-cal-sum").textContent]);
  ok(oct[0] === "2026年10月" && oct[1] === 7 && oct[2] === "この月の期限 7 件（まだ 0 件）", "⑧ October: the done ones checked", oct);
  await p.click('.td5-cal-top [aria-label="次の月"]'); await p.click('.td5-cal-top [aria-label="次の月"]'); await p.waitForTimeout(300);
  ok((await txt(p, ".td5-cal-ym")) === "2026年12月", "⑧ December");
  await p.click('.td5-cal-day[aria-label^="12月1日"]'); await p.waitForTimeout(200);
  ok((await txt(p, "#tdPanelBody .card.empty")) === "この日が期限のToDoはありません。", "⑧ a day with none");
  await p.click('.td5-cal-day[aria-label^="12月1日"]'); await p.waitForTimeout(200);
  ok(!(await p.$(".td5-cal-list")) && !(await p.$("#tdPanelBody .card.empty")), "⑧ pressed again: closed");
  await p.locator(".td5-week-seg button", { hasText: "1週間" }).click(); await p.waitForTimeout(300);
  ok((await title(p)) === "週の見通し" && !!(await p.$(".td-week")), "⑧ back to 1週間");
  await p.click("#sheetDone"); await p.waitForTimeout(400);

  // ---- ④ Apple's map on an iPhone
  const r = await mk({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
  await seed(r, D.all(), "todo"); await r.waitForTimeout(1000);
  const href = await r.evaluate(() => document.querySelector('#todoList [data-edit="f"]')?.closest("li").querySelector("a.td5-place")?.getAttribute("href"));
  ok(href === "https://maps.apple.com/?q=" + encodeURIComponent("駅前の銀行"), "④ Apple's map on an iPhone", href);

  // ---- ⑩ sets: the words read; one 期限 only: none kept; a set with none: as before
  const pr = await Promise.all(["見直す（前日）", "準備（2週間前）", "提出（当日）", "メモ（あとで）", "（3日前）", "読む(5日前)"].map((x) => W(p, "parse", x)));
  ok(JSON.stringify(pr) === JSON.stringify([{ text: "見直す", off: 1 }, { text: "準備", off: 14 }, { text: "提出", off: 0 }, { text: "メモ（あとで）" }, { text: "（3日前）" }, { text: "読む", off: 5 }]), "⑩ the words read", pr);
  ok(JSON.stringify((await W(p, "made", ["a", "p3"])).map((x) => x.off ?? null)) === "[null,null]", "⑩ made with one 期限: no days kept"); // (d was given one above)
  await p.click("#todoAdd"); await p.waitForTimeout(600);
  await p.fill("#todoText", ""); await p.fill("#todoDue", "2026-11-20"); await p.dispatchEvent("#todoDue", "change"); await p.waitForTimeout(200);
  await p.locator("#todoSetPick .chip-btn", { hasText: "旅行の準備" }).click(); await p.waitForTimeout(500);
  const tr = (await ls(p, "todos")).filter((x) => ["宿を予約", "荷物をまとめる"].includes(x.text)).map((x) => x.due);
  ok(JSON.stringify(tr) === '["2026-11-20","2026-11-20"]', "⑩ a set with none: all on the 期限, as before", tr);

  ok([e, p, q, r].every((x) => !x.errs.length), "no errors on the pages", [...e.errs, ...p.errs, ...q.errs, ...r.errs]);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
