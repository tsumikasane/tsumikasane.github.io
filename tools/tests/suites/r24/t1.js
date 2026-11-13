// カレンダー その2 ①〜⑩ (on the hooked copy at 8772)
process.env.URL0 = process.env.URL0 || "http://localhost:8772/";
const { chromium } = require("playwright");
const { phone, seed, at, P, URL0 } = require("./lib");
const { make, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const ev = async (p, id) => (await ls(p, "events")).find((e) => e.id === id);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id) || null;
const openDayOf = async (p, md) => { await p.evaluate((md) => [...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith(md)).click(), md); await p.waitForTimeout(700); };
const openPlan = async (p, md, title) => { await openDayOf(p, md); await p.locator("#calDayList .row-btn", { hasText: title }).first().click(); await p.waitForTimeout(700); };
const view = async (p, v) => { await p.click(`#calViews button[data-view="${v}"]`); await p.waitForTimeout(500); };
const undo = async (p) => { await p.locator(".toast.show button", { hasText: "元に戻す" }).first().click(); await p.waitForTimeout(500); };
const alarms = (p) => p.evaluate(() => window.__cal.alarms(Date.now()).map((a) => ({ ...a, when: new Date(a.at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) })));
const setTime = (p, id, v) => p.evaluate(({ id, v }) => { const t = document.getElementById(id); t.value = v; t.dispatchEvent(new Event("change", { bubbles: true })); }, { id, v });
async function open(data = make(), when = "10:00", day = today, hash = "calendar") { const p = await phone(b, at(when, day), { deviceScaleFactor: 1 }); await seed(p, data, hash); await p.waitForTimeout(900); return p; }
let b;

