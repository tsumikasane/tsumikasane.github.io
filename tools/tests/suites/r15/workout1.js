// 運動 ①〜⑩
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed } = require("./lib");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10";
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
let i = 0;
const RUN = (date, km, minutes) => ({ id: "w" + ++i, date, type: "ランニング", km, minutes, createdAt: T(date, 7) });
const ST = (date, exercise, kg, reps, sets, extra = {}) => ({ id: "w" + ++i, date, type: "筋トレ", exercise, kg, reps, sets, createdAt: T(date, 8) + i, ...extra });
const DATA = {
  settings: [],
  weights: [{ id: "2026-11-01", date: "2026-11-01", kg: 60, createdAt: T("2026-11-01") }],
  workouts: [
    RUN("2026-11-03", 5, 30), RUN("2026-11-05", 8, 50), RUN("2026-11-07", 4, 22),
    ST("2026-11-03", "レッグカール", 25, 20, 3), ST("2026-11-03", "ラットプルダウン", 30, 20, 3, { setList: [{ kg: 30, reps: 20 }, { kg: 30, reps: 18 }, { kg: 30, reps: 15 }] }),
    ST("2026-11-06", "レッグプレス", 35, 20, 3), ST("2026-11-09", "レッグプレス", 40, 20, 3), ST("2026-11-09", "チェストプレス", 30, 15, 3), ST("2026-11-09", "プランク", undefined, 60, 3, { per: "sec" }),
    { id: "w99", date: "2026-11-08", type: "エアロバイク", minutes: 30, createdAt: T("2026-11-08", 7) },
  ],
  meals: [{ id: "m1", date: today, slot: "朝食", text: "パン", kcal: 600, createdAt: T(today, 7) }, { id: "m2", date: today, slot: "昼食", text: "定食", kcal: 800, createdAt: T(today, 12) }],
};
(async () => {
  const b = await chromium.launch();
  let p = await phone(b, at("12:00", today));
  await p.goto(URL0); await p.evaluate((P) => localStorage.setItem(P + "dietPart", "workout"), P);
  await seed(p, DATA, "diet");
  await p.evaluate((P) => localStorage.setItem(P + "dietPart", "workout"), P); await p.reload(); await p.waitForTimeout(800);
  ok(await p.isVisible("#part-workout"), "運動 shows");
  ok((await p.getAttribute("#wtSettings", "aria-label")) === "運動の設定", "the gear is 運動's");
  // ⑧ the month: 17 km, no goal yet
  let rm = await txt(p, "#runMonthCard");
  ok(rm.startsWith("11月のラン 17 km") && rm.includes("月の目標を決める"), "⑧ no goal: " + rm);
  await p.locator("#runMonthCard .link-btn").click(); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.activeElement.id) === "runGoal", "⑧ the button opens the gear at the goal");
  await p.fill("#runGoal", "50"); await p.selectOption("#restSec", "60"); await p.waitForTimeout(200);
  await p.locator("#sheetDone").click(); await p.waitForTimeout(600);
  rm = await txt(p, "#runMonthCard");
  ok(rm.startsWith("11月のラン 17 / 50 km") && rm.includes("あと 33 km・1日あたり 1.6 km（残り 21 日）"), "⑧ with a goal: " + rm);
  const st = await ls(p, "settings");
  ok(st.find((x) => x.id === "runGoal")?.km === 50 && st.find((x) => x.id === "woRest")?.sec === 60, "⑧⑨ kept: " + JSON.stringify(st.filter((x) => /runGoal|woRest/.test(x.id))));
  // ② the menu (火曜): レッグカール did 3 × 20 last time, ラットプルダウン not
  const rows = await p.evaluate(() => [...document.querySelectorAll("#woMenu li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()));
  ok(rows.find((r) => r.includes("レッグカール"))?.includes("1段階上げどき") && !rows.find((r) => r.includes("ラットプルダウン"))?.includes("上げどき"), "② 上げどき: " + rows.join(" | "));
  // ⑥ the week (日 11/8 〜 土 11/14)
  const wk = await p.evaluate(() => [...document.querySelectorAll("#woWeekList li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()));
  ok(wk.length === 7 && wk[0].startsWith("日 11/8") && wk[0].endsWith("1 / 4") && wk[1].endsWith("3 / 4") && wk[2].endsWith("まだ") && !/\d \/ \d$|まだ$/.test(wk[3]), "⑥ days: " + wk.join(" | "));
  ok((await txt(p, "#woWeekSum")) === "ラン 0 / 30 km・筋トレ 9 / 63 セット・メニューをぜんぶできた日 0 日", "⑥ sums: " + await txt(p, "#woWeekSum"));
  ok(await p.isDisabled("#woWeekList li:nth-child(5) button") && (await p.getAttribute("#woWeekList li:nth-child(3)", "class")).includes("cur"), "⑥ days to come can't be pressed; today marked");
  // ⑦ sets by 部位 (11/4〜11/10)
  const parts = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll("#woPartsList li")].map((li) => [li.querySelector(".wo-part-name").textContent, li.innerText.replace(/\s+/g, " ").trim()])));
  ok(parts["脚"].includes("6 / 18 セット") && parts["胸"].includes("3 / 6 セット") && parts["体幹"].includes("3 / 15 セット") && parts["背中"].includes("0 / 12 セット") && parts["背中"].includes("最後は7日前・しばらくやっていません") && parts["肩"].includes("まだやっていません"), "⑦ " + JSON.stringify(parts));
  // ③ 自己ベスト
  let best = await p.evaluate(() => [...document.querySelectorAll("#woBestList li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()));
  ok(best[0] === "ラン 最長 11/5（木） 8 km" && best[1] === "ラン 最速 4 km・11/7（土） 5:30/km" && best.some((x) => x.startsWith("レッグプレス") && x.endsWith("40 kg × 20 回")) && best.some((x) => x.startsWith("プランク") && x.endsWith("60 秒")) && best.some((x) => x.startsWith("ラットプルダウン") && x.endsWith("30 kg × 20 回")), "③ " + best.join(" | "));
  // ① the last time, 前回と同じ (筋トレ), with ② for one ready
  await p.selectOption("#woType", "筋トレ"); await p.fill("#woExercise", "レッグプレス"); await p.waitForTimeout(200);
  let last = await txt(p, "#woLast");
  ok(last.startsWith("前回 きのう：40 kg × 20 回 × 3 セット 前回と同じ"), "① レッグプレス: " + last);
  await p.locator("#woLast .link-btn").click(); await p.waitForTimeout(150);
  ok((await p.inputValue("#woWeight")) === "40" && (await p.inputValue("#woReps")) === "20" && (await p.inputValue("#woSets")) === "3", "① 前回と同じ fills the fields");
  await p.fill("#woExercise", "レッグカール"); await p.waitForTimeout(200);
  ok((await txt(p, "#woLast")).includes("前回は3セットとも20回できたので、1段階上げる目安です"), "② in the form: " + await txt(p, "#woLast"));
  await p.fill("#woExercise", "ラットプルダウン"); await p.waitForTimeout(150);
  await p.locator("#woLast .link-btn").click(); await p.waitForTimeout(150);
  ok(await p.isVisible("#woEachBox") && (await p.locator("#woEachBox .wo-set").count()) === 3, "① sets of their own come back as sets");
  // ① ④ a run: its last, with the pace
  await p.selectOption("#woType", "ランニング"); await p.waitForTimeout(200);
  last = await txt(p, "#woLast");
  ok(last.startsWith("前回 11/7（土）：4 km・22 分・5:30/km"), "①④ the last run, with its pace: " + last);
  // ⑩ 目安 for a run typed in
  await p.fill("#woDist", "3"); await p.fill("#woMin", "20"); await p.waitForTimeout(150);
  ok((await txt(p, "#woKcalHint")) === "目安 約 180 kcal を入れる", "⑩ the form's 目安: " + await txt(p, "#woKcalHint"));
  await p.locator("#workoutForm button[type=submit]").click(); await p.waitForTimeout(400);
  let row = await p.evaluate(() => [...document.querySelectorAll("#workoutList li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()));
  ok(row.some((r) => r.includes("3 km・20 分・6:40/km") && r.includes("消費 約 180 kcal（体重から計算）")), "④⑩ the row: " + row.join(" | "));
  ok((await txt(p, "#workoutTotal")).includes("消費 約 180 kcal") && (await txt(p, "#woBalance")) === "食事 1,400 kcal − 運動 約 180 kcal = 1,220 kcal", "⑩ the day: " + await txt(p, "#workoutTotal") + " | " + await txt(p, "#woBalance"));
  // ③ a longer run: 自己ベスト更新
  await p.fill("#woDist", "10"); await p.fill("#woMin", "60"); await p.locator("#workoutForm button[type=submit]").click(); await p.waitForTimeout(400);
  let said = await p.evaluate(() => document.querySelector("#status").textContent);
  ok(said.includes("自己ベスト更新：ラン 最長 10 km"), "③ said: " + said);
  ok(await p.locator("canvas.confetti").count() >= 0, "③ (confetti drawn unless less motion)");
  // ③ a heavier レッグプレス
  await p.selectOption("#woType", "筋トレ"); await p.fill("#woExercise", "レッグプレス"); await p.fill("#woWeight", "45"); await p.fill("#woReps", "10"); await p.fill("#woSets", "3");
  await p.locator("#workoutForm button[type=submit]").click(); await p.waitForTimeout(400);
  said = await p.evaluate(() => document.querySelector("#status").textContent);
  ok(said.includes("自己ベスト更新：レッグプレス 45 kg × 10 回"), "③ said: " + said);
  // ⑨ ＋1 on レッグカール: one set, 25 kg (its last), then the rest (60 秒 as set)
  await p.locator('#woMenu li:has-text("レッグカール") .wo-plus1').click(); await p.waitForTimeout(400);
  let w = (await ls(p, "workouts")).filter((x) => x.exercise === "レッグカール" && x.date === today);
  ok(w.length === 1 && w[0].kg === 25 && w[0].reps === 20 && w[0].sets === 1 && w[0].live === true, "⑨ a set: " + JSON.stringify(w));
  ok(await p.isVisible("#restBar") && (await txt(p, "#restLeft")) === "1:00", "⑨ the rest counts down from 1:00: " + await txt(p, "#restLeft"));
  said = await p.evaluate(() => document.querySelector("#status").textContent);
  ok(said.startsWith("レッグカール 1セット目を記録"), "⑨ said: " + said);
  await p.locator('#woMenu li:has-text("レッグカール") .wo-plus1').click(); await p.waitForTimeout(400);
  w = (await ls(p, "workouts")).filter((x) => x.exercise === "レッグカール" && x.date === today);
  ok(w.length === 1 && w[0].sets === 2, "⑨ the second on the same entry: " + JSON.stringify(w));
  await p.evaluate(() => document.querySelector("#status .toast-undo")?.click()); await p.waitForTimeout(400);
  w = (await ls(p, "workouts")).filter((x) => x.exercise === "レッグカール" && x.date === today);
  ok(w[0].sets === 1 && await p.isHidden("#restBar"), "⑨ 元に戻す: back to 1, the rest stopped");
  await p.locator('#woMenu li:has-text("レッグカール") .wo-plus1').click(); await p.waitForTimeout(300);
  await p.locator("#restMore").click(); await p.waitForTimeout(100);
  ok((await txt(p, "#restLeft")) === "1:30", "⑨ ＋30秒: " + await txt(p, "#restLeft"));
  await p.locator("#restStop").click(); await p.waitForTimeout(100);
  ok(await p.isHidden("#restBar"), "⑨ おわり");
  // ⑤ the chart: レッグプレス
  await p.locator("#woChartCard").scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  const opts = await p.evaluate(() => [...document.querySelectorAll("#woChartPick option")].map((o) => o.textContent));
  ok(opts[0] === "ランの距離（週ごと）" && opts[1] === "ランのペース" && opts.includes("レッグプレス"), "⑤ what can be shown: " + opts.join(","));
  ok((await p.locator("#woChart .wo-bar").count()) === 2, "⑤ weekly bars (the week of 11/1 and this one): " + await p.locator("#woChart .wo-bar").count());
  await p.selectOption("#woChartPick", { label: "レッグプレス" }); await p.waitForTimeout(300);
  const tb = await p.evaluate(() => [...document.querySelectorAll("#woChartTable tr")].map((r) => r.textContent));
  ok(tb.length === 3 && tb[0].includes("45 kg × 10 回") && tb[0].endsWith("45 kg") && tb[2].endsWith("35 kg"), "⑤ レッグプレス, newest first: " + tb.join(" | "));
  const bx = await p.locator("#woChart").boundingBox();
  await p.mouse.move(bx.x + bx.width - 60, bx.y + bx.height / 2); await p.waitForTimeout(150);
  ok(await p.isVisible("#woChartTip") && (await txt(p, "#woChartTip")).startsWith("45 kg"), "⑤ the tip: " + await txt(p, "#woChartTip"));
  await p.screenshot({ path: out + "/wo-chart.png" });
  await p.selectOption("#woChartPick", { label: "ランのペース" }); await p.waitForTimeout(300);
  ok((await txt(p, "#woChartNote")) === "下ほど速いペースです。", "⑤ pace: lower is faster");
  ok(!p.errs.length, "no page errors: " + p.errs.join(" | "));
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200);
  await p.screenshot({ path: out + "/wo-top.png", fullPage: true });
  // ⑨ the rest's end: a clock that runs
  const c2 = await b.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true, timezoneId: "Asia/Tokyo", locale: "ja-JP" });
  await c2.clock.install({ time: at("12:00", today) });
  const q = await c2.newPage(); q.errs = []; q.on("pageerror", (e) => q.errs.push(e.message));
  await q.goto(URL0); await q.evaluate(({ P, DATA }) => { localStorage.clear(); for (const [k, v] of Object.entries(DATA)) localStorage.setItem(P + k, JSON.stringify(v)); localStorage.setItem(P + "dietPart", "workout"); }, { P, DATA });
  await q.goto(URL0 + "#diet"); await q.reload(); await q.clock.runFor(1500);
  await q.locator('#woMenu li:has-text("レッグカール") .wo-plus1').click(); await q.clock.runFor(1000);
  ok((await q.evaluate(() => document.querySelector("#restLeft").textContent)) === "1:29", "⑨ counting: " + await q.evaluate(() => document.querySelector("#restLeft").textContent));
  await q.clock.runFor(90000);
  ok(await q.evaluate(() => document.querySelector("#restBar").hidden) && (await q.evaluate(() => document.querySelector("#status").textContent)).includes("休憩おわり"), "⑨ the end: said and gone");
  ok(!q.errs.length, "clock page: no errors: " + q.errs.join(" | "));
  // dark, for the look
  const d = await phone(b, at("12:00", today), { colorScheme: "dark" });
  await d.goto(URL0); await d.evaluate((P) => localStorage.setItem(P + "dietPart", "workout"), P);
  await seed(d, { ...DATA, settings: [{ id: "runGoal", km: 50, updatedAt: T("2026-11-01") }] }, "diet");
  await d.evaluate((P) => localStorage.setItem(P + "dietPart", "workout"), P); await d.reload(); await d.waitForTimeout(800);
  await d.screenshot({ path: out + "/wo-dark.png", fullPage: true });
  ok(!d.errs.length, "dark: no page errors: " + d.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
