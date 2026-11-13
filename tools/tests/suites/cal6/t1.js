// カレンダー その6 ①〜⑩ (on the hooked copy at 8812)
process.env.URL0 = process.env.URL0 || "http://localhost:8812/";
const { chromium } = require("playwright");
const { phone, seed, at, P } = require("./lib");
const { make, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const nos = (s) => String(s || "").replace(/\s+/g, "");
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const ev = async (p, id) => (await ls(p, "events")).find((e) => e.id === id);
const openDayOf = async (p, md) => { await p.evaluate((md) => [...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith(md)).click(), md); await p.waitForTimeout(700); };
const openPlan = async (p, md, title) => { await openDayOf(p, md); await p.locator("#calDayList .row-btn", { hasText: title }).first().click(); await p.waitForTimeout(700); };
const closeSheet = async (p) => { for (let i = 0; i < 4 && (await p.evaluate(() => document.getElementById("daySheet").open)); i++) { await p.keyboard.press("Escape"); await p.waitForTimeout(700); } };
const undo = async (p) => { await p.locator(".show button", { hasText: "元に戻す" }).first().click(); await p.waitForTimeout(600); };
const setVal = (p, id, v) => p.evaluate(({ id, v }) => { const t = document.getElementById(id); t.value = v; t.dispatchEvent(new Event("input", { bubbles: true })); t.dispatchEvent(new Event("change", { bubbles: true })); }, { id, v });
async function open(data = make(), when = "10:30", day = today) { const p = await phone(b, at(when, day), { deviceScaleFactor: 1 }); await seed(p, data, "calendar"); await p.waitForTimeout(900); return p; }
let b;

(async () => {
  b = await chromium.launch();
  let p = await open();
  ok(!p.errs.length, "the page opens, no error", p.errs);

  // ② the month summed up, under the picker's wheels
  await p.click("#calMonthBtn"); await p.waitForTimeout(800);
  const sum = nos(await txt(p, "#cal6Sum"));
  ok(sum.includes("2026年11月のまとめ") && sum.includes("予定9件・合計11時間") && sum.includes("いちばん多い日：11/14（土）3件") && sum.includes("ラベル：遊び5件・ゼミ1件") && sum.includes("バイト1回") && sum.includes("予定の費用4,000円"), "② the month summed up", sum);
  // ③ 100日後
  await p.fill("#cal6JumpN", "100"); await p.waitForTimeout(200);
  ok((await txt(p, "#cal6JumpTo")) === "→ 2027年2月22日（月）", "③ the day 100 days on", await txt(p, "#cal6JumpTo"));
  await p.fill("#cal6JumpN", "-30"); await p.waitForTimeout(200);
  ok((await txt(p, "#cal6JumpWord")) === "日前" && (await txt(p, "#cal6JumpTo")) === "→ 10月15日（木）", "③ 30日前", [await txt(p, "#cal6JumpWord"), await txt(p, "#cal6JumpTo")]);
  await p.click(".cal6-jump-chips .chip-btn:nth-child(3)"); await p.waitForTimeout(200);
  await p.click("#cal6JumpGo"); await p.waitForTimeout(900);
  ok((await txt(p, "#calMonthName")).includes("2027年2月"), "③ その日へ: the calendar goes there", await txt(p, "#calMonthName"));
  p = await open();

  // ⑨ today's plans: 終わり, いま, あと何時間
  await openDayOf(p, "11月14日");
  const rows = await p.evaluate(() => [...document.querySelectorAll("#calDayList li")].map((li) => li.innerText.replace(/\s+/g, "")));
  ok(rows.some((r) => r.includes("歯医者") && r.includes("終わり")) && rows.some((r) => r.includes("買い物") && r.includes("いま")) && rows.some((r) => r.includes("映画") && r.includes("あと2時間30分")), "⑨ 終わり, いま and あと何分", rows);
  await closeSheet(p);

  // ① a day's plans moved at once, then 元に戻す
  await openDayOf(p, "11月16日");
  ok(await p.isVisible("#cal6DayBtn"), "① まとめて動かす under the list");
  await p.click("#cal6DayBtn"); await p.waitForTimeout(300);
  ok((await p.inputValue("#cal6DayTo")) === "2026-11-17", "① the next day to begin with");
  await p.click('#cal6DayBox [data-k="day-move"]'); await p.waitForTimeout(700);
  ok((await ev(p, "e1")).date === "2026-11-17" && (await ev(p, "e3")).date === "2026-11-17", "① both moved", [(await ev(p, "e1")).date, (await ev(p, "e3")).date]);
  await undo(p);
  ok((await ev(p, "e1")).date === "2026-11-16" && (await ev(p, "e3")).date === "2026-11-16", "① 元に戻す");
  await closeSheet(p);
  // a repeating plan's turn: copied as its own, then moved (taken out of it)
  await openDayOf(p, "11月18日");
  await p.click("#cal6DayBtn"); await p.waitForTimeout(300);
  await p.click('#cal6DayBox [data-k="day-copy"]'); await p.waitForTimeout(700);
  let all = await ls(p, "events");
  ok(all.some((e) => e.title === "英会話" && e.date === "2026-11-19" && !e.repeat && e.labelId === "l2") && !(await ev(p, "e2")).skip, "① copied: a plan of its own, the repeat as it was");
  await closeSheet(p);
  await openDayOf(p, "11月25日");
  await p.click("#cal6DayBtn"); await p.waitForTimeout(300);
  await setVal(p, "cal6DayTo", "2026-11-27");
  await p.click('#cal6DayBox [data-k="day-move"]'); await p.waitForTimeout(700);
  all = await ls(p, "events");
  ok((await ev(p, "e2")).skip?.includes("2026-11-25") && all.some((e) => e.title === "英会話" && e.date === "2026-11-27" && !e.repeat), "① moved: the turn taken out, kept on its new day", (await ev(p, "e2")).skip);
  await closeSheet(p);

  // ⑩ a plan's 費用 in 家計簿, and taken back
  await openPlan(p, "11月16日", "飲み会");
  ok((await txt(p, ".cal6-money")).includes("費用 4,000円") && (await p.inputValue("#cal6MoneyCat")) === "交際費", "⑩ its 費用, the 費目 its name says");
  await p.click('.cal6-money [data-k="money-go"]'); await p.waitForTimeout(700);
  let ex = await p.evaluate(() => window.__cal6.expenses());
  const made = ex.find((x) => x.amount === 4000);
  ok(made && made.category === "交際費" && made.date === today && made.kind === "out" && made.memo === "飲み会" && (await ev(p, "e3")).exMade?.["2026-11-16"] === made.id, "⑩ in 家計簿 (today, the plan still to come)", made);
  ok((await txt(p, ".cal6-money")).includes("家計簿に記録しました"), "⑩ said in the plan");
  await p.click('.cal6-money [data-k="money-undo"]'); await p.waitForTimeout(700);
  ex = await p.evaluate(() => window.__cal6.expenses());
  ok(!ex.some((x) => x.amount === 4000) && !(await ev(p, "e3")).exMade, "⑩ 取り消す");
  // ⑦ the plan as a .ics file
  ok(await p.isVisible("#cal6Ics"), "⑦ カレンダーのファイルで送る in the plan");
  const ics = await p.evaluate(() => window.__cal6.ics("e2"));
  ok(ics.includes("SUMMARY:英会話") && ics.split("BEGIN:VEVENT").length === 2 && ics.includes("RRULE:FREQ=WEEKLY"), "⑦ the one plan, with its repeat", ics);
  await closeSheet(p);

  // ④ a place's 移動時間, ⑤ 前と同じにする, ⑩ 費用 in the form
  await p.click("#calAdd"); await p.waitForTimeout(700);
  await p.fill("#planTitle", "ゼミ発表");
  await setVal(p, "planTime", "13:00"); await p.waitForTimeout(150);
  await setVal(p, "planPlace", "3号館"); await p.waitForTimeout(200);
  ok((await p.inputValue("#planTravel")) === "30" && (await txt(p, "#planTravelMemo")).includes("前と同じ 30 分"), "④ the place's 移動時間 as before", [await p.inputValue("#planTravel"), await txt(p, "#planTravelMemo")]);
  await p.fill("#planCost", "1500");
  await p.click("#planSave"); await p.waitForTimeout(700);
  const ze = (await ls(p, "events")).find((e) => e.title === "ゼミ発表");
  ok(ze && ze.travel === 30 && ze.cost === 1500, "④⑩ saved with them", ze);
  await p.click("#calAdd"); await p.waitForTimeout(700);
  await p.fill("#planTitle", "美容院"); await p.waitForTimeout(200);
  ok(await p.isVisible("#planSame") && (await txt(p, "#planSame")).includes("前と同じにする"), "⑤ 前と同じにする for a name used before", await txt(p, "#planSame"));
  await p.click(".cal6-same-btn"); await p.waitForTimeout(300);
  ok((await p.inputValue("#planTime")) === "14:00" && (await p.inputValue("#planEndTime")) === "15:00" && (await p.inputValue("#planPlace")) === "駅前の美容院" && await p.isHidden("#planSame"), "⑤ filled in as that one, then put away");
  await closeSheet(p);

  // ⑥ 予定 narrowed to a label
  p = await open();
  await p.click("#calFind"); await p.waitForTimeout(700);
  ok((await p.locator("#cal6FindLabels .cal6-find-chip").count()) === 3, "⑥ すべて and the two labels");
  await p.click('#cal6FindLabels [data-l="l2"]'); await p.waitForTimeout(400);
  let list = await txt(p, "#findList");
  ok(list.includes("飲み会") && list.includes("英会話") && !list.includes("ゼミ") && !list.includes("映画") && !list.includes("17:00〜22:00"), "⑥ 遊び's plans alone (no shift)", list.slice(0, 400));
  await p.fill("#findText", "ゼミ"); await p.waitForTimeout(400);
  ok((await txt(p, "#findList")) === "見つかりませんでした。", "⑥ and in what is found", await txt(p, "#findList"));
  await p.click('#cal6FindLabels [data-l=""]'); await p.waitForTimeout(400);
  ok((await txt(p, "#findList")).includes("ゼミ"), "⑥ すべて again");
  await closeSheet(p);

  // ⑧ the old plans (the class kept), deleted with a second press, and back
  await p.click("#calSettings"); await p.waitForTimeout(700);
  ok((await txt(p, "#cal6OldN")) === "2件", "⑧ two old plans (not the class)", await txt(p, "#cal6OldN"));
  await p.selectOption("#cal6OldYears", "3"); await p.waitForTimeout(200);
  ok((await txt(p, "#cal6OldN")) === "ありません", "⑧ none before three years ago");
  await p.selectOption("#cal6OldYears", "1"); await p.waitForTimeout(200);
  await p.click("#cal6OldDel"); await p.waitForTimeout(200);
  ok(!!(await ev(p, "e7")), "⑧ not on the first press");
  await p.click("#cal6OldDel"); await p.waitForTimeout(700);
  ok(!(await ev(p, "e7")) && !(await ev(p, "e8")) && !!(await ev(p, "e9")), "⑧ deleted on the second, the class kept");
  await undo(p);
  ok(!!(await ev(p, "e7")) && !!(await ev(p, "e8")), "⑧ 元に戻す");

  ok(!p.errs.length, "no error on the way", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
