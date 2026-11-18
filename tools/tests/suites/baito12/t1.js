// バイト その12 ①③④⑤⑥⑦⑧: what is shown (⑩ と ⑦ のシフト希望は使う人が消した: 2026-11-18)
process.env.URL0 = process.env.URL0 || "http://localhost:8863/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const row = (p, id) => txt(p, `#shiftList li[data-shift="${id}"]`);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  // ⑤ 次のバイト: both
  ok((await txt(p, "#bt3Next .bt12-acts")) === "遅れる連絡 休む連絡", "⑤ " + (await txt(p, "#bt3Next .bt12-acts")));
  // ③ ふりかえりの傾向
  const fl = await txt(p, "#bt12Feel");
  ok(fl === "ふりかえりの傾向（この3か月） 6 回：よかった 2・ふつう 1・しんどかった 3 しんどかったが多いのは 金曜（4 回のうち 3 回）・夜の勤務（4 回のうち 3 回）・カフェ（6 回のうち 3 回）", "③ " + fl);
  // ④ 58,000 − (3,980 + 1,200)
  const cs = await txt(p, "#bt12Cost");
  ok(cs === "バイトのためにかかったお金（2026年） バイト代の見込み 58,000 円 − かかったお金 5,180 円 = 差し引き 52,820 円 11/5 黒いくつ 3,980 円 10/12 タクシー 1,200 円 家計簿に入れる（#バイト）", "④ " + cs);
  // ⑥⑦⑧ the rows
  ok((await row(p, "c1")).includes("変更あり（前は 18:00〜22:00）"), "⑥ " + (await row(p, "c1")));
  ok((await row(p, "w1")).includes("カフェの定休日（水曜）の勤務") && (await row(p, "h1")).includes("カフェの定休日（祝日）の勤務") && !(await row(p, "n1")).includes("定休日") && !(await row(p, "s1")).includes("定休日"), "⑦ the rows");
  const p1 = await row(p, "p1");
  ok(p1.includes("場所：新宿店（ヘルプ）・交通費 500円") && p1.includes("5,500 円"), "⑧ " + p1);
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
