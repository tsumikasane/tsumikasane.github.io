// カレンダー その7 ①〜⑩ (on the hooked copy at 8813)
process.env.URL0 = process.env.URL0 || "http://localhost:8813/";
const { chromium } = require("playwright");
const { phone, seed, at, P } = require("./lib");
const { make, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const nos = (s) => String(s || "").replace(/\s+/g, "");
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const ev = async (p, id) => (await ls(p, "events")).find((e) => e.id === id);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id) || null;
const cell = (p, md) => p.evaluate((md) => { const c = [...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith(md)); return c ? { bars: [...c.querySelectorAll(".bar")].map((b) => b.textContent), hol: c.querySelector(".hol")?.textContent || "", red: c.classList.contains("hol") } : null; }, md);
const openDayOf = async (p, md) => { await p.evaluate((md) => [...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith(md)).click(), md); await p.waitForTimeout(700); };
const openPlan = async (p, md, title) => { await openDayOf(p, md); await p.locator("#calDayList .row-btn", { hasText: title }).first().click(); await p.waitForTimeout(700); };
const closeSheet = async (p) => { for (let i = 0; i < 4 && (await p.evaluate(() => document.getElementById("daySheet").open)); i++) { await p.keyboard.press("Escape"); await p.waitForTimeout(700); } };
const setVal = (p, id, v) => p.evaluate(({ id, v }) => { const t = document.getElementById(id); t.value = v; t.dispatchEvent(new Event("input", { bubbles: true })); t.dispatchEvent(new Event("change", { bubbles: true })); }, { id, v });
async function open(data = make(), when = "10:30", day = today) { const p = await phone(b, at(when, day), { deviceScaleFactor: 1 }); await seed(p, data, "calendar"); await p.waitForTimeout(900); return p; }
let b;

