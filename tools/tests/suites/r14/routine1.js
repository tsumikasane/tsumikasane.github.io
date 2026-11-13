// ルーティーン ①〜⑩
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed } = require("./lib");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10";
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const R = (id, name, made, extra = {}) => ({ id, name, createdAt: T(made, 9) + id.charCodeAt(1), ...extra });
const D = (date, done, extra = {}) => ({ id: date, date, done, at: Object.fromEntries(done.map((x) => [x, T(date, 8)])), updatedAt: T(date, 8), ...extra });
const DATA = {
  routines: [
    R("r1", "ストレッチ", "2026-10-01"), R("r2", "水を飲む", "2026-10-01", { target: 8, unit: "杯" }), R("r3", "日記を書く", "2026-10-01", { link: "journal" }),
    R("r4", "勉強", "2026-10-05", { link: "study", linkMin: 30 }), R("r5", "読書", "2026-10-01", { pauses: [{ from: "2026-11-05" }] }),
  ],
  routineDays: [
    D("2026-11-03", ["r1"]), D("2026-11-04", ["r1"]), D("2026-11-05", [], { rest: true }), D("2026-11-06", ["r1"]), D("2026-11-07", ["r1"]),
    D("2026-11-08", ["r1"]), D("2026-11-09", ["r1", "r2"], { counts: { r2: 8 } }), D("2026-11-10", [], { counts: { r2: 3 } }),
  ],
  journal: [{ id: "2026-11-09", date: "2026-11-09", text: "いい日", createdAt: T("2026-11-09", 22) }],
  study: [{ id: "s1", date: "2026-11-10", minutes: 45, createdAt: T(today, 7) }, { id: "s2", date: "2026-11-09", minutes: 20, createdAt: T("2026-11-09", 7) }],
};
const rows = (p) => p.evaluate(() => [...document.querySelectorAll("#rtList > li")].map((li) => li.innerText.replace(/\s+/g, " ").trim() + " | " + (li.querySelector(".rt-name")?.value || "")));
(async () => {
  const b = await chromium.launch();
  let p = await phone(b, at("12:00", today));
  await seed(p, DATA, "routine");
  // the list: the paused one (⑩) not in it, 勉強 checked by 45 分 of study (⑦)
  let names = await p.evaluate(() => [...document.querySelectorAll("#rtList .rt-name")].map((i) => i.value));
  ok(names.join(",") === "ストレッチ,水を飲む,日記を書く,勉強", "the day's items, 読書 (paused) not among them: " + names.join(","));
  ok((await txt(p, "#rtCount")) === "1 / 4", "count, 勉強 by the study page: " + await txt(p, "#rtCount"));
  const study = p.locator('#rtList li[data-rt="r4"]');
  ok((await study.getAttribute("class")).includes("auto") && await study.locator(".check").isDisabled() && (await study.innerText()).includes("勉強を30分以上記録したのでチェック"), "⑦ 勉強 checked by the record: " + (await study.innerText()).replace(/\s+/g, " "));
  const diary = p.locator('#rtList li[data-rt="r3"]');
  ok((await diary.innerText()).includes("日記を書いたら自動でチェック") && !(await diary.locator(".check").isDisabled()), "⑦ 日記, not yet: " + (await diary.innerText()).replace(/\s+/g, " "));
  // ⑧ ストレッチ's run: 11/3〜11/9 with 11/5 お休み = 6 days
  ok((await p.locator('#rtList li[data-rt="r1"]').innerText()).includes("6日連続"), "⑧ the run goes over the お休み day: " + (await p.locator('#rtList li[data-rt="r1"]').innerText()).replace(/\s+/g, " "));
  // ⑤ the counted one
  const water = p.locator('#rtList li[data-rt="r2"]');
  ok((await water.innerText()).includes("3 / 8杯") && (await water.locator(".rt-ring-n").textContent()) === "3", "⑤ 水 3 / 8杯: " + (await water.innerText()).replace(/\s+/g, " "));
  await water.locator(".check").click(); await p.waitForTimeout(200);
  ok((await p.locator('#rtList li[data-rt="r2"]').innerText()).includes("4 / 8杯"), "⑤ +1 → 4");
  await p.locator('#rtList li[data-rt="r2"] .rt-minus').click(); await p.waitForTimeout(200);
  ok((await p.locator('#rtList li[data-rt="r2"]').innerText()).includes("3 / 8杯"), "⑤ −1 → 3");
  // ⑩ the paused one's card
  ok((await txt(p, "#rtPausedCard")).includes("読書") && (await txt(p, "#rtPausedCard")).includes("から休止中"), "⑩ 休止中: " + await txt(p, "#rtPausedCard"));
  // ① the week
  const wk = await p.evaluate(() => ({ rows: [...document.querySelectorAll("#rtWeek tbody tr")].map((tr) => tr.querySelector("th").textContent), heads: [...document.querySelectorAll("#rtWeek thead th")].slice(1).map((th) => [".wd", ".dn", ".rest-mark"].map((q) => th.querySelector(q)?.textContent || "").join("")) }));
  ok(wk.rows.join(",") === "ストレッチ,水を飲む,日記を書く,読書,勉強" && wk.heads.length === 7 && wk.heads[1] === "木5休" && wk.heads[6] === "火10", "① the week's rows and days: " + JSON.stringify(wk));
  const cells = await p.evaluate(() => [...document.querySelectorAll("#rtWeek tbody tr")].map((tr) => [...tr.querySelectorAll("td")].map((td) => td.classList.contains("off") ? "-" : td.querySelector(".rt-cell.auto") ? "A" : td.querySelector(".rt-cell.on") ? "x" : td.querySelector(".rt-cell-n") ? td.innerText.trim() : "o").join("")));
  ok(cells[0] === "xoxxxxo" && cells[1] === "ooooox3" && cells[2] === "oooooAo" && cells[3] === "o------" && cells[4] === "ooooooA", "① the squares: " + JSON.stringify(cells));
  // check 日記 on 11/8 in the table
  await p.locator("#rtWeek tbody tr").nth(2).locator("td").nth(4).locator("button").click(); await p.waitForTimeout(300);
  let days = await ls(p, "routineDays");
  ok(days.find((d) => d.id === "2026-11-08").done.includes("r3"), "① 11/8 checked from the table");
  // ⑧ お休み today, and back
  await p.locator('#rtFoot button:has-text("お休みにする")').click(); await p.waitForTimeout(300);
  ok(await p.isVisible("#rtRestNote") && (await txt(p, "#rtCount")) === "お休み・1 / 4" && (await ls(p, "routineDays")).find((d) => d.id === today).rest === true, "⑧ きょうをお休みに: " + await txt(p, "#rtCount"));
  await p.locator('#rtFoot button:has-text("お休みをやめる")').click(); await p.waitForTimeout(300);
  ok(await p.isHidden("#rtRestNote") && !(await ls(p, "routineDays")).find((d) => d.id === today).rest, "⑧ お休みをやめる");
  // ⑨ all of today's done
  await p.locator('#rtList li[data-rt="r1"] .check').click(); await p.locator('#rtList li[data-rt="r3"] .check').click(); await p.waitForTimeout(200);
  for (let i = 0; i < 5; i++) { await p.locator('#rtList li[data-rt="r2"] .check').click(); await p.waitForTimeout(120); }
  await p.waitForTimeout(300);
  const said = await p.evaluate(() => document.querySelector("#status")?.textContent || "");
  ok(said.includes("きょうのルーティーンをぜんぶできました"), "⑨ said: " + said);
  ok((await txt(p, "#rtFoot")).startsWith("ぜんぶできました"), "⑨ under the list: " + await txt(p, "#rtFoot"));
  ok((await txt(p, "#rtCount")) === "4 / 4", "4 / 4");
  await p.screenshot({ path: out + "/rt-top.png" });
  // ② the calendar
  const cal = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll("#rtCal .rtc-d")].map((c) => [c.querySelector(".dn").textContent, [...c.classList].filter((k) => /^lv|rest|bare/.test(k)).join("+") + ":" + (c.querySelector(".da")?.textContent || "")])));
  ok(cal["10"] === "lv4:ぜんぶ" && cal["5"] === "lv0+rest:休" && cal["9"] === "lv3:3/4" && cal["8"] === "lv2:2/4" && cal["11"] === "bare:", "② days: " + JSON.stringify([cal["5"], cal["8"], cal["9"], cal["10"], cal["11"]]));
  ok((await txt(p, "#rtCalKey")).includes("ぜんぶできた日 1 日・お休み 1 日"), "② key: " + await txt(p, "#rtCalKey"));
  await p.locator('#rtCal .rtc-d:has(.dn:text-is("9"))').click(); await p.waitForTimeout(400);
  ok((await txt(p, "#rtHead")) === "11月9日（月）のルーティーン", "② a day pressed: " + await txt(p, "#rtHead"));
  await p.locator("#sec-routine .datenav .chip-btn").click(); await p.waitForTimeout(300);
  // ③ each item's record
  const st = await p.evaluate(() => [...document.querySelectorAll("#rtStats li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()));
  ok(st[0].startsWith("ストレッチ") && st[0].includes("いまの連続 7 日") && st[0].includes("これまで 7 日"), "③ ストレッチ: " + st[0]);
  ok(st.some((x) => x.startsWith("読書（休止中）")), "③ 読書 says paused: " + st.find((x) => x.startsWith("読書")));
  await p.locator("#rtStatsCard").scrollIntoViewIfNeeded();
  await p.screenshot({ path: out + "/rt-stats.png", fullPage: true });
  // ⑤⑦ an item's settings: 勉強 to counting 5 ページ, unlinked
  await p.locator('#rtList li[data-rt="r4"] .rt-opts').click(); await p.waitForTimeout(500);
  ok((await txt(p, "#sheetTitle")) === "項目の設定" && (await p.inputValue("#rtiLink")) === "study" && (await p.inputValue("#rtiMin")) === "30", "⋯ opens its settings");
  await p.selectOption("#rtiLink", ""); await p.fill("#rtiTarget", "5"); await p.fill("#rtiUnit", "ページ");
  await p.locator("#recSave").click(); await p.waitForTimeout(500);
  let r4 = (await ls(p, "routines")).find((r) => r.id === "r4");
  ok(r4.target === 5 && r4.unit === "ページ" && !r4.link, "⑤ saved: " + JSON.stringify(r4));
  ok((await p.locator('#rtList li[data-rt="r4"]').innerText()).includes("0 / 5ページ"), "⑤ its row: " + (await p.locator('#rtList li[data-rt="r4"]').innerText()).replace(/\s+/g, " "));
  // ⑩ paused from its settings, then 再開
  await p.locator('#rtList li[data-rt="r1"] .rt-opts').click(); await p.waitForTimeout(500);
  await p.locator("#rtiPause").check(); await p.locator("#recSave").click(); await p.waitForTimeout(500);
  names = await p.evaluate(() => [...document.querySelectorAll("#rtList .rt-name")].map((i) => i.value));
  ok(!names.includes("ストレッチ") && (await txt(p, "#rtPausedCard")).includes("ストレッチ"), "⑩ paused: " + names.join(","));
  await p.locator('#rtPausedList li:has-text("ストレッチ") button').click(); await p.waitForTimeout(400);
  names = await p.evaluate(() => [...document.querySelectorAll("#rtList .rt-name")].map((i) => i.value));
  ok(names.includes("ストレッチ") && !(await ls(p, "routines")).find((r) => r.id === "r1").pauses, "⑩ 再開 (a pause of no days dropped): " + JSON.stringify((await ls(p, "routines")).find((r) => r.id === "r1").pauses));
  // ④ the order: 勉強 up by the keyboard, 水 down by a drag
  await p.locator("#rtSettings").click(); await p.waitForTimeout(600);
  ok(await p.isVisible("#rtOrderList") && await p.isVisible("#rtRemindOn"), "the settings: 並べ替え and お知らせ");
  await p.locator('#rtOrderList li[data-key="r4"] .grip').focus(); await p.keyboard.press("ArrowUp"); await p.waitForTimeout(300);
  let order = await p.evaluate(() => [...document.querySelectorAll("#rtOrderList li")].map((li) => li.dataset.key).join(","));
  ok(order === "r1,r2,r3,r4,r5", "④ ↑ by the keyboard (勉強 over 読書): " + order);
  const g = await p.locator('#rtOrderList li[data-key="r1"] .grip').boundingBox(), h = await p.locator('#rtOrderList li[data-key="r3"]').boundingBox();
  await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await p.mouse.down();
  for (let i = 1; i <= 10; i++) { await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + ((h.y + h.height / 2 + 4 - (g.y + g.height / 2)) * i) / 10); await p.waitForTimeout(30); }
  await p.mouse.up(); await p.waitForTimeout(500);
  order = await p.evaluate(() => [...document.querySelectorAll("#rtOrderList li")].map((li) => li.dataset.key).join(","));
  ok(order === "r2,r3,r1,r4,r5", "④ dragged down: " + order);
  // ⑥ the reminder
  await p.locator("#rtRemindOn").check(); await p.waitForTimeout(300);
  const rm = (await ls(p, "settings")).find((x) => x.id === "rtRemind");
  ok(rm && rm.on === true && !(await p.isDisabled("#rtRemindAt")), "⑥ お知らせ on: " + JSON.stringify(rm) + " | " + await txt(p, "#rtRemindFoot"));
  await p.locator("#sheetDone").click(); await p.waitForTimeout(500);
  names = await p.evaluate(() => [...document.querySelectorAll("#rtList .rt-name")].map((i) => i.value));
  ok(names.join(",") === "水を飲む,日記を書く,ストレッチ,勉強", "④ the page in the new order: " + names.join(","));
  // きょう's tile: the first three in that order, 水 counted
  await p.goto(URL0 + "#home"); await p.reload(); await p.waitForTimeout(800);
  const tile = await p.evaluate(() => [...document.querySelectorAll('[data-tile="routine"] .rt-tile li')].map((li) => li.innerText.replace(/\s+/g, " ").trim()));
  ok(tile.length === 4 && tile[0].startsWith("水を飲む") && tile[0].includes("8/8") && tile[1].startsWith("日記を書く") && tile[2].startsWith("ストレッチ") && tile[3] === "ほか 1 項目", "きょう's tile: " + tile.join(" | "));
  await p.locator('[data-tile="routine"] button[data-rt="r2"]').click(); await p.waitForTimeout(300);
  ok((await p.evaluate(() => document.querySelector('[data-tile="routine"] button[data-rt="r2"]').innerText)).includes("9/8") && (await p.evaluate(() => document.querySelector("#status").textContent)).includes("「水を飲む」9 / 8杯"), "the tile counts one up, past its number: " + await p.evaluate(() => document.querySelector("#status").textContent));
  await p.evaluate(() => document.querySelector("#status .toast-undo")?.click()); await p.waitForTimeout(300);
  ok((await p.evaluate(() => document.querySelector('[data-tile="routine"] button[data-rt="r2"]').innerText)).includes("8/8"), "元に戻す: 8/8");
  ok(!p.errs.length, "no page errors: " + p.errs.join(" | "));
  // dark, for the look
  const d = await phone(b, at("12:00", today), { colorScheme: "dark" });
  await seed(d, DATA, "routine");
  await d.screenshot({ path: out + "/rt-dark-top.png" });
  await d.locator("#rtCalCard").scrollIntoViewIfNeeded();
  await d.screenshot({ path: out + "/rt-dark-cal.png" });
  ok(!d.errs.length, "dark: no page errors: " + d.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
