// つみかさね その7 ①〜⑩
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-14"; // a Saturday, the last day of the week (from Sunday)
const T = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const wait = (p, ms = 300) => p.waitForTimeout(ms);
const errs = [];
async function open(b, data, hm) {
  const p = await phone(b, at(hm, today), { deviceScaleFactor: 1 });
  await seed(p, data, "tsumi"); await wait(p, 1600);
  return p;
}

// 59 days before today: 朝食 at 07:30 (パン on even days back, ラーメン on odd), 勉強 at 21:10, 運動 at 18:00 every 3rd
// day; today 4 食事 and a 運動 (5, past the 3 of any day before)
const meals = [], study = [], workouts = [], per = new Map();
const put = (d) => per.set(d, (per.get(d) || 0) + 1);
for (let i = 1; i <= 59; i++) {
  const d = addDays(today, -i);
  meals.push({ id: "m" + i, date: d, slot: "朝食", text: i % 2 ? "ラーメン" : "パン", kcal: 500, createdAt: T(d, "07:30") }); put(d);
  study.push({ id: "s" + i, date: d, minutes: 30, createdAt: T(d, "21:10") }); put(d);
  if (i % 3 === 0) { workouts.push({ id: "w" + i, date: d, type: "ランニング", minutes: 30, km: 5, createdAt: T(d, "18:00") }); put(d); }
}
[["パン", "07:30", "朝食"], ["うどん", "12:00", "昼食"], ["カレー", "13:00", "間食"], ["そば", "15:00", "間食"]].forEach(([text, hm, slot], j) => { meals.push({ id: "t" + j, date: today, slot, text, kcal: 400, createdAt: T(today, hm) }); put(today); });
workouts.push({ id: "w0", date: today, type: "ランニング", minutes: 20, km: 3, createdAt: T(today, "18:00") }); put(today);
const settings = [{ id: "tsumiNotes", words: { "meal:m2": "#旅行 おいしかった", "meal:m4": "#旅行", "meal:m6": "#ラーメン部 また行く" }, updatedAt: 1 }];
const DATA = { meals, study, workouts, settings };
const sumDays = (from, to) => [...per].filter(([d]) => d >= from && d <= to).reduce((a, [, n]) => a + n, 0);

