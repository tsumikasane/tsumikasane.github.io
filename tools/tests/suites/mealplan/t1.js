// 食事's きょうの記録 holding what is to be eaten, put there beforehand (the user's call, 2026-11-24): ダイエット その7's plans
// under each 区分 (予定, 食べた, 削除), what they come to, 食べる予定を置く (the 区分 to come, the kcal guessed when none is
// given) for today (食事's day goes no later); 食べた puts one in as a record and takes the plan off
process.env.URL0 = process.env.URL0 || "http://localhost:8765/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const DAY = "2026-11-24", T = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const plans = (p) => p.evaluate((P) => (JSON.parse(localStorage.getItem(P + "settings") || "[]").find((x) => x.id === "mealPlans") || {}).list || [], P);
const meals = (p) => p.evaluate((P) => JSON.parse(localStorage.getItem(P + "meals") || "[]"), P);
const card = (p) => p.evaluate(() => document.getElementById("mealSlots").innerText.replace(/\s+/g, " "));
const rows = (p, slot) => p.evaluate((slot) => [...document.querySelectorAll(`#mealSlots .meal-plan-list[aria-label="${slot}の予定"] li`)].map((li) => `${li.querySelector(".meal-plan-name").textContent}|${li.querySelector(".meal-plan-sub").textContent.replace(/\u00a0/g, " ")}`), slot);
const status = (p) => p.evaluate(() => document.getElementById("status").textContent);
const submit = async (p) => { await p.click("#mealSlots .meal-plan-form button[type=submit]"); await p.waitForTimeout(500); };
async function open(b, data, when = `${DAY}T12:00:00+09:00`) {
  const p = await phone(b, new Date(when));
  await seed(p, data, "diet");
  await p.evaluate((P) => localStorage.setItem(P + "dietPart", "meal"), P); await p.reload(); await p.waitForTimeout(1200);
  return p;
}
(async () => {
  const b = await chromium.launch();
  const base = { meals: [{ id: "m1", date: DAY, slot: "朝食", text: "トースト", kcal: 300, at: "07:30", createdAt: T(DAY, "07:30") }, { id: "m0", date: "2026-11-22", slot: "昼食", text: "おにぎり", kcal: 180, createdAt: T("2026-11-22", "12:00") }],
    settings: [{ id: "kcalGoal", target: 2000, updatedAt: 1 }] };
  let p = await open(b, base);
  // nothing planned: 食べる予定を置く only
  ok(!(await p.$("#mealSlots .meal-plan-list")) && await p.isVisible("#mealSlots .meal-plan-open") && !(await p.$("#mealSlots .meal-plan-form")), "nothing planned: 食べる予定を置く only");
  // opened at noon: 夕食, the food's field to type in; 置く keeps it with その7's plans and shows it under 夕食
  await p.click("#mealSlots .meal-plan-open"); await p.waitForTimeout(300);
  ok((await p.inputValue("#mealPlanSlot")) === "夕食" && (await p.evaluate(() => document.activeElement?.id)) === "mealPlanText", "opened: 夕食, the food's field focused");
  await p.fill("#mealPlanText", "サラダチキン"); await p.fill("#mealPlanKcal", "120"); await submit(p);
  let l = await plans(p);
  ok(l.length === 1 && l[0].date === DAY && l[0].slot === "夕食" && l[0].text === "サラダチキン" && l[0].kcal === 120, "置く: kept with the plans", l);
  ok(JSON.stringify(await rows(p, "夕食")) === JSON.stringify(["サラダチキン|予定・120 kcal"]), "under 夕食: 予定・120 kcal", await rows(p, "夕食"));
  ok((await status(p)).includes("きょうの夕食に「サラダチキン」を予定しました"), "said", await status(p));
  // another under 昼食, no kcal: as eaten the last time (180)
  await p.selectOption("#mealPlanSlot", "昼食"); await p.fill("#mealPlanText", "おにぎり"); await submit(p);
  l = await plans(p);
  ok(l.length === 2 && l[1].slot === "昼食" && l[1].text === "おにぎり" && l[1].kcal === 180, "no kcal: as the last time", l[1]);
  // what they come to (300 eaten, 300 planned, against 2,000); the day's own total as it was; the same plans in 食事の予定
  ok(/予定をぜんぶ食べると きょうは 600 kcal・目安まで あと 1,400 kcal/.test(await card(p)), "what they come to", await card(p));
  ok(/300 \/ 2,000 kcal/.test(await p.evaluate(() => document.querySelector("#mealGoalCard .card-head").innerText)), "the day's total: the plans not in it");
  ok((await p.locator("#dt7Plan .dt7-plan-list li").count()) === 2, "the same plans in 食事の予定");
  // 食べた: 昼食 at 12:00, the plan off, 昼食's row has it
  await p.click('#mealSlots .meal-plan-list[aria-label="昼食の予定"] .meal-plan-eat'); await p.waitForTimeout(600);
  const ms = await meals(p);
  ok(ms.some((m) => m.date === DAY && m.slot === "昼食" && m.text === "おにぎり" && m.kcal === 180 && m.at === "12:00") && (await plans(p)).length === 1, "食べた: put in at 12:00, the plan off", ms.map((m) => [m.date, m.slot, m.text, m.at]));
  ok(/昼食 おにぎり 180 kcal/.test(await card(p)) && !(await p.$('#mealSlots .meal-plan-list[aria-label="昼食の予定"]')) && (await status(p)).includes("予定の「おにぎり」を昼食に記録しました"), "昼食 eaten, said", await card(p));
  // 削除 (twice): off
  const del = '#mealSlots .meal-plan-list[aria-label="夕食の予定"] li button:not(.meal-plan-eat)';
  await p.click(del); await p.waitForTimeout(250); await p.click(del); await p.waitForTimeout(500);
  ok(!(await plans(p)).length && !(await p.$("#mealSlots .meal-plan-list")), "削除: off");
  // 閉じる
  await p.click('#mealSlots .meal-plan-form button:has-text("閉じる")'); await p.waitForTimeout(300);
  ok(!(await p.$("#mealSlots .meal-plan-form")) && await p.isVisible("#mealSlots .meal-plan-open"), "閉じる");
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();

  // the day before: its plan left (食べた still), nothing to put in; back to today: 食べる予定を置く again
  p = await open(b, { meals: [], settings: [{ id: "mealPlans", list: [{ id: "a", date: "2026-11-23", slot: "夕食", text: "カレー", kcal: 700 }], updatedAt: 1 }] });
  await p.click('#sec-diet .datenav button:has-text("前日")'); await p.waitForTimeout(600);
  ok(JSON.stringify(await rows(p, "夕食")) === JSON.stringify(["カレー|予定・700 kcal"]) && !!(await p.$("#mealSlots .meal-plan-eat")) && !(await p.$("#mealSlots .meal-plan-open")), "the day before: its plan, 食べた, nothing to put in", await card(p));
  await p.click('#mealSlots .meal-plan-eat'); await p.waitForTimeout(600);
  ok((await meals(p)).some((m) => m.date === "2026-11-23" && m.slot === "夕食" && m.text === "カレー" && m.kcal === 700 && !m.at) && !(await plans(p)).length, "食べた that day: put in on its day, no time", await meals(p));
  await p.click('#sec-diet .datenav button:has-text("翌日")'); await p.waitForTimeout(600);
  ok(await p.isVisible("#mealSlots .meal-plan-open"), "back to today: 食べる予定を置く");
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