(async () => {
  b = await chromium.launch();
  let p = await open();
  ok(!p.errs.length, "the page opens, no error", p.errs);

  // ① what runs into what
  let c = await p.evaluate(() => window.__cal.clashes("2026-11-12", 14 * 60, 15 * 60, "e2"));
  ok(c.length === 1 && c[0].name === "歯医者", "① 面接 runs into 歯医者", c);
  c = await p.evaluate(() => window.__cal.clashes("2026-11-12", 16 * 60 + 30, 17 * 60 + 30, null));
  ok(c.length === 1 && c[0].name === "バイト", "① a shift counts", c);
  c = await p.evaluate(() => window.__cal.clashes("2026-11-13", 19 * 60, 20 * 60, null));
  ok(c.length === 1 && c[0].name === "飲み会（仮）", "① a 仮 one counts, said so", c);
  // the new plan's form: 14:30 on 11/12, then 16:00
  await openDayOf(p, "11月12日");
  await p.click("#dayAdd"); await p.waitForTimeout(700);
  await p.fill("#planTitle", "打ち合わせ");
  await setTime(p, "planTime", "14:30"); await p.waitForTimeout(200);
  ok((await txt(p, "#planClash")) === "14:00〜15:00の「面接」ほか1件と重なっています", "① the form says what the time runs into", await txt(p, "#planClash"));
  await setTime(p, "planTime", "16:00"); await p.waitForTimeout(200);
  ok(await p.isHidden("#planClash") && (await p.inputValue("#planEndTime")) === "17:00", "① 16:00〜17:00: nothing said (バイト from 17:00)");
  // ② 移動時間, ⑨ the list, ④ 仮 with one more day
  await p.selectOption("#planTravel", "30"); await p.waitForTimeout(150);
  ok((await txt(p, "#planTravelFoot")) === "15:30 に出発", "② the time to leave under it", await txt(p, "#planTravelFoot"));
  await p.click("#planChecks > .link-btn"); await p.keyboard.type("資料"); await p.keyboard.press("Enter"); await p.keyboard.type("ノートPC"); await p.waitForTimeout(150);
  await p.check("#planTen"); await p.waitForTimeout(200);
  ok(await p.isVisible("#planCands") && (await p.locator("#planCandList li").count()) === 1 && (await p.inputValue("#planCandList .cand-date")) === "2026-11-13" && (await p.inputValue("#planCandList .cand-time")) === "16:00", "④ 仮の予定: one more day made, the next day at the same time");
  await p.click("#planSave"); await p.waitForTimeout(700);
  let made = (await ls(p, "events")).find((e) => e.title === "打ち合わせ");
  ok(made && made.travel === 30 && made.ten === true && made.cands?.length === 1 && made.cands[0].date === "2026-11-13" && made.cands[0].endTime === "17:00" && made.checks?.map((x) => x.text).join() === "資料,ノートPC", "②④⑨ saved with them", made);
  // ② the free hours leave out the way there (面接 40 分, 打ち合わせ 30 分)
  let free = await p.evaluate(() => window.__cal.free("2026-11-12"));
  ok(JSON.stringify(free) === "[[540,800],[900,930]]", "② free: 9:00〜13:20 and 15:00〜15:30", free);
  // ② 出発のお知らせ (on at first): 面接 at 13:20; not the 仮 one
  let al = await alarms(p);
  const leave = al.find((a) => a.tag === "cal-leave:e2:2026-11-12");
  ok(leave && leave.title === "そろそろ出発：面接" && leave.when.endsWith("13:20") && leave.body.includes("14:00から・移動 40") && leave.body.includes("〇〇ビル 5F"), "② 出発のお知らせ at 13:20", leave);
  ok(!al.some((a) => a.tag.startsWith("cal-leave:" + made.id)), "② none for a 仮 plan");
  // ③ 前の晩のお知らせ: off at first; on, the evening before 11/12 (面接, 歯医者, 打ち合わせ（仮）, バイト)
  ok(!al.some((a) => a.tag.startsWith("cal-eve:")), "③ off at first");
  await p.click("#sheetDone").catch(() => {}); await p.waitForTimeout(600);
  await p.click("#calSettings"); await p.waitForTimeout(700);
  ok(await p.isVisible("#calEveForm") && !(await p.isChecked("#calEveOn")) && (await p.inputValue("#calEveAt")) === "21:00" && await p.isChecked("#calLeaveOn"), "③② the gear: 前の晩 off at 21:00, 出発 on");
  const sig0 = await p.evaluate(() => window.__cal.sig());
  await p.check("#calEveOn"); await p.waitForTimeout(500);
  ok((await setting(p, "calEve"))?.on === true && (await p.evaluate(() => window.__cal.sig())) !== sig0, "③ turned on: kept, sent again");
  al = await alarms(p);
  const eve = al.find((a) => a.tag === "cal-eve:2026-11-12");
  ok(eve && eve.when.startsWith("11/11") && eve.when.endsWith("21:00") && eve.title === "あしたの予定 4件" && eve.body.startsWith("14:00 面接、14:30 歯医者、16:00 打ち合わせ（仮）、17:00 バイト") && eve.body.includes("13:20 に出発（面接）") && eve.body.includes("持ち物・準備：履歴書、スーツ、資料、ノートPC"), "③ the night before 11/12, its plans, when to leave, what to take", eve);
  ok(!al.some((a) => a.tag === "cal-eve:2026-11-17"), "③ none for a day with nothing");
  await p.uncheck("#calLeaveOn"); await p.waitForTimeout(400);
  ok((await setting(p, "calendar"))?.leave === false && !(await alarms(p)).some((a) => a.tag.startsWith("cal-leave:")), "② 出発のお知らせ off: none");
  // ⑧ 授業の時間割
  await p.click("#calTTOpen"); await p.waitForTimeout(500);
  ok((await p.evaluate(() => window.__cal.panel())) === "tt" && (await txt(p, "#sheetTitle")) === "授業の時間割" && (await p.inputValue("#ttFrom")) === "2026-10-01" && (await p.inputValue("#ttTo")) === "2027-01-31", "⑧ the timetable: the term guessed (後期)");
  await p.click("#tt-1-2"); await p.waitForTimeout(200);
  await p.selectOption("#ttSubject", "sb1"); await p.waitForTimeout(100);
  ok((await p.inputValue("#ttName")) === "線形代数", "⑧ a 勉強の科目 picked fills the name");
  await p.fill("#ttRoom", "3号館201"); await p.click("#ttSave"); await p.waitForTimeout(700);
  let cls = (await ls(p, "events")).filter((e) => e.cls);
  const lab = (await ls(p, "labels")).find((l) => l.name === "授業");
  ok(cls.length === 1 && cls[0].title === "線形代数" && cls[0].date === "2026-10-05" && cls[0].time === "10:40" && cls[0].endTime === "12:10" && cls[0].repeat === "weekly" && cls[0].repeatUntil === "2027-01-31" && cls[0].place === "3号館201" && cls[0].subjectId === "sb1" && lab && lab.color === "green" && cls[0].labelId === lab.id, "⑧ a class: a plan every Monday 2限 through the term, under 授業 (green)", { cls, lab });
  ok((await toast(p)).includes("月曜 2限に「線形代数」を入れました"), "⑧ said");
  await p.click("#tt-3-1"); await p.waitForTimeout(200); await p.fill("#ttName", "英語"); await p.press("#ttName", "Enter"); await p.waitForTimeout(700);
  ok((await ls(p, "events")).filter((e) => e.cls).length === 2 && (await txt(p, "#tt-3-1")).includes("英語"), "⑧ another, by Enter");
  await p.click(".tt-times summary"); await p.waitForTimeout(200);
  await setTime(p, "ttP2a", "10:45"); await p.waitForTimeout(700);
  ok((await ls(p, "events")).find((e) => e.title === "線形代数")?.time === "10:45" && (await p.evaluate(() => window.__cal.tt().periods[1].from)) === "10:45", "⑧ a period's time changed: its classes follow");
  await p.click("#tt-1-2"); await p.waitForTimeout(200);
  await p.locator(".tt-edit button", { hasText: "この授業を消す" }).click(); await p.waitForTimeout(700);
  ok(!(await ls(p, "events")).some((e) => e.title === "線形代数" && e.cls), "⑧ a class taken away: its plan goes");
  await undo(p);
  ok((await ls(p, "events")).some((e) => e.title === "線形代数" && e.cls), "⑧ 元に戻す: back");
  await p.click("#sheetDone"); await p.waitForTimeout(700);
  ok((await p.evaluate(() => window.__cal.turns("2026-11-16"))).includes("線形代数") && (await p.evaluate(() => window.__cal.turns("2026-11-18"))).includes("英語"), "⑧ on the calendar every week");
  ok(!(await p.evaluate(() => window.__cal.turns("2027-02-01"))).includes("線形代数"), "⑧ not after the term");
  await p.close();

  // ④ a 仮 plan: its other days, no alarm, decided, 元に戻す
  const D = make();
  D.events.find((e) => e.id === "e4").alarms = [10];
  p = await open(D);
  ok((await p.evaluate(() => window.__cal.turns("2026-11-14"))).includes("飲み会#1") && (await p.evaluate(() => window.__cal.turns("2026-11-15"))).includes("飲み会#2"), "④ its other days among the turns");
  ok(await p.evaluate(() => [...document.querySelectorAll(".cal-day")].filter((c) => c.querySelector(".bar.ten")).length === 3), "④ dashed on its 3 days in the month");
  ok(!(await alarms(p)).some((a) => a.tag.startsWith("e4:")), "④ its 通知アラーム wait until it is decided");
  await openPlan(p, "11月14日", "飲み会");
  ok((await p.locator("#edCards .cal-decide li").count()) === 3 && (await txt(p, "#edCards .cal-decide li.here")).startsWith("11月14日（土） 19:00〜21:00"), "④ the plan opened: its 3 days to pick from, the one opened marked");
  await p.click('#edCards [data-k="decide-1"]'); await p.waitForTimeout(600);
  let e4 = await ev(p, "e4");
  ok(e4.date === "2026-11-14" && e4.time === "19:00" && !e4.ten && !e4.cands && (await toast(p)).includes("「飲み会」を11月14日（土） 19:00に決めました"), "④ この日に決める", e4);
  ok((await p.evaluate(() => window.__cal.turns("2026-11-13"))).length === 0 && (await alarms(p)).some((a) => a.tag === "e4:2026-11-14"), "④ decided: one day, its alarm back");
  await undo(p);
  e4 = await ev(p, "e4");
  ok(e4.ten === true && e4.cands.length === 2 && e4.date === "2026-11-13", "④ 元に戻す: 仮 again");
  await p.close();

  // ⑤ as words: a day, its week, the free hours, a plan
  p = await open();
  await p.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: URL0.replace(/\/$/, "") });
  const copied = () => p.evaluate(() => navigator.clipboard.readText().catch(() => ""));
  await openDayOf(p, "11月12日");
  await p.click("#dayShare"); await p.waitForTimeout(150);
  await p.click('#dayShareBox [data-share="day"]'); await p.waitForTimeout(400);
  ok((await copied()) === "11月12日（木）の予定\n14:00〜15:00 面接（〇〇ビル 5F）\n14:30〜15:00 歯医者\n17:00〜22:00 バイト" && (await toast(p)).includes("文字でコピーしました"), "⑤ the day's plans as words", await copied());
  await p.click("#dayShare"); await p.click('#dayShareBox [data-share="free"]'); await p.waitForTimeout(400);
  let w = await copied();
  ok(w.startsWith("空いている時間（11/12〜11/18・9時〜22時のうち）\n11月12日（木） 09:00〜13:20、15:00〜17:00\n11月13日（金） 09:00〜19:00、21:00〜22:00"), "⑤ the free hours of the 7 days", w);
  await p.click("#dayShare"); await p.click('#dayShareBox [data-share="week"]'); await p.waitForTimeout(400);
  w = await copied();
  ok(w.startsWith("11/8〜11/14の予定\n11月10日（火）\n　13:00〜14:00 説明会\n11月11日（水）\n　10:00〜11:30 ゼミ\n　18:00〜19:00 英会話") && w.includes("　19:00〜21:00 飲み会（仮）"), "⑤ the week's plans", w);
  await p.locator("#calDayList .row-btn", { hasText: "面接" }).click(); await p.waitForTimeout(600);
  await p.click("#edShare"); await p.waitForTimeout(400);
  ok((await copied()) === "面接\n11月12日（木） 14:00〜15:00\n場所：〇〇ビル 5F\nhttps://example.com/info", "⑤ a plan as words", await copied());
  // ② a 移動時間 not among the choices (40 分) stays as it was
  ok((await p.inputValue("#edTravel")) === "40" && (await txt(p, "#edTravelFoot")) === "13:20 に出発", "② 40 分 kept in the form");
  // ⑨ its list for 11/12: checked off, the rest to ToDo
  ok((await txt(p, "#edCards .cal-checks-head")).includes("1 / 3"), "⑨ 1 of 3 done");
  await p.click('#edCards [data-k="chk-c1"]'); await p.waitForTimeout(400);
  ok((await ev(p, "e2")).checks.find((x) => x.id === "c1").done === true && (await txt(p, "#edCards .cal-checks-head")).includes("2 / 3"), "⑨ 履歴書 checked off");
  await p.click('#edCards [data-k="chk-todo"]'); await p.waitForTimeout(500);
  let tds = await ls(p, "todos");
  ok(tds.length === 1 && tds[0].text === "スーツ" && tds[0].due === "2026-11-11" && tds[0].memo === "「面接」（11月12日（木））の準備" && (await toast(p)).includes("ToDoに 1 件を入れました"), "⑨ the one left to ToDo, due the day before", tds);
  await undo(p);
  ok((await ls(p, "todos")).length === 0, "⑨ 元に戻す: taken back");
  // ⑩ not over yet: no ふりかえり; the edit form told apart by 移動時間 alone
  ok(!(await p.isVisible("#edNoteText")), "⑩ none before it is over");
  await p.selectOption("#edTravel", "60"); await p.waitForTimeout(150);
  await p.click("#sheetSave"); await p.waitForTimeout(600);
  ok((await ev(p, "e2")).travel === 60, "② a change of 移動時間 alone is saved");
  await p.close();

  // ⑥ an end dragged: ゼミ to 12:30; a repeat's turn alone; 元に戻す
  p = await open();
  await view(p, "week");
  const dragEnd = async (sel, mins) => {
    const g = await p.locator(sel + " .tg-end").boundingBox(), col = await p.locator(sel).evaluate((b) => { const r = b.closest(".tg-col").getBoundingClientRect(); return { h: r.height }; });
    const x = g.x + g.width / 2, y = g.y + g.height / 2, dy = (col.h / 1440) * mins;
    await p.mouse.move(x, y); await p.mouse.down();
    for (let k = 1; k <= 6; k++) { await p.mouse.move(x, y + (dy * k) / 6); await p.waitForTimeout(30); }
    await p.mouse.up(); await p.waitForTimeout(500);
  };
  await dragEnd('[data-ev="e1|2026-11-11"]', 60);
  ok((await ev(p, "e1")).endTime === "12:30" && (await toast(p)).includes("「ゼミ」を 10:00〜12:30 にしました"), "⑥ ゼミ's end dragged to 12:30", (await ev(p, "e1")).endTime);
  ok(!(await p.evaluate(() => document.getElementById("daySheet").open)), "⑥ the drag opens nothing");
  await undo(p);
  ok((await ev(p, "e1")).endTime === "11:30", "⑥ 元に戻す");
  await dragEnd('[data-ev="e5|2026-11-11"]', 30);
  let ev5 = await ev(p, "e5"), one = (await ls(p, "events")).find((e) => e.title === "英会話" && e.id !== "e5");
  ok(ev5.skip?.includes("2026-11-11") && one && one.date === "2026-11-11" && one.endTime === "19:30" && !one.repeat && !one.notes && !one.checked && (await toast(p)).includes("（この回だけ）"), "⑥ a repeat's turn alone", { skip: ev5.skip, one });
  // ① the end dragged into another says so
  await undo(p);
  await dragEnd('[data-ev="e1|2026-11-11"]', 0);
  // ⑦ 年
  await view(p, "year");
  ok((await txt(p, "#calMonthName")) === "2026年" && (await p.locator(".cal-ym").count()) === 12 && (await p.locator('.cal-ym[data-ym="2026-11"]').getAttribute("aria-label")).startsWith("11月、予定 "), "⑦ the year: 12 months", await txt(p, "#calMonthName"));
  ok(await p.evaluate(() => { const m = document.querySelector('.cal-ym[data-ym="2026-11"]'); const d = [...m.querySelectorAll(".yd:not(.pad)")]; return d[10].classList.contains("today") && d[11].classList.contains("l3") && d[2].classList.contains("sun"); }), "⑦ today ringed, a busy day dark, a holiday red");
  await p.evaluate(() => document.getElementById("calPrev").click()); await p.waitForTimeout(700);
  ok((await txt(p, "#calMonthName")) === "2025年", "⑦ ‹: the year before");
  await p.evaluate(() => document.getElementById("calNext").click()); await p.waitForTimeout(700);
  await p.click('.cal-ym[data-ym="2026-11"]'); await p.waitForTimeout(500);
  ok((await p.evaluate(() => window.__cal.view())) === "month" && (await txt(p, "#calMonthName")) === "2026年11月", "⑦ a month pressed: that month");
  await p.close();

  // ⑩ ふりかえり on 説明会 (11/10): kept, in the day's list, on 日記's page, found
  p = await open();
  await openPlan(p, "11月10日", "説明会");
  ok(await p.isVisible("#edNoteText"), "⑩ over: ふりかえり shows");
  await p.click('#edCards [data-k="mood-good"]'); await p.waitForTimeout(300);
  await p.fill("#edNoteText", "社員さんの話が面白かった"); await p.press("#edNoteText", "Enter"); await p.waitForTimeout(400);
  let n7 = (await ev(p, "e7")).notes?.["2026-11-10"];
  ok(n7 && n7.mood === "good" && n7.text === "社員さんの話が面白かった", "⑩ how it went and a word, kept", n7);
  ok((await p.getAttribute('#edCards [data-k="mood-good"]', "aria-pressed")) === "true", "⑩ よかった pressed");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  ok((await txt(p, "#calDayList")).includes("よかった 社員さんの話が面白かった"), "⑩ under it in the day's list", await txt(p, "#calDayList"));
  await p.click("#sheetDone"); await p.waitForTimeout(600);
  await p.click("#calFind"); await p.waitForTimeout(500);
  await p.fill("#findText", "ほめられ"); await p.waitForTimeout(400);
  ok((await txt(p, "#findList")).includes("英会話") && (await txt(p, "#findList")).includes("11月4日"), "⑩ found by its words, on its day", await txt(p, "#findList"));
  await p.close();
  p = await open(make(), "10:00", "2026-11-04", "journal");
  ok((await txt(p, "#jnPlanNotes")).includes("英会話") && (await txt(p, "#jnPlanNotes")).includes("発音をほめられた") && await p.isVisible("#jnPlanNotes"), "⑩ on 日記's page for that day", await txt(p, "#jnPlanNotes"));
  await p.close();

  // ⑨ あしたの準備 (きょう, from 20:00): what is left for tomorrow
  p = await open(make(), "21:00", today, "home");
  ok((await p.evaluate(() => document.body.innerText)).includes("持ち物") && (await p.evaluate(() => document.body.innerText)).includes("履歴書、スーツ"), "⑨ あしたの準備: 持ち物");
  // ⑨ a repeat's list, by day
  await p.goto(URL0 + "#calendar"); await p.reload(); await p.waitForTimeout(900);
  await openPlan(p, "11月11日", "英会話");
  ok((await txt(p, "#edCards .cal-checks-head")).includes("0 / 1"), "⑨ a repeat: this day's own (0 of 1)");
  await p.click('#edCards [data-k="chk-k1"]'); await p.waitForTimeout(400);
  ok(JSON.stringify((await ev(p, "e5")).checked) === JSON.stringify({ "2026-11-04": ["k1"], "2026-11-11": ["k1"] }), "⑨ checked for 11/11 alone", (await ev(p, "e5")).checked);
  ok(!p.errs.length, "no error along the way", p.errs);
  await p.close();

  console.log(fails ? `${fails} FAILED` : "ALL OK");
  await b.close();
})();
