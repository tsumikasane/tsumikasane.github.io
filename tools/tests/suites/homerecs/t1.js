// きょう's きょうの記録 as a checklist of 毎日記録するもの (the user's call, 2026-11-23: as からだ's はじめにやること has them,
// an empty circle till it is in, then a check). Those picked in つみかさね's settings, in their order; with none picked,
// as before (the kinds kept in the last 14 days, as chips)
const { chromium } = require("playwright");
const { URL0, P, phone, seed } = require("./lib");
const { toTile } = require("../homeparts/parts");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const day = "2026-11-23", T = Date.parse(`${day}T08:00:00+09:00`);
const ALL = ["journal", "weight", "meal", "workout", "study", "routine", "money"];
// (the tile where it is: in 完了 once opened, as its 記録する opens a sheet or a page (きょう まだ・完了, 2026-11-25))
const rows = async (p) => (await toTile(p, "h3recs"), p.evaluate(() => [...document.querySelectorAll('[data-tile="h3recs"] .h3-checks li')].map((li) => ({
  k: li.dataset.k, ok: li.classList.contains("ok"), name: li.querySelector(".h3-check-w")?.firstChild?.textContent,
  note: li.querySelector(".h3-check-note")?.textContent || null, go: !!li.querySelector(".h3-check-go"), mark: !!li.querySelector(".h3-check-mark svg") }))));
