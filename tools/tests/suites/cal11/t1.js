// カレンダー その11 ①〜⑩ (on the hooked copy at 8817)
process.env.URL0 = process.env.URL0 || "http://localhost:8817/";
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
const openDayOf = async (p, md) => { await p.evaluate((md) => [...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith(md)).click(), md); await p.waitForTimeout(700); };
const openPlan = async (p, md, title) => { await openDayOf(p, md); await p.locator("#calDayList .row-btn", { hasText: title }).first().click(); await p.waitForTimeout(700); };
const closeSheet = async (p) => { for (let i = 0; i < 4 && (await p.evaluate(() => document.getElementById("daySheet").open)); i++) { await p.keyboard.press("Escape"); await p.waitForTimeout(700); } };
const undo = async (p) => { await p.locator(".show button", { hasText: "元に戻す" }).first().click(); await p.waitForTimeout(600); };
const setVal = (p, id, v) => p.evaluate(({ id, v }) => { const t = document.getElementById(id); t.value = v; t.dispatchEvent(new Event("input", { bubbles: true })); t.dispatchEvent(new Event("change", { bubbles: true })); }, { id, v });
const turns = (p, d) => p.evaluate((d) => window.__cal11.turns(d), d);
async function open(data = make(), when = "10:30", day = today) { const p = await phone(b, at(when, day), { deviceScaleFactor: 1 }); await seed(p, data, "calendar"); await p.waitForTimeout(900); return p; }
let b;