(async () => {
  b = await chromium.launch();
  let p = await open();
  ok(!p.errs.length, "the page opens, no error", p.errs);

  // ① a day off of one's own: red with its name, the repeat resting on holidays rests on it too
  let c = await cell(p, "11月18日");
  ok(c && c.red && c.hol === "創立記念日" && !c.bars.includes("英会話"), "① 創立記念日 as a holiday, 英会話 resting", c);
  ok((await cell(p, "11月25日")).bars.includes("英会話"), "① the other turns as they were");
  let al = await p.evaluate(() => window.__cal7.alarms(Date.now()));
  // ⑩ a mark before its name
  ok((await cell(p, "11月16日")).bars.includes("🎓ゼミ"), "⑩ the mark before its name in the month", await cell(p, "11月16日"));
  // ① in the gear: one more, a run of days, then deleted
  await p.click("#calSettings"); await p.waitForTimeout(700);
  ok((await txt(p, ".cal7-offs")).includes("創立記念日"), "① listed in the gear");
  await p.fill("#cal7OffName", "学園祭"); await setVal(p, "cal7OffFrom", "2026-11-21"); await setVal(p, "cal7OffTo", "2026-11-23");
  await p.click("#cal7OffAdd"); await p.waitForTimeout(500);
  let offs = (await setting(p, "calendar")).offDays;
  ok(offs.length === 2 && offs[1].name === "学園祭" && offs[1].from === "2026-11-21" && offs[1].to === "2026-11-23", "① 学園祭 put in", offs);
  // ③ the label's 通知アラーム, ④ the evening before, in the gear
  ok((await p.inputValue("#cal7LA-l1")) === "30" && (await p.inputValue("#cal7LA-l2")) === "", "③ ゼミ 30分前, 遊び いつもどおり");
  await p.click("#cal7StarOn"); await p.waitForTimeout(500);
  ok((await setting(p, "calendar")).starEve?.on === true, "④ turned on");
  await closeSheet(p);
  c = await cell(p, "11月22日");
  ok(c && c.red && c.hol === "学園祭", "① each of its days red", c);
  al = await p.evaluate(() => window.__cal7.alarms(Date.now()));
  const star = al.find((a) => a.tag === "cal-star:e1:2026-11-17");
  ok(star && star.title === "あしたは大事な予定：面接" && new Date(star.at).toISOString() === "2026-11-16T11:00:00.000Z" && star.body.includes("14:00から・〇〇ビル") && star.body.includes("履歴書") && !star.body.includes("印鑑"), "④ the evening before, with what is still to take", star);
  ok(!al.some((a) => a.tag.startsWith("cal-star:e2")), "④ not for a plan that isn't ★");

  // ⑤ read out
  const say = await p.evaluate(() => window.__cal7.speech("2026-11-17"));
  ok(say === "11月17日火曜日の予定は 2 件です。14時から15時まで、面接、場所は〇〇ビル。14時30分から15時まで、歯医者。", "⑤ what is read out", say);
  ok((await p.evaluate(() => window.__cal7.speech("2026-11-19"))) === "11月19日木曜日の予定はありません。", "⑤ a day with none");
  await openDayOf(p, "11月17日");
  ok(await p.isVisible("#cal7Speak"), "⑤ 読み上げ under the day's list");
  // ⑨ the month's plans as words (shared)
  await p.evaluate(() => { window.__shared = null; navigator.share = (d) => { window.__shared = d; return Promise.resolve(); }; });
  await p.click("#dayShare"); await p.waitForTimeout(200);
  await p.click('#dayShareBox [data-share="month"]'); await p.waitForTimeout(400);
  const shared = await p.evaluate(() => window.__shared);
  ok(shared && shared.title === "2026年11月の予定" && shared.text.includes("11月17日（火）") && shared.text.includes("14:00〜15:00 面接") && shared.text.includes("11月4日（水）"), "⑨ この月の予定", shared);
  await closeSheet(p);

  // ② 次回を入れる at the usual gap
  await p.evaluate(() => document.getElementById("calPrev").click()); await p.waitForTimeout(600);
  await openPlan(p, "10月24日", "美容院");
  const nx = nos(await txt(p, ".cal7-next"));
  ok(nx.includes("いつもの6週間後") && nx.includes("12/5（土）") && nx.includes("1週間後11/21（土）"), "② the usual gap, and a week on from today", nx);
  await p.click('.cal7-next [data-k="next-usual"]'); await p.waitForTimeout(700);
  ok((await p.inputValue("#planTitle")) === "美容院" && (await p.inputValue("#planDate")) === "2026-12-05" && (await p.inputValue("#planTime")) === "14:00" && (await p.inputValue("#planPlace")) === "駅前の美容院", "② a new plan as it was, on 12/5");
  await p.click("#planSave"); await p.waitForTimeout(700);
  ok((await ls(p, "events")).some((e) => e.title === "美容院" && e.date === "2026-12-05"), "② added");
  await closeSheet(p);
  await openPlan(p, "10月24日", "美容院");
  ok(await p.evaluate(() => !document.querySelector(".cal7-next")), "② not once there is a next one");
  await closeSheet(p);
  await p.evaluate(() => document.getElementById("calNext").click()); await p.waitForTimeout(600);

  // ③ a label picked: its 通知アラーム; ⑥ a set put in and kept; ⑩ a mark picked
  await p.click("#calAdd"); await p.waitForTimeout(700);
  await p.fill("#planTitle", "ゼミ合宿");
  await setVal(p, "planTime", "13:00"); await p.waitForTimeout(150);
  const before = await txt(p, "#planAlarmText");
  await p.locator("#planLabels label", { hasText: "ゼミ" }).click(); await p.waitForTimeout(300);
  ok((await txt(p, "#planAlarmText")) === "30分前", "③ ゼミ picked: 30分前", [before, await txt(p, "#planAlarmText")]);
  await p.locator("#planLabels label", { hasText: "なし" }).click(); await p.waitForTimeout(300);
  ok((await txt(p, "#planAlarmText")) === before, "③ back to いつも for no label", await txt(p, "#planAlarmText"));
  await p.locator("#planLabels label", { hasText: "ゼミ" }).click(); await p.waitForTimeout(300);
  await p.locator("#planSets .chip-btn", { hasText: "旅行" }).click(); await p.waitForTimeout(300);
  let items = await p.evaluate(() => [...document.querySelectorAll("#planChecks .td-step-name")].map((x) => x.value));
  ok(items.join() === "充電器,歯ブラシ", "⑥ 旅行's items put in", items);
  await p.locator("#planSets .chip-btn", { hasText: "旅行" }).click(); await p.waitForTimeout(300);
  items = await p.evaluate(() => [...document.querySelectorAll("#planChecks .td-step-name")].map((x) => x.value));
  ok(items.length === 2, "⑥ not twice", items);
  await p.click("#planChecks > .link-btn"); await p.keyboard.type("寝袋"); await p.waitForTimeout(150);
  await p.click("#planSets .cal7-sets-edit"); await p.waitForTimeout(200);
  await p.fill("#planSetName", "合宿"); await p.click('#planSets [data-k="set-save"]'); await p.waitForTimeout(400);
  const sets = (await setting(p, "calendar")).checkSets;
  ok(sets.length === 2 && sets[1].name === "合宿" && sets[1].items.join() === "充電器,歯ブラシ,寝袋", "⑥ the list kept as 合宿", sets);
  await p.click('#planMarks [data-mark="🍻"]'); await p.waitForTimeout(150);
  await p.click("#planSave"); await p.waitForTimeout(700);
  const made = (await ls(p, "events")).find((e) => e.title === "ゼミ合宿");
  ok(made && made.labelId === "l1" && JSON.stringify(made.alarms) === "[30]" && made.mark === "🍻" && made.checks?.length === 3, "③⑥⑩ saved with them", made);
  await closeSheet(p);
  // ⑩ taken off in the plan opened
  await openPlan(p, "11月16日", "ゼミ");
  ok((await p.getAttribute('#edMarks [data-mark="🎓"]', "aria-pressed")) === "true", "⑩ the mark picked in the form");
  await p.click('#edMarks [data-mark=""]'); await p.click("#sheetSave"); await p.waitForTimeout(700);
  ok(!(await ev(p, "e7")).mark, "⑩ taken off");
  await closeSheet(p);

  // ⑦ 重なっている予定 and ⑧ ふりかえり, in 予定
  p = await open();
  await p.click("#calFind"); await p.waitForTimeout(700);
  ok(nos(await txt(p, ".cal7-clash")).includes("面接と歯医者") && nos(await txt(p, ".cal7-clash")).includes("11/17（火）"), "⑦ 面接 runs into 歯医者", await txt(p, ".cal7-clash"));
  await p.click('#cal3FindSeg [data-k="notes"]'); await p.waitForTimeout(400);
  const notes = await p.evaluate(() => [...document.querySelectorAll(".cal7-notes li")].map((x) => x.innerText.replace(/\s+/g, "")));
  ok(notes.length === 2 && notes[0].includes("発表") && notes[0].includes("いまいち") && notes[1].includes("サークル") && notes[1].includes("楽しかった"), "⑧ the latest first", notes);
  ok(nos(await txt(p, ".cal7-notes-sum")) === "この3か月：よかった1・ふつう0・いまいち1", "⑧ counted", await txt(p, ".cal7-notes-sum"));
  ok((await p.getAttribute('#cal3FindSeg [data-k="notes"]', "aria-pressed")) === "true" && (await p.getAttribute('#cal3FindSeg [data-k="coming"]', "aria-pressed")) === "false", "⑧ its button pressed");
  await p.click('#cal3FindSeg [data-k="coming"]'); await p.waitForTimeout(400);
  ok((await p.getAttribute('#cal3FindSeg [data-k="notes"]', "aria-pressed")) === "false" && (await txt(p, "#findList")).includes("これからの予定"), "⑧ これから again");
  await p.click('#cal3FindSeg [data-k="rep"]'); await p.waitForTimeout(400);
  ok((await p.getAttribute('#cal3FindSeg [data-k="rep"]', "aria-pressed")) === "true" && (await p.getAttribute('#cal3FindSeg [data-k="notes"]', "aria-pressed")) === "false", "⑧ 繰り返しの予定 as it was");
  await closeSheet(p);

  ok(!p.errs.length, "no error on the way", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