const big = async (p) => (await toTile(p, "h3recs"), p.evaluate(() => document.querySelector('[data-tile="h3recs"] .big')?.textContent.replace(/\s+/g, "") ?? null));
const put = (p, k, v) => p.evaluate(({ P, k, v }) => localStorage.setItem(P + k, JSON.stringify(v)), { P, k, v });
const reload = async (p) => { await p.reload(); await p.waitForTimeout(800); };
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date(`${day}T13:00:00+09:00`), { deviceScaleFactor: 1 });
  const R = (id, name) => ({ id, name, createdAt: T - 30 * 864e5 });
  await seed(p, {
    settings: [{ id: "recRemind", on: true, kinds: ALL, times: ["21:00"], updatedAt: 1 }],
    weights: [{ id: day, date: day, kg: 89.2, createdAt: T }], meals: [{ id: "m1", date: day, slot: "朝食", text: "パン", kcal: 300, createdAt: T }],
    routines: [R("r1", "ストレッチ"), R("r2", "読書")], routineDays: [{ id: day, date: day, done: ["r1"], at: { r1: T }, updatedAt: T }],
  }, "home");
  await p.waitForTimeout(400);
  let r = await rows(p);
  ok(r.map((x) => x.name).join("・") === "日記・からだ・食事・運動・勉強・ルーティーン・家計簿", "毎日記録するもの, in their order", r.map((x) => x.name));
  ok(r.filter((x) => x.ok).map((x) => x.k).join() === "weight,meal" && r.filter((x) => x.ok).every((x) => x.note === "記録しました" && x.mark && !x.go), "in: からだ and 食事, checked, 記録しました", r);
  ok(r.filter((x) => !x.ok).every((x) => x.go && !x.mark && !x.note), "not yet: an empty circle and 記録する (ルーティーン: one of two not done)", r);
  ok((await big(p)) === "2/7" && await p.evaluate(() => document.querySelector('[data-tile="h3recs"] .h3-checks-bar')?.getAttribute("aria-label")) === "7 のうち 2 記録しました", "2 / 7 and the bar", await big(p));
  ok(!(await p.$('[data-tile="h3recs"] .h3-rec')), "not the chips of before");
  // 記録する: 勉強's sheet; 日記 opens its page
  await toTile(p, "h3recs"); await p.click('.h3-check-go[data-k="study"]'); await p.waitForTimeout(700);
  ok((await p.evaluate(() => document.getElementById("sheetTitle")?.textContent)) === "勉強を記録", "勉強's 記録する: its sheet");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  await toTile(p, "h3recs"); await p.click('.h3-check-go[data-k="journal"]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => location.hash) === "#journal", "日記's 記録する: 日記");
  // recorded elsewhere: checked; ルーティーン all done; 家計簿 said to be きょうは使っていない
  await put(p, "journal", [{ id: day, date: day, text: "きょうは晴れ", createdAt: T }]);
  await put(p, "study", [{ id: "s1", date: day, minutes: 30, createdAt: T }]);
  await put(p, "workouts", [{ id: "w1", date: day, type: "ラン", minutes: 20, createdAt: T }]);
  await put(p, "routineDays", [{ id: day, date: day, done: ["r1", "r2"], at: { r1: T, r2: T }, updatedAt: T }]);
  await p.evaluate(({ P, day }) => { const s = JSON.parse(localStorage.getItem(P + "settings")); s.push({ id: "moZero", days: [day], updatedAt: 1 }); localStorage.setItem(P + "settings", JSON.stringify(s)); }, { P, day });
  await p.goto(URL0 + "#home"); await reload(p);
  r = await rows(p);
  ok(r.every((x) => x.ok) && r.find((x) => x.k === "routine").note === "ぜんぶできました" && r.find((x) => x.k === "money").note === "使っていない日" && (await big(p)) === "7/7", "all in: ぜんぶできました, 使っていない日, 7 / 7", r);
  ok((await p.evaluate(() => document.querySelector('[data-tile="h3recs"] .sub')?.textContent)) === "きょうの記録はぜんぶ済みました", "all in: said");
  // no ルーティーン asked of today: きょうはありません
  await put(p, "routines", []); await put(p, "routineDays", []);
  await reload(p);
  ok((await rows(p)).find((x) => x.k === "routine")?.note === "きょうはありません", "no ルーティーン today: きょうはありません");
  ok(!p.errs.length, "no page errors (1)", p.errs);

  // 毎日記録するものを変える: つみかさね's settings at the kinds; one off, gone from the tile
  await toTile(p, "h3recs"); await p.click('[data-tile="h3recs"] .h3-recs-set'); await p.waitForTimeout(900);
  ok(await p.evaluate(() => { const h = document.getElementById("recRemindKindsHead"), r = h?.getBoundingClientRect(); return !!h && r.top > 0 && r.top < 320; }), "毎日記録するものを変える: the settings, at 毎日記録するもの");
  await p.click("label[for=recKind_money]"); await p.waitForTimeout(300);
  await p.click("#sheetDone"); await p.waitForTimeout(600);
  r = await rows(p);
  ok(r.length === 6 && !r.some((x) => x.k === "money"), "家計簿 off there: 6 here", r.map((x) => x.k));

  // none picked: as before (the kinds kept lately, as chips) and 毎日記録するものを選ぶ
  await seed(p, { settings: [{ id: "recRemind", on: false, kinds: [], times: ["21:00"], updatedAt: 1 }], weights: [{ id: day, date: day, kg: 89.2, createdAt: T }], study: [{ id: "s0", date: "2026-11-20", minutes: 30, createdAt: T }] }, "home");
  ok(!(await p.$('[data-tile="h3recs"] .h3-checks')) && JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('[data-tile="h3recs"] .h3-rec')].map((x) => x.dataset.k + (x.classList.contains("done") ? "+" : "")))) === '["weight+","study"]'
    && (await p.evaluate(() => document.querySelector('[data-tile="h3recs"] .h3-recs-set')?.textContent)) === "毎日記録するものを選ぶ", "none picked: as before, and 毎日記録するものを選ぶ");
  // not set yet, the 日記 お知らせ of before on: started from it (日記)
  await seed(p, { settings: [{ id: "jnRemind", on: true, at: "21:30", updatedAt: 1 }] }, "home");
  r = await rows(p);
  ok(r.length === 1 && r[0].k === "journal" && !r[0].ok, "not set yet: from the お知らせ of before (日記)", r);
  ok(!p.errs.length, "no page errors (2)", p.errs);

  // ---- きょうやるToDo (the user's call, 2026-11-23): in the list while きょうやる is in use, till the list is set again;
  // how far and 開く; ぜんぶ終えました once all are done; 選ぶ while none are picked ----
  const TD = ["つみかさねアプリ整理", "Vポイント獲得", "レポートを書く", "買い物", "洗濯", "メールを返す"].map((text, i) => ({ id: "t" + i, text, today: day, createdAt: T + i, ...(i === 5 ? { done: true, doneAt: T + 3600e3 } : {}) }));
  await seed(p, { settings: [{ id: "recRemind", on: true, kinds: ALL, times: ["21:00"], updatedAt: 1 }], todos: TD }, "home");
  r = await rows(p);
  const td = r.find((x) => x.k === "todo");
  ok(r.length === 8 && r[7].k === "todo" && td.name === "きょうやるToDo" && !td.ok && td.go, "set before it came, きょうやる in use: きょうやるToDo at the end, not yet", r.map((x) => x.k));
  ok((await p.evaluate(() => document.querySelector('li[data-k="todo"] .h3-check-w small')?.textContent)) === "6 件中 1 件" && (await p.evaluate(() => document.querySelector('.h3-check-go[data-k="todo"]')?.textContent)) === "開く", "how far, and 開く");
  await toTile(p, "h3recs"); await p.click('.h3-check-go[data-k="todo"]'); await p.waitForTimeout(900);
  ok(await p.evaluate(() => location.hash === "#todo" && document.getElementById("sec-todo")?.classList.contains("td-focus")), "開く: ToDo, きょうやるだけ表示");
  await p.evaluate(({ P }) => { const k = P + "todos", l = JSON.parse(localStorage.getItem(k)); l.forEach((t) => { t.done = true; t.doneAt = Date.now(); }); localStorage.setItem(k, JSON.stringify(l)); }, { P });
  await p.goto(URL0 + "#home"); await reload(p);
  ok((await rows(p)).find((x) => x.k === "todo")?.note === "ぜんぶ終えました", "all done: checked, ぜんぶ終えました");
  await p.evaluate(({ P }) => { const k = P + "todos", l = JSON.parse(localStorage.getItem(k)); l.forEach((t) => { t.today = "2026-11-22"; t.done = false; delete t.doneAt; }); localStorage.setItem(k, JSON.stringify(l)); }, { P });
  await reload(p); await toTile(p, "h3recs"); // (opened by its 開く above: in 完了)
  ok((await p.evaluate(() => document.querySelector('li[data-k="todo"] .h3-check-w small')?.textContent)) === "まだ選んでいません" && (await p.evaluate(() => document.querySelector('.h3-check-go[data-k="todo"]')?.textContent)) === "選ぶ", "none picked today: 選ぶ");
  await toTile(p, "h3recs"); await p.click('.h3-check-go[data-k="todo"]'); await p.waitForTimeout(900);
  ok((await p.evaluate(() => document.getElementById("sheetTitle")?.textContent)) === "きょうやるを選ぶ", "選ぶ: きょうやるを選ぶ");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  // turned off: kept so
  await p.goto(URL0 + "#home"); await reload(p);
  await toTile(p, "h3recs"); await p.click('[data-tile="h3recs"] .h3-recs-set'); await p.waitForTimeout(900);
  await p.evaluate(() => document.getElementById("recKind_todo").scrollIntoView({ block: "center" })); await p.waitForTimeout(300);
  await p.click("label[for=recKind_todo]"); await p.waitForTimeout(300);
  await p.click("#sheetDone"); await p.waitForTimeout(600);
  await reload(p);
  ok(!(await rows(p)).some((x) => x.k === "todo"), "turned off there: gone, and stays gone");
  // not in use (no きょうやる in the last 14 days): not put in
  await seed(p, { settings: [{ id: "recRemind", on: true, kinds: ["journal"], times: ["21:00"], updatedAt: 1 }], todos: [{ id: "x", text: "むかしの", today: "2026-10-01", createdAt: T }] }, "home");
  ok(JSON.stringify((await rows(p)).map((x) => x.k)) === '["journal"]', "きょうやる not in use lately: not put in");
  ok(!p.errs.length, "no page errors (3)", p.errs);

  // ---- 目標 and 睡眠 (the user's call, 2026-11-23): in the list while in use lately; 開く for 目標, 記録する for 睡眠 (からだ's
  // day at the time still to put in); 進めました, 記録しました ----
  const G = (mandala) => [{ id: "g1", title: "英語", depth: 1, mandala, createdAt: T - 30 * 864e5 }];
  await seed(p, { settings: [{ id: "recRemind", on: true, kinds: ["journal"], times: ["21:00"], updatedAt: 1 }], goals: G([{ t: "単語", d: true, at: T - 864e5 }, { t: "音読" }]),
    bodyDays: [{ id: day, date: day, bed: "23:30", createdAt: T - 864e5 }] }, "home");
  r = await rows(p);
  ok(JSON.stringify(r.map((x) => x.k)) === '["journal","goal","sleep"]' && !r[1].ok && !r[2].ok, "in use lately: 目標 and 睡眠 put in, not yet", r.map((x) => x.k));
  ok((await p.evaluate(() => document.querySelector('.h3-check-go[data-k="goal"]')?.textContent)) === "開く" && (await p.evaluate(() => document.querySelector('li[data-k="sleep"] .h3-check-w small')?.textContent)) === "起きた時刻がまだです",
    "目標: 開く; 睡眠: 起きた時刻がまだです");
  await toTile(p, "h3recs"); await p.click('.h3-check-go[data-k="sleep"]'); await p.waitForTimeout(900);
  ok(await p.evaluate(() => location.hash === "#diet" && document.activeElement?.id === "bd2Wake"), "睡眠's 記録する: からだ, at 起きた時刻");
  await p.goto(URL0 + "#home"); await reload(p);
  await toTile(p, "h3recs"); await p.click('.h3-check-go[data-k="goal"]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => location.hash) === "#goal", "目標's 開く: 目標");
  await put(p, "goals", G([{ t: "単語", d: true, at: T - 864e5 }, { t: "音読", d: true, at: T + 3600e3 }]));
  await put(p, "bodyDays", [{ id: day, date: day, bed: "23:30", wake: "07:00", createdAt: T - 864e5 }]);
  await p.goto(URL0 + "#home"); await reload(p);
  r = await rows(p);
  ok(r.find((x) => x.k === "goal")?.note === "進めました" && r.find((x) => x.k === "sleep")?.note === "記録しました", "in: 進めました, 記録しました", r);
  // not in use lately: not put in
  await seed(p, { settings: [{ id: "recRemind", on: true, kinds: ["journal"], times: ["21:00"], updatedAt: 1 }], goals: G([{ t: "単語", d: true, at: Date.parse("2026-10-01T09:00:00+09:00") }]),
    bodyDays: [{ id: "2026-10-01", date: "2026-10-01", bed: "23:00", wake: "07:00", createdAt: T }] }, "home");
  ok(JSON.stringify((await rows(p)).map((x) => x.k)) === '["journal"]', "目標 and 睡眠 not in use lately: not put in");
  ok(!p.errs.length, "no page errors (4)", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
