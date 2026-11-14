// バイト その7 ①②③⑥⑦⑧⑩: what is shown, and the お知らせ
process.env.URL0 = process.env.URL0 || "http://localhost:8867/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const T = (s) => Date.parse(s + "+09:00");
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(800);
  // ③ 日給 8,000; ⑥ 皆勤手当 3,000 and 寸志 5,000: 5,000 + 5,000 + 8,000 + 8,000 = 26,000
  const r3 = await txt(p, '#shiftList li:has([data-edit="n3"])');
  ok(r3.includes("日給 8,000円") && r3.includes("8,000 円"), "③ " + r3);
  const sum = await txt(p, "#jobSum");
  ok(/見込み 26,000\s?円/.test(sum) && /皆勤手当：\+3,000\s円/.test(sum) && /寸志：\+5,000\s円/.test(sum), "⑥ " + sum);
  ok(/1時間あたり 1,200\s円/.test(sum), "⑥ 1時間あたり without 手当・ボーナス: " + sum);
  // ⑦ November's pay on 12/28 (月) as it is
  ok(sum.includes("給料日 12月28日（月）"), "⑦ a weekday stays");
  // ② これまで: from 10/5, 2 回 (to today), 10 時間, 10,000, 950円 → 1,000円
  const tot = await txt(p, "#bt7Total");
  ok(tot.includes("これまでのバイト") && /10\/5から 1か月・2\s回・10\s時間/.test(tot) && /給料の見込みの合計 10,000\s円/.test(tot) && tot.includes("時給：950円 → 1,000円"), "② " + tot);
  // ①⑧ the お知らせ
  const al = await p.evaluate(() => window.__bt7.alarms(Date.now()).filter((a) => /^bt7-/.test(a.tag)).map((a) => ({ at: a.at, title: a.title, body: a.body, tag: a.tag })));
  const go = al.find((a) => a.tag === "bt7-go:n2:2026-11-27:17:00"), eve = al.find((a) => a.tag === "bt7-eve:2026-11-27");
  ok(go && go.at === T("2026-11-27T16:30:00") && go.title === "そろそろ家を出る時刻です" && go.body === "17:00 からカフェ（通勤 30 分）・持ち物：エプロン", "① " + JSON.stringify(go));
  ok(eve && eve.at === T("2026-11-26T21:00:00") && eve.title === "あしたは 17:00 からバイト" && eve.body === "17:00〜22:00　持ち物：エプロン", "⑧ " + JSON.stringify(eve));
  ok(al.some((a) => a.tag === "bt7-eve:2026-11-30" && a.at === T("2026-11-29T21:00:00")) && !al.some((a) => a.tag.includes("2026-12-10")), "⑧ the 7 days");
  // ⑦ October's pay: 11/28 (土) → 11/27 (金)
  await p.click("#monthNav .navbtn"); await p.waitForTimeout(400);
  ok((await txt(p, "#jobSum")).includes("給料日 11月27日（金）"), "⑦ the weekday before: " + (await txt(p, "#jobSum")));
  // ⑩ 12/10: 試験「数学」の2日前
  await p.click("#monthNav .navbtn:nth-of-type(2)"); await p.click("#monthNav .navbtn:nth-of-type(2)"); await p.waitForTimeout(400);
  ok((await txt(p, '#shiftList li:has([data-edit="x1"])')).includes("試験「数学」の2日前です"), "⑩ " + (await txt(p, '#shiftList li:has([data-edit="x1"])')));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
