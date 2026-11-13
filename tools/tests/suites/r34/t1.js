// からだ その2 ①〜⑩, through the hook build at 8777 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8777/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const wt = async (p, d) => (await ls(p, "weights")).find((r) => r.id === d);
const status = (p) => p.evaluate(() => [document.getElementById("status")?.textContent || "", document.getElementById("sheetStatus").textContent].join("｜"));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__bd2[f](...a), { f, a });
const WHEN = new Date("2026-11-11T07:40:00+09:00");
const base = () => ({ weights: D.weights(), bodyDays: D.bodyDays(), settings: D.settings() });
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, base(), "weight"); await p.waitForTimeout(1200);

  // ① the last weight (11/10), and a press puts it in, or 0.1 off it
  const last = (await ls(p, "weights")).filter((r) => r.id < "2026-11-11").sort((a, b) => a.id.localeCompare(b.id)).pop();
  ok((await txt(p, "#bd2Quick")).startsWith(`前回 ${last.kg.toFixed(1)} kg（きのう）`), "① the last one, over the buttons", await txt(p, "#bd2Quick"));
  await p.locator("#bd2Quick button", { hasText: "−0.1" }).click(); await p.waitForTimeout(200);
  ok((await p.inputValue("#wtInput")) === (last.kg - 0.1).toFixed(1), "① −0.1 put in", await p.inputValue("#wtInput"));
  await p.locator("#bd2Quick button", { hasText: "同じ" }).click(); await p.waitForTimeout(200);
  ok((await p.inputValue("#wtInput")) === last.kg.toFixed(1), "① 同じ");

  // ② あったこと picked before the day has its weight: kept with 記録する; ⑤ nothing crossed today
  await p.locator("#bd2Tags button", { hasText: "外食" }).click(); await p.waitForTimeout(200);
  ok((await p.getAttribute('#bd2Tags button:has-text("外食")', "aria-pressed")) === "true" && !(await p.$('#bd2Tags button:has-text("生理")')), "② picked; 生理 only for 女性");
  await p.click("#wtSubmit"); await p.waitForTimeout(700);
  let r = await wt(p, "2026-11-11");
  ok(r?.kg === last.kg && JSON.stringify(r.tags) === '["eatout"]', "② saved with the weight", r);
  ok(!(await p.isVisible("#bd2Quick")), "① gone once the day has its own");
  // pressed with the weight there: at once; written again with 更新する, kept
  await p.locator("#bd2Tags button", { hasText: "寝不足" }).click(); await p.waitForTimeout(500);
  ok(JSON.stringify((await wt(p, "2026-11-11")).tags) === '["eatout","short"]', "② at once on a day with its weight");
  await p.fill("#wtInput", (last.kg + 0.1).toFixed(1)); await p.click("#wtSubmit"); await p.waitForTimeout(700);
  ok(JSON.stringify((await wt(p, "2026-11-11")).tags) === '["eatout","short"]', "② kept as the day is written again");
  // what came of them: 飲み会 up, 運動 down
  const eff = await W(p, "effects");
  const drink = eff?.list.find((x) => x.k === "drink"), move = eff?.list.find((x) => x.k === "move");
  ok(drink && move && drink.d > 0.3 && move.d < -0.1 && drink.n >= 4, "② 飲み会 the next day up, 運動した down", eff);
  ok((await txt(p, "#bd2Effects")).includes("飲み会") && (await txt(p, "#bd2Effects")).includes("運動した"), "② said on the page", await txt(p, "#bd2Effects"));

  // ③ 停滞期: two weeks flat after losing, with a goal below
  const pl = await W(p, "plateau");
  ok(!!pl && Math.abs(pl.mid - pl.now) < 0.3 && pl.before - pl.mid >= 0.5, "③ found", pl);
  ok((await txt(p, "#bd2Plateau")).startsWith("停滞期かもしれません"), "③ said, with what helps", await txt(p, "#bd2Plateau"));

  // ④ 体重カレンダー: November, each day's weight, down and up tinted; a day pressed opens it
  const cal = await p.evaluate(() => ({ head: document.querySelector("#bd2Cal .bd2-cal-ym")?.textContent, days: document.querySelectorAll("#bd2Cal .bd2-cal-day:not(.empty)").length, kg: document.querySelectorAll("#bd2Cal .bd2-cal-kg").length, down: document.querySelectorAll("#bd2Cal .bd2-cal-day.down").length, up: document.querySelectorAll("#bd2Cal .bd2-cal-day.up").length }));
  ok(cal.head === "2026年11月" && cal.days === 30 && cal.kg >= 9 && cal.down > 0 && cal.up > 0, "④ the month: days, weights, down and up", cal);
  await p.locator("#bd2Cal button", { hasText: "前の月" }).click().catch(() => p.click('#bd2Cal [aria-label="前の月"]')); await p.waitForTimeout(300);
  ok((await txt(p, "#bd2Cal .bd2-cal-ym")) === "2026年10月", "④ ‹ the month before");
  await p.click('#bd2Cal .bd2-cal-day[aria-label^="10/20"]'); await p.waitForTimeout(500);
  ok((await p.evaluate(() => document.getElementById("wtFormLabel").textContent)).startsWith("10/20"), "④ a day pressed: that day", await p.evaluate(() => document.getElementById("wtFormLabel").textContent));

  // ⑦ 水分: today 400 ml, a cup and a bottle; ⑧ 睡眠: last night 00:30 → 06:30 (6 時間), the week's mean
  await p.evaluate(() => document.querySelector(".datenav button:last-child")?.click());
  await p.goto(process.env.URL0 + "#weight"); await p.reload(); await p.waitForTimeout(1200);
  ok((await txt(p, ".bd2-water-v")) === "400 / 2,000 ml", "⑦ today's water against the aim", await txt(p, ".bd2-water-v"));
  await p.locator("#bd2Daily button", { hasText: "コップ1杯" }).click(); await p.waitForTimeout(400);
  await p.locator("#bd2Daily button", { hasText: "＋500 ml" }).click(); await p.waitForTimeout(400);
  ok((await ls(p, "bodyDays")).find((x) => x.id === "2026-11-11")?.water === 1100 && (await txt(p, ".bd2-water-v")) === "1,100 / 2,000 ml", "⑦ a cup and a bottle: 1,100 ml", await txt(p, ".bd2-water-v"));
  await p.locator("#status button").click(); await p.waitForTimeout(400);
  ok((await ls(p, "bodyDays")).find((x) => x.id === "2026-11-11")?.water === 600, "⑦ 元に戻す");
  await p.selectOption("#bd2WaterGoal", "1500"); await p.waitForTimeout(300);
  ok((await txt(p, ".bd2-water-v")) === "600 / 1,500 ml", "⑦ the aim changed", await txt(p, ".bd2-water-v"));
  ok((await txt(p, ".bd2-sleep-v")).replace(/\s/g, "") === "6時間" && (await txt(p, "#bd2Daily .bd2-sec:last-child .sub")).startsWith("この7日の平均"), "⑧ last night 6 時間, the week's mean", await txt(p, "#bd2Daily .bd2-sec:last-child"));
  await p.fill("#bd2Bed", "23:00"); await p.dispatchEvent("#bd2Bed", "change"); await p.waitForTimeout(400);
  ok((await ls(p, "bodyDays")).find((x) => x.id === "2026-11-11")?.bed === "23:00" && (await txt(p, ".bd2-sleep-v")).replace(/\s/g, "") === "7時間30分", "⑧ a time changed: kept, 7時間30分", await txt(p, ".bd2-sleep-v"));

  // ⑤ 節目: a weight under 67 kg (this year's lowest so far 67.0 and up): 66 kg台
  const q = await phone(b, WHEN, { deviceScaleFactor: 1 });
  q.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) q.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(q, base(), "weight"); await q.waitForTimeout(1000);
  const min = Math.min(...D.weights().map((x) => x.kg));
  await q.fill("#wtInput", (Math.floor(min) - 0.2).toFixed(1)); await q.click("#wtSubmit"); await q.waitForTimeout(800);
  ok((await status(q)).includes(`${Math.floor(min) - 1} kg台に入りました`), "⑤ a new ○○kg台, said with 紙ふぶき", await status(q));

  // ⑥ サイズの目標 from the gear: a line, and how far
  await q.click("#wtSettings"); await q.waitForTimeout(800);
  await q.fill("#bd2SizeGoal-waist", "78"); await q.dispatchEvent("#bd2SizeGoal-waist", "change"); await q.waitForTimeout(400);
  ok((await ls(q, "settings")).find((x) => x.id === "sizeGoals")?.waist === 78, "⑥ kept");
  // ⑨ 週のまとめのお知らせ: on; next Monday's says the week before
  await q.evaluate(() => document.getElementById("bd2WeekOn").scrollIntoView({ block: "center" }));
  await q.click("#bd2WeekOn"); await q.waitForTimeout(400);
  const al = await W(q, "alarms", WHEN.getTime());
  ok(al[0]?.tag === "bd2-week:2026-11-16" && al[0].title.startsWith("先週の体重：平均") && al[0].body.includes("記録"), "⑨ next Monday's", al[0]);
  // ⑩ ほかのアプリから取り込む: three lines, one already recorded, a bad one
  await q.evaluate(() => document.getElementById("bd2ImportText").scrollIntoView({ block: "center" }));
  await q.fill("#bd2ImportText", "日付,体重,体脂肪率\n2026/08/01,70.4,25.1\n2026/08/02,70.2,\n2026-10-20,60.0,20.0\nabc"); await q.waitForTimeout(300);
  ok((await txt(q, "#bd2ImportNote")).startsWith("3 日分（8/1〜10/20）を読みました。うち 1 日はもう記録があり、そのままにします。") && (await txt(q, "#bd2ImportGo")) === "2 日分を取り込む", "⑩ what it read", await txt(q, "#bd2ImportNote"));
  await q.click("#bd2ImportGo"); await q.waitForTimeout(700);
  ok((await wt(q, "2026-08-01"))?.kg === 70.4 && (await wt(q, "2026-08-01")).fat === 25.1 && (await wt(q, "2026-08-02"))?.kg === 70.2 && (await wt(q, "2026-10-20")).kg !== 60, "⑩ put in, the one recorded left as it was");
  await q.locator("#sheetStatus button, #status button").first().click(); await q.waitForTimeout(500);
  ok(!(await wt(q, "2026-08-01")), "⑩ 元に戻す");
  ok(p.errs.length === 0 && q.errs.length === 0, "no errors on the page", [...p.errs, ...q.errs]);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
