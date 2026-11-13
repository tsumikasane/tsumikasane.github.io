// つみかさね その6 ①〜⑩
const { chromium } = require("playwright");
const fs = require("fs");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-14"; // a Saturday
const T = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
const wait = (p, ms = 300) => p.waitForTimeout(ms);
// 70 days: 食事 each day (07:30 on even days back, 10:00 on odd), 日記 at 21:00 but every 7th from the 3rd, 運動 at
// 18:00 every 3rd day, 勉強 at 20:00 from 3 to 20 days back
const meals = [], journal = [], workouts = [], study = [], perDay = new Map();
const put = (d) => perDay.set(d, (perDay.get(d) || 0) + 1);
for (let i = 0; i < 70; i++) {
  const d = addDays(today, -i);
  meals.push({ id: "m" + i, date: d, slot: "朝食", text: "パン", kcal: 300, createdAt: T(d, i % 2 ? "10:00" : "07:30") }); put(d);
  if (i % 7 !== 3) { journal.push({ id: d, date: d, text: "日記 " + d, createdAt: T(d, "21:00") }); put(d); }
  if (i % 3 === 0) { workouts.push({ id: "w" + i, date: d, type: "ランニング", minutes: 30, km: 5, createdAt: T(d, "18:00") }); put(d); }
  if (i >= 3 && i <= 20) { study.push({ id: "s" + i, date: d, minutes: 60, createdAt: T(d, "20:00") }); put(d); }
}
const DATA = { meals, journal, workouts, study };
const total = [...perDay.values()].reduce((a, b) => a + b, 0);
const inMonth = (m, to = "9999") => [...perDay].filter(([d]) => d.startsWith(m) && d <= to).reduce((a, [, n]) => a + n, 0);

