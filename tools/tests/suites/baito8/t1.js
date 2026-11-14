// バイト その8 ①②③⑤⑥⑦⑧⑩: what is shown, and the お知らせ
process.env.URL0 = process.env.URL0 || "http://localhost:8868/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
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
  // ⑤ 30 分 longer than planned; ⑧ 手取り at 97%; ⑩ 12/1 から 1,100円
  ok(/予定より 長く 30\s分（1 回） 働きました/.test(sum), "⑤ " + sum);
  ok(/手取りの見込み 約 [\d,]+\s円（明細の手取りの割合 97%）/.test(sum), "⑧");
  ok(sum.includes("12/1から 時給 1,100円になります"), "⑩ said");
  // ⑦ 休みの日: 10 days of shifts in November
  const cal = await txt(p, "#bt6Cal");
  ok(/11月の休み 20\s日・/.test(cal) && cal.includes("次の休みは きょう"), "⑦ " + cal);
  // ① records
  const rec = await txt(p, "#bt8Records");
  ok(rec.includes("バイトの記録") && /いちばん長い勤務 9\s時間（11\/14 09:00〜19:00）/.test(rec) && /いちばん長い連勤 3\s日（11\/12〜11\/14）/.test(rec) && rec.includes("いちばん働いた月 11月"), "① " + rec);
  // ②③ the hours of the day, the days of the week
  const ways = await txt(p, "#bt8Ways");
  ok(ways.includes("いちばん多い時間帯は 夜（18〜22時）です。") && /月曜日 8\s回/.test(ways) && /木曜日 8\s回/.test(ways), "②③ " + ways);
  // ⑥ 出勤の押し忘れ: 10 minutes after tomorrow's 17:00
  const al = await p.evaluate(() => window.__bt8.alarms(Date.now()).filter((a) => String(a.tag).startsWith("bt8-in:")));
  const t27 = al.find((a) => a.tag === "bt8-in:t27:2026-11-27:17:00");
  ok(t27 && t27.at === Date.parse("2026-11-27T17:10:00+09:00") && t27.title === "出勤を押しましたか？" && al.some((a) => a.tag.startsWith("bt8-in:d03:")), "⑥ " + JSON.stringify(t27));
  // ⑥ not once 出勤 is pressed for it
  await p.evaluate(({ P }) => { const s = JSON.parse(localStorage.getItem(P + "settings")); s.push({ id: "bt2Clock", jobId: "j1", date: "2026-11-27", start: "16:55", at: 1, updatedAt: 1 }); localStorage.setItem(P + "settings", JSON.stringify(s)); }, { P });
  await p.reload(); await p.waitForTimeout(800);
  ok(!(await p.evaluate(() => window.__bt8.alarms(Date.now()).some((a) => a.tag === "bt8-in:t27:2026-11-27:17:00"))), "⑥ 出勤 pressed: none");
  // ⑩ 12/3 at 1,100円
  await p.click("#monthNav .navbtn:nth-of-type(2)"); await p.waitForTimeout(400);
  ok((await txt(p, '#shiftList li:has([data-edit="d03"])')).includes("5,500 円"), "⑩ 12/3: " + (await txt(p, '#shiftList li:has([data-edit="d03"])')));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
