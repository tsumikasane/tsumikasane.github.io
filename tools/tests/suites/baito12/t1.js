// バイト その12 ①⑤⑥⑦⑧: what is shown (⑩ と ⑦ のシフト希望、③ ふりかえりの傾向 と ④ かかったお金 は使う人が消した: 2026-11-18;
// ⑥⑦⑧ の勤務の行のことばは、勤務の一覧といっしょに: 2026-11-26)
process.env.URL0 = process.env.URL0 || "http://localhost:8863/";
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
  // ⑤ 次のバイト: both
  ok(!(await p.$("#bt3Next .bt12-acts")) && !(await txt(p, "#bt3Next")).includes("連絡"), "⑤ 遅れる・休む連絡: taken out at the user's call (2026-11-27, tools/REMOVED.md)");
  ok(!(await p.$("#bt12Feel")) && !(await p.$("#bt12Cost")) && !(await shiftRow(p, "f5")).includes("しんどかった"), "③④ gone; no ふりかえり on a row");
  // ⑥ 変更あり（前は…）, ⑦ ○○の定休日（水曜）の勤務, ⑧ 場所：… on each shift's row: went with the month's list at the user's
  // call (2026-11-26, tools/REMOVED.md); ⑧ its pay with its own 交通費, in 勤務カレンダー's day
  const p1 = await shiftRow(p, "p1");
  ok(p1.includes("5,500 円"), "⑧ " + p1);
  // ① 締め日: カフェ 11/30, 塾 12/15, at 21:00
  const al = await p.evaluate(() => window.__bt12.alarms(Date.now()).filter((a) => a.tag.startsWith("bt12-cut")).map((a) => ({ tag: a.tag, at: new Date(a.at).toISOString(), title: a.title, body: a.body })));
  const c = al.find((a) => a.tag === "bt12-cut:j1:2026-11-30"), j = al.find((a) => a.tag === "bt12-cut:j2:2026-12-15");
  ok(al.length === 2 && c && c.at === "2026-11-30T12:00:00.000Z" && c.title === "きょうはカフェの締め日です" && c.body === "11月分（11/1〜11/30）は 7 回・33 時間・見込み 約 35,300円。入れ忘れた勤務はありませんか？", "① カフェ: " + JSON.stringify(al));
  ok(j && j.at === "2026-12-15T12:00:00.000Z" && j.body.startsWith("12月分（11/16〜12/15）は 1 回・3 時間・見込み 約 4,500円"), "① 塾: " + JSON.stringify(j));
  // ①⑦ the settings
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  const f = await p.evaluate(() => ({ on: document.getElementById("bt12CutOn").checked, at: document.getElementById("bt12CutAt").value,
    wd: [...document.querySelectorAll('#jobForms [data-job="j1"] [data-f="closed"]')].filter((b) => b.checked).map((b) => b.value), hol: document.querySelector('#jobForms [data-job="j1"] [data-f="closedHol"]').checked,
    wd2: [...document.querySelectorAll('#jobForms [data-job="j2"] [data-f="closed"]')].filter((b) => b.checked).length }));
  ok(f.on && f.at === "21:00" && JSON.stringify(f.wd) === '["3"]' && f.hol && f.wd2 === 0, "①⑦ the settings: " + JSON.stringify(f));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
