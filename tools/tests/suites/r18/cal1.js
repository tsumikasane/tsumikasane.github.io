// カレンダー ①〜⑩
const { chromium } = require("playwright");
const fs = require("fs");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10";
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const days7 = Array.from({ length: 7 }, (_, i) => addDays(today, i));
const DATA = {
  events: [
    { id: "e1", date: today, title: "授業", time: "10:00", endTime: "12:00", labelId: "l1", createdAt: T(today) },
    { id: "e2", date: addDays(today, 1), title: "歯医者", time: "15:00", endTime: "16:00", createdAt: T(today) },
    { id: "e3", date: addDays(today, -7), title: "ジム", time: "19:00", endTime: "20:00", place: "駅前ジム", createdAt: T(today) },
    { id: "e4", date: addDays(today, -3), title: "ジム", time: "19:00", endTime: "20:00", place: "駅前ジム", createdAt: T(today) },
    { id: "e5", date: addDays(today, -14), title: "ゼミ", time: "13:00", endTime: "14:30", repeat: "weekly", labelId: "l1", createdAt: T(today) },
    { id: "e6", date: addDays(today, 3), title: "旅行", endDate: addDays(today, 4), createdAt: T(today), icsUid: "trip-1@example.com" },
  ],
  labels: [{ id: "l1", name: "大学", color: "blue", createdAt: 1 }],
  shifts: [{ id: "s1", date: today, start: "17:00", end: "22:00", rest: 0, jobId: "j1", createdAt: T(today) }, { id: "s2", date: addDays(today, 2), start: "22:00", end: "05:00", rest: 30, jobId: "j1", createdAt: T(today, 10) }],
  settings: [{ id: "jobs", items: [{ id: "j1", name: "コンビニ", wage: 1100, fare: 0, night: true, cutoff: 0, payday: 25 }], updatedAt: 1 }],
  workouts: [{ id: "w1", date: today, type: "ランニング", minutes: 30, km: 5, createdAt: 1 }], study: [{ id: "st1", date: addDays(today, -1), minutes: 60, createdAt: 1 }],
  journal: [{ id: addDays(today, -1), date: addDays(today, -1), text: "日記", createdAt: 1 }], weights: [{ id: today, date: today, kg: 60, createdAt: 1 }],
};
const WX = { day: today, at: T(today, 8), lat: 35.68, lon: 139.77, days: 7, daily: { time: days7, weather_code: [0, 3, 61, 2, 71, 80, 1], temperature_2m_max: [18, 17, 14, 16, 5, 12, 19], temperature_2m_min: [9, 10, 8, 7, -1, 6, 9], precipitation_probability_max: [10, 20, 80, 30, 60, 70, 0] }, hourly: { time: [], precipitation_probability: [] } };
async function open(b, when = "08:30", data = DATA) {
  const p = await phone(b, at(when, today));
  await seed(p, data, "calendar");
  await p.evaluate(({ P, WX }) => { localStorage.setItem(P + "wxPlace", JSON.stringify({ lat: 35.68, lon: 139.77, at: 1 })); localStorage.setItem(P + "wxData", JSON.stringify(WX)); }, { P, WX });
  await p.reload(); await p.waitForTimeout(800);
  return p;
}
const daySheet = async (p, d) => { await p.locator(`.cal-day[aria-label^="${Number(d.slice(5, 7))}月${Number(d.slice(8))}日"]`).first().click(); await p.waitForTimeout(600); };
const closeSheet = async (p) => { await p.keyboard.press("Escape"); await p.waitForTimeout(500); };