(async () => {
  const b = await chromium.launch();
  let p = await open(b, DATA, "21:30");
  // 1 新記録 (5, past 3), 2 皆勤 (the week's last day, every day kept), 4 この時間 (勉強 at 21 every day before, none today)
  ok((await txt(p, "#ts7RecordBtn")) === "きょうは新記録！ 5 こ（これまでのいちばんは 3 こ）", "1 新記録: the line", await txt(p, "#ts7RecordBtn"));
  ok((await txt(p, "#ts7WeekBtn")) === "今週は皆勤です！ 毎日積みました", "2 皆勤: the line on the week's last day", await txt(p, "#ts7WeekBtn"));
  ok(await p.isHidden("#ts7PinchLine"), "3 no ピンチ with blocks today");
  ok((await txt(p, "#ts7HourBtn")) === "いつも21時台は勉強を積んでいます：勉強を記録", "4 この時間: 勉強", await txt(p, "#ts7HourBtn"));
  await wait(p, 900);
  const said = await toast(p);
  ok(said.includes("きょうは新記録！ 5 こ") && said.includes("今週は皆勤です！"), "1 2 said once, with 紙ふぶき", said);
  await p.click("#ts7HourBtn"); await wait(p, 800);
  ok(await p.evaluate(() => document.getElementById("daySheet").open), "4 pressed: 勉強's sheet");
  await p.keyboard.press("Escape"); await wait(p, 700);

  // the gear
  await p.click("#tsumiSettings"); await wait(p, 800);
  // 2 今週の皆勤
  const dots = await p.evaluate(() => [...document.querySelectorAll("#ts7All .ts7-dot")].map((x) => x.className.replace("ts7-dot ", "") + ":" + x.textContent));
  const firstWeek = (() => { const f = addDays(today, -59), wd = new Date(f + "T12:00:00Z").getUTCDay(); return addDays(f, -wd); })();
  let perfect = 0;
  for (let w = firstWeek; w < "2026-11-08"; w = addDays(w, 7)) if ([...Array(7)].every((_, i) => per.has(addDays(w, i)))) perfect++;
  const all = await txt(p, "#ts7All");
  ok(dots.join(",") === "kept:日,kept:月,kept:火,kept:水,kept:木,kept:金,kept:土" && all.includes("今週は皆勤です！") && all.includes(`皆勤の週 これまで ${perfect} 週・いまの連続 ${perfect} 週・いちばん長い連続 ${perfect} 週`), "2 the seven days and the weeks kept", { dots, all, perfect });
  // 6 今週のふりかえり
  const rev = await p.evaluate(() => [...document.querySelectorAll("#ts7Rev li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()));
  const n = sumDays("2026-11-08", today), was = sumDays("2026-11-01", "2026-11-07");
  ok(rev[0] === `今週（11/8〜） 7 日積んだ・先週より +${n - was}（先週の11/1〜11/7は ${was} こ） ${n} こ` && rev[1] === "いちばん積んだ日 きょう・11月14日（土） 5 こ" && rev.includes("食事 先週より +3 10 こ") && rev.includes("運動 先週より +1 3 こ") && rev.includes("勉強 先週より −1 6 こ"), "6 this week against last", { rev, n, was });
  // 8 思い出クイズ
  const q = await txt(p, "#ts7Quiz .ts7-q");
  ok(/に積んだ(食事|運動|勉強)は、どれでしょう？$/.test(q) && (await p.locator("#ts7Quiz .ts7-choice").count()) === 3, "8 a question, three to pick from", q);
  await p.locator("#ts7Quiz .ts7-choice").first().click(); await wait(p);
  const res = await txt(p, "#ts7Quiz .ts7-said"), score = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "tsumiQuiz") || "{}"), P);
  ok((res === "正解！ よくおぼえていましたね" || /^ざんねん。正解は「.+」でした$/.test(res)) && (await p.locator("#ts7Quiz .ts7-choice.right").count()) === 1 && score.all === 1 && (await txt(p, "#ts7Quiz .sub")) === `これまで 1 問のうち ${score.right} 問正解`, "8 picked: right or not, the score", { res, score });
  await p.locator("#ts7Quiz .link-btn", { hasText: "次の問題" }).click(); await wait(p);
  ok((await p.locator("#ts7Quiz .ts7-choice:not([disabled])").count()) === 3 && !(await p.locator("#ts7Quiz .ts7-said").count()), "8 the next");
  // 7 よく積んでいることば
  const words = await p.evaluate(() => [...document.querySelectorAll("#ts7Words .chip-btn")].map((x) => x.textContent));
  ok(words.join(",") === "パン 30,ラーメン 30,ランニング 20", "7 the words, numbers and 朝食 left out", words);
  await p.locator("#ts7Words .chip-btn", { hasText: "ラーメン" }).click(); await wait(p, 500);
  ok(await p.inputValue("#tsumiFind") === "ラーメン" && await p.isVisible("#tsumiFound"), "7 pressed: looked for");
  // 9 ひとことのタグ
  const tags = await p.evaluate(() => [...document.querySelectorAll("#ts7Tags .chip-btn")].map((x) => x.textContent));
  ok(tags.join(",") === "#旅行 2,#ラーメン部 1" && await p.isHidden("#ts7TagList"), "9 the tags", tags);
  await p.locator("#ts7Tags .chip-btn", { hasText: "#旅行" }).click(); await wait(p);
  const tagRows = await p.evaluate(() => [...document.querySelectorAll("#ts7TagList li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()));
  ok(tagRows.length === 2 && tagRows[0].startsWith("食事 11月12日（木） #旅行 おいしかった") && tagRows[1].startsWith("食事 11月10日（火） #旅行"), "9 a tag pressed: its blocks, the latest first", tagRows);
  // 5 目標のおすすめ
  const avg = sumDays(addDays(today, -28), addDays(today, -1)) / 28;
  const sugDay = Math.max(1, Math.ceil(avg * 1.1)), sugMonth = Math.max(10, Math.ceil((avg * 1.1 * 30) / 10) * 10), yc = [...per.values()].reduce((a, b) => a + b, 0);
  const sugYear = Math.max(50, Math.ceil((yc + avg * 1.1 * 48) / 50) * 50);
  ok((await txt(p, "#ts7SugDay")) === `おすすめ：1日 ${sugDay} こ（この4週間は1日 ${(Math.round(avg * 10) / 10).toFixed(1)} こ） これにする`, "5 きょうの目標's", await txt(p, "#ts7SugDay"));
  ok((await txt(p, "#ts7SugMonth")) === `おすすめ：${sugMonth} こ（この4週間のペースで11月まるごと） これにする`, "5 今月の目標's", await txt(p, "#ts7SugMonth"));
  ok((await txt(p, "#ts7SugYear")) === `おすすめ：${sugYear} こ（ことしの ${yc} こに、この4週間のペースで12月31日まで） これにする`, "5 ことしの目標's", await txt(p, "#ts7SugYear"));
  await p.locator("#ts7SugDay .link-btn").click(); await wait(p, 400);
  const dg = (await ls(p, "settings")).find((x) => x.id === "tsumiDayGoal");
  ok(dg && dg.n === sugDay && await p.isHidden("#ts7SugDay"), "5 これにする: the goal set, the suggestion gone", dg);
  // 10 日記に書き足す
  await p.click("#ts7Jn"); await wait(p, 600);
  let jn = (await ls(p, "journal")).find((j) => (j.date || j.id) === today);
  ok(jn && jn.text === "きょうのつみかさね（5 こ）\n・食事：朝食・パン・400 kcal\n・食事：昼食・うどん・400 kcal\n・食事：間食・カレー・400 kcal\n・食事：間食・そば・400 kcal\n・運動：" + jn?.text.split("・運動：")[1] && jn.text.split("\n").length === 6 && (await toast(p)).includes("きょうのブロック 5 こを日記に書き足しました"), "10 today's blocks onto today's 日記", jn?.text);
  await wait(p, 3200);
  await p.click("#ts7Jn"); await wait(p, 500);
  ok((await toast(p)).includes("もう日記に入っています") && (await ls(p, "journal")).filter((j) => (j.date || j.id) === today).length === 1, "10 again: already there", await toast(p));
  if (p.errs.length) errs.push(...p.errs);
  await p.close();

  // 3 連続のピンチ: 19:00, none today, 20 days on end to yesterday; and 2 the week not kept yet
  const m2 = [];
  for (let i = 1; i <= 20; i++) m2.push({ id: "p" + i, date: addDays(today, -i), slot: "朝食", text: "パン", createdAt: T(addDays(today, -i), "08:00") });
  p = await open(b, { meals: m2 }, "19:00");
  ok((await txt(p, "#ts7PinchBtn")) === "連続 20 日がとぎれそうです。きょうはあと 5 時間 0 分", "3 the line", await txt(p, "#ts7PinchBtn"));
  ok(await p.isHidden("#ts7RecordLine") && await p.isHidden("#ts7WeekLine") && await p.isHidden("#ts7HourLine"), "1 2 4 none here");
  await p.click("#ts7PinchBtn"); await wait(p, 500);
  ok(await p.evaluate(() => document.getElementById("tsumiAddMenu").open), "3 pressed: なにを積みますか");
  await p.keyboard.press("Escape"); await wait(p, 500);
  await p.click("#tsumiSettings"); await wait(p, 800);
  const all2 = await txt(p, "#ts7All");
  ok(all2.includes("今週 6 / 7 日。あと 1 日で皆勤です") && (await p.evaluate(() => document.querySelector("#ts7All .ts7-dot:last-child").className)).includes("today"), "2 today still to come", all2);
  ok((await txt(p, "#ts7SugDay")) === "おすすめ：1日 1 こ（この4週間は1日 0.7 こ） これにする", "5 from 20 days: 1 a day", await txt(p, "#ts7SugDay"));
  if (p.errs.length) errs.push(...p.errs);
  await p.close();

  // 1 the days on end past the longest before (4): 5 now, a block a day
  const m3 = [], back = [0, 1, 2, 3, 4, 10, 11, 12, 13, 20, 21, 22, 23, 30, 31, 32, 33, 40, 41, 42, 43];
  for (const i of back) m3.push({ id: "q" + i, date: addDays(today, -i), slot: "朝食", text: "パン", createdAt: T(addDays(today, -i), "08:00") });
  p = await open(b, { meals: m3 }, "10:00");
  ok((await txt(p, "#ts7RecordBtn")) === "連続 5 日は、これまででいちばん長い連続です！", "1 the days on end", await txt(p, "#ts7RecordBtn"));
  await wait(p, 900);
  ok((await toast(p)).includes("連続 5 日は、いちばん長い連続です！"), "1 said", await toast(p));
  if (p.errs.length) errs.push(...p.errs);
  ok(!errs.length, "no errors: " + errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
