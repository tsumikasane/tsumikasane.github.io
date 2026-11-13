// からだ その2: the edges — a page with nothing yet (水分 back to none, 睡眠 half put in and emptied), あったこと kept for a
// day while another is looked at and taken off, 生理, 停滞期 not said, the calendar's months, the 節目 not said twice nor
// for a past day, サイズの目標's line and emptied, 水分 on a past day, the week's notification on and off, and CSV in
// other shapes, written over and taken back
process.env.URL0 = process.env.URL0 || "http://localhost:8777/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const wt = async (p, d) => (await ls(p, "weights")).find((r) => r.id === d);
const bday = async (p, d) => (await ls(p, "bodyDays")).find((x) => x.id === d);
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const status = (p) => p.evaluate(() => [document.getElementById("status")?.textContent || "", document.getElementById("sheetStatus").textContent].join("｜"));
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__bd2[f](...a), { f, a });
const prev = (p) => p.evaluate(() => document.querySelectorAll("#sec-diet .datenav .navbtn")[0].click());
const next = (p) => p.evaluate(() => document.querySelectorAll("#sec-diet .datenav .navbtn")[1].click());
const goDay = (p, d) => p.evaluate((d) => { const f = document.querySelector("#sec-diet .datenav input[type=date]"); f.value = d; f.dispatchEvent(new Event("change", { bubbles: true })); }, d);
const setTime = async (p, sel, v) => { await p.fill(sel, v); await p.dispatchEvent(sel, "change"); await p.waitForTimeout(300); };
const WHEN = new Date("2026-11-11T07:40:00+09:00");
const base = () => ({ weights: D.weights(), bodyDays: D.bodyDays(), settings: D.settings() });
(async () => {
  const b = await chromium.launch();
  const mk = async () => { const p = await phone(b, WHEN, { deviceScaleFactor: 1 }); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); }); return p; };

  // ---- nothing recorded yet: only 水分・睡眠 shows
  const e = await mk();
  await seed(e, {}, "weight"); await e.waitForTimeout(900);
  const vis = await e.evaluate(() => ["bd2Quick", "bd2Effects", "bd2Plateau", "bd2Cal", "bd2Daily"].map((id) => { const x = document.getElementById(id); return !x.hidden && x.offsetHeight > 0; }));
  ok(JSON.stringify(vis) === "[false,false,false,false,true]", "nothing yet: only 水分・睡眠", vis);
  ok((await txt(e, ".bd2-water-v")) === "0 / 2,000 ml" && (await txt(e, ".bd2-sleep-v")) === "—" && (await txt(e, ".bd2-sleep-note")).startsWith("きょうの朝までの夜です。"), "nothing yet: 0 ml, no sleep",
    [await txt(e, ".bd2-water-v"), await txt(e, ".bd2-sleep-v"), await txt(e, ".bd2-sleep-note")]);
  ok(!(await e.isVisible("#bd2Daily .bd2-less")) && !(await e.$('#bd2Tags button:has-text("生理")')), "nothing yet: no −200; no 生理 without 女性");
  // ⑦ a cup, then back to none: the day's gone, and not into 最近削除した項目
  await e.locator("#bd2Daily button", { hasText: "コップ1杯" }).click(); await e.waitForTimeout(400);
  ok((await bday(e, "2026-11-11"))?.water === 200 && (await e.isVisible("#bd2Daily .bd2-less")), "⑦ a cup on a day with nothing");
  await e.click("#bd2Daily .bd2-less"); await e.waitForTimeout(400);
  const tomb = (await ls(e, "deleted")).find((t) => t.id === "bodyDays/2026-11-11");
  ok(!(await bday(e, "2026-11-11")) && tomb && !tomb.data && !(await e.isVisible("#bd2Daily .bd2-less")), "⑦ back to none: gone, nothing in 最近削除した項目", tomb);
  // ⑧ 寝た only: kept, no length; under an hour: none; over midnight; both emptied: gone
  await setTime(e, "#bd2Bed", "23:30");
  ok((await bday(e, "2026-11-11"))?.bed === "23:30" && (await txt(e, ".bd2-sleep-v")) === "—", "⑧ 寝た only: kept, no length yet");
  await setTime(e, "#bd2Wake", "00:10");
  ok((await txt(e, ".bd2-sleep-v")) === "—", "⑧ under an hour: not counted", await txt(e, ".bd2-sleep-v"));
  await setTime(e, "#bd2Wake", "07:15");
  ok((await txt(e, ".bd2-sleep-v")).replace(/\s/g, "") === "7時間45分", "⑧ over midnight: 7時間45分", await txt(e, ".bd2-sleep-v"));
  await setTime(e, "#bd2Bed", ""); await setTime(e, "#bd2Wake", "");
  ok(!(await bday(e, "2026-11-11")), "⑧ both emptied: the day's gone", await bday(e, "2026-11-11"));
  // ⑤ no goal: a first weight crosses nothing; ① then hidden
  await e.fill("#wtInput", "70.0"); await e.click("#wtSubmit"); await e.waitForTimeout(800);
  ok((await wt(e, "2026-11-11"))?.kg === 70 && !/kg台|半分|届きました/.test(await status(e)) && !(await e.isVisible("#bd2Quick")), "⑤ a first weight, no goal: nothing said", await status(e));
  ok(await e.isVisible("#bd2Cal") && !(await e.isVisible("#bd2Effects")), "④ one weight: the calendar; ② too few for the next day");

  // ---- あったこと: picked for a day without its weight, kept while another is looked at; on and off on a day with one; 生理
  const p = await mk();
  await seed(p, { ...base(), settings: [...D.settings().filter((x) => x.id !== "body"), { id: "body", height: 160, age: 25, sex: "f", updatedAt: D.T("2026-09-20") }] }, "weight"); await p.waitForTimeout(1000);
  ok(!!(await p.$('#bd2Tags button:has-text("生理")')), "② 生理 for 女性");
  await p.locator("#bd2Tags button", { hasText: "むくみ" }).click(); await p.waitForTimeout(200);
  await prev(p); await p.waitForTimeout(400);
  ok((await p.getAttribute('#bd2Tags button:has-text("むくみ")', "aria-pressed")) === "false", "② the day before: its own");
  await next(p); await p.waitForTimeout(400);
  ok((await p.getAttribute('#bd2Tags button:has-text("むくみ")', "aria-pressed")) === "true", "② back: still picked");
  await p.fill("#wtInput", "67.0"); await p.click("#wtSubmit"); await p.waitForTimeout(700);
  ok(JSON.stringify((await wt(p, "2026-11-11"))?.tags) === '["swell"]', "② saved with the weight", await wt(p, "2026-11-11"));
  await prev(p); await p.waitForTimeout(400);
  await p.locator("#bd2Tags button", { hasText: "塩分多め" }).click(); await p.waitForTimeout(400);
  ok(JSON.stringify((await wt(p, "2026-11-10"))?.tags) === '["salty"]', "② on, on a day with its weight");
  await p.locator("#bd2Tags button", { hasText: "塩分多め" }).click(); await p.waitForTimeout(400);
  const r10 = await wt(p, "2026-11-10");
  ok(!("tags" in r10) && r10.kg === 67.2, "② off: none kept, the rest as it was", r10);
  // ⑦ a past day's 水分, its own; the words say which day
  ok((await txt(p, ".bd2-water-v")) === "1,600 / 2,000 ml", "⑦ the day before: its own", await txt(p, ".bd2-water-v"));
  await p.locator("#bd2Daily button", { hasText: "コップ1杯" }).click(); await p.waitForTimeout(400);
  ok((await bday(p, "2026-11-10"))?.water === 1800 && (await status(p)).startsWith("水分 200 ml を足しました（きのう 1,800 ml）"), "⑦ a cup, the day before", await status(p));

  // ---- 停滞期 not said: no goal, a goal above, nothing this last week
  const q = await mk();
  for (const [what, data] of [["no goal", { ...base(), settings: D.settings().filter((x) => x.id !== "weight") }],
    ["a goal above", { ...base(), settings: [...D.settings().filter((x) => x.id !== "weight"), { id: "weight", target: 70, updatedAt: D.T("2026-09-20") }] }],
    ["nothing for 8 days", { ...base(), weights: D.weights().filter((r) => r.id <= "2026-11-03") }]]) {
    await seed(q, data, "weight"); await q.waitForTimeout(800);
    ok(!(await q.isVisible("#bd2Plateau")) && (await W(q, "plateau")) === null, `③ not said: ${what}`);
  }

  // ---- the calendar: no month after this one, days to come not pressed, a day without; September; the day's month again
  await seed(q, base(), "weight"); await q.waitForTimeout(900);
  ok(await q.isDisabled('#bd2Cal [aria-label="次の月"]'), "④ no month after this one");
  ok(await q.isDisabled('#bd2Cal .bd2-cal-day[aria-label^="11/12（"]'), "④ a day to come can't be pressed");
  ok((await q.getAttribute('#bd2Cal .bd2-cal-day[aria-label^="11/2（"]', "aria-label")).endsWith("記録なし"), "④ a day without: 記録なし");
  await q.click('#bd2Cal [aria-label="前の月"]'); await q.waitForTimeout(200); await q.click('#bd2Cal [aria-label="前の月"]'); await q.waitForTimeout(200);
  ok((await txt(q, "#bd2Cal .bd2-cal-ym")) === "2026年9月" && (await txt(q, "#bd2Cal .sub")).startsWith("この月は 7 日記録"), "④ September: 7 days", await txt(q, "#bd2Cal .sub"));
  await prev(q); await q.waitForTimeout(400);
  ok((await txt(q, "#bd2Cal .bd2-cal-ym")) === "2026年11月", "④ the day moved from the dates: its month again", await txt(q, "#bd2Cal .bd2-cal-ym"));
  await next(q); await q.waitForTimeout(400);

  // ---- 節目: 66.2 (this year has 66 kg台 already, short of half): nothing; 65.6: half way and 65 kg台; 65.5 written again:
  // not again; a past day: nothing; 61.9: the goal
  await q.fill("#wtInput", "66.2"); await q.click("#wtSubmit"); await q.waitForTimeout(800);
  ok(!/kg台|半分|届きました/.test(await status(q)), "⑤ 66.2: nothing", await status(q));
  await q.fill("#wtInput", "65.6"); await q.click("#wtSubmit"); await q.waitForTimeout(800);
  let s = await status(q);
  ok(s.includes("目標まで半分のところまで来ました（69.4 → 62.0 kg）") && s.includes("65 kg台に入りました（この1年でいちばん軽い）"), "⑤ 65.6: half way, and 65 kg台", s);
  await q.evaluate(() => { document.getElementById("status").textContent = ""; });
  await q.fill("#wtInput", "65.5"); await q.click("#wtSubmit"); await q.waitForTimeout(800);
  ok(!/kg台|半分/.test(await status(q)), "⑤ 65.5, the day again: not said twice", await status(q));
  await goDay(q, "2026-11-02"); await q.waitForTimeout(500);
  await q.fill("#wtInput", "61.0"); await q.click("#wtSubmit"); await q.waitForTimeout(800);
  ok((await wt(q, "2026-11-02"))?.kg === 61 && !/届きました|kg台/.test(await status(q)) && (await W(q, "miles")).reached === false, "⑤ a past day: not said", await status(q));
  await goDay(q, "2026-11-11"); await q.waitForTimeout(500);
  await q.fill("#wtInput", "61.9"); await q.click("#wtSubmit"); await q.waitForTimeout(800);
  ok((await status(q)).includes("目標の 62.0 kg に届きました！") && (await W(q, "miles")).reached === true, "⑤ the goal reached", await status(q));

  // ---- サイズの目標: 78 kept and 5 not; under the plot, its line; ヒップ has none; emptied: gone
  await q.click("#wtSettings"); await q.waitForTimeout(800);
  await q.fill("#bd2SizeGoal-waist", "78"); await q.dispatchEvent("#bd2SizeGoal-waist", "change"); await q.waitForTimeout(300);
  await q.fill("#bd2SizeGoal-hip", "5"); await q.dispatchEvent("#bd2SizeGoal-hip", "change"); await q.waitForTimeout(300);
  const sg = (await ls(q, "settings")).find((x) => x.id === "sizeGoals");
  ok(sg?.waist === 78 && !("hip" in sg) && (await q.inputValue("#bd2SizeGoal-hip")) === "", "⑥ 78 kept, 5 not (its field back to empty)", [sg, await q.inputValue("#bd2SizeGoal-hip")]);
  await q.click("#sheetDone"); await q.waitForTimeout(700);
  const line = () => q.$$eval("#sizeChart line.target", (x) => x.length);
  ok((await txt(q, "#sizeNote")).includes("目標 78.0 cm まで、あと 3.9 cm") && (await line()) === 1, "⑥ under the plot, and its line", [await txt(q, "#sizeNote"), await line()]);
  await q.locator("#sizePick button", { hasText: "ヒップ" }).click(); await q.waitForTimeout(300);
  ok(!(await txt(q, "#sizeNote")).includes("目標") && (await line()) === 0, "⑥ ヒップ: no goal, no line", await txt(q, "#sizeNote"));
  await q.click("#wtSettings"); await q.waitForTimeout(800);
  await q.fill("#bd2SizeGoal-waist", ""); await q.dispatchEvent("#bd2SizeGoal-waist", "change"); await q.waitForTimeout(300);
  ok(!(await ls(q, "settings")).find((x) => x.id === "sizeGoals"), "⑥ emptied: gone");

  // ---- 週のまとめ: off, none; on at 21:30: only the Monday whose week has 2 and more, and the signature carries it; off again
  ok((await W(q, "alarms", WHEN.getTime())).length === 0, "⑨ off: none");
  const sig0 = await W(q, "sig");
  await q.evaluate(() => document.getElementById("bd2WeekOn").scrollIntoView({ block: "center" }));
  ok(await q.isDisabled("#bd2WeekAt"), "⑨ off: its time can't be set");
  await q.click("#bd2WeekOn"); await q.waitForTimeout(300);
  await setTime(q, "#bd2WeekAt", "21:30");
  const al = await W(q, "alarms", WHEN.getTime());
  ok(al.length === 1 && al[0].tag === "bd2-week:2026-11-16" && new Date(al[0].at).toISOString() === "2026-11-16T12:30:00.000Z" && al[0].body.startsWith("11/9〜11/15・記録 3 日"), "⑨ on: 11/16 21:30, the week before's", al);
  ok((await W(q, "sig")) !== sig0, "⑨ on: what's sent changes");
  await q.click("#bd2WeekOn"); await q.waitForTimeout(300);
  ok((await W(q, "alarms", WHEN.getTime())).length === 0 && (await W(q, "sig")) === sig0, "⑨ off again: none, what's sent as before");

  // ---- CSV: lines it can't read only; then other shapes (年月日, tabs, ; and ., quoted with a time, kg and %), a day twice
  // (the last stands), a weight out of range, a day to come, no such day; written over and taken back
  await q.evaluate(() => document.getElementById("bd2ImportText").scrollIntoView({ block: "center" }));
  await q.fill("#bd2ImportText", "abc 1\nxyz 2"); await q.waitForTimeout(200);
  ok((await txt(q, "#bd2ImportNote")).startsWith("読めない行が 2 行あります。") && (await q.isDisabled("#bd2ImportGo")), "⑩ nothing it can read", await txt(q, "#bd2ImportNote"));
  await q.fill("#bd2ImportText", ["日付\t体重\t体脂肪率", "2026年8月1日,70.4", "2026-08-03\t70.1\t25.0", "2026.08.04;70.0", "\"2026-08-05 07:30\",\"69.9\",\"24.8\"",
    "2026/08/07, 69.5 kg, 24.6 %", "2026-08-03,70.3", "2026-08-06,500", "2026-12-01,65.0", "2026-02-30,65.0", "2026-10-20,60.0,20.0"].join("\n"));
  await q.check("#bd2ImportOver"); await q.waitForTimeout(300);
  ok((await txt(q, "#bd2ImportNote")) === "6 日分（8/1〜10/20）を読みました。うち 1 日はもう記録があり、上書きします。読めない行 3 行はとばします。" && (await txt(q, "#bd2ImportGo")) === "6 日分を取り込む",
    "⑩ what it read, written over", await txt(q, "#bd2ImportNote"));
  const before = await wt(q, "2026-10-20");
  await q.click("#bd2ImportGo"); await q.waitForTimeout(800);
  const got = await Promise.all(["2026-08-01", "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-07", "2026-10-20"].map((d) => wt(q, d)));
  ok(got.map((r) => r && `${r.kg}/${r.fat ?? "-"}`).join(" ") === "70.4/- 70.3/- 70/- 69.9/24.8 69.5/24.6 60/20", "⑩ put in, the last of a day standing, 10/20 written over", got.map((r) => r && `${r.kg}/${r.fat ?? "-"}`));
  ok((await q.inputValue("#bd2ImportText")) === "" && (await txt(q, "#bd2ImportNote")).startsWith("日付・体重（・体脂肪率）を1日1行で"), "⑩ the box emptied");
  await q.locator("#sheetStatus button, #status button").first().click(); await q.waitForTimeout(600);
  const back = await wt(q, "2026-10-20");
  ok(!(await wt(q, "2026-08-01")) && !(await wt(q, "2026-08-07")) && back?.kg === before.kg && back.fat === before.fat, "⑩ 元に戻す: 10/20 as it was, the rest gone", back);

  // a year of lines at once: in one go, quick; 元に戻す takes them all back
  const lines = [];
  for (let i = 0; i < 300; i++) lines.push(`${new Date(Date.UTC(2025, 8, 1 + i)).toISOString().slice(0, 10)},${(72 - i * 0.01).toFixed(1)}`);
  const n0 = (await ls(q, "weights")).length;
  await q.fill("#bd2ImportText", lines.join("\n")); await q.waitForTimeout(300);
  ok((await txt(q, "#bd2ImportGo")) === "300 日分を取り込む", "⑩ 300 lines read", await txt(q, "#bd2ImportGo"));
  const t0 = Date.now(); await q.click("#bd2ImportGo");
  await q.waitForFunction(({ P, n }) => JSON.parse(localStorage.getItem(P + "weights") || "[]").length >= n, { P, n: n0 + 300 }, { timeout: 15000 });
  const took = Date.now() - t0;
  ok(took < 3000, `⑩ 300 days in one go (${took} ms)`);
  await q.locator("#sheetStatus button, #status button").first().click(); await q.waitForTimeout(800);
  ok((await ls(q, "weights")).length === n0, "⑩ 元に戻す: all 300 gone", (await ls(q, "weights")).length - n0);
  // a day deleted, then put in from CSV: in again, and the deleted one stays in 最近削除した項目, apart from the day
  await q.click("#sheetDone"); await q.waitForTimeout(500);
  await goDay(q, "2026-10-21"); await q.waitForTimeout(500);
  await q.evaluate(() => document.getElementById("wtDelete").scrollIntoView({ block: "center" }));
  await q.click("#wtDelete"); await q.waitForTimeout(200); await q.click("#wtDelete"); await q.waitForTimeout(600);
  ok(!(await wt(q, "2026-10-21")), "⑩ (10/21 deleted first)");
  await q.click("#wtSettings"); await q.waitForTimeout(800);
  await q.evaluate(() => document.getElementById("bd2ImportText").scrollIntoView({ block: "center" }));
  await q.fill("#bd2ImportText", "2026-10-21,66.0"); await q.waitForTimeout(200);
  await q.click("#bd2ImportGo"); await q.waitForTimeout(700);
  const dels = (await ls(q, "deleted")).filter((t) => t.id.startsWith("weights/2026-10-21"));
  ok((await wt(q, "2026-10-21"))?.kg === 66 && dels.length === 1 && dels[0].id.startsWith("weights/2026-10-21#") && !!dels[0].data, "⑩ a deleted day put in: in, the deleted one kept apart", dels.map((t) => t.id));

  ok([e, p, q].every((x) => !x.errs.length), "no errors on the pages", [...e.errs, ...p.errs, ...q.errs]);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
