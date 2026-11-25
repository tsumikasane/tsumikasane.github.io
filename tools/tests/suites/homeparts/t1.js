// きょう まだ・完了 (the user's call, 2026-11-25), at the page itself (8765) and as a user would: the bar at the foot, the
// tiles of each part, a tile with its record put in today or opened today in 完了, the presses that don't count, a check
// on a tile (it stays a moment, then goes), メモ written, the next day, another device's, the guide and the settings' words
const { chromium } = require("playwright");
const { URL0, P, phone, seed } = require("./lib");
const { part, partNow, toTile, allTiles } = require("./parts");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const DAY = "2026-11-25", Y = "2026-11-24", T = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const shown = (p) => p.$$eval("#homeTiles > .tile", (l) => l.map((t) => t.dataset.tile));
const setting = (p, id) => p.evaluate(({ P, id }) => JSON.parse(localStorage.getItem(P + "settings") || "[]").find((x) => x.id === id) || null, { P, id });
// the parts nudged at the foot, as they are (the class is on for a moment only)
const bumps = (p) => p.evaluate(() => { if (!window.__bumps) { window.__bumps = []; new MutationObserver((l) => { for (const m of l) if (m.target.classList.contains("hp-bump")) window.__bumps.push(m.target.dataset.part); }).observe(document.getElementById("homeParts"), { subtree: true, attributes: true, attributeFilter: ["class"] }); } return [...new Set(window.__bumps.splice(0))]; });
const none = (p) => p.evaluate(() => document.querySelector("#homeTiles .tiles-none")?.textContent || null);
// a Wednesday: yesterday's 日記 and 勉強, two ルーティーン, a ToDo due today, a plan today (put in yesterday), a goal; today, a
// 固定費 put in by itself and last night's おやすみ (on today's record, put in last night)
const data = () => ({
  journal: [{ id: Y, date: Y, text: "きのうの日記", createdAt: T(Y, "21:00") }],
  study: [{ id: "s0", date: Y, minutes: 30, createdAt: T(Y, "20:00") }],
  routines: [{ id: "r1", name: "散歩", createdAt: 1 }, { id: "r2", name: "ストレッチ", createdAt: 2 }],
  todos: [{ id: "t1", text: "歯医者の予約", done: false, due: DAY, createdAt: T(Y, "09:00") }, { id: "t2", text: "部屋の掃除", done: false, due: "", createdAt: T(Y, "09:00") }],
  events: [{ id: "e1", date: DAY, title: "打ち合わせ", time: "15:00", endTime: "16:00", createdAt: T(Y, "10:00") }],
  goals: [{ id: "g1", title: "本を24冊読む", criterion: "24冊", deadline: "2027-01-31", depth: 2, done: false, createdAt: T("2026-11-01", "09:00") }],
  expenses: [{ id: "x0", date: DAY, kind: "out", category: "住居", amount: 60000, fixed: "f1", createdAt: T(DAY, "00:01") }],
  bodyDays: [{ id: DAY, date: DAY, bed: "23:30", createdAt: T(Y, "23:30") }],
});
async function open(b, when, d = data(), o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, ...o });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, d, "home"); await p.waitForTimeout(900);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, `${DAY}T10:00:00+09:00`);

  // the bar: まだ and 完了 at the foot, まだ at first; on きょう alone
  const bar = await p.evaluate(() => { const x = document.getElementById("homeParts"), r = x.getBoundingClientRect();
    return { on: getComputedStyle(x).display, words: [...x.querySelectorAll("button")].map((y) => y.textContent + (y.getAttribute("aria-pressed") === "true" ? "*" : "")).join("|"), label: x.getAttribute("aria-label"), bottom: Math.round(innerHeight - r.bottom), tabTop: Math.round(document.querySelector(".menu").getBoundingClientRect().top), barBottom: Math.round(r.bottom) }; });
  ok(bar.on === "flex" && bar.words === "まだ*|完了" && bar.label === "きょうのタイルの表示の切り替え" && bar.barBottom <= bar.tabTop, "the bar: まだ・完了 over the tab bar, まだ at first", bar);
  // every tile まだ at first: nothing of today's yet (yesterday's 日記 and 勉強, a 固定費, last night's おやすみ don't count)
  const all0 = await shown(p);
  ok(["journal", "study", "money", "h4sleep", "todo", "routine", "calendar", "weather", "h3time", "h4memo"].every((k) => all0.includes(k)), "まだ: every tile at first (yesterday's, a 固定費, last night's おやすみ: not today's put in)", all0);
  await part(p, "done");
  ok((await shown(p)).length === 0 && (await none(p)) === "きょう完了したタイルは、まだありません。タイルを開いたり、記録を入れたりすると、ここに移ります。", "完了: none yet, and said so", await none(p));
  await part(p, "todo");
  ok((await allTiles(p)).length === all0.length, "both parts: the same tiles");

  // a tile opened (its page): カウントダウン's head goes to カレンダー; kept with the account; back on きょう, in 完了
  await p.click('.tile[data-tile="countdown"] .tile-head'); await p.waitForTimeout(700);
  ok((await p.evaluate(() => document.documentElement.dataset.tab)) === "calendar", "カウントダウン's head: カレンダー");
  ok(JSON.stringify(await p.evaluate(() => getComputedStyle(document.getElementById("homeParts")).display)) === '"none"', "the bar: not on カレンダー");
  const hd = await setting(p, "homeDone");
  ok(hd && hd.day === DAY && JSON.stringify(hd.keys) === '["countdown"]', "opened: kept (設定 homeDone: the day and the tile)", hd);
  await p.click('.menu button[data-tab="home"]'); await p.waitForTimeout(2600);
  ok(!(await shown(p)).includes("countdown") && (await toTile(p, "countdown")) === "done", "back on きょう: カウントダウン in 完了");
  await part(p, "todo");

  // a sheet opened from a tile: 天気's page
  await p.click('.tile[data-tile="weather"] .tile-head'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.getElementById("daySheet").open), "天気's head: its page (a sheet)");
  await p.keyboard.press("Escape"); await p.waitForTimeout(2600);
  ok(!(await shown(p)).includes("weather") && JSON.stringify((await setting(p, "homeDone")).keys) === '["countdown","weather"]', "天気: in 完了", (await setting(p, "homeDone")).keys);

  // a press that opens nothing doesn't count: 次にすること's… (none here); メモ's やめる; a plain tile looked at does
  await p.click('.tile[data-tile="h4memo"] .h4-memo-write'); await p.waitForTimeout(300);
  await p.locator('.tile[data-tile="h4memo"] .link-btn', { hasText: "やめる" }).click(); await p.waitForTimeout(2600);
  ok((await shown(p)).includes("h4memo") && !(await setting(p, "homeDone")).keys.includes("h4memo"), "メモ: 書く then やめる, still まだ");
  await p.click('.tile[data-tile="h3time"] .h3-ring'); await p.waitForTimeout(400);
  ok((await shown(p)).includes("h3time"), "時間の進み looked at: still there a moment");
  await p.waitForTimeout(2300);
  ok(!(await shown(p)).includes("h3time") && (await setting(p, "homeDone")).keys.includes("h3time"), "時間の進み (nothing on it to press): in 完了 after");

  // a check on ルーティーン's tile: stays while in use and a moment after, then goes, 完了 nudged; not kept as opened
  await bumps(p);
  await p.click('.tile[data-tile="routine"] button[data-rt="r1"]'); await p.waitForTimeout(600);
  await p.click('.tile[data-tile="routine"] button[data-rt="r2"]'); await p.waitForTimeout(1600);
  ok((await shown(p)).includes("routine"), "ルーティーン: two checked, the tile still there while in use");
  await p.waitForTimeout(1000);
  ok(!(await shown(p)).includes("routine") && JSON.stringify(await bumps(p)) === '["done"]', "ルーティーン: then in 完了, 完了 nudged");
  ok(!(await setting(p, "homeDone")).keys.includes("routine"), "ルーティーン: by its record, not kept as opened");
  // its checks taken off (from 完了): back to まだ
  await part(p, "done");
  ok((await shown(p)).includes("routine"), "完了: ルーティーン there");
  await p.click('.tile[data-tile="routine"] button[data-rt="r1"]'); await p.waitForTimeout(300);
  await p.click('.tile[data-tile="routine"] button[data-rt="r2"]'); await p.waitForTimeout(2700);
  ok(!(await shown(p)).includes("routine") && JSON.stringify(await bumps(p)) === '["todo"]', "checks taken off: gone from 完了, まだ nudged");
  await part(p, "todo");
  ok((await shown(p)).includes("routine"), "まだ: ルーティーン back");

  // a ToDo checked on its tile: in 完了 (one done today)
  await p.click('.tile[data-tile="todo"] [data-td="t1"]'); await p.waitForTimeout(2900);
  ok(!(await shown(p)).includes("todo") && (await toTile(p, "todo")) === "done", "ToDo checked on the tile: in 完了");
  await part(p, "todo");

  // メモ written: stays while the field is in use, goes once kept
  await p.click('.tile[data-tile="h4memo"] .h4-memo-write'); await p.waitForTimeout(300);
  await p.type("#h4MemoIn", "牛乳を買う"); await p.waitForTimeout(2600);
  ok((await shown(p)).includes("h4memo") && (await p.evaluate(() => document.activeElement?.id)) === "h4MemoIn", "メモ: still there while it is written");
  await p.click('.tile[data-tile="h4memo"] .h4-memo-save'); await p.waitForTimeout(2700);
  ok(!(await shown(p)).includes("h4memo") && (await toTile(p, "h4memo")) === "done", "メモ kept: in 完了");
  await part(p, "todo");

  // a record put in elsewhere: 日記 written today
  await p.evaluate((P) => { const k = P + "journal", l = JSON.parse(localStorage.getItem(k) || "[]"); l.push({ id: "2026-11-25", date: "2026-11-25", text: "きょうは晴れ", createdAt: Date.now() }); localStorage.setItem(k, JSON.stringify(l)); }, P);
  await p.reload(); await p.waitForTimeout(900);
  ok((await partNow(p)) === "todo" && !(await shown(p)).includes("journal"), "日記 written today: not in まだ (まだ, as the app opens)");
  await part(p, "done");
  const done1 = await shown(p);
  ok(["countdown", "weather", "h3time", "todo", "h4memo", "journal"].every((k) => done1.includes(k)) && !done1.includes("routine"), "完了: the ones opened and the ones recorded", done1);
  await p.screenshot({ path: out + "/hp-done.png" });
  await part(p, "todo");
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(400);
  const foot = await p.evaluate(() => { const l = [...document.querySelectorAll("#homeTiles > .tile, #h2Dock:not([hidden])")].pop(); return [Math.round(l.getBoundingClientRect().bottom), Math.round(document.getElementById("homeParts").getBoundingClientRect().top)]; });
  ok(foot[0] <= foot[1], "the last tile clear of the bar, scrolled to the foot", foot);
  await p.screenshot({ path: out + "/hp-todo-foot.png" });

  // the guide (このページでできること) and the gear's sheet say so
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200);
  await p.click("#h6MoreBtn"); await p.waitForTimeout(300); await p.click("#h6MenuGroup .h6-guide-btn"); await p.waitForTimeout(500);
  ok((await p.textContent("#h6GuideBody")).includes("下の「まだ」「完了」"), "the guide: まだ・完了");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await p.click("#homeSettings"); await p.waitForTimeout(700);
  ok((await p.textContent("#h2Set")).includes("下の「まだ」「完了」では、きょう開いたタイルと、きょう記録を入れたタイルが完了に移ります"), "the settings: まだ・完了 said");
  await p.click("#sheetCancel").catch(() => {}); await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  ok(!p.errs.length, "no page errors", p.errs);

  // the next day: all まだ again (yesterday's opened ones kept, not read)
  await p.context().clock.setFixedTime(new Date("2026-11-26T08:00:00+09:00"));
  await p.reload(); await p.waitForTimeout(900);
  const next = await shown(p);
  ok(["countdown", "weather", "h3time", "todo", "h4memo", "journal", "routine"].every((k) => next.includes(k)) && (await setting(p, "homeDone")).day === DAY, "the next day: every tile まだ again", next);
  await part(p, "done");
  ok((await shown(p)).length === 0, "the next day: 完了 empty");
  await p.close();

  // another device's: the tiles it opened (synced as 設定), in 完了 here too; all in 完了: まだ says so
  p = await open(b, `${DAY}T10:00:00+09:00`, { ...data(), settings: [{ id: "homeDone", day: DAY, keys: ["goal", "tsumi"], updatedAt: T(DAY, "09:00") }] });
  ok(!(await shown(p)).includes("goal") && !(await shown(p)).includes("tsumi"), "opened on another device: not in まだ here");
  const every = await shown(p);
  await p.evaluate(({ P, every, DAY }) => { const l = JSON.parse(localStorage.getItem(P + "settings") || "[]"); l.push({ id: "homeDone", day: DAY, keys: every, updatedAt: Date.now() }); localStorage.setItem(P + "settings", JSON.stringify(l.filter((x, i, a) => x.id !== "homeDone" || i === a.length - 1))); }, { P, every: [...every, "goal", "tsumi"], DAY });
  await p.reload(); await p.waitForTimeout(900);
  ok((await shown(p)).length === 0 && (await none(p)) === "きょうのタイルは、すべて完了しました。", "every tile done: まだ says so", await none(p));
  await p.close();

  // a wide screen: the bar at the foot of the column, beside the sidebar
  p = await open(b, `${DAY}T10:00:00+09:00`, data(), { viewport: { width: 1180, height: 820 }, isMobile: false, hasTouch: false });
  const wide = await p.evaluate(() => { const r = document.getElementById("homeParts").getBoundingClientRect(); return [Math.round(r.left), Math.round(innerHeight - r.bottom), getComputedStyle(document.getElementById("homeParts")).display]; });
  ok(wide[0] >= 272 && wide[1] < 40 && wide[2] === "flex", "wide: at the foot of the column", wide);
  await p.screenshot({ path: out + "/hp-wide.png" });
  ok(!p.errs.length, "no page errors (wide)", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
