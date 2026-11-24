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
  // ⑩ a mark before its name: Lucide's icon (the user's call, 2026-11-23), named for VoiceOver
  const mk = await p.evaluate(() => { const c = [...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith("11月16日")); const b = c && [...c.querySelectorAll(".bar")].find((x) => x.textContent.endsWith("ゼミ")); const v = b?.querySelector("svg.lc"); return b ? { text: b.textContent, href: v?.querySelector("use")?.getAttribute("href"), name: v?.getAttribute("aria-label"), first: b.firstChild === v || b.firstElementChild === v } : null; });
  ok(mk && mk.text === "ゼミ" && mk.href === "#lc-graduation-cap" && mk.name === "学校", "⑩ the mark before its name in the month: its icon", mk);
  // ① in the gear: one more, a run of days, then deleted
  await p.click("#calSettings"); await p.waitForTimeout(700);
  ok((await txt(p, ".cal7-offs")).includes("創立記念日"), "① listed in the gear");
  await p.fill("#cal7OffName", "学園祭"); await setVal(p, "cal7OffFrom", "2026-11-21"); await setVal(p, "cal7OffTo", "2026-11-23");
  await p.click("#cal7OffAdd"); await p.waitForTimeout(500);
  let offs = (await setting(p, "calendar")).offDays;
  ok(offs.length === 2 && offs[1].name === "学園祭" && offs[1].from === "2026-11-21" && offs[1].to === "2026-11-23", "① 学園祭 put in", offs);
  // ③ the label's 通知アラーム in the gear; ④ the evening before taken out (the user's call, 2026-11-22): not in the gear,
  // and none comes for the ★ plan, its setting kept on from before (data.js) as it was
  ok((await p.inputValue("#cal7LA-l1")) === "30" && (await p.inputValue("#cal7LA-l2")) === "", "③ ゼミ 30分前, 遊び いつもどおり");
  ok(!(await p.$("#cal7StarOn")) && !(await txt(p, "#daySheet")).includes("大事な予定の前の日のお知らせ"), "④ taken out: not in the gear");
  await closeSheet(p);
  c = await cell(p, "11月22日");
  ok(c && c.red && c.hol === "学園祭", "① each of its days red", c);
  al = await p.evaluate(() => window.__cal7.alarms(Date.now()));
  ok(!al.some((a) => a.tag.startsWith("cal-star:")) && (await setting(p, "calendar")).starEve?.on === true, "④ taken out: none the evening before a ★ plan, the setting kept");

  // ⑤ read out
  // ⑤ 読み上げ: taken out at the user's call (2026-11-24, tools/REMOVED.md): not under the day's list
  await openDayOf(p, "11月17日");
  ok(!(await p.$("#cal7Speak")) && !(await p.evaluate(() => document.querySelector("#dayView .label-tools").innerText.includes("読み上げ"))), "⑤ no 読み上げ under the day's list (taken out)");
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
  // ⑩ the picker: the sixteen as Lucide's icons, each named (🍽️ its own, the rest as the stamps)
  const pk = await p.evaluate(() => [...document.querySelectorAll("#planMarks button[data-mark]")].filter((x) => x.dataset.mark).map((x) => [x.dataset.mark, x.querySelector("use")?.getAttribute("href"), x.getAttribute("aria-label"), x.textContent.trim()]));
  ok(pk.length === 16 && pk.every(([, h, , t]) => /^#lc-/.test(h || "") && t === "") && JSON.stringify(pk.find((x) => x[0] === "🍽️")) === JSON.stringify(["🍽️", "#lc-utensils", "アイコン 食事", ""]) && pk.find((x) => x[0] === "🍻")[2] === "アイコン 飲み会", "⑩ the picker: sixteen icons, named", pk.slice(0, 5));
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

  // ⑦ 重なっている予定, in 予定; ⑧ ふりかえり (予定's third view) taken off 2026-11-23, the user's call, with その3 ⑤'s
  // 繰り返し beside it: no 見方 to switch, これから at once, the label chips under the field; the plans' ふりかえり kept,
  // and found by their words
  p = await open();
  await p.click("#calFind"); await p.waitForTimeout(700);
  ok(nos(await txt(p, ".cal7-clash")).includes("面接と歯医者") && nos(await txt(p, ".cal7-clash")).includes("11/17（火）"), "⑦ 面接 runs into 歯医者", await txt(p, ".cal7-clash"));
  const view = await p.evaluate(() => ({
    seg: !!document.querySelector("#cal3FindSeg, .cal3-find-seg"),
    tabs: [...document.querySelectorAll("#findView button")].map((x) => x.textContent.trim()).filter((t) => /^(これから|繰り返し|ふりかえり)$/.test(t)),
    notes: !!document.querySelector(".cal7-notes, .cal7-notes-sum"),
    order: [...document.getElementById("findView").children].filter((x) => !x.hidden).map((x) => x.id || x.className),
  }));
  ok(!view.seg && !view.tabs.length && !view.notes, "⑧ gone: no これから・繰り返し・ふりかえり to switch, no list of ふりかえり", view);
  ok(view.order.join(",") === "rec-search,cal6FindLabels,findList", "the label chips right under the field", view.order);
  ok((await txt(p, "#findList")).includes("これからの予定"), "これから at once");
  const e8 = await ev(p, "e8"), e9 = await ev(p, "e9");
  ok(e8?.notes?.["2026-11-10"]?.text === "楽しかった" && e9?.notes?.["2026-11-12"]?.mood === "bad", "the plans' ふりかえり kept as they were", [e8?.notes, e9?.notes]);
  await p.fill("#findText", "楽しかった"); await p.waitForTimeout(500);
  ok(nos(await txt(p, "#findList")).includes("サークル"), "a ふりかえり's words still find its plan", await txt(p, "#findList"));
  await closeSheet(p);
  // a plan's own 繰り返し stays (the user's call: 予定を追加における繰り返しの機能はそのまま): picked in 新しい予定, kept;
  // in the plan opened, there too
  await p.click("#calAdd"); await p.waitForTimeout(800);
  ok(await p.evaluate(() => { const r = document.getElementById("planRepeat"); return !!r && !!r.offsetParent && [...r.options].some((o) => o.value === "weekly"); }), "新しい予定: 繰り返し still there");
  await p.fill("#planTitle", "英会話"); await p.selectOption("#planRepeat", "weekly");
  await p.click("#planSave"); await p.waitForTimeout(700);
  const eng = (await ls(p, "events")).find((e) => e.title === "英会話");
  ok(eng && eng.repeat === "weekly", "and kept: 毎週", eng);
  await closeSheet(p);
  await openPlan(p, "11月16日", "ゼミ");
  ok(await p.evaluate(() => { const r = document.getElementById("edRepeat"); return !!r && !!r.offsetParent; }), "the plan opened: 繰り返し there too");
  await closeSheet(p);

  ok(!p.errs.length, "no error on the way", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
