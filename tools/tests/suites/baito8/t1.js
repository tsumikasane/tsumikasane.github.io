// バイト その8 ⑤⑦⑧: what is shown (①②③ and ⑩ taken out 2026-11-19, the user's call; ⑥ 出勤の押し忘れ went with 出勤・退勤)
process.env.URL0 = process.env.URL0 || "http://localhost:8868/";
const { chromium } = require("playwright");
const { P, at, phone, seed, shiftRow } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  const sum = await txt(p, "#jobSum");
  // ⑤ 30 分 longer than planned; ⑧ 手取り at 97%; ⑩ これから時給が変わる日: no more said (taken out 2026-11-19)
  ok(/予定より 長く 30\s分（1 回） 働きました/.test(sum), "⑤ " + sum);
  ok(/手取りの見込み 約 [\d,]+\s円（明細の手取りの割合 97%）/.test(sum), "⑧");
  ok(!sum.includes("時給 1,100円になります"), "⑩ not said");
  // ⑦ 休みの日 under 勤務カレンダー: the month's ○月の休み ○ 日 (and 次の休みは ○ から（この先の勤務はまだ入っていません）) taken out
  // at the user's call (2026-11-27, tools/REMOVED.md); 次の休みは ○ (and ○ から ○ 連休) back at the user's call the same day
  const cal = await txt(p, "#bt6Cal");
  ok(cal.includes("11月の勤務カレンダー") && !cal.includes("の休み ") && !cal.includes("この先の勤務はまだ入っていません") && (await txt(p, "#bt6Cal .bt8-off")) === "次の休みは きょう", "⑦ 次の休みは きょう alone: " + cal);
  // ① バイトの記録 and ②③ 働き方: taken out at the user's call (2026-11-19, tools/REMOVED.md)
  ok(!(await p.$("#bt8Records")) && !(await p.$("#bt8Ways")), "①②③ バイトの記録・働き方: gone");
  // ⑥ 出勤の押し忘れ: gone with 出勤・退勤 (no お知らせ)
  ok(!(await p.evaluate(() => window.__bt8.alarms(Date.now()).some((a) => String(a.tag).startsWith("bt8-in:")))), "⑥ none");
  // ⑩ 12/3 at the job's own 1,000円 (wageNext kept, not read)
  await p.click("#monthNav .navbtn:nth-of-type(2)"); await p.waitForTimeout(400);
  const d03 = await shiftRow(p, "d03");
  ok(d03.includes("5,000 円"), "⑩ 12/3: " + d03);
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
