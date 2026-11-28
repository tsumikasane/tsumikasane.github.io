// 毎日の記録のお知らせ (the user's call, 2026-11-23): what to record each day and the times, set beforehand in つみかさね's
// settings; at each time, those not in yet that day in one notification (「きょうは日記と食事の記録がまだです」). It took
// the place of 積み忘れ, 食事's 記録し忘れ, からだ's 測り忘れ, 家計簿's つけ忘れ and 日記's 書く時間: their screens and
// notifications gone, what they kept stays, and the new one starts from them. On r19's hook build (8768: __alarmTimes)
process.env.URL0 = process.env.URL0 || "http://localhost:8768/";
const { chromium } = require("playwright");
const { URL0, P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-23", tomorrow = "2026-11-24";
const T = (d, hm = "09:00") => Date.parse(`${d}T${hm}:00+09:00`);
const day = (n) => new Date(Date.parse(today + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const setting = (p, id) => p.evaluate(({ P, id }) => JSON.parse(localStorage.getItem(P + "settings") || "[]").find((x) => x.id === id) || null, { P, id });
const alarms = (p) => p.evaluate(() => window.__alarmTimes(Date.now()).filter((a) => /^(?:tsumi-remind|rec-remind):/.test(a.tag)));
const put = (p, k, list) => p.evaluate(({ P, k, list }) => localStorage.setItem(P + k, JSON.stringify(list)), { P, k, list });
const reload = async (p) => { await p.reload(); await p.waitForTimeout(700); };
const state = (p) => p.evaluate(() => ({
  on: document.getElementById("recRemindOn").checked, times: [...document.querySelectorAll("#recRemindTimes input[type=time]")].map((x) => x.value),
  off: [...document.querySelectorAll("#recRemindTimes input[type=time]")].every((x) => x.disabled), add: !!document.querySelector("#recRemindTimes .rec-remind-add"),
  kinds: [...document.querySelectorAll("#recRemindKinds input")].filter((x) => x.checked).map((x) => x.id.replace("recKind_", "")),
  names: [...document.querySelectorAll("#recRemindKinds label")].map((x) => x.textContent), foot: document.getElementById("recRemindFoot").textContent }));
const OLD = [
  { id: "tsumiRemind", on: true, at: "21:30", updatedAt: 1 },
  { id: "jnRemind", on: true, at: "21:30", updatedAt: 1 },
  { id: "mealRemind", on: true, at: { 朝食: "", 昼食: "14:00", 夕食: "21:00" }, updatedAt: 1 },
  { id: "weightRemind", on: false, at: "08:00", updatedAt: 1 },
];
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date(`${today}T12:00:00+09:00`), { deviceScaleFactor: 1 });

  // ---- 1 from the five before it: on (one was), 日記 and 食事 (theirs were on), 積み忘れ's 21:30 ----
  await seed(p, { settings: OLD, meals: [{ id: "m1", date: today, slot: "朝食", text: "パン", kcal: 300, at: "08:00", createdAt: T(today, "08:00") }] }, "tsumi");
  await p.click("#tsumiSettings"); await p.waitForTimeout(800);
  const gear = await txt(p, "#tsumiGroup");
  ok(gear.includes("毎日の記録のお知らせ") && gear.includes("毎日記録するもの") && !gear.includes("積み忘れのお知らせ"), "the gear: 毎日の記録のお知らせ, no 積み忘れのお知らせ");
  ok(await p.evaluate(() => [...document.querySelectorAll("#tsumiToc button")].find((x) => x.textContent === "お知らせ")?.dataset.to) === "recRemindHead", "its お知らせ in the gear's contents leads to it");
  // the gear's これから届くお知らせ (the next 7 days' listed): taken out at the user's call (2026-11-25, tools/REMOVED.md); the
  // notifications themselves made as before (below)
  ok(!(await p.$("#tsumiBell, #tsumiBellHead, .ts-bell")) && !(await p.$$eval("#tsumiGroup h3.group-head", (l) => l.some((x) => x.textContent.includes("これから届く")))) && !gear.includes("この先7日に届くお知らせ"),
    "これから届くお知らせ: not listed in the gear");
  let st = await state(p);
  ok(st.on && JSON.stringify(st.times) === '["21:30"]' && JSON.stringify(st.kinds) === '["journal","meal"]' && st.add && !st.off, "started from the five: on, 21:30, 日記 and 食事", st);
  ok(JSON.stringify(st.names) === JSON.stringify(["日記", "からだ", "食事", "運動", "勉強", "ルーティーン", "家計簿", "きょうやるToDo", "目標", "睡眠"]), "the kinds: the seven record pages, きょうやるToDo, 目標 and 睡眠 (2026-11-23)", st.names);
  ok(!(await setting(p, "recRemind")), "nothing of its own saved till it is changed");
  let a = await alarms(p);
  ok(a.length === 40 && new Date(a[0].at).toISOString() === "2026-11-23T12:30:00.000Z" && a[0].title === "記録のお知らせ" && a[0].body === "きょうは日記の記録がまだです" && a[0].url === "./#journal" && a[0].tag === "rec-remind:" + today,
    "today at 21:30: 日記 alone (食事 in), its page; no 1 on the icon (a block today)", a.slice(0, 1));
  ok(a[1].tag === "tsumi-remind:" + tomorrow && a[1].body === "きょうは日記と食事の記録がまだです" && a[1].url === "./#tsumi:recs", "a day to come: both, つみかさね's きょうの記録 (きょう's till it moved there, 2026-11-26); with the icon's 1", a[1]);
  const olds = await p.evaluate(() => window.__alarmTimes(Date.now()).filter((x) => /^(?:meal-remind|weight-remind|jn-remind|mo2-remind|tsumi-remind-x):/.test(x.tag)).length);
  ok(olds === 0, "none of the five's own, though theirs are on", olds);

  // ---- 2 changed here: 家計簿, a time added (up to three), one taken away, off ----
  await p.click("label[for=recKind_money]"); await p.waitForTimeout(300);
  let rr = await setting(p, "recRemind");
  ok(rr && rr.on === true && JSON.stringify(rr.kinds) === '["journal","meal","money"]' && JSON.stringify(rr.times) === '["21:30"]', "家計簿 picked: saved with the account", rr);
  await p.click("#recRemindTimes .rec-remind-add"); await p.waitForTimeout(300);
  st = await state(p);
  ok(JSON.stringify(st.times) === '["21:00","21:30"]' && await p.evaluate(() => document.activeElement?.value) === "21:00", "時刻を追加: 21:00, in order, given the focus", st.times);
  ok(JSON.stringify((await setting(p, "recRemind")).times) === '["21:00","21:30"]', "saved in order");
  a = await alarms(p);
  ok(a.length === 80 && a[0].body === "きょうは日記と家計簿の記録がまだです" && a[0].url === "./#tsumi:recs" && new Date(a[0].at).toISOString() === "2026-11-23T12:00:00.000Z" && a[2].body === "きょうは日記、食事と家計簿の記録がまだです",
    "each time each day; two or more: きょう; three: 日記、食事と家計簿", a.slice(0, 3).map((x) => x.body));
  await p.click("#recRemindTimes .rec-remind-add"); await p.waitForTimeout(300);
  st = await state(p);
  ok(st.times.length === 3 && !st.add, "three: no 時刻を追加", st);
  // a time changed: kept as typed while it has the focus, in order once left
  await p.fill("#recRemindTimes .rec-remind-time:nth-child(3) input", "07:00"); await p.dispatchEvent("#recRemindTimes .rec-remind-time:nth-child(3) input", "change"); await p.waitForTimeout(200);
  ok(JSON.stringify((await setting(p, "recRemind")).times) === '["07:00","12:00","21:00"]', "a time changed: saved", (await setting(p, "recRemind")).times);
  await p.click("#recRemindKindsHead"); await p.waitForTimeout(300);
  ok(JSON.stringify((await state(p)).times) === '["07:00","12:00","21:00"]', "left: shown in order", (await state(p)).times);
  await p.click("#recRemindTimes .rec-remind-time:nth-child(1) .icon-btn"); await p.waitForTimeout(300);
  st = await state(p);
  ok(JSON.stringify(st.times) === '["12:00","21:00"]' && st.add && await p.evaluate(() => document.activeElement?.classList.contains("rec-remind-add")), "× : that one gone, 時刻を追加 back, the focus on it", st.times);
  await p.evaluate(() => document.getElementById("recRemindOn").scrollIntoView({ block: "center" })); await p.locator("#recRemindOn").click({ force: true }); // (in the middle first: not under the sheet's head) await p.waitForTimeout(300);
  st = await state(p);
  ok(!st.on && st.off && (await setting(p, "recRemind")).on === false && st.foot.startsWith("決めた時刻に、毎日記録するもののうち"), "off: saved, the times greyed, what it does said", st);
  ok((await alarms(p)).length === 0, "off: none");
  await p.evaluate(() => document.getElementById("recRemindOn").scrollIntoView({ block: "center" })); await p.locator("#recRemindOn").click({ force: true }); // (in the middle first: not under the sheet's head) await p.waitForTimeout(300);
  // none picked: said
  for (const k of ["journal", "meal", "money"]) { await p.click(`label[for=recKind_${k}]`); await p.waitForTimeout(150); }
  ok((await state(p)).foot === "毎日記録するものを選んでください。" && (await alarms(p)).length === 0, "none picked: asked for, none sent", (await state(p)).foot);
  for (const k of ["journal", "money"]) { await p.click(`label[for=recKind_${k}]`); await p.waitForTimeout(150); }
  const kept = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "settings")).filter((x) => ["tsumiRemind", "jnRemind", "mealRemind", "weightRemind"].includes(x.id)), P);
  ok(JSON.stringify(kept) === JSON.stringify(OLD), "the five's own settings stay as they were", kept);
  // a 日記 written today: sent again, today's says 家計簿 alone, its page
  const sig1 = await p.evaluate(() => window.__pushSig());
  await put(p, "journal", [{ id: today, date: today, text: "きょうは晴れ", createdAt: T(today, "12:00") }]);
  await reload(p);
  a = await alarms(p);
  ok(a[0].body === "きょうは家計簿の記録がまだです" && a[0].url === "./#book" && await p.evaluate(() => window.__pushSig()) !== sig1, "日記 written: today's 家計簿 alone (its page, 家計簿); sent again", a[0]);
  ok(!p.errs.length, "no page errors (1, 2)", p.errs);
  // きょうやるToDo (2026-11-23): in its own words; once those picked for the day are all done, not in it
  await put(p, "settings", [{ id: "recRemind", on: true, kinds: ["money", "todo"], times: ["21:00"], known: ["journal", "weight", "meal", "workout", "study", "routine", "money", "todo"], updatedAt: 1 }]);
  await put(p, "todos", [{ id: "t1", text: "レポート", today, createdAt: T(today) }, { id: "t2", text: "買い物", today, createdAt: T(today), done: true, doneAt: T(today, "10:00") }]);
  await reload(p);
  a = await alarms(p);
  ok(a[0].body === "きょうは家計簿の記録と、きょうやるToDoがまだです" && a[0].url === "./#tsumi:recs", "きょうやるToDo: 「…の記録と、きょうやるToDoがまだです」", a[0]);
  await put(p, "expenses", [{ id: "e1", date: today, kind: "out", category: "食費", amount: 500, createdAt: T(today) }]);
  await reload(p);
  a = await alarms(p);
  ok(a[0].body === "きょうやるToDoが、まだ終わっていません" && a[0].url === "./#todo:pick", "きょうやるToDo alone: its words, ToDo's きょうやる", a[0]);
  await put(p, "todos", [{ id: "t1", text: "レポート", today, createdAt: T(today), done: true, doneAt: T(today, "12:00") }, { id: "t2", text: "買い物", today, createdAt: T(today), done: true, doneAt: T(today, "10:00") }]);
  await reload(p);
  ok(!(await alarms(p)).some((x) => x.tag.endsWith(today)), "きょうやる all done: none today");
  // 目標 and 睡眠 (2026-11-23): a goal moved that day; the night before's bed and the morning's wake
  await put(p, "settings", [{ id: "recRemind", on: true, kinds: ["goal", "sleep"], times: ["21:00"], known: ["journal", "weight", "meal", "workout", "study", "routine", "money", "todo", "goal", "sleep"], updatedAt: 1 }]);
  await put(p, "goals", [{ id: "g1", title: "英語", depth: 1, mandala: [{ t: "単語", d: true, at: T("2026-11-22", "20:00") }, { t: "音読" }], createdAt: T("2026-11-01") }]);
  await put(p, "bodyDays", [{ id: today, date: today, bed: "23:30", createdAt: T("2026-11-22", "23:30") }]);
  await reload(p);
  a = await alarms(p);
  ok(a[0].body === "きょうは目標と睡眠の記録がまだです" && a[0].url === "./#tsumi:recs", "目標 and 睡眠 not in (a goal moved yesterday, today's bed alone)", a[0]);
  await put(p, "bodyDays", [{ id: today, date: today, bed: "23:30", wake: "07:00", createdAt: T("2026-11-22", "23:30") }]);
  await reload(p);
  a = await alarms(p);
  ok(a[0].body === "きょうは目標の記録がまだです" && a[0].url === "./#goal", "睡眠 in (bed and wake): 目標 alone, its page", a[0]);
  await put(p, "goals", [{ id: "g1", title: "英語", depth: 1, mandala: [{ t: "単語", d: true, at: T("2026-11-22", "20:00") }, { t: "音読", d: true, at: T(today, "11:00") }], createdAt: T("2026-11-01") }]);
  await reload(p);
  ok(!(await alarms(p)).some((x) => x.tag.endsWith(today)), "a goal moved today: none today");

  // ---- 3 what counts as in: a weight, a 運動, a 勉強, every ルーティーン done, a 家計簿 not a 固定費 (or きょうは使っていない) ----
  const ALL = { id: "recRemind", on: true, kinds: ["journal", "weight", "meal", "workout", "study", "routine", "money"], times: ["21:00"], updatedAt: 1 };
  const R = { id: "r1", name: "ストレッチ", createdAt: T("2026-10-01") };
  await seed(p, {
    settings: [ALL], routines: [R], weights: [{ id: today, date: today, kg: 60, createdAt: T(today) }],
    workouts: [{ id: "w1", date: today, type: "ラン", minutes: 30, createdAt: T(today) }],
    expenses: [{ id: "fx-f1-2026-11", date: today, kind: "out", category: "住居", amount: 50000, fixed: "f1", createdAt: T(today) }],
  }, "home");
  a = await alarms(p);
  ok(a[0].body === "きょうは日記、食事、勉強、ルーティーンと家計簿の記録がまだです", "in: からだ and 運動; a 固定費 alone isn't 家計簿", a[0]?.body);
  await put(p, "routineDays", [{ id: today, date: today, done: ["r1"], at: { r1: T(today, "10:00") }, updatedAt: T(today, "10:00") }, { id: tomorrow, date: tomorrow, rest: true, updatedAt: 1 }]);
  await put(p, "study", [{ id: "s1", date: today, minutes: 30, createdAt: T(today) }]);
  await put(p, "settings", [ALL, { id: "moZero", days: [today], updatedAt: 1 }]);
  await reload(p);
  a = await alarms(p);
  ok(a[0].body === "きょうは日記と食事の記録がまだです", "in too: 勉強, the ルーティーン done, the day said to be きょうは使っていない", a[0]?.body);
  ok(!a.some((x) => x.tag.endsWith(tomorrow)) && a.some((x) => x.tag.endsWith(day(2))), "none on an お休みの日 (tomorrow), the day after as before");
  ok(!p.errs.length, "no page errors (3)", p.errs);

  // ---- 4 家計簿's きょうは使っていない (「きょうはまだ記録がありません。」 and its button under the budget's line, while 家計簿 was
  // picked and today had none): taken out at the user's call (2026-11-27, tools/REMOVED.md). Not there; the お知らせ tonight as
  // before; a day said so before still counts (3) ----
  await seed(p, { settings: [{ id: "recRemind", on: true, kinds: ["money"], times: ["21:00"], updatedAt: 1 }] }, "money");
  const book = await txt(p, "#sec-money");
  ok(!(await p.$("#mo2Zero")) && !/きょうはまだ記録がありません|きょうは使っていない/.test(book), "家計簿 picked, nothing today: nothing offered (taken out)", book.slice(0, 160));
  a = await alarms(p);
  ok(a.some((x) => x.tag.endsWith(today) && x.body === "きょうは家計簿の記録がまだです") && !(await setting(p, "moZero")), "the お知らせ tonight as before (家計簿 still to do)", a.map((x) => [x.tag, x.body]));

  // ---- 5 the four pages: none of their own お知らせ ----
  await seed(p, { settings: OLD.concat([{ id: "moRemind", on: true, at: "21:00", updatedAt: 1 }]) }, "diet");
  const heads = (id) => p.evaluate((id) => [...document.querySelectorAll(`#${id} .group-head`)].map((x) => x.textContent.trim()), id);
  await p.evaluate(() => document.querySelector('#dietParts button[data-part="meal"]')?.click()); await p.waitForTimeout(400);
  await p.click("#wtSettings"); await p.waitForTimeout(600);
  const mh = await heads("mealSetGroup");
  ok(!mh.includes("記録し忘れのお知らせ") && mh.includes("目安"), "食事's settings: no 記録し忘れのお知らせ", mh);
  await p.goto(URL0 + "#diet"); await reload(p);
  await p.evaluate(() => document.querySelector('#dietParts button[data-part="weight"]')?.click()); await p.waitForTimeout(400);
  await p.click("#wtSettings"); await p.waitForTimeout(600);
  const bh = await heads("bodyGroup");
  ok(!bh.includes("測り忘れのお知らせ") && bh.includes("週のまとめのお知らせ"), "からだ's settings: no 測り忘れのお知らせ", bh);
  await p.goto(URL0 + "#money"); await reload(p);
  await p.click("#moneySettings"); await p.waitForTimeout(600);
  const oh = await heads("moneyGroup");
  ok(!oh.includes("つけ忘れのお知らせ") && oh.includes("貯金の目標"), "家計簿's settings: no つけ忘れのお知らせ", oh);
  await p.goto(URL0 + "#journal"); await reload(p);
  await p.click("#jnSettings"); await p.waitForTimeout(600);
  const jh = await heads("jnSetGroup");
  ok(!jh.includes("書く時間のお知らせ") && jh.includes("テンプレート") && jh.includes("週のふりかえりのお知らせ"), "日記's settings: no 書く時間のお知らせ", jh);
  ok(!(await p.$("#mealRemindOn, #wtRemindOn, #mo2RemindOn, #jnRemindOn, #tsumiRemindOn")), "none of their switches left");
  ok(!p.errs.length, "no page errors (4, 5)", p.errs);

  // ---- 6 the time suggested: by when 日記 went in on the last ten days (22:00): お知らせを 22:30 に ----
  const jn = Array.from({ length: 10 }, (_, i) => { const d = day(-1 - i); return { id: d, date: d, text: "日記", createdAt: T(d, "22:00") }; });
  await seed(p, { settings: [{ id: "recRemind", on: true, kinds: ["journal"], times: ["21:00"], updatedAt: 1 }], journal: jn }, "tsumi");
  await p.click("#tsumiSettings"); await p.waitForTimeout(800);
  ok(await p.isVisible("#tsumiRemindTip") && (await txt(p, "#tsumiRemindTipText")) === "この30日は、たいてい 22:00 ごろまでに日記を記録しています。" && (await txt(p, "#tsumiRemindTipBtn")) === "お知らせを 22:30 にする",
    "the time suggested", await txt(p, "#tsumiRemindTip"));
  await p.click("#tsumiRemindTipBtn"); await p.waitForTimeout(400);
  ok(JSON.stringify((await setting(p, "recRemind")).times) === '["22:30"]' && await p.isHidden("#tsumiRemindTip") && JSON.stringify((await state(p)).times) === '["22:30"]', "pressed: 22:30, the suggestion gone");
  ok(!p.errs.length, "no page errors (6)", p.errs);

  // ---- 7 on, this device getting them: no words on what comes when (「毎日 21:00 に、…この端末に届きます。…」 and how
  // ルーティーン, 家計簿, きょうやるToDo, 目標 and 睡眠 count), nor on the icon's 1: taken out at the user's call (2026-11-26,
  // tools/REMOVED.md); the notifications as before. The notification server here one of the test's own ----
  const q = await phone(b, new Date(`${today}T12:00:00+09:00`), { deviceScaleFactor: 1 });
  await q.context().addInitScript(() => { window.__pushServer = "https://push.example.test"; try { Object.defineProperty(Notification, "permission", { get: () => "granted" }); } catch {} }); // (notifications allowed, as on a phone that gets them)
  await q.context().route("https://push.example.test/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"sub":true,"alarms":0}' }));
  await seed(q, { settings: [{ id: "recRemind", on: true, times: ["21:00"], kinds: ["journal", "routine", "money", "todo", "goal", "sleep"], updatedAt: 1 }] }, "tsumi");
  // (this device's notifications on: put in once the page has looked for them, as sync1 does; the browser here has none)
  await q.evaluate((P) => localStorage.setItem(P + "push", JSON.stringify({ id: "dev1", endpoint: "https://web.push.apple.com/x" })), P);
  await q.click("#tsumiSettings"); await q.waitForTimeout(800);
  await q.click("label[for=recKind_meal]"); await q.waitForTimeout(400); // (食事 added: the part drawn again, this device's notifications on)
  const qs = await state(q), qg = await txt(q, "#tsumiGroup");
  ok(qs.on && JSON.stringify(qs.times) === '["21:00"]' && qs.foot === "" && await q.isHidden("#recRemindFoot") && !qg.includes("この端末に届きます。お休みの日は届きません") && !qg.includes("記録したことになります")
    && !qg.includes("ぜんぶできるまで「まだ」") && !qg.includes("ホーム画面のアイコンに「1」"), "on: no words on what comes when, nor on the icon's 1", { foot: qs.foot });
  ok((await alarms(q)).some((a) => a.tag.startsWith("rec-remind:") || a.tag.startsWith("tsumi-remind:")), "on: the notifications made as before");
  await q.click("#recRemindOn"); await q.waitForTimeout(400);
  ok((await state(q)).foot.startsWith("決めた時刻に、毎日記録するもののうち") && await q.isVisible("#recRemindFoot"), "off: what it does, said as before", (await state(q)).foot);
  ok(!q.errs.length, "no page errors (7)", q.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
