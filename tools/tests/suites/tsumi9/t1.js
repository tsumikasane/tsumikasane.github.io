// つみかさね その9 ①〜⑩
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-14"; // a Saturday
const T = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const WD = ["日", "月", "火", "水", "木", "金", "土"], wd = (d) => WD[new Date(d + "T12:00:00Z").getUTCDay()];
const long = (d) => `${d.slice(0, 4) === "2026" ? "" : Number(d.slice(0, 4)) + "年"}${Number(d.slice(5, 7))}月${Number(d.slice(8))}日（${wd(d)}）`;
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const rows = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel + " > li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()), sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const wait = (p, ms = 300) => p.waitForTimeout(ms);
const errs = [];
async function open(b, data, hm) {
  const p = await phone(b, at(hm, today), { deviceScaleFactor: 1, permissions: ["clipboard-read", "clipboard-write"] });
  await p.addInitScript(() => { try { delete Navigator.prototype.share; } catch {} }); // (no share sheet here: the words are copied)
  await seed(p, data, "tsumi"); await wait(p, 1600);
  return p;
}

// as tsumi7's 59 days and today; 日記 20 days back with the weather, and three in 2025; からだ's 体調 and 睡眠 20 days back
const meals = [], study = [], workouts = [], journal = [], bodyDays = [], blocks = [];
const put = (d, t, kind) => blocks.push({ d, t, kind });
for (let i = 1; i <= 59; i++) {
  const d = addDays(today, -i);
  meals.push({ id: "m" + i, date: d, slot: "朝食", text: i % 2 ? "ラーメン" : "パン", kcal: 500, createdAt: T(d, "07:30") }); put(d, T(d, "07:30"), "食事");
  study.push({ id: "s" + i, date: d, minutes: 30, createdAt: T(d, "21:10") }); put(d, T(d, "21:10"), "勉強");
  if (i % 3 === 0) { workouts.push({ id: "w" + i, date: d, type: "ランニング", minutes: 30, km: 5, createdAt: T(d, "18:00") }); put(d, T(d, "18:00"), "運動"); }
  if (i <= 20) {
    journal.push({ id: d, date: d, text: "日記", wx: { word: ["晴れ", "くもり", "雨"][i % 3], icon: "sun", hi: 20, lo: 10 }, createdAt: T(d, "22:00") }); put(d, T(d, "22:00"), "日記");
    bodyDays.push({ id: d, date: d, cond: i % 2 ? "bad" : "good", bed: i % 2 ? "01:00" : "23:00", wake: i % 2 ? "06:00" : "07:00" });
  }
}
for (const d of ["2025-03-10", "2025-11-01", "2025-11-20"]) { journal.push({ id: d, date: d, text: "去年の日記", createdAt: T(d, "22:00") }); put(d, T(d, "22:00"), "日記"); }
[["パン", "07:30", "朝食"], ["うどん", "12:00", "昼食"], ["カレー", "13:00", "間食"], ["そば", "15:00", "間食"]].forEach(([text, hm, slot], j) => { meals.push({ id: "t" + j, date: today, slot, text, kcal: 400, createdAt: T(today, hm) }); put(today, T(today, hm), "食事"); });
workouts.push({ id: "w0", date: today, type: "ランニング", minutes: 20, km: 3, createdAt: T(today, "18:00") }); put(today, T(today, "18:00"), "運動");
blocks.sort((a, b) => a.t - b.t);
const settings = [{ id: "tsumiDayBest", days: { "2026-11-12": "meal:m2", "2026-11-10": "meal:m4" }, updatedAt: 1 }, { id: "tsumiFav", keys: ["meal:m6", "study:2026-11-11"], updatedAt: 1 }];
const DATA = { meals, study, workouts, journal, bodyDays, settings };
const count = (from, to) => blocks.filter((b) => b.d >= from && b.d <= to).length;