(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("21:30", today), { deviceScaleFactor: 1, acceptDownloads: true, permissions: ["clipboard-read", "clipboard-write"] });
  await p.addInitScript(() => { try { delete Navigator.prototype.share; } catch {} }); // (no share sheet here: the words are copied)
  await seed(p, DATA, "tsumi"); await wait(p, 1500);

  // 3 先月の自分とくらべる
  const diff = inMonth("2026-11") - inMonth("2026-10", "2026-10-14");
  const last = await txt(p, "#ts6LastBtn");
  ok(await p.isVisible("#ts6LastLine") && last === (diff > 0 ? `先月の同じころより ${diff} こ多いペースです` : diff < 0 ? `先月の同じころより ${-diff} こ少ないペースです` : "先月の同じころと同じペースです"), "3 先月の同じころと", { last, diff });
  // 8 つみねこおみくじ
  ok((await txt(p, "#ts6LuckBtn")) === "きょうのつみねこおみくじを引く", "8 to draw");
  await p.click("#ts6LuckBtn"); await wait(p);
  const luck = await txt(p, "#ts6LuckBtn"), said = await toast(p);
  ok(/^おみくじは(大吉|中吉|小吉|吉|末吉)・ラッキーな記録は(食事|日記|運動|勉強)/.test(luck) && /ラッキーな時刻は \d+ 時/.test(said), "8 drawn: the line and the words", { luck, said });
  await p.reload(); await wait(p, 1500);
  ok((await txt(p, "#ts6LuckBtn")) === luck, "8 the same all day, drawn once", await txt(p, "#ts6LuckBtn"));
  ok(await p.isHidden("#ts6YearLine"), "4 no line with no goal");

  // the gear
  await p.click("#tsumiSettings"); await wait(p, 700);
  // 2 1日のタイムライン
  ok((await txt(p, "#ts6DayTitle")) === "きょう・11月14日（土） 3 こ", "2 today", await txt(p, "#ts6DayTitle"));
  let rows = await p.evaluate(() => [...document.querySelectorAll("#ts6DayList li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()));
  ok(rows.length === 3 && rows[0].startsWith("07:30 食事 朝食・パン・300 kcal") && rows[1].startsWith("18:00 運動") && rows[2].startsWith("21:00 日記"), "2 by their time", rows);
  ok(await p.isDisabled("#ts6DayNext"), "2 none after today");
  await p.click("#ts6DayPrev"); await wait(p);
  rows = await p.evaluate(() => [...document.querySelectorAll("#ts6DayList li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()));
  ok((await txt(p, "#ts6DayTitle")) === "きのう・11月13日（金） 2 こ" && rows[0].startsWith("10:00 食事"), "2 the day before", rows);
  // 10 月のランキング
  const months = ["2026-11", "2026-10", "2026-09"].map((m) => [m, inMonth(m)]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  rows = await p.evaluate(() => [...document.querySelectorAll("#ts6Rank li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()));
  ok(rows.length === 3 && rows.every((r, i) => r.startsWith(`${i + 1}位 ${Number(months[i][0].slice(0, 4))}年${Number(months[i][0].slice(5))}月`) && r.includes(`${months[i][1]} こ`)) && rows.some((r) => r.includes("（今月）")), "10 the months by their count", { rows, months });
  // 5 朝のつみかさね
  const morn = await txt(p, "#ts6Morn");
  ok(morn === "きょうの最初のブロック 07:30 この7日の平均 前の7日より 21 分早い 08:34 朝に積んだ日の連続 1 日 この30日で朝に積んだ日 15 日", "5 朝", morn);
  // 6 しばらく積んでいない種類
  const idle = await txt(p, "#ts6Idle");
  ok(idle === "勉強 最後は 11月11日（水） 3 日ぶり 積む", "6 勉強, 3 days", idle);
  // 7 いっしょに積んでいる種類
  rows = await p.evaluate(() => [...document.querySelectorAll("#ts6Pair li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()));
  ok(rows.length >= 2 && rows[0].includes("100%") && rows.some((r) => r.startsWith("運動を積んだ日は、食事も") && r.includes("20 日のうち 20 日")), "7 pairs", rows);
  // 1 文字で送る
  await p.click("#ts6SendDay"); await wait(p, 500);
  let words = await p.evaluate(() => navigator.clipboard.readText());
  ok(words.startsWith("11月14日（土）のつみかさね　3 こ\n（日記 1・食事 1・運動 1）\n\n07:30 食事 朝食・パン・300 kcal\n18:00 運動 ランニング") && words.endsWith(`ぜんぶで ${total.toLocaleString()} こ`) && (await toast(p)).includes("文字でコピーしました"), "1 today as words", words);
  await p.click("#ts6SendWeek"); await wait(p, 500);
  words = await p.evaluate(() => navigator.clipboard.readText());
  const week = [...Array(7)].reduce((a, _, i) => a + (perDay.get(addDays(today, -i)) || 0), 0);
  ok(words.startsWith(`11/8〜11/14のつみかさね　${week} こ`) && words.includes("11/14（土） 3 こ") && words.includes("11/8（日） "), "1 the week as words", words);
  // 9 ブロックを表にして書き出す
  ok((await txt(p, "#ts6CsvCount")) === `${total.toLocaleString()} こ`, "9 how many");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#ts6Csv")]);
  const csv = fs.readFileSync(await dl.path(), "utf8").replace(/^﻿/, "").trim().split("\r\n");
  ok(dl.suggestedFilename() === `tsumikasane-blocks-${today}.csv` && csv[0] === "日付,時刻,種類,中身,もとの記録" && csv.length === total + 1 && csv[csv.length - 1].startsWith(`${today},21:00,日記`), "9 the table, oldest first", csv.slice(-2));
  // 4 ことしの目標
  await p.fill("#ts6YearN", "2000"); await p.click("#ts6YearForm .btn"); await wait(p, 400);
  const yc = inMonth("2026");
  let goal = await txt(p, "#ts6YearGoal");
  ok(goal.startsWith(`2026年は ${yc} / 2,000 こ`) && goal.includes(`あと ${(2000 - yc).toLocaleString()} こ`) && goal.includes("目標をはずす"), "4 the goal, how far", goal);
  await p.keyboard.press("Escape"); await wait(p, 700);
  ok((await txt(p, "#ts6YearBtn")) === `ことしの目標 ${yc} / 2,000 こ`, "4 the line at the card's foot", await txt(p, "#ts6YearBtn"));
  await p.click("#tsumiSettings"); await wait(p, 700);
  await p.fill("#ts6YearN", "100"); await p.click("#ts6YearForm .btn"); await wait(p, 300);
  await p.keyboard.press("Escape"); await wait(p, 1500);
  ok((await txt(p, "#ts6YearBtn")) === "ことしの目標の 100 こに届きました" && (await toast(p) + "").length >= 0, "4 reached");
  const set = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "settings") || "[]").find((x) => x.id === "tsumiYearGoal"), P);
  ok(set && set.n === 100 && set.year === "2026" && set.doneAt > 0, "4 kept with the account, reached once", set);
  // 6 積む: the way to it
  await p.click("#tsumiSettings"); await wait(p, 700);
  await p.locator("#ts6Idle .link-btn").click(); await wait(p, 900);
  ok(await p.evaluate(() => document.getElementById("daySheet").open), "6 積む: 勉強's sheet");
  ok(!p.errs.length, "no errors: " + p.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