(async () => {
  const b = await chromium.launch();
  let p = await open(b);
  // ① the month
  const cell = await p.evaluate(() => document.querySelector(".cal-day.today").getAttribute("aria-label"));
  ok(cell.includes("バイト 17:00〜22:00") && (await p.evaluate(() => [...document.querySelectorAll(".cal-day.today .bar")].map((x) => x.textContent))).join(",") === "授業,ゼミ,コンビニ", "① the month: the shift by its time among the plans", cell);
  // ⑤ the weather on the next 7 days
  const wxCells = await p.evaluate(() => [...document.querySelectorAll(".cal-day")].filter((c) => c.querySelector(".wx")).map((c) => c.querySelector(".n").textContent + ":" + c.querySelector(".wx").className.replace("wx wx-icon ", "")));
  ok(wxCells.join(" ") === "10:sun 11:cloud 12:rain 13:cloud 14:snow 15:rain 16:sun" && cell.includes("晴れ、最高18度、最低9度、降水確率10%"), "⑤ the weather on the 7 days", wxCells);
  // ⑦ the marks
  const marks = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll(".cal-day")].filter((c) => c.querySelector(".marks")).map((c) => [c.querySelector(".n").textContent, c.querySelectorAll(".marks i").length])));
  ok(JSON.stringify(marks) === JSON.stringify({ 9: 2, 10: 2 }) && cell.includes("記録 運動・体重"), "⑦ the marks: 9th 日記・勉強, 10th 運動・体重", marks);
  await p.screenshot({ path: __dirname + "/shots/c-month.png" });

  // ① the day's sheet: the shift by its time, its form there, a new one
  await daySheet(p, today);
  let day = await txt(p, "#calDayList");
  ok(day.indexOf("授業") < day.indexOf("ゼミ") && day.indexOf("ゼミ") < day.indexOf("コンビニ") && day.includes("17:00〜22:00・5 時間"), "① the day's list: the shift among the plans", day);
  ok(await p.isVisible("#dayShiftAdd"), "① シフトを追加 there (a job is set)");
  // ⑥ the free hours, from now (8:30)
  ok(await txt(p, "#dayFree") === "きょうの空き時間 08:30〜10:00 1 時間 30 分 12:00〜13:00 1 時間 14:30〜17:00 2 時間 30 分", "⑥ the day's free hours", await txt(p, "#dayFree"));
  // ③ the plans made often: one more today
  ok(await txt(p, "#dayOften") === "よく使う ジム 19:00〜20:00", "③ よく使う in the day's sheet", await txt(p, "#dayOften"));
  await p.locator("#dayOften button").click(); await p.waitForTimeout(400);
  let evs = await ls(p, "events"), gym = evs.find((e) => e.title === "ジム" && e.date === today);
  ok(gym && gym.time === "19:00" && gym.endTime === "20:00" && gym.place === "駅前ジム" && !gym.repeat, "③ added today with its times and place", gym);
  await p.locator(".toast-undo:visible").first().click(); await p.waitForTimeout(300);
  ok(!(await ls(p, "events")).some((e) => e.title === "ジム" && e.date === today), "③ 元に戻す");
  // the shift's form in the sheet
  await p.locator('#calDayList button[aria-label^="コンビニの勤務"]').click(); await p.waitForTimeout(400);
  ok(await p.inputValue("#reStart") === "17:00" && await p.inputValue("#reEnd") === "22:00", "① the shift opens in the sheet");
  await p.fill("#reEnd", "21:00"); await p.locator("#recSave").click(); await p.waitForTimeout(400);
  ok((await ls(p, "shifts")).find((x) => x.id === "s1").end === "21:00" && await p.isVisible("#calDayList"), "① saved, back to the day's list");
  await p.locator("#dayShiftAdd").click(); await p.waitForTimeout(400);
  ok(await p.inputValue("#reDate") === today && await p.inputValue("#reStart") === "22:00" && await p.inputValue("#reEnd") === "05:00" && await p.inputValue("#reRest") === "30", "① a new shift: the day, the last one's times", [await p.inputValue("#reDate"), await p.inputValue("#reStart")]);
  await p.fill("#reStart", "09:00"); await p.fill("#reEnd", "12:00"); await p.fill("#reRest", ""); await p.locator("#recSave").click(); await p.waitForTimeout(400);
  let sh = (await ls(p, "shifts")).find((x) => x.start === "09:00");
  ok(sh && sh.date === today && sh.end === "12:00" && sh.jobId === "j1" && await p.isVisible("#calDayList"), "① added with its job, back to the list", sh);
  ok(await txt(p, "#dayFree") === "きょうの空き時間 08:30〜09:00 30 分 12:00〜13:00 1 時間 14:30〜17:00 2 時間 30 分 21:00〜22:00 1 時間", "⑥ the shifts (9:00〜12:00 added, 〜21:00 now) out of the free hours", await txt(p, "#dayFree"));
  // ⑥ a free time pressed: a new plan there
  await p.locator("#dayFree button").first().click(); await p.waitForTimeout(400);
  ok(await p.inputValue("#planTime") === "08:30" && await p.inputValue("#planEndTime") === "09:00" && await p.inputValue("#planDate") === today, "⑥ a plan at the free time, to its end", [await p.inputValue("#planTime"), await p.inputValue("#planEndTime")]);
  await closeSheet(p); await closeSheet(p);

  // ② a plan from a few words
  await p.locator("#calAdd").click(); await p.waitForTimeout(500);
  ok(await txt(p, "#planOften") === "よく使う ジム 19:00〜20:00", "③ よく使う in the new plan's form");
  const cases = [
    ["あした 15時 歯医者", "11月11日（水） 15:00 「歯医者」にする", ["2026-11-11", "15:00", "16:00", "歯医者"]],
    ["金曜18:00-22:00バイト", "11月13日（金） 18:00〜22:00 「バイト」にする", ["2026-11-13", "18:00", "22:00", "バイト"]],
    ["11/20 美容院", "11月20日（金） 終日 「美容院」にする", ["2026-11-20", "", "", "美容院"]],
    ["来週の月曜 午後3時半から 面接", "11月16日（月） 15:30 「面接」にする", ["2026-11-16", "15:30", "16:30", "面接"]],
    ["3日後 締切", "11月13日（金） 終日 「締切」にする", ["2026-11-13", "", "", "締切"]],
    ["5日に支払い", "12月5日（土） 終日 「支払い」にする", ["2026-12-05", "", "", "支払い"]],
    ["夜8時から10時 電話", null, null],
  ];
  for (const [input, says, want] of cases) {
    await p.locator("#planTitle").fill(input); await p.waitForTimeout(120);
    const got = await txt(p, "#planParse");
    if (!says) { ok(got.endsWith("20:00〜22:00 「電話」にする"), "② " + input + " → " + got); continue; }
    ok(got === says, "② " + input + " → " + got, says);
    await p.locator("#planParse button").click(); await p.waitForTimeout(120);
    const f = [await p.inputValue("#planDate"), await p.inputValue("#planTime"), await p.inputValue("#planEndTime"), await p.inputValue("#planTitle")];
    ok(JSON.stringify(f) === JSON.stringify(want) && await p.isHidden("#planParse"), "② put in: " + f.join(" "), want);
  }
  await p.locator("#planTitle").fill("歯医者"); await p.waitForTimeout(120);
  ok(await p.isHidden("#planParse"), "② a name alone: nothing offered");
  await p.locator("#planTitle").fill(""); await p.waitForTimeout(120);
  await p.locator("#planOften button").click(); await p.waitForTimeout(150);
  ok(await p.inputValue("#planTitle") === "ジム" && await p.inputValue("#planTime") === "19:00" && await p.inputValue("#planPlace") === "駅前ジム" && await p.isHidden("#planOften"), "③ the form filled from よく使う");
  await closeSheet(p);
  await p.evaluate(() => { document.querySelector("#planTitle").value = ""; });

  // ⑧ the hours by label in 予定
  await p.locator("#calFind").click(); await p.waitForTimeout(500);
  let sum = await txt(p, ".cal-sum");
  ok(sum.startsWith("11/8〜11/14・合計") && sum.includes("バイト 14 時間") && sum.includes("大学 3 時間 30 分") && sum.includes("ラベルなし 1 時間"), "⑧ this week by label", sum);
  ok((await txt(p, "#findList")).includes("11月12日（木） 22:00 コンビニ 22:00〜05:00"), "① the shifts in これからの予定");
  await p.locator('.cal-sum button:has-text("今月")').click(); await p.waitForTimeout(200);
  sum = await txt(p, ".cal-sum");
  ok(sum.startsWith("11/1〜11/30・合計") && sum.includes("大学 8 時間"), "⑧ this month (授業 2 h, ゼミ 4 × 1.5 h)", sum);
  await closeSheet(p);

  // 週: ① the shift blocks, ⑤ the weather under the days, ⑥ the free bands
  await p.locator('#calViews [data-view="week"]').click(); await p.waitForTimeout(500);
  ok(await p.locator('#tgBody .tg-ev.shift[data-shift="s1"]').count() === 1 && (await p.evaluate(() => [...document.querySelectorAll("#tgBody .tg-ev.shift")].map((x) => x.innerText.replace(/\s+/g, " ")))).includes("コンビニ 〜05:00"), "① 週: the shifts, the part past midnight to its end");
  ok((await p.evaluate(() => [...document.querySelectorAll("#tgHead .wxs")].map((x) => x.textContent))).join(" ") === "18° 17° 14° 16° 5°", "⑤ 週: the weather under the days", await p.evaluate(() => [...document.querySelectorAll("#tgHead .wxs")].map((x) => x.textContent)));
  ok(await p.locator("#tgBody .tg-free").count() > 4 && await p.locator("#tgBody .tg-free.one").count() === 0, "⑥ 週: the free bands, plain");
  await p.screenshot({ path: __dirname + "/shots/c-week.png" });
  // 日
  await p.locator('#calViews [data-view="day"]').click(); await p.waitForTimeout(500);
  ok(await txt(p, "#tgWx") === "晴れ 18° / 9° 降水確率 10%", "⑤ 日: the day's weather", await txt(p, "#tgWx"));
  ok((await p.evaluate(() => [...document.querySelectorAll("#tgBody .tg-free.one")].map((x) => x.textContent))).join(",") === ",空き 1 時間,空き 2 時間 30 分,空き 1 時間", "⑥ 日: the free bands, a length on each but the short one",
    await p.evaluate(() => [...document.querySelectorAll("#tgBody .tg-free.one")].map((x) => x.textContent)));
  // ④ 授業 held and moved down 3 hours
  const box = await p.locator('#tgBody .tg-ev[data-ev^="e1|"]').boundingBox(), colH = (await p.locator("#tgBody .tg-col").boundingBox()).height;
  await p.mouse.move(box.x + box.width / 2, box.y + 5); await p.mouse.down(); await p.waitForTimeout(600);
  ok(await p.locator("#tgBody .tg-ghost").count() === 1, "④ held: lifted");
  await p.mouse.move(box.x + box.width / 2, box.y + 5 + colH / 8, { steps: 6 }); await p.waitForTimeout(100);
  ok((await txt(p, "#tgBody .tg-ghost .tm")) === "13:00〜15:00", "④ the time it would go to: " + await txt(p, "#tgBody .tg-ghost .tm"));
  await p.mouse.up(); await p.waitForTimeout(500);
  let e1 = (await ls(p, "events")).find((e) => e.id === "e1");
  ok(e1.time === "13:00" && e1.endTime === "15:00" && e1.date === today && await p.isHidden("#sheet .sheet-view:not([hidden]) #evEdit"), "④ moved to 13:00〜15:00, nothing opened", e1);
  await p.locator(".toast-undo:visible").first().click(); await p.waitForTimeout(400);
  ok((await ls(p, "events")).find((e) => e.id === "e1").time === "10:00", "④ 元に戻す");
  // a press without holding still opens it
  await p.locator('#tgBody .tg-ev[data-ev^="e1|"]').click(); await p.waitForTimeout(500);
  ok(await p.inputValue("#edTitle") === "授業", "④ a plain press still opens the plan");
  await closeSheet(p);
  // a repeat's turn (ゼミ, 13:00) moved: this turn alone
  const zb = await p.locator('#tgBody .tg-ev[data-ev^="e5|"]').boundingBox();
  await p.mouse.move(zb.x + zb.width / 2, zb.y + 5); await p.mouse.down(); await p.waitForTimeout(600);
  await p.mouse.move(zb.x + zb.width / 2, zb.y + 5 + colH / 12, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(500);
  evs = await ls(p, "events");
  const e5 = evs.find((e) => e.id === "e5"), moved = evs.find((e) => e.title === "ゼミ" && e.id !== "e5");
  ok(e5.skip?.includes(today) && moved && moved.date === today && moved.time === "15:00" && moved.endTime === "16:30" && !moved.repeat && moved.labelId === "l1", "④ a repeat's turn alone moved", [e5.skip, moved]);
  await p.locator(".toast-undo:visible").first().click(); await p.waitForTimeout(400);
  evs = await ls(p, "events");
  ok(!evs.find((e) => e.id === "e5").skip?.length && !evs.some((e) => e.title === "ゼミ" && e.id !== "e5"), "④ 元に戻す: the repeat as it was");
  // the shift moved
  const sb = await p.locator('#tgBody .tg-ev.shift[data-shift="s1"]').boundingBox();
  await p.mouse.move(sb.x + sb.width / 2, sb.y + 5); await p.mouse.down(); await p.waitForTimeout(600);
  await p.mouse.move(sb.x + sb.width / 2, sb.y + 5 + colH / 24, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(500);
  const s1 = (await ls(p, "shifts")).find((x) => x.id === "s1");
  ok(s1.start === "18:00" && s1.end === "22:00", "④ a shift moved an hour, its length kept", s1);
  await p.screenshot({ path: __dirname + "/shots/c-day.png" });
  await p.locator('#calViews [data-view="month"]').click(); await p.waitForTimeout(400);

  // the settings: ⑤⑦⑥ off, the free hours' span
  await p.locator("#calSettings").click(); await p.waitForTimeout(500);
  await p.locator("#calWx").click({ force: true }); await p.locator("#calMarks").click({ force: true }); await p.waitForTimeout(300);
  await p.selectOption("#calFreeFrom", "09:00"); await p.selectOption("#calFreeTo", "21:00"); await p.waitForTimeout(300);
  let cs = (await ls(p, "settings")).find((x) => x.id === "calendar");
  ok(cs && cs.wx === false && cs.marks === false && cs.freeFrom === "09:00" && cs.freeTo === "21:00", "⑤⑦⑥ kept", cs);
  // ⑨ on
  await p.locator("#calMorningOn").click({ force: true }); await p.waitForTimeout(300);
  ok((await ls(p, "settings")).find((x) => x.id === "calMorning")?.on === true, "⑨ kept on");
  await closeSheet(p);
  ok(await p.locator(".cal-day .wx").count() === 0 && await p.locator(".cal-day .marks").count() === 0, "⑤⑦ off: none on the month");
  await daySheet(p, addDays(today, 1));
  ok((await txt(p, "#dayFree")).startsWith("空き時間 09:00〜15:00"), "⑥ the span set: from 9:00", await txt(p, "#dayFree"));
  await closeSheet(p);

  // ⑩ .ics read in
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0",
    "BEGIN:VEVENT", "UID:a-1@example.com", "DTSTART:20261120T100000", "DTEND:20261120T113000", "SUMMARY:面談", "LOCATION:3号館", "DESCRIPTION:持ち物\\n履歴書", "BEGIN:VALARM", "TRIGGER:-PT10M", "END:VALARM", "END:VEVENT",
    "BEGIN:VEVENT", "UID:a-2@example.com", "DTSTART;VALUE=DATE:20261123", "DTEND;VALUE=DATE:20261126", "SUMMARY:合宿", "END:VEVENT",
    "BEGIN:VEVENT", "UID:a-3@example.com", "DTSTART:20261121T010000Z", "DURATION:PT1H30M", "SUMMARY:オンライン", "END:VEVENT",
    "BEGIN:VEVENT", "UID:a-4@example.com", "DTSTART;TZID=Asia/Tokyo:20261117T090000", "DTEND;TZID=Asia/Tokyo:20261117T103000", "RRULE:FREQ=WEEKLY;UNTIL=20261215T000000Z", "EXDATE;TZID=Asia/Tokyo:20261124T090000", "SUMMARY:英語", "END:VEVENT",
    "BEGIN:VEVENT", "UID:a-5@example.com", "DTSTART;VALUE=DATE:20261127", "RRULE:FREQ=MONTHLY;BYDAY=-1FR", "SUMMARY:月末の会", "END:VEVENT",
    "BEGIN:VEVENT", "UID:a-6@example.com", "DTSTART:20261122T100000", "SUMMARY:中止", "STATUS:CANCELLED", "END:VEVENT",
    "BEGIN:VEVENT", "UID:a-4@example.com", "RECURRENCE-ID:20261201T090000", "DTSTART:20261201T100000", "SUMMARY:英語（変更）", "END:VEVENT",
    "BEGIN:VEVENT", "UID:trip-1@example.com", "DTSTART;VALUE=DATE:20261113", "SUMMARY:旅行", "END:VEVENT",
    "BEGIN:VEVENT", "UID:a-7@example.com", "DTSTART:20261128T120000", "DTEND:20261128T130000", "SUMMARY:とても長い名前の予定で、七十五バイトを超える行がちゃんと折り返されても読めるかどうかを確かめる", "END:VEVENT",
    "END:VCALENDAR"].join("\r\n").replace("SUMMARY:とても長い名前の予定で、", "SUMMARY:とても長い名前の予定で、\r\n ");
  fs.writeFileSync(__dirname + "/in.ics", ics);
  await p.locator("#calSettings").click(); await p.waitForTimeout(500);
  await p.setInputFiles("#icsFile", __dirname + "/in.ics"); await p.waitForTimeout(600);
  const said = await p.evaluate(() => document.querySelector("#sheetStatus.show, #status.show")?.firstChild?.textContent);
  ok(said === "6 件の予定を読み込みました。すでにある 1 件は読み込んでいません。繰り返しの 1 件は1回目だけです", "⑩ read in: said", said);
  evs = await ls(p, "events");
  const g = (t) => evs.find((e) => e.title === t);
  ok(g("面談")?.date === "2026-11-20" && g("面談").time === "10:00" && g("面談").endTime === "11:30" && g("面談").place === "3号館" && g("面談").memo === "持ち物\n履歴書" && g("面談").icsUid === "a-1@example.com", "⑩ a timed one, its place and memo", g("面談"));
  ok(g("合宿")?.date === "2026-11-23" && g("合宿").endDate === "2026-11-25" && !g("合宿").time, "⑩ days, its last the day before DTEND", g("合宿"));
  ok(g("オンライン")?.date === "2026-11-21" && g("オンライン").time === "10:00" && g("オンライン").endTime === "11:30", "⑩ UTC to this phone's time, DURATION", g("オンライン"));
  ok(g("英語")?.repeat === "weekly" && g("英語").repeatUntil === "2026-12-15" && JSON.stringify(g("英語").skip) === '["2026-11-24"]' && g("英語").time === "09:00", "⑩ a weekly repeat, UNTIL and EXDATE", g("英語"));
  ok(g("月末の会") && !g("月末の会").repeat, "⑩ a repeat it can't keep: the first turn", g("月末の会"));
  ok(!g("中止") && !g("英語（変更）") && evs.filter((e) => e.title === "旅行").length === 1, "⑩ called off, a changed turn and one here already: not read in");
  ok(g("とても長い名前の予定で、七十五バイトを超える行がちゃんと折り返されても読めるかどうかを確かめる"), "⑩ a folded line read whole");
  await p.locator(".toast-undo:visible").first().click(); await p.waitForTimeout(400);
  ok(!(await ls(p, "events")).some((e) => e.icsUid?.startsWith("a-")), "⑩ 元に戻す: all taken back");
  // ⑩ written out, then read in again: nothing twice
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 5000 }).catch(() => null), p.locator("#icsExport").click()]);
  const out = dl ? fs.readFileSync(await dl.path(), "utf8") : "";
  ok(out.includes("BEGIN:VEVENT") && out.includes("SUMMARY:授業") && out.includes("RRULE:FREQ=WEEKLY") && out.includes("LOCATION:駅前ジム") && out.includes("UID:trip-1@example.com") && out.includes("DTSTART;VALUE=DATE:20261113"), "⑩ written out", out.slice(0, 200));
  if (out) {
    fs.writeFileSync(__dirname + "/out.ics", out);
    await p.setInputFiles("#icsFile", __dirname + "/out.ics"); await p.waitForTimeout(500);
    const said2 = await p.evaluate(() => document.querySelector("#sheetStatus.show, #status.show")?.firstChild?.textContent);
    ok(said2 === "読み込む予定はありませんでした（どれもすでにあります）", "⑩ its own file again: nothing twice", said2);
  }
  ok(!p.errs.length, "no page errors: " + p.errs.join(" | "));
  // dark
  const d = await phone(b, at("08:30", today), { colorScheme: "dark" });
  await seed(d, DATA, "calendar"); await d.evaluate(({ P, WX }) => { localStorage.setItem(P + "wxPlace", JSON.stringify({ lat: 35.68, lon: 139.77, at: 1 })); localStorage.setItem(P + "wxData", JSON.stringify(WX)); }, { P, WX }); await d.reload(); await d.waitForTimeout(800);
  await d.screenshot({ path: __dirname + "/shots/c-dark.png" });
  ok(!d.errs.length, "dark: no page errors: " + d.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