(async () => {
  const b = await chromium.launch();
  let p = await open(b, DATA, "21:30");
  await p.click("#tsumiSettings"); await wait(p, 800);
  // 1 スタンプカード: 63 days with blocks: the 3rd card, 3 stamps
  ok((await txt(p, "#ts9Stamp")).startsWith("3 枚目 3 / 30") && (await txt(p, "#ts9Stamp .sub")) === "あと 27 日でいっぱい・いっぱいにしたカード 2 枚" && (await p.locator("#ts9Stamp .ts9-stamp.on").count()) === 3
    && (await p.getAttribute("#ts9Stamp .ts9-stamp:first-child", "aria-label")) === "1 こ目、11月12日（木）", "1 the card being filled", await txt(p, "#ts9Stamp"));
  // 2 ゾロ目・連番: 165 blocks; the 123rd and the 111th
  const b123 = blocks[122], b111 = blocks[110], sp = await rows(p, "#ts9Special");
  ok(blocks.length === 165 && sp[0] === "次は 222 こ目（ゾロ目） あと 57 こ" && sp[1].startsWith(`${b123.kind} 123 こ目（連番）・${long(b123.d)}`) && sp[2].startsWith(`${b111.kind} 111 こ目（ゾロ目）・${long(b111.d)}`) && sp.length === 3, "2 the next, and the ones passed, the latest first", { sp, b123, b111 });
  // 3 きょうのいちばん: today's 5 to pick from; the days before
  ok((await p.locator("#ts9BestToday .ts9-pick").count()) === 5 && (await p.locator('#ts9BestToday .ts9-pick[aria-pressed="true"]').count()) === 0, "3 today's blocks, none picked");
  const past = await rows(p, "#ts9BestPast");
  ok(past.length === 2 && past[0].startsWith("食事 11月12日（木） 朝食・パン") && past[1].startsWith("食事 11月10日（火） 朝食・パン"), "3 the days before, the latest first", past);
  await p.locator("#ts9BestToday .ts9-pick", { hasText: "カレー" }).click(); await wait(p, 300);
  let best = (await ls(p, "settings")).find((x) => x.id === "tsumiDayBest");
  ok(best.days[today] === "meal:t2" && (await p.locator('#ts9BestToday .ts9-pick[aria-pressed="true"]').innerText()).includes("カレー"), "3 picked, kept with the account", best.days);
  await p.locator("#ts9BestToday .ts9-pick", { hasText: "カレー" }).click(); await wait(p, 300);
  best = (await ls(p, "settings")).find((x) => x.id === "tsumiDayBest");
  ok(!(today in best.days), "3 pressed again: put back", best.days);
  // 4 天気とつみかさね
  ok(JSON.stringify(await rows(p, "#ts9Wx")) === JSON.stringify(["晴れ 6 日 1日 4.0 こ", "くもり 7 日 1日 3.0 こ", "雨 7 日 1日 3.0 こ"]), "4 each weather's blocks a day", await rows(p, "#ts9Wx"));
  // 5 体調・睡眠とつみかさね
  ok(JSON.stringify(await rows(p, "#ts9Body")) === JSON.stringify(["体調がよい日 10 日 1日 3.3 こ", "体調がわるい日 10 日 1日 3.3 こ", "7時間以上寝た日 10 日 1日 3.3 こ", "6時間より短い日 10 日 1日 3.3 こ"]), "5 体調 and 睡眠", await rows(p, "#ts9Body"));
  // 8 去年とくらべる
  const lr = await rows(p, "#ts9Last"), now = count("2026-01-01", today), then = count("2025-01-01", "2025-11-14");
  ok(lr[0] === `ことし（1/1〜11/14） 去年より +${now - then}（去年の同じころまでは ${then} こ） ${now} こ` && lr.includes("3月 去年 1 こ・去年より −1 0 こ")
    && lr.includes(`9月 去年 0 こ・去年より +${count("2026-09-01", "2026-09-30")} ${count("2026-09-01", "2026-09-30")} こ`) && lr.includes(`11月 去年 1 こ・去年より +${count("2026-11-01", today) - 1} ${count("2026-11-01", today)} こ`) && lr.length === 5, "8 the year to today and each month, against last year", lr);
  // 10 お気に入りの一覧
  const fav = await rows(p, "#ts9Fav");
  ok(fav.length === 2 && fav[0].startsWith("勉強 11月11日（水）") && fav[1].startsWith("食事 11月8日（日） 朝食・パン"), "10 the お気に入り, the latest first", fav);
  await p.click("#ts9FavSend"); await wait(p, 400);
  let words = await p.evaluate(() => navigator.clipboard.readText());
  ok(words === "お気に入りのブロック（2 こ）\n\n2026/11/8 食事：朝食・パン・500 kcal\n2026/11/11 勉強：科目なし 30 分", "10 sent as words, oldest first", words);
  // 7 今月・ことしを文字で送る
  await p.click("#ts9SendMonth"); await wait(p, 400);
  words = await p.evaluate(() => navigator.clipboard.readText());
  ok(words.startsWith(`11月のつみかさね（11/1〜11/14）　${count("2026-11-01", today)} こ\n（${["日記", "食事", "運動", "勉強"].map((k) => `${k} ${blocks.filter((x) => x.d >= "2026-11-01" && x.kind === k).length}`).join("・")}）\n\n積んだ日 14 日・いちばん多い日 11/14（土） 5 こ`) && words.endsWith(`ぜんぶで ${blocks.length} こ`), "7 this month as words", words);
  await p.click("#ts9SendYear"); await wait(p, 400);
  words = await p.evaluate(() => navigator.clipboard.readText());
  ok(words.startsWith(`2026年のつみかさね（きょうまで）　${now} こ`) && words.includes("\n1月 —\n") && words.includes(`\n10月 ${count("2026-10-01", "2026-10-31")} こ\n`) && words.includes("積んだ日 60 日"), "7 this year as words, a line a month", words);
  // 9 期間を再生: this week, from the gear
  await p.click("#ts9PlayWeek"); await wait(p, 600);
  ok(!(await p.evaluate(() => document.getElementById("daySheet").open)) && (await toast(p)).includes(`この1週間のブロック ${count(addDays(today, -6), today)} こを再生します`), "9 the gear shut, the week played", await toast(p));
  if (p.errs.length) errs.push(...p.errs);
  await p.close();

  // 1 a card filled today: 30 days to today
  const m2 = [];
  for (let i = 0; i < 30; i++) m2.push({ id: "c" + i, date: addDays(today, -i), slot: "朝食", text: "パン", createdAt: T(addDays(today, -i), "08:00") });
  p = await open(b, { meals: m2 }, "21:00");
  ok((await txt(p, "#ts9StampBtn")) === "スタンプカード 1 枚目が、いっぱいになりました！" && await p.isHidden("#ts9SpecialLine") && await p.isHidden("#ts9LongLine"), "1 the line on the day it fills (2 6: none here)", await txt(p, "#ts9StampBtn"));
  await wait(p, 900);
  ok((await toast(p)).includes("スタンプカード 1 枚目が、いっぱいになりました！"), "1 said once", await toast(p));
  if (p.errs.length) errs.push(...p.errs);
  await p.close();

  // 2 the 111th today, 6 three days from passing the longest: 6 a day 20〜29 days back (10 on end), 7 a day 1〜6 back,
  // 9 today (7 on end now)
  const m3 = [];
  const add = (d, n) => { for (let j = 0; j < n; j++) m3.push({ id: `${d}-${j}`, date: d, slot: "朝食", text: "パン" + j, createdAt: T(d, `0${8 + Math.floor(j / 6)}:${String((j % 6) * 10).padStart(2, "0")}`) }); };
  for (let i = 20; i <= 29; i++) add(addDays(today, -i), 6);
  for (let i = 1; i <= 6; i++) add(addDays(today, -i), 7);
  add(today, 9);
  p = await open(b, { meals: m3 }, "10:00");
  ok(m3.length === 111 && (await txt(p, "#ts9SpecialBtn")) === "きょう 111 こ目（ゾロ目）を積みました！", "2 the 111th today: the line", await txt(p, "#ts9SpecialBtn"));
  ok((await txt(p, "#ts9LongBtn")) === "いちばん長い連続（10 日）を超えるまで、あと 4 日です（いま 7 日）", "6 the days to passing the longest", await txt(p, "#ts9LongBtn"));
  await wait(p, 900);
  ok((await toast(p)).includes("きょう 111 こ目（ゾロ目）を積みました！"), "2 said once", await toast(p));
  // 9 a span with none
  await p.click("#tsumiSettings"); await wait(p, 800);
  await p.fill("#tsumiSpanFrom", "2026-11-01"); await p.fill("#tsumiSpanTo", "2026-11-05"); await wait(p, 200);
  await p.click("#ts9PlaySpan"); await wait(p, 400);
  ok((await toast(p)).includes("11/1〜11/5に積んだブロックはありません") && await p.evaluate(() => document.getElementById("daySheet").open), "9 a span with none: said, the gear stays", await toast(p));
  if (p.errs.length) errs.push(...p.errs);
  ok(!errs.length, "no errors: " + errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
