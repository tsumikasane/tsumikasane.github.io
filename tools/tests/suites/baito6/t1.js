// バイト その6 ①③④⑤⑧⑩: what is shown, and pressed on the page (⑨ ふりかえり は使う人が消した: 2026-11-18)
process.env.URL0 = process.env.URL0 || "http://localhost:8866/";
const { chromium } = require("playwright");
const { P, at, phone, seed, shiftRow } = require("./lib");
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
  ok((await shiftRow(p, "n1")).includes("5,000 円"), "③ a shift without its 交通費");
  // ⑧ 仮: said, in the list, and settled at once
  ok(/仮のシフト 1\s回をふくみます。/.test(sum) && (await shiftRow(p, "n2")).includes("仮"), "⑧ 仮 said");
  ok(await p.evaluate(() => document.querySelector('#bt6Cal [data-day="2026-11-09"]').classList.contains("tent")), "⑧ dashed in the calendar");
  await p.click("#jobSum .bt6-tent .link-btn"); await p.waitForTimeout(500);
  ok(!("tentative" in (await ls(p, "shifts")).find((x) => x.id === "n2")) && !(await txt(p, "#jobSum")).includes("仮のシフト"), "⑧ ぜんぶ確定にする");
  ok(!(await p.$("#bt6Feel")) && !(await p.$("#bt6Bulk")), "⑨ ② gone");
  // ① the calendar: 3 days, a day pressed, この日に勤務を入れる
  const cal = await txt(p, "#bt6Cal");
  ok(cal.includes("11月の勤務カレンダー") && !/日・\d+\s*時間・/.test(cal) && !cal.includes("カレンダーの月で数えています") && (await txt(p, '#bt6Cal [data-day="2026-11-02"]')) === "2 5h", "① (the month's 3 日・15 時間・15,000 円 under it: taken out at the user's call, 2026-11-27) " + cal);
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
  const d1 = await shiftRow(p, "d1");
  ok(d1.includes("6,000 円"), "④ " + d1);
  await p.click("#monthNav .navbtn"); await p.waitForTimeout(400);
  // ⑩ the job's notes: in バイト's settings, under バイト先を追加 (a card on the page till 2026-11-28, moved at the user's call)
  const order = await p.evaluate(() => [...document.querySelectorAll("#moneyJob [id]")].map((x) => x.id).filter((id) => ["bt4Leave", "bt10AlarmsCard", "bt14People"].includes(id)).join());
  ok(!(await p.$("#moneyJob #bt6Notes")) && !(await txt(p, "#moneyJob")).includes("バイト先のメモ") && order === "bt4Leave,bt10AlarmsCard,bt14People", "⑩ no card on the page (the cards around it in their order)", order);
  await p.click("#moneySettings"); await p.waitForTimeout(600);
  const set = await p.evaluate(() => {
    const h = document.getElementById("bt6NotesHead"), heads = [...document.querySelectorAll("#jobGroup h3.group-head")].map((x) => x.textContent), add = document.querySelector("#jobGroup .job-add");
    return { head: h && !h.closest("[hidden]") ? h.textContent : null, after: !!add && !!(add.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING), next: heads[heads.indexOf("バイト先のメモ") + 1] };
  });
  ok(set.head === "バイト先のメモ" && set.after && set.next === "1年の目安" && (await p.inputValue('#bt6NotesBody textarea[data-job="j1"]')) === "レジ締めは22時", "⑩ in the settings, under バイト先を追加: shown", set);
  await p.fill('#bt6NotesBody textarea[data-job="j1"]', "レジ締めは22時\nロッカー 12番"); await p.waitForTimeout(1000);
  ok((await ls(p, "settings")).find((s) => s.id === "jobs").items[0].notes === "レジ締めは22時\nロッカー 12番", "⑩ kept");
  await p.fill('#bt6NotesBody textarea[data-job="j1"]', "ロッカー 12番"); await p.click("#sheetDone"); await p.waitForTimeout(400);
  ok((await ls(p, "settings")).find((s) => s.id === "jobs").items[0].notes === "ロッカー 12番", "⑩ kept as the sheet closes at once");
  await p.screenshot({ path: (process.argv[2] || __dirname) + "/baito6-job.png", fullPage: true });
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