(async () => {
  b = await chromium.launch();
  let p = await open();
  ok(!p.errs.length, "the page opens, no error", p.errs);

  // ① a week as a ひな形 (and その8's panel with no "null" in it)
  await openDayOf(p, "11月16日");
  await p.click("#cal8TplBtn"); await p.waitForTimeout(300);
  const box = await txt(p, "#cal8TplBox");
  ok(!box.includes("null") && (await txt(p, ".cal11-week-head")) === "1週間のひな形（11/15〜11/21の週）", "① under the day's, the week's", box.slice(0, 200));
  await p.fill("#cal11WeekName", "いつもの週");
  await p.click('[data-k="wtpl-save"]'); await p.waitForTimeout(500);
  const wt = (await setting(p, "calendar")).weekTpls;
  ok(wt && wt.length === 1 && wt[0].name === "いつもの週" && wt[0].plans.map((x) => x.at + x.title).join(",") === "1ゼミ準備,3ジム,4オンライン面談,5飲み会,6歯医者", "① saved, not the repeating ones", wt);
  ok(wt[0].plans.find((x) => x.title === "飲み会")?.meet === "17:30" && wt[0].plans.find((x) => x.title === "歯医者")?.say === "保険証を持っていく", "① with ⑩ 集合 and ② ひとこと kept");
  await closeSheet(p);
  await openDayOf(p, "11月25日");
  await p.click("#cal8TplBtn"); await p.waitForTimeout(300);
  ok((await txt(p, "#cal8TplBox")).includes("予定 5件・月・水・木・金・土"), "① its weekdays", await txt(p, "#cal8TplBox"));
  await p.click("[data-wtpl]"); await p.waitForTimeout(700);
  ok((await turns(p, "2026-11-23")).includes("ゼミ準備") && (await turns(p, "2026-11-25")).includes("ジム") && (await turns(p, "2026-11-27")).includes("飲み会") && (await turns(p, "2026-11-28")).includes("歯医者"), "① put on the week of 11/22");
  await undo(p);
  ok(!(await turns(p, "2026-11-23")).includes("ゼミ準備") && !(await turns(p, "2026-11-28")).includes("歯医者"), "① 元に戻す");
  await closeSheet(p);

  // ② a word in the alarm, ⑩ the meeting in it and in the leave's
  let al = await p.evaluate(() => window.__cal11.alarms(Date.now()));
  const dent = al.find((a) => a.tag === "e7:2026-11-21"), drink = al.find((a) => a.tag === "e5:2026-11-20"), leave = al.find((a) => a.tag === "cal-leave:e5:2026-11-20");
  ok(dent && dent.body.split("\n").includes("保険証を持っていく"), "② the word in 歯医者's", dent);
  ok(drink && drink.body.split("\n")[1] === "集合 17:30・ハチ公前", "⑩ 集合 in 飲み会's", drink);
  ok(leave && new Date(leave.at).toISOString() === "2026-11-20T08:00:00.000Z" && leave.body === "集合 17:30・18:00から・移動 30 分\n集合場所：ハチ公前", "⑩ そろそろ出発 at 17:00 for 17:30", leave);
  ok(JSON.stringify(await p.evaluate(() => window.__cal11.free("2026-11-20"))) === "[[630,1020],[1260,1320]]", "⑩ free (after 数学) up to 17:00", await p.evaluate(() => window.__cal11.free("2026-11-20")));
  ok((await p.evaluate(() => window.__cal11.text("e5", "2026-11-20"))).includes("集合：17:30・ハチ公前"), "⑩ in the plan's text to send");

  // ⑩ the day's list and the form
  await openDayOf(p, "11月20日");
  const row = nos(await txt(p, "#calDayList"));
  ok(row.includes("集合17:30・ハチ公前") && row.includes("移動30分・17:00出発"), "⑩ in the day's list", row);
  await p.locator("#calDayList .row-btn", { hasText: "飲み会" }).first().click(); await p.waitForTimeout(700);
  ok((await p.inputValue("#edMeet")) === "17:30" && (await p.inputValue("#edMeetPlace")) === "ハチ公前" && await p.isVisible("#edMeetPlace") && (await txt(p, "#edTravelFoot")).startsWith("17:00 に出発（集合 17:30）"), "⑩ in the form", await txt(p, "#edTravelFoot"));
  await setVal(p, "edMeet", "18:30"); await p.waitForTimeout(200);
  ok(await p.isVisible("#edMeetFoot") && (await txt(p, "#edMeetFoot")).includes("より前の時刻"), "⑩ after the start: said", await txt(p, "#edMeetFoot"));
  await setVal(p, "edMeet", "17:30"); await p.waitForTimeout(200);
  await closeSheet(p);

  // ⑦⑧ online, a phone
  await openDayOf(p, "11月19日");
  ok(nos(await txt(p, "#calDayList")).includes("オンライン"), "⑦ オンライン in the day's list");
  await p.locator("#calDayList .row-btn", { hasText: "オンライン面談" }).first().click(); await p.waitForTimeout(700);
  const join = await p.evaluate(() => document.querySelector('.cal11-quick [data-k="join"]')?.getAttribute("href")), tel = await p.evaluate(() => document.querySelector('.cal11-quick [data-k="tel"]')?.getAttribute("href"));
  ok(join === "https://meet.example.com/abc" && tel === "tel:0312345678", "⑦⑧ 参加する and 電話をかける at the top", [join, tel]);
  ok(await p.isChecked("#edOnline") && (await p.inputValue("#edTel")) === "03-1234-5678" && await p.isHidden("#edSayRow"), "⑦⑧ in the form (no alarm: no word)");
  await closeSheet(p);

  // ③ the class put in 勉強
  await openPlan(p, "11月13日", "数学");
  ok(nos(await txt(p, ".cal11-study p")) === "11/13の回を勉強の記録に入れる（1時間30分）", "③ offered", await txt(p, ".cal11-study"));
  ok((await p.inputValue("#cal11StudySub")) === "s1", "③ its own 科目 picked");
  await p.click('[data-k="study-go"]'); await p.waitForTimeout(700);
  let st = await ls(p, "study");
  ok(st.length === 1 && st[0].date === "2026-11-13" && st[0].minutes === 90 && st[0].subjectId === "s1" && st[0].note === "数学", "③ in 勉強", st);
  ok((await ev(p, "e4")).studyMade?.["2026-11-13"] === st[0].id && nos(await txt(p, ".cal11-study p")).includes("勉強に記録しました（数学・1時間30分）"), "③ said so", await txt(p, ".cal11-study"));
  await p.click('[data-k="study-undo"]'); await p.waitForTimeout(700);
  st = await ls(p, "study");
  ok(!st.length && !(await ev(p, "e4")).studyMade, "③ 取り消す", [st, (await ev(p, "e4")).studyMade]);
  await closeSheet(p);
  await openPlan(p, "11月16日", "ゼミ準備");
  ok(!(await p.isVisible(".cal11-study")), "③ none for a plan not of study, nor to come");
  await closeSheet(p);

  // ④⑤⑥ a new plan
  await p.click("#calAdd"); await p.waitForTimeout(700);
  await p.fill("#planTitle", "歯医者");
  await setVal(p, "planDate", "2026-11-21"); await p.waitForTimeout(200);
  ok(await p.isVisible("#planDup") && (await txt(p, "#planDup")) === "11月21日（土）には、もう「歯医者」（10:00〜11:00）があります", "⑥ the same plan said", await txt(p, "#planDup"));
  await p.fill("#planTitle", "掃除"); await p.waitForTimeout(150);
  ok(await p.isHidden("#planDup"), "⑥ none for another name");
  await setVal(p, "planTime", "02:00"); await p.waitForTimeout(200);
  ok(await p.isVisible("#planNight") && (await txt(p, "#planNight")).startsWith("夜中の 2時の予定です。"), "⑤ the night asked about", await txt(p, "#planNight"));
  await p.click('#planNight [data-k="night-pm"]'); await p.waitForTimeout(300);
  ok((await p.inputValue("#planTime")) === "14:00" && (await p.inputValue("#planEndTime")) === "15:00" && await p.isHidden("#planNight"), "⑤ 午後の 14:00", [await p.inputValue("#planTime"), await p.inputValue("#planEndTime")]);
  ok(await p.isHidden("#planUntilQuick"), "④ none while it does not repeat");
  await p.selectOption("#planRepeat", "weekly"); await p.waitForTimeout(300);
  const chips = await p.evaluate(() => [...document.querySelectorAll("#planUntilQuick [data-until]")].map((x) => x.dataset.until).join(","));
  ok(chips === "今月末,3か月,今年いっぱい,学期の終わり", "④ the choices", chips);
  await p.click('#planUntilQuick [data-until="今月末"]'); await p.waitForTimeout(200);
  ok((await p.inputValue("#planUntil")) === "2026-11-30", "④ 今月末", await p.inputValue("#planUntil"));
  await p.click('#planUntilQuick [data-until="学期の終わり"]'); await p.waitForTimeout(200);
  ok((await p.inputValue("#planUntil")) === "2027-02-10" && (await p.getAttribute('#planUntilQuick [data-until="学期の終わり"]', "aria-pressed")) === "true", "④ 学期の終わり", await p.inputValue("#planUntil"));
  // ② ⑦ ⑧ ⑩ put in and saved
  ok(await p.isHidden("#planSayRow"), "② no word while there is no alarm");
  await setVal(p, "planAlarms", "10"); await p.waitForTimeout(200);
  ok(await p.isVisible("#planSayRow"), "② the word once there is one");
  await p.fill("#planSay", "ゴミ袋を買う");
  await p.selectOption("#planTravel", "15"); await p.waitForTimeout(150);
  await p.click("#planOnline"); await p.waitForTimeout(200);
  ok((await p.inputValue("#planTravel")) === "0", "⑦ オンライン: no way there", await p.inputValue("#planTravel"));
  await p.click("#planOnline"); await p.waitForTimeout(150);
  await p.fill("#planTel", "090-0000-1111");
  await setVal(p, "planMeet", "13:45"); await p.fill("#planMeetPlace", "駅");
  await p.click("#planSave"); await p.waitForTimeout(800);
  const made = (await ls(p, "events")).find((e) => e.title === "掃除");
  ok(made && made.repeat === "weekly" && made.repeatUntil === "2027-02-10" && made.say === "ゴミ袋を買う" && !made.online && made.tel === "090-0000-1111" && made.meet === "13:45" && made.meetPlace === "駅" && made.time === "14:00", "②④⑧⑩ saved", made);
  await closeSheet(p);

  // ⑨ a day found by its date
  await p.click("#calFind"); await p.waitForTimeout(700);
  await p.fill("#findText", "12/24"); await p.waitForTimeout(500);
  ok((await txt(p, ".cal11-date")) === "12月24日（木）を開く" && !(await txt(p, "#findList")).includes("見つかりませんでした"), "⑨ 12/24", await txt(p, "#findList"));
  await p.fill("#findText", "あした"); await p.waitForTimeout(500);
  ok((await txt(p, ".cal11-date")) === "11月15日（日）を開く", "⑨ あした", await txt(p, ".cal11-date"));
  await p.fill("#findText", "歯医者"); await p.waitForTimeout(500);
  ok(!(await p.isVisible(".cal11-date")), "⑨ none for words");
  await p.fill("#findText", "12/24"); await p.waitForTimeout(500);
  await p.click(".cal11-date button"); await p.waitForTimeout(700);
  ok((await txt(p, "#sheetTitle")).includes("12月24日"), "⑨ opened", await txt(p, "#sheetTitle"));
  await closeSheet(p);

  // ⑩ きょう's きょうの準備: to leave for the time to meet
  p = await open(make(), "15:30", "2026-11-20");
  const prep = await p.evaluate(() => window.__cal11.prep());
  ok(prep && prep.includes("17:00 に出発"), "⑩ きょうの準備 says 17:00", prep);

  ok(!p.errs.length, "no error on the way", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
