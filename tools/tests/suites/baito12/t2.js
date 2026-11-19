// バイト その12 ①⑤⑥⑦⑧: what is pressed and typed (⑩ と ⑦ のシフト希望、③ ふりかえり は使う人が消した: 2026-11-18; ② 退勤のまとめ と
// ⑨ 予定の終わりで退勤 は出勤・退勤といっしょに)
process.env.URL0 = process.env.URL0 || "http://localhost:8863/";
const fs = require("fs");
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setting = async (p, id) => (await ls(p, "settings")).find((s) => s.id === id);
const job = async (p, id) => (await setting(p, "jobs")).items.find((j) => j.id === id);
const shift = async (p, id) => (await ls(p, "shifts")).find((x) => x.id === id);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today), { acceptDownloads: true });
  await p.addInitScript(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true }); window.__copied = ""; Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true }); });
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  // ⑤ 遅れる: the time kept as typed while drawn again; 休む
  await p.click('#bt3Next [data-msg="late"]'); await p.waitForTimeout(200);
  ok((await p.inputValue('#bt3Next .bt12-msg [data-m="at"]')) === "17:15" && (await p.inputValue('#bt3Next .bt12-msg [data-m="why"]')) === "train", "⑤ late's panel");
  await p.fill('#bt3Next .bt12-msg [data-m="at"]', "17:30");
  await p.click("#monthNav .navbtn >> nth=1"); await p.waitForTimeout(300); await p.click("#monthNav .navbtn >> nth=0"); await p.waitForTimeout(300); // (drawn again: その9 ⑩ 選ぶ taken out 2026-11-19)
  ok((await p.inputValue('#bt3Next .bt12-msg [data-m="at"]')) === "17:30", "⑤ kept as typed");
  await p.click('#bt3Next .bt12-msg [data-m="send"]'); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__copied)) === "おつかれさまです。きょう 17:00〜22:00のシフトですが、電車が遅れていて、17:30ごろの到着になりそうです。ご迷惑をおかけして、すみません。", "⑤ late: " + (await p.evaluate(() => window.__copied)));
  await p.click('#bt3Next [data-msg="off"]'); await p.waitForTimeout(200);
  await p.click('#bt3Next .bt12-msg [data-m="send"]'); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__copied)) === "おつかれさまです。きょう 17:00〜22:00のシフトですが、体調が悪く、お休みさせていただけないでしょうか。急な連絡になってしまい、申し訳ありません。", "⑤ off: " + (await p.evaluate(() => window.__copied)));
  // ⑧ the .ics: the shift's own place
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#bt11Ics")]);
  const ev = fs.readFileSync(await dl.path(), "utf8").split("BEGIN:VEVENT").find((e) => e.includes("UID:p1@")) || "";
  ok(ev.includes("LOCATION:新宿店（ヘルプ）"), "⑧ .ics: " + JSON.stringify(ev));
  // ⑨② 予定の終わりで退勤 and 退勤のまとめ: gone with 出勤・退勤 (2026-11-19)
  ok(!(await p.$("#bt2Clock")) && !(await p.$("#bt12PlanOut")) && !(await p.$(".bt12-done")), "⑨② gone");
  // ③ ふりかえり, no more in the sheet; one kept on a shift stays as the shift is changed there
  await p.click('#shiftList [data-edit="f6"]'); await p.waitForTimeout(500);
  ok(!(await p.$("#reShiftFeel")), "③ none in the sheet");
  await p.fill("#reShiftMemo", "片づけ"); await p.locator("#recSave").click(); await p.waitForTimeout(600);
  const f6 = await shift(p, "f6");
  ok(f6.feel === "good" && f6.memo === "片づけ", "③ its ふりかえり kept: " + JSON.stringify(f6));
  // ⑥ c1 changed again in the sheet: both kept
  await p.click('#shiftList [data-edit="c1"]'); await p.waitForTimeout(500);
  ok((await txt(p, ".bt12-changes")) === "変更の記録 11/20 に変更：前は 11/21（土） 18:00〜22:00", "⑥ in the sheet: " + (await txt(p, ".bt12-changes")));
  await p.fill("#reStart", "18:30"); await p.locator("#recSave").click(); await p.waitForTimeout(600);
  const c1 = await shift(p, "c1");
  ok(c1.start === "18:30" && c1.changes.length === 2 && c1.changes[1].start === "17:00" && c1.changes[1].date === "2026-11-21", "⑥ kept: " + JSON.stringify(c1.changes));
  ok((await txt(p, '#shiftList li[data-shift="c1"]')).includes("変更あり（前は 17:00〜22:00）"), "⑥ the row");
  // ⑧ p1: the 交通費 back to the job's, the place kept, no change kept
  await p.click('#shiftList [data-edit="p1"]'); await p.waitForTimeout(500);
  ok((await p.inputValue("#reShiftFare")) === "500" && (await p.inputValue("#reShiftPlace")) === "新宿店（ヘルプ）", "⑧ in the sheet");
  await p.fill("#reShiftFare", ""); await p.locator("#recSave").click(); await p.waitForTimeout(600);
  const p1 = await shift(p, "p1");
  ok(!("fare" in p1) && p1.place === "新宿店（ヘルプ）" && !("changes" in p1) && (await txt(p, '#shiftList li[data-shift="p1"]')).includes("5,300 円"), "⑧ " + JSON.stringify(p1));
  // ⑦ a shift on a Wednesday: said as it goes in
  await p.clock.setFixedTime(at("22:31", today));
  await p.fill("#shiftDate", "2026-12-02"); await p.fill("#shiftStart", "17:00"); await p.fill("#shiftEnd", "22:00"); await p.fill("#shiftRest", "0");
  await p.locator('#shiftForm button[type="submit"]').click(); await p.waitForTimeout(500);
  ok((await txt(p, "#status")).includes("カフェの定休日（水曜）の勤務です。日付をたしかめてください"), "⑦ said: " + (await txt(p, "#status")));
  // ⑦ the 定休日 changed in the job's form; ① off
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  await p.uncheck('#jobForms [data-job="j1"] [data-f="closed"][value="3"]'); await p.check('#jobForms [data-job="j1"] [data-f="closed"][value="1"]'); await p.waitForTimeout(700);
  ok(JSON.stringify((await job(p, "j1")).closed) === "[1]", "⑦ 月曜 now: " + JSON.stringify((await job(p, "j1")).closed));
  await p.click("#bt12CutOn"); await p.waitForTimeout(300);
  ok((await setting(p, "bt12")).cutOn === false && !(await p.evaluate(() => window.__bt12.alarms(Date.now()).some((a) => a.tag.startsWith("bt12-cut")))), "① off");
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
