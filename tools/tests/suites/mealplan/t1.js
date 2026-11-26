// 食事's 食べる予定 (ダイエット その7's plans). きょうの記録 (the user's call, 2026-11-24): under each 区分 its plans (予定,
// 食べた, 削除) and what they come to. 食べる予定を置く there taken out at the user's call (2026-11-26, tools/REMOVED.md):
// a plan is put in on each 区分's own screen (朝食・昼食・夕食・間食の記録), ○○に食べる予定 — the 区分's plans for the day
// shown (食べた, 削除) and, for today, a food (its kcal guessed when none is given) put in as one of the 区分's
process.env.URL0 = process.env.URL0 || "http://localhost:8765/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const DAY = "2026-11-24", T = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const plans = (p) => p.evaluate((P) => (JSON.parse(localStorage.getItem(P + "settings") || "[]").find((x) => x.id === "mealPlans") || {}).list || [], P);
const meals = (p) => p.evaluate((P) => JSON.parse(localStorage.getItem(P + "meals") || "[]"), P);
const card = (p) => p.evaluate(() => document.getElementById("mealSlots").innerText.replace(/\s+/g, " "));
const rowsIn = (p, box, slot) => p.evaluate(({ box, slot }) => [...document.querySelectorAll(`${box} .meal-plan-list[aria-label="${slot}の予定"] li`)].map((li) => `${li.querySelector(".meal-plan-name").textContent}|${li.querySelector(".meal-plan-sub").textContent.replace(/ /g, " ")}`), { box, slot });
const rows = (p, slot) => rowsIn(p, "#mealSlots", slot);
const recRows = (p, slot) => rowsIn(p, "#mealRecPlan", slot);
const status = (p) => p.evaluate(() => document.getElementById("status").textContent);
const recOpen = (p) => p.evaluate(() => document.getElementById("mealRec").open);
const head = (p) => p.evaluate(() => { const b = document.getElementById("mealRecPlan"); return b.hidden ? null : b.querySelector(".mr-sec-head")?.textContent; });
const formShown = (p) => p.evaluate(() => { const f = document.querySelector("#mealRecPlan .meal-plan-form"); return !!f && !f.hidden && f.offsetHeight > 0; });
const openSlot = async (p, s) => { await p.click(`#mealSlots button[data-slot="${s}"]`); await p.waitForTimeout(500); };
const pickSlot = async (p, s) => { await p.click(`#mealRecSlots button:has-text("${s}")`); await p.waitForTimeout(400); };
const closeRec = async (p) => { await p.click("#mealRecClose"); await p.waitForTimeout(400); };
const put = async (p) => { await p.click('#mealRecPlan .meal-plan-form button[type="submit"]'); await p.waitForTimeout(500); };
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
  // きょうの記録: 食べる予定を置く taken out (2026-11-26): no button, no form, nothing said of it
  ok(!(await p.$("#mealSlots .meal-plan-open")) && !(await p.$("#mealSlots .meal-plan-form")) && !(await p.$("#mealPlanSlot")) && !(await card(p)).includes("食べる予定を置く") && !(await p.$("#mealSlots .meal-plan-list")), "きょうの記録: 食べる予定を置く gone", await card(p));

  // 夕食's screen: 夕食に食べる予定, nothing yet, the form for today; 予定に入れる keeps it with その7's plans
  await openSlot(p, "夕食");
  ok((await recOpen(p)) && (await head(p)) === "夕食に食べる予定" && await formShown(p) && !(await p.$("#mealRecPlan .meal-plan-list")), "夕食's screen: 夕食に食べる予定, the form", await head(p));
  await p.fill("#mealPlanText", "サラダチキン"); await p.fill("#mealPlanKcal", "120"); await put(p);
  let l = await plans(p);
  ok(l.length === 1 && l[0].date === DAY && l[0].slot === "夕食" && l[0].text === "サラダチキン" && l[0].kcal === 120, "予定に入れる: kept with the plans, 夕食's", l);
  ok(JSON.stringify(await recRows(p, "夕食")) === JSON.stringify(["サラダチキン|予定・120 kcal"]) && (await p.inputValue("#mealPlanText")) === "" && (await p.inputValue("#mealPlanKcal")) === "", "on the screen: 予定・120 kcal; the fields emptied", await recRows(p, "夕食"));
  ok((await status(p)).includes("きょうの夕食に「サラダチキン」を予定しました"), "said", await status(p));
  ok(!(await meals(p)).some((m) => m.slot === "夕食") && !(await p.evaluate(() => document.getElementById("mealRecDone").textContent)), "not eaten: nothing in 夕食 yet");

  // what is typed stays as the screen draws again; the 区分 changed on the screen: 昼食's, no kcal: as eaten the last time (180)
  await p.fill("#mealPlanText", "おにぎり");
  await p.evaluate((P) => window.dispatchEvent(new StorageEvent("storage", { key: P + "meals" })), P); await p.waitForTimeout(300);
  ok((await p.inputValue("#mealPlanText")) === "おにぎり", "typed: kept as it draws again");
  await pickSlot(p, "昼食");
  ok((await head(p)) === "昼食に食べる予定" && !(await p.$("#mealRecPlan .meal-plan-list")) && (await p.inputValue("#mealPlanText")) === "おにぎり", "昼食's screen: its own (none yet), the words kept", await head(p));
  await p.press("#mealPlanText", "Enter"); await p.waitForTimeout(500);
  l = await plans(p);
  ok(l.length === 2 && l[1].slot === "昼食" && l[1].text === "おにぎり" && l[1].kcal === 180, "no kcal: as the last time, 昼食's (Enter)", l[1]);
  // 元に戻す takes a plan put in back off
  await pickSlot(p, "間食");
  await p.fill("#mealPlanText", "ゆで卵"); await p.fill("#mealPlanKcal", "80"); await put(p);
  ok((await plans(p)).some((x) => x.slot === "間食" && x.text === "ゆで卵"), "間食's put in");
  await p.locator("#status button").first().click(); await p.waitForTimeout(500);
  ok(!(await plans(p)).some((x) => x.text === "ゆで卵") && !(await p.$("#mealRecPlan .meal-plan-list")), "元に戻す: off again", await plans(p));
  await closeRec(p);

  // きょうの記録: each under its 区分, what they come to (300 eaten, 300 planned, against 2,000); the day's own total as it was
  ok(JSON.stringify(await rows(p, "夕食")) === JSON.stringify(["サラダチキン|予定・120 kcal"]) && JSON.stringify(await rows(p, "昼食")) === JSON.stringify(["おにぎり|予定・180 kcal"]), "きょうの記録: under 夕食 and 昼食", await card(p));
  ok(/予定をぜんぶ食べると きょうは 600 kcal・目安まで あと 1,400 kcal/.test(await card(p)), "what they come to", await card(p));
  ok(/300 \/ 2,000 kcal/.test(await p.evaluate(() => document.querySelector("#mealGoalCard .card-head").innerText)), "the day's total: the plans not in it");
  ok(!(await p.$("#dt7Plan")), "食事の予定's card: none");
  // 食べた in きょうの記録: 昼食 at 12:00, the plan off
  await p.click('#mealSlots .meal-plan-list[aria-label="昼食の予定"] .meal-plan-eat'); await p.waitForTimeout(600);
  let ms = await meals(p);
  ok(ms.some((m) => m.date === DAY && m.slot === "昼食" && m.text === "おにぎり" && m.kcal === 180 && m.at === "12:00") && (await plans(p)).length === 1, "食べた (きょうの記録): put in at 12:00, the plan off", ms.map((m) => [m.date, m.slot, m.text, m.at]));
  ok(/昼食 おにぎり 180 kcal/.test(await card(p)) && !(await p.$('#mealSlots .meal-plan-list[aria-label="昼食の予定"]')) && (await status(p)).includes("予定の「おにぎり」を昼食に記録しました"), "昼食 eaten, said", await card(p));
  // 食べた on 夕食's screen: in 夕食, shown with what the 区分 has, the plan off
  await openSlot(p, "夕食");
  await p.click("#mealRecPlan .meal-plan-eat"); await p.waitForTimeout(600);
  ms = await meals(p);
  ok(ms.some((m) => m.date === DAY && m.slot === "夕食" && m.text === "サラダチキン" && m.kcal === 120 && m.at === "12:00") && !(await plans(p)).length, "食べた (夕食's screen): put in, the plan off", ms.map((m) => [m.slot, m.text]));
  ok(!(await p.$("#mealRecPlan .meal-plan-list")) && /この夕食に入れたもの サラダチキン 120 kcal/.test(await p.evaluate(() => document.getElementById("mealRecDone").innerText.replace(/\s+/g, " "))) && await formShown(p), "the screen: in what 夕食 has; the form still there",
    await p.evaluate(() => document.getElementById("mealRecDone").innerText));
  // 削除 (twice) on the screen
  await p.fill("#mealPlanText", "プリン"); await p.fill("#mealPlanKcal", "150"); await put(p);
  const del = '#mealRecPlan .meal-plan-list li button:not(.meal-plan-eat)';
  await p.click(del); await p.waitForTimeout(250); await p.click(del); await p.waitForTimeout(500);
  ok(!(await plans(p)).length && !(await p.$("#mealRecPlan .meal-plan-list")), "削除 on the screen: off");
  await closeRec(p);
  ok(!(await p.$("#mealSlots .meal-plan-list")) && !(await card(p)).includes("予定をぜんぶ"), "きょうの記録: nothing planned, nothing said");
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();

  // the day before: its plan left (食べた still), on the card and on its 区分's screen, nothing to put in; back to today: the form
  p = await open(b, { meals: [], settings: [{ id: "mealPlans", list: [{ id: "a", date: "2026-11-23", slot: "夕食", text: "カレー", kcal: 700 }], updatedAt: 1 }] });
  await p.click('#sec-diet .datenav button:has-text("前日")'); await p.waitForTimeout(600);
  ok(JSON.stringify(await rows(p, "夕食")) === JSON.stringify(["カレー|予定・700 kcal"]) && !!(await p.$("#mealSlots .meal-plan-eat")) && !(await card(p)).includes("予定をぜんぶ"), "the day before: its plan, 食べた, no sum", await card(p));
  await openSlot(p, "夕食");
  ok((await head(p)) === "夕食に食べる予定" && JSON.stringify(await recRows(p, "夕食")) === JSON.stringify(["カレー|予定・700 kcal"]) && !(await formShown(p)), "its screen: the plan, no form", await head(p));
  await pickSlot(p, "朝食");
  ok((await head(p)) === null, "朝食's that day: nothing planned, nothing shown");
  await pickSlot(p, "夕食");
  await p.click("#mealRecPlan .meal-plan-eat"); await p.waitForTimeout(600);
  ok((await meals(p)).some((m) => m.date === "2026-11-23" && m.slot === "夕食" && m.text === "カレー" && m.kcal === 700 && !m.at) && !(await plans(p)).length && (await head(p)) === null, "食べた that day: put in on its day, no time; the section gone", await meals(p));
  await closeRec(p);
  await p.click('#sec-diet .datenav button:has-text("翌日")'); await p.waitForTimeout(600);
  await openSlot(p, "朝食");
  ok((await head(p)) === "朝食に食べる予定" && await formShown(p), "back to today: the form");
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
