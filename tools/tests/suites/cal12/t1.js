// カレンダー その12 ①〜⑩ (on the hooked copy at 8818)
process.env.URL0 = process.env.URL0 || "http://localhost:8818/";
const { chromium } = require("playwright");
const { phone, seed, at, P } = require("./lib");
const { make, today, weather } = require("./data");
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
const alarms = (p) => p.evaluate(() => window.__cal12.alarms(Date.now()));
const iso = (a) => (a ? new Date(a.at).toISOString() : null);
const catchShare = (p) => p.evaluate(() => { window.__shared = []; navigator.share = (d) => { window.__shared.push(d); return Promise.resolve(); }; });
const shared = (p) => p.evaluate(() => window.__shared);
async function open(when = "16:00", day = today, data = make()) {
  const t = at(when, day), p = await phone(b, t, { deviceScaleFactor: 1 });
  await p.context().route("**/api.open-meteo.com/**", (r) => r.abort()); // (the forecast kept is the test's own)
  await p.context().route("**/air-quality-api.open-meteo.com/**", (r) => r.abort());
  await seed(p, { ...data, ...weather(t.getTime()) }, "calendar"); await p.waitForTimeout(900);
  return p;
}
let b;

(async () => {
  b = await chromium.launch();
  let p = await open();
  ok(!p.errs.length, "the page opens, no error", p.errs);

  // ⑦ the way there too short after ゼミ
  await openDayOf(p, "11月16日");
  const list = nos(await txt(p, "#calDayList"));
  ok(list.includes("移動が間に合いません（「ゼミ」が16:45まで・15分おくれ）"), "⑦ in the day's list", list);
  // ③ 帰る時刻 in it (その8's 帰り said from it)
  ok(list.includes("23:30に帰る・帰り30分・00:00ごろ着く") && !list.includes("22:30ごろ着く"), "③ 帰る時刻 in the day's list", list);
  await p.locator("#calDayList .row-btn", { hasText: "面接" }).first().click(); await p.waitForTimeout(700);
  ok(await p.isVisible("#edLate") && nos(await txt(p, "#edLate")).includes("15分おくれ"), "⑦ in the form", await txt(p, "#edLate"));
  await closeSheet(p);

  // ③ the form and its notification
  await openPlan(p, "11月16日", "飲み会");
  ok((await p.inputValue("#edHome")) === "23:30" && (await txt(p, "#edHomeFoot")) === "23:30 に出る（00:00 ごろ着く）" && await p.isHidden("#edTravelBackFoot"), "③ in the form", await txt(p, "#edHomeFoot"));
  // ⑩ words to send to the one met
  await catchShare(p);
  ok((await txt(p, ".cal12-meet .cal12-head")) === "待ち合わせの連絡（集合 18:45）", "⑩ offered (3 hours before)", await txt(p, ".cal12-meet"));
  await p.click('.cal12-meet [data-msg="いまから向かいます"]'); await p.waitForTimeout(200);
  await p.click('.cal12-meet [data-msg="10分おくれます"]'); await p.waitForTimeout(200);
  await p.click('.cal12-meet [data-msg="着きました"]'); await p.waitForTimeout(200);
  const sent = (await shared(p)).map((x) => x.text);
  ok(sent[0] === "いまから向かいます。16:30ごろ着きます。" && sent[1] === "すみません、10分ほどおくれます（18:55ごろ着きます）。" && sent[2] === "着きました（駅前）。", "⑩ the words", sent);
  await closeSheet(p);
  let al = await alarms(p);
  const home = al.find((a) => a.tag === "cal-home:e5:2026-11-16");
  ok(home && iso(home) === "2026-11-16T14:15:00.000Z" && home.title === "そろそろ帰る時間：飲み会" && home.body === "23:30 に出る予定です（帰りの移動 30 分・00:00 ごろ着く）", "③ そろそろ帰る時間 at 23:15", home);

  // ② the rain: 通院 tomorrow leaves 10 minutes early
  const leave = al.find((a) => a.tag === "cal-leave:e8:2026-11-17");
  ok(leave && iso(leave) === "2026-11-17T00:20:00.000Z" && leave.body.includes("雨の予報なので10分早めに"), "② 出発のお知らせ at 9:20", leave);
  ok(JSON.stringify(await p.evaluate(() => window.__cal12.free("2026-11-17"))) === "[[660,1320]]", "② the free hours from 9:20 busy", await p.evaluate(() => window.__cal12.free("2026-11-17")));
  await openDayOf(p, "11月17日");
  ok(nos(await txt(p, "#calDayList")).includes("移動30分・09:20出発（雨の予報で10分早め）"), "② in the day's list", await txt(p, "#calDayList"));
  await p.locator("#calDayList .row-btn", { hasText: "通院" }).first().click(); await p.waitForTimeout(700);
  ok((await txt(p, "#edTravelFoot")).startsWith("09:20 に出発（雨の予報で10分早め）"), "② in the form", await txt(p, "#edTravelFoot"));
  await closeSheet(p);
  const sigRain = await p.evaluate(() => window.__cal12.sig());

  // ⑤⑥ 英会話 on Wednesday
  await openPlan(p, "11月18日", "英会話");
  ok((await txt(p, ".cal12-hw .cal12-head")) === "次の回（11/25（水））までにやること", "⑤ offered", await txt(p, ".cal12-hw"));
  await p.fill("#cal12Hw", "単語を覚える");
  await p.click('[data-k="hw-add"]'); await p.waitForTimeout(700);
  let td = (await ls(p, "todos")).find((t) => t.fromPlan === "e6");
  ok(td && td.text === "英会話：単語を覚える" && td.due === "2026-11-25" && !td.done, "⑤ the ToDo", td);
  ok(nos(await txt(p, ".cal12-hw-list")) === "単語を覚える期限11/25（水）", "⑤ listed there", await txt(p, ".cal12-hw-list"));
  await undo(p);
  ok(!(await ls(p, "todos")).some((t) => t.fromPlan === "e6"), "⑤ 元に戻す");
  ok(!!(await alarms(p)).find((a) => a.tag === "e6:2026-11-18"), "⑥ its alarm as it is");
  await p.click('[data-k="mute"]'); await p.waitForTimeout(600);
  ok(JSON.stringify((await ev(p, "e6")).mute) === '["2026-11-18"]', "⑥ kept", (await ev(p, "e6")).mute);
  al = await alarms(p);
  ok(!al.find((a) => a.tag === "e6:2026-11-18") && !!al.find((a) => a.tag === "e6:2026-11-25"), "⑥ that turn's alone gone");
  await closeSheet(p);
  await openDayOf(p, "11月18日");
  ok(nos(await txt(p, "#calDayList")).includes("この回はお知らせなし"), "⑥ said in the day's list");
  await p.locator("#calDayList .row-btn", { hasText: "英会話" }).first().click(); await p.waitForTimeout(700);
  await p.click('[data-k="mute"]'); await p.waitForTimeout(600);
  ok(!(await ev(p, "e6")).mute, "⑥ back");
  await closeSheet(p);

  // ① the free hours sent
  await p.click("#calFind"); await p.waitForTimeout(700);
  await catchShare(p);
  await p.click('.cal5-free [data-k="free-120"]'); await p.waitForTimeout(400);
  await p.click('[data-k="free-share"]'); await p.waitForTimeout(300);
  let s1 = (await shared(p))[0];
  ok(s1 && s1.title === "空いている時間" && s1.text.split("\n")[0] === "空いている時間（2 時間以上）" && s1.text.split("\n")[1] === "11/17（火） 11:00〜22:00" && !s1.text.includes("11/16"), "① 2時間以上", s1);
  await p.click('.cal5-free [data-k="free--1"]'); await p.waitForTimeout(400);
  ok((await txt(p, '[data-k="free-share"]')) === "予定のない日を文字で送る", "① the days with nothing too");
  await p.click('[data-k="free-share"]'); await p.waitForTimeout(300);
  s1 = (await shared(p))[1];
  ok(s1 && s1.text.startsWith("予定のない日（11/16〜11/29）\n") && s1.text.includes("11/19（木）"), "① 予定のない日", s1);
  await closeSheet(p);

  // ⑧ by voice
  await p.click("#calAdd"); await p.waitForTimeout(700);
  ok((await p.getAttribute("#planSay", "placeholder")) === "お知らせのひとこと", "(その11 ② the field's name alone)");
  await p.evaluate(() => { window.webkitSpeechRecognition = window.SpeechRecognition = class { start() { setTimeout(() => { this.onresult({ results: [[{ transcript: "あした15時 歯医者" }]] }); this.onend(); }, 50); } stop() {} }; });
  await p.click("#cal12Mic"); await p.waitForTimeout(400);
  ok((await p.inputValue("#planTitle")) === "歯医者" && (await p.inputValue("#planDate")) === "2026-11-17" && (await p.inputValue("#planTime")) === "15:00" && (await p.inputValue("#planEndTime")) === "16:00", "⑧ heard and put in", [await p.inputValue("#planTitle"), await p.inputValue("#planDate"), await p.inputValue("#planTime")]);
  // ⑦ in a new plan's form, ③ saved
  await setVal(p, "planDate", today); await setVal(p, "planTime", "17:00"); await p.waitForTimeout(150);
  await p.selectOption("#planTravel", "30"); await p.waitForTimeout(200);
  ok(await p.isVisible("#planLate"), "⑦ said in a new plan's form", await txt(p, "#planLate"));
  await setVal(p, "planHome", "20:30"); await p.waitForTimeout(150);
  await p.click("#planSave"); await p.waitForTimeout(700);
  const made = (await ls(p, "events")).find((e) => e.title === "歯医者");
  ok(made && made.home === "20:30" && made.travel === 30, "③ saved", made);
  await closeSheet(p);

  // ⑨ countdown's notifications, from the gear
  await p.click("#calSettings"); await p.waitForTimeout(800);
  ok((await p.inputValue("#cal12Rain")) === "10" && (await txt(p, "#cal12RainFoot")).includes("10分早めます"), "② the gear", await txt(p, "#cal12RainFoot"));
  await p.click("#cal12CountOn"); await p.waitForTimeout(400);
  ok(JSON.stringify((await setting(p, "calendar")).count12) === '{"on":true,"at":"09:00","days":[7,1]}', "⑨ on", (await setting(p, "calendar")).count12);
  await p.click('#cal12CountDays [data-n="3"]'); await p.waitForTimeout(400);
  al = (await alarms(p)).filter((a) => a.tag.startsWith("cal-count:"));
  ok(al.map((a) => a.tag + "@" + iso(a)).sort().join(" ") === "cal-count:e7:2026-12-01:1@2026-11-30T00:00:00.000Z cal-count:e7:2026-12-01:3@2026-11-28T00:00:00.000Z cal-count:e7:2026-12-01:7@2026-11-24T00:00:00.000Z", "⑨ 7日前・3日前・前の日 at 9:00", al.map((a) => a.tag));
  ok(al.find((a) => a.tag.endsWith(":7")).title === "「旅行」まで、あと7日" && al.find((a) => a.tag.endsWith(":1")).title === "あしたは「旅行」", "⑨ their words");
  await closeSheet(p);
  ok(sigRain !== (await p.evaluate(() => window.__cal12.sig())), "the server is sent them again");
  ok(!p.errs.length, "no error on the way", p.errs);

  // ④ the timetable, during 1限
  p = await open("10:00");
  await p.evaluate(() => window.__cal12.tt()); await p.waitForTimeout(800);
  ok(nos(await txt(p, ".cal12-tt")) === "いま1限線形代数（A101）・10:30まで次3限英語（3号館201）・13:00から", "④ now and next", await txt(p, ".cal12-tt"));
  ok(await p.evaluate(() => document.getElementById("tt-1-1").classList.contains("cal12-now") && document.getElementById("tt-1-3").classList.contains("cal12-next")), "④ their cells marked");
  await closeSheet(p);
  p = await open("16:00");
  await p.evaluate(() => window.__cal12.tt()); await p.waitForTimeout(800);
  ok(nos(await txt(p, ".cal12-tt")) === "きょうの授業は終わり次は11/23（月）1限線形代数（A101）・09:00から", "④ after the day's", await txt(p, ".cal12-tt"));
  await closeSheet(p);
  ok(!p.errs.length, "no error on the way", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
