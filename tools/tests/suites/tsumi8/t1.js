// つみかさね その8 ①〜⑩
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-14"; // a Saturday
const T = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
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

// as tsumi7's: 59 days before today, 朝食 at 07:30, 勉強 at 21:10, 運動 at 18:00 every 3rd day; today 4 食事 and a 運動.
// 今日のめあて 食事・運動・日記; つみねこ petted 45 times on this device
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
const settings = [{ id: "tsumiNotes", words: { "meal:m2": "#旅行 おいしかった", "meal:m4": "#旅行", "meal:m6": "#ラーメン部 また行く" }, updatedAt: 1 },
  { id: "tsumiAims", days: { [today]: ["meal", "workout", "journal"] }, updatedAt: 1 }];
const DATA = { meals, study, workouts, settings, tsumiPets: { day: today, n: 0, total: 45 } };

(async () => {
  const b = await chromium.launch();
  let p = await open(b, DATA, "21:30");
  // 2 きょうのめあて at the card's foot
  ok((await txt(p, "#ts8AimBtn")) === "きょうのめあて 2 / 3：食事 ✓・運動 ✓・日記", "2 the day's めあて, each ✓ once on", await txt(p, "#ts8AimBtn"));
  ok(await p.isHidden("#ts8BackLine"), "1 no おかえり with no days left out");

  await p.click("#tsumiSettings"); await wait(p, 800);
  // 6 この30日の積み方
  const last30 = [...Array(30)].map((_, i) => addDays(today, -29 + i)).map((d) => per.get(d) || 0), avg = last30.reduce((a, b) => a + b, 0) / 30;
  ok((await p.locator("#ts8Chart .ts8-bar").count()) === 30 && (await txt(p, "#ts8Chart .ts8-top")) === "5 こ", "6 thirty columns, the top 5", await txt(p, "#ts8Chart .ts8-top"));
  ok((await txt(p, "#ts8ChartRead")) === `平均 ${(Math.round(avg * 10) / 10).toFixed(1)} こ・積んだ日 30 日・いちばん多い日 11/14（土） 5 こ`, "6 under it: the average, the days, the most", await txt(p, "#ts8ChartRead"));
  const hs = await p.evaluate(() => [...document.querySelectorAll("#ts8Chart .ts8-bar i")].map((i) => i.style.height));
  ok(hs[29] === "100%" && hs[28] === "40%" && (await p.getAttribute("#ts8Chart .ts8-bar:last-child", "aria-label")) === "11月14日（土）、5 こ", "6 the heights, and each named with its day and count", hs.slice(-3));
  await p.locator("#ts8Chart .ts8-bar").nth(28).click(); await wait(p);
  ok((await txt(p, "#ts8ChartRead")) === "2 こ きのう・11月13日（金） 階段で見る" && (await p.locator("#ts8Chart .ts8-bar.on").count()) === 1, "6 a column pressed: its count first, and the way to it", await txt(p, "#ts8ChartRead"));
  // 7 連続の記録ベスト5
  ok(JSON.stringify(await rows(p, "#ts8Runs")) === JSON.stringify(["1位 9/16〜11/14 いま続いています 60 日"]), "7 the one run, going on", await rows(p, "#ts8Runs"));
  // 3 タイプ診断
  const type = await txt(p, "#ts8Type");
  ok(type === "あなたは「夜のコツコツバランス型」 時刻のわかるブロックの 56% を、夜（17時〜朝4時）に積んでいます。 60 日のうち 60 日（100%）積みました。毎日のように積んでいます。 よく積むのは食事と勉強です。", "3 the type and why", type);
  // 4 種類ごとのペース
  ok(JSON.stringify(await rows(p, "#ts8Pace")) === JSON.stringify(["食事 63 こ・あいた日なし 1日 1.1 こ", "勉強 59 こ・あいた日なし 1 日に 1 回", "運動 20 こ・いちばんあいたのは 2 日 3 日に 1 回"]), "4 how often each", await rows(p, "#ts8Pace"));
  // 5 いつもの時間 (62 食事: one at 12:00 sharp is taken as one with no time kept, as つみかさね takes it)
  ok(JSON.stringify(await rows(p, "#ts8Usual")) === JSON.stringify(["食事 まんなか 07:30・62 こから 07:30ごろ", "運動 まんなか 18:00・20 こから 18:00ごろ", "勉強 まんなか 21:10・59 こから 21:10ごろ"]), "5 each one's usual time, earliest first", await rows(p, "#ts8Usual"));
  // 8 よくある積む順番
  ok(JSON.stringify(await rows(p, "#ts8Order")) === JSON.stringify(["その日の最初に積むのは 60 日のうち 60 日 食事", "食事 → 勉強 このあとに積んだ日 40 日", "食事 → 運動 このあとに積んだ日 20 日", "運動 → 勉強 このあとに積んだ日 19 日"]), "8 the first, and one after another", await rows(p, "#ts8Order"));
  // 10 なかよし度
  ok((await txt(p, "#ts8FriendHead")) === "つみねことのなかよし度" && (await txt(p, "#ts8Friend")) === "♥♥♥♡♡ 大のなかよし 105 ポイント（積んだ日 60・なでた 45） あと 195 ポイントで「親友」", "10 the points, the step and the next", await txt(p, "#ts8Friend"));
  // 9 ひとこと集
  await p.click("#ts8Notes"); await wait(p, 500);
  const notes = await p.evaluate(() => navigator.clipboard.readText());
  ok(notes === "つみかさねのひとこと（3 こ）\n\n2026/11/8 食事（朝食・パン・500 kcal）\n「#ラーメン部 また行く」\n\n2026/11/10 食事（朝食・パン・500 kcal）\n「#旅行」\n\n2026/11/12 食事（朝食・パン・500 kcal）\n「#旅行 おいしかった」" && (await toast(p)).includes("つみかさねのひとこと（3 こ）を文字でコピーしました"), "9 every ひとこと, oldest first", notes);
  // 2 めあて in the gear: あした first; 勉強 picked
  ok((await p.getAttribute('#ts8AimSeg [data-day="tomorrow"]', "aria-pressed")) === "true" && (await p.locator('#ts8AimKinds .chip-btn[aria-pressed="true"]').count()) === 0, "2 あした, none yet");
  await p.locator("#ts8AimKinds .chip-btn", { hasText: "勉強" }).click(); await wait(p, 300);
  let aims = (await ls(p, "settings")).find((x) => x.id === "tsumiAims");
  ok(JSON.stringify(aims?.days) === JSON.stringify({ [today]: ["meal", "workout", "journal"], "2026-11-15": ["study"] }) && (await txt(p, "#ts8AimFoot")).startsWith("あした（11月15日（日））のめあては 勉強。"), "2 picked for あした, kept with the account", { aims, foot: await txt(p, "#ts8AimFoot") });
  await p.click('#ts8AimSeg [data-day="today"]'); await wait(p);
  const pressed = await p.evaluate(() => [...document.querySelectorAll('#ts8AimKinds .chip-btn[aria-pressed="true"]')].map((x) => x.textContent));
  ok(pressed.join(",") === "日記,食事,運動", "2 きょう's", pressed);
  // 2 日記 written (その7 10): the めあて all on, said once the gear is shut
  await p.click("#ts7Jn"); await wait(p, 800);
  await p.keyboard.press("Escape"); await wait(p, 1800);
  ok((await txt(p, "#ts8AimBtn")) === "きょうのめあてを、ぜんぶ果たしました！（食事・運動・日記）" && (await toast(p)).includes("きょうのめあてを、ぜんぶ果たしました！"), "2 all on: the line, and said", { line: await txt(p, "#ts8AimBtn"), said: await toast(p) });
  if (p.errs.length) errs.push(...p.errs);
  await p.close();

  // 1 おかえりなさい, 7 the runs: blocks today, 5〜9, 12〜13 and 20〜29 days back
  const m2 = [];
  for (const i of [0, 5, 6, 7, 8, 9, 12, 13, ...[...Array(10)].map((_, j) => 20 + j)]) m2.push({ id: "q" + i, date: addDays(today, -i), slot: "朝食", text: "パン", createdAt: T(addDays(today, -i), "08:00") });
  p = await open(b, { meals: m2 }, "10:00");
  ok((await txt(p, "#ts8BackBtn")) === "おかえりなさい！ 5 日ぶりのブロックです。また積んでいこうね", "1 the line", await txt(p, "#ts8BackBtn"));
  await wait(p, 900);
  ok((await toast(p)).includes("おかえりなさい！ 5 日ぶりのブロックです"), "1 said once", await toast(p));
  ok(await p.isHidden("#ts8AimLine"), "2 none with no めあて");
  await p.click("#tsumiSettings"); await wait(p, 800);
  ok(JSON.stringify(await rows(p, "#ts8Runs")) === JSON.stringify(["1位 10/16〜10/25 10 日", "2位 11/5〜11/9 5 日", "3位 11/1〜11/2 2 日"]), "7 the longest first", await rows(p, "#ts8Runs"));
  ok(await p.isHidden("#ts8Type") && await p.isHidden("#ts8TypeHead"), "3 none with under 20 blocks");
  await p.locator("#ts8Runs .row-btn").first().click(); await wait(p, 900);
  ok(!(await p.evaluate(() => document.getElementById("daySheet").open)) && (await txt(p, "#tsumiTip")).includes("10月16日"), "7 pressed: its first day on the stairs", await txt(p, "#tsumiTip"));
  if (p.errs.length) errs.push(...p.errs);
  ok(!errs.length, "no errors: " + errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
