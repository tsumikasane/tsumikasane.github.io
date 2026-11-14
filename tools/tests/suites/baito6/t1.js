// バイト その6 ①③④⑤⑧⑨⑩: what is shown, and pressed on the page
process.env.URL0 = process.env.URL0 || "http://localhost:8866/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(800);
  // ③ November: 3 回 × 5,000 + 交通費 1か月 300 (not each time)
  let sum = await txt(p, "#jobSum");
  ok(/見込み 15,300\s?円/.test(sum) && /交通費（1か月分）：\+300\s円/.test(sum), "③ " + sum);
  ok((await txt(p, '#shiftList li:has([data-edit="n1"])')).includes("5,000 円"), "③ a shift without its 交通費");
  // ⑧ 仮: said, in the list, and settled at once
  ok(/仮のシフト 1\s回をふくみます。/.test(sum) && (await txt(p, '#shiftList li:has([data-edit="n2"])')).includes("仮"), "⑧ 仮 said");
  ok(await p.evaluate(() => document.querySelector('#bt6Cal [data-day="2026-11-09"]').classList.contains("tent")), "⑧ dashed in the calendar");
  await p.click("#jobSum .bt6-tent .link-btn"); await p.waitForTimeout(500);
  ok(!("tentative" in (await ls(p, "shifts")).find((x) => x.id === "n2")) && !(await txt(p, "#jobSum")).includes("仮のシフト"), "⑧ ぜんぶ確定にする");
  // ⑨ yesterday's shift asked about
  const fq = await txt(p, "#bt6Feel");
  ok(fq.includes("きのう 17:00〜22:00") && fq.includes("バイトは、どうだった？"), "⑨ asked: " + fq);
  await p.click('#bt6Feel [data-feel="hard"]'); await p.waitForTimeout(500);
  ok((await ls(p, "shifts")).find((x) => x.id === "n3").feel === "hard" && await p.isHidden("#bt6Feel"), "⑨ kept");
  ok(/ふりかえり：しんどかった 1/.test(await txt(p, "#jobSum")) && (await txt(p, '#shiftList li:has([data-edit="n3"])')).includes("しんどかった"), "⑨ said in the month");
  // ① the calendar: 3 days, a day pressed, この日に勤務を入れる
  const cal = await txt(p, "#bt6Cal");
  ok(cal.includes("11月の勤務カレンダー") && /3 日・15\s時間・15,000\s円/.test(cal) && (await txt(p, '#bt6Cal [data-day="2026-11-02"]')) === "2 5h", "① " + cal);
  ok(await p.evaluate(() => document.querySelector('#bt6Cal [data-day="2026-11-02"]').classList.contains("lv2")), "① tinted by its hours");
  await p.click('#bt6Cal [data-day="2026-11-02"]'); await p.waitForTimeout(300);
  ok((await txt(p, "#bt6Cal .bt6-cal-day")).includes("17:00〜22:00"), "① the day's shifts");
  await p.click("#bt6Cal .bt6-cal-day .link-btn:last-child"); await p.waitForTimeout(300);
  ok((await p.inputValue("#shiftDate")) === "2026-11-02", "① この日に勤務を入れる");
  // ⑤ the second mark: 15,300 in 2026 (11月分, paid 12/25)
  const yr = await txt(p, "#jobYear");
  ok(/130万の壁（1,300,000\s円）まで、あと 1,284,700\s円/.test(yr) && yr.includes("目安の 1,030,000 円"), "⑤ " + yr);
  // ④ 12/30: +200円 an hour
  await p.click("#monthNav .navbtn:nth-of-type(2)"); await p.waitForTimeout(400);
  ok((await txt(p, '#shiftList li:has([data-edit="d1"])')).includes("6,000 円"), "④ " + (await txt(p, '#shiftList li:has([data-edit="d1"])')));
  await p.click("#monthNav .navbtn"); await p.waitForTimeout(400);
  // ⑩ the job's notes
  await p.click("#bt6Notes summary"); await p.waitForTimeout(300);
  ok((await p.inputValue('#bt6NotesBody textarea[data-job="j1"]')) === "レジ締めは22時" && (await txt(p, "#bt6NotesHead")) === "バイト先のメモ（1）", "⑩ shown");
  await p.fill('#bt6NotesBody textarea[data-job="j1"]', "レジ締めは22時\nロッカー 12番"); await p.waitForTimeout(1000);
  ok((await ls(p, "settings")).find((s) => s.id === "jobs").items[0].notes === "レジ締めは22時\nロッカー 12番", "⑩ kept");
  await p.screenshot({ path: (process.argv[2] || __dirname) + "/baito6-job.png", fullPage: true });
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
