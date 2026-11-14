// バイト その6 ②③④⑤⑥⑦⑧⑨: what is typed in
process.env.URL0 = process.env.URL0 || "http://localhost:8866/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setting = async (p, id) => (await ls(p, "settings")).find((s) => s.id === id);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(800);
  // ⑥ a pattern's button fills in the form; ひとことで, by its name
  ok((await txt(p, "#bt6Pats")) === "早番 9:00〜14:00", "⑥ the buttons: " + (await txt(p, "#bt6Pats")));
  await p.click('#bt6Pats [data-pat="p1"]'); await p.waitForTimeout(200);
  ok((await p.inputValue("#shiftStart")) === "09:00" && (await p.inputValue("#shiftEnd")) === "14:00" && (await p.inputValue("#shiftRest")) === "30", "⑥ filled in");
  await p.fill("#bt3QuickText", "あした 早番"); await p.waitForTimeout(200);
  ok((await txt(p, "#bt3QuickSay")).includes("11/27（金） 09:00〜14:00・休憩 30分"), "⑥ ひとことで: " + (await txt(p, "#bt3QuickSay")));
  // ⑧ 仮 from the words and from the form
  await p.fill("#bt3QuickText", "11/28 17-22 仮"); await p.waitForTimeout(200);
  ok((await txt(p, "#bt3QuickSay")).includes("17:00〜22:00・仮"), "⑧ ひとことで 仮: " + (await txt(p, "#bt3QuickSay")));
  await p.press("#bt3QuickText", "Enter"); await p.waitForTimeout(400);
  ok((await ls(p, "shifts")).some((x) => x.date === "2026-11-28" && x.tentative === true), "⑧ put in as 仮");
  await p.fill("#shiftDate", "2026-11-29"); await p.fill("#shiftStart", "10:00"); await p.fill("#shiftEnd", "14:00"); await p.evaluate(() => { document.getElementById("shiftTent").checked = true; }); // (the toast may lie over it)
  await p.locator('#shiftForm button[type="submit"]').click(); await p.waitForTimeout(500);
  ok((await ls(p, "shifts")).some((x) => x.date === "2026-11-29" && x.tentative === true), "⑧ the form's 仮");
  // ⑧⑨ in the sheet
  await p.click('#shiftList [data-edit="n1"]'); await p.waitForTimeout(500);
  await p.evaluate(() => { document.getElementById("reShiftTent").checked = true; }); await p.selectOption("#reShiftFeel", "good"); await p.locator("#recSave").click(); await p.waitForTimeout(600);
  let n1 = (await ls(p, "shifts")).find((x) => x.id === "n1");
  ok(n1.tentative === true && n1.feel === "good", "⑧⑨ the sheet: " + JSON.stringify(n1));
  await p.click('#shiftList [data-edit="n1"]'); await p.waitForTimeout(500);
  await p.evaluate(() => { document.getElementById("reShiftTent").checked = false; }); await p.selectOption("#reShiftFeel", ""); await p.locator("#recSave").click(); await p.waitForTimeout(600);
  n1 = (await ls(p, "shifts")).find((x) => x.id === "n1");
  ok(!("tentative" in n1) && !("feel" in n1), "⑧⑨ taken off");
  // ② lines of words: the month, days alone, a pattern, 仮; one not read, one there already
  await p.click("#bt6Bulk summary"); await p.waitForTimeout(300);
  await p.fill("#bt6BulkText", "12月のシフト\n1(火) 17:00-22:00\n3(木) 早番\n12/6 10-15 休憩45 仮\nよろしくお願いします\n11/2 17-22");
  await p.waitForTimeout(300);
  const out = await p.evaluate(() => [...document.querySelectorAll("#bt6BulkOut li")].map((li) => li.className + "|" + li.innerText.replace(/\s+/g, " ")));
  ok(out.length === 5 && out[0].includes("12/1（火） 17:00〜22:00") && out[1].includes("12/3（木） 09:00〜14:00・休憩 30分") && out[2].includes("12/6（日） 10:00〜15:00・休憩 45分・仮") && out[3].startsWith("bad|") && out[4].startsWith("dup|"), "② read: " + JSON.stringify(out));
  ok((await p.textContent("#bt6BulkGo")) === "3 件を入れる", "② the button");
  await p.click("#bt6BulkGo"); await p.waitForTimeout(500);
  const dec = (await ls(p, "shifts")).filter((x) => x.date >= "2026-12-01" && x.date <= "2026-12-06").sort((a, c) => a.date.localeCompare(c.date));
  ok(dec.length === 3 && dec[0].start === "17:00" && dec[1].rest === 30 && dec[1].start === "09:00" && dec[2].rest === 45 && dec[2].tentative === true, "② put in: " + JSON.stringify(dec.map((x) => [x.date, x.start, x.end, x.rest, x.tentative])));
  // ⑦ 退勤のつけ忘れ: 出勤 at 11:00 with no shift today → 20:00
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  await p.evaluate(() => { const c = document.getElementById("bt6OutOn"); c.checked = true; c.dispatchEvent(new Event("change")); }); await p.waitForTimeout(300);
  ok((await setting(p, "bt6")).outOn === true, "⑦ on");
  // ⑥ a pattern added in the settings
  await p.fill("#bt6PatName", "遅番"); await p.fill("#bt6PatStart", "17:00"); await p.fill("#bt6PatEnd", "22:00"); await p.click('#bt6PatForm button[type="submit"]'); await p.waitForTimeout(400);
  ok((await setting(p, "bt6")).pats.map((x) => x.name).join(",") === "早番,遅番", "⑥ added");
  // ③ 交通費の数え方, ④ 期間の時給アップ, ⑤ もう1つの目安
  const f = '#jobForms [data-job="j1"]';
  ok((await p.inputValue(`${f} [data-f="fareMode"]`)) === "month" && (await txt(p, `${f} .bt6-periods`)).includes("12/29〜1/3 ＋200円"), "③④ the job's form");
  await p.selectOption(`${f} [data-f="fareMode"]`, ""); await p.waitForTimeout(600);
  ok(!("fareMode" in (await setting(p, "jobs")).items[0]), "③ each time again");
  const pr = `${f} .bt6-periods .bt2-wage-add`;
  await p.fill(`${pr} input[type="date"]:nth-of-type(1)`, "2027-01-04"); await p.fill(`${pr} input[type="date"]:nth-of-type(2)`, "2027-01-05"); await p.fill(`${pr} input[type="number"]`, "100");
  await p.click(`${pr} .btn`); await p.waitForTimeout(500);
  ok(JSON.stringify((await setting(p, "jobs")).items[0].periods) === JSON.stringify([{ from: "2026-12-29", to: "2027-01-03", plus: 200 }, { from: "2027-01-04", to: "2027-01-05", plus: 100 }]), "④ added: " + JSON.stringify((await setting(p, "jobs")).items[0].periods));
  ok((await p.inputValue("#bt6Wall2")) === "1300000" && (await p.inputValue("#bt6Wall2Name")) === "130万の壁", "⑤ in the settings");
  await p.fill("#bt6Wall2", "1500000"); await p.fill("#bt6Wall2Name", "150万"); await p.dispatchEvent("#bt6Wall2Name", "change"); await p.waitForTimeout(400);
  const js = await setting(p, "jobs");
  ok(js.wall2 === 1500000 && js.wall2Name === "150万" && js.wall === 1030000, "⑤ saved: " + JSON.stringify([js.wall, js.wall2, js.wall2Name]));
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  // ⑦ the お知らせ
  await p.evaluate(({ P, at }) => { const s = JSON.parse(localStorage.getItem(P + "settings")); s.push({ id: "bt2Clock", jobId: "j1", date: "2026-11-26", start: "11:00", at, updatedAt: at }); localStorage.setItem(P + "settings", JSON.stringify(s)); }, { P, at: Date.parse("2026-11-26T11:00:00+09:00") });
  await p.reload(); await p.waitForTimeout(800);
  const al = await p.evaluate(() => window.__bt6.alarms(Date.now()).filter((a) => String(a.tag).startsWith("bt6-out:")));
  ok(al.length === 1 && al[0].at === Date.parse("2026-11-26T20:00:00+09:00") && al[0].title === "退勤のつけ忘れはありませんか？" && al[0].body === "きょう 11:00 からカフェで出勤中になっています", "⑦ " + JSON.stringify(al));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
