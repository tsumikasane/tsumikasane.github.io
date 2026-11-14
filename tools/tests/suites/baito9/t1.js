// バイト その9 ①③④⑤⑥⑦⑧⑨: what is shown
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
  // ④ at work since 10:00: 2 時間 × 1,000 so far, 3 時間 to 15:00
  const ck = await txt(p, "#bt2Clock");
  ok(/ここまで 約 2,000\s円・予定の終わり（15:00）まで あと 3\s時間/.test(ck), "④ " + ck);
  // ⑥ 祝日, ⑤ 重なり
  ok((await txt(p, '#shiftList li:has([data-edit="h23"])')).includes("祝日（勤労感謝の日）"), "⑥");
  ok((await txt(p, '#shiftList li:has([data-edit="o1"])')).includes("ほかの勤務（14:00〜16:00）と重なっています") && (await txt(p, '#shiftList li:has([data-edit="o2"])')).includes("ほかの勤務（10:00〜15:00）と重なっています"), "⑤");
  ok(!(await txt(p, '#shiftList li:has([data-edit="a1"])')).includes("重なって"), "⑤ not on the others");
  // ⑨ カフェ's November: 28 時間 × 1,000 + 深夜 1 時間 × 250 + 交通費 6 × 300 = 30,050
  const blk = (await p.$$("#jobSum .job-block"))[0];
  await blk.evaluate((b) => { b.querySelector("details.bt9-parts").open = true; });
  const parts = await blk.evaluate((b) => [...b.querySelectorAll("details.bt9-parts li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()));
  ok(JSON.stringify(parts) === JSON.stringify(["基本（時給 × 時間） 28,000 円", "深夜の割増 250 円", "交通費 1,800 円", "合計 30,050 円"]), "⑨ " + JSON.stringify(parts));
  // ⑦ 塾 ended: not in the form's menu
  ok(await p.evaluate(() => [...document.querySelectorAll("#shiftJob option")].map((o) => o.value).join(",")) === "j1" && await p.isHidden("#shiftJobField"), "⑦ the form: カフェ alone");
  // ① the jobs side by side: 塾 at 1,500 an hour the best
  const cmp = await txt(p, "#bt9Cmp");
  ok(cmp.includes("バイト先をくらべる（この3か月）") && /塾 1時間あたりがいちばん 3\s回・9\s時間・13,500\s円 1時間あたり 1,500\s円/.test(cmp), "① " + cmp);
  // ③ the mark: 1 month left
  ok((await txt(p, "#jobYear")).includes("目安をこえないには、のこり 1 か月分（11月分まで）で"), "③ " + (await txt(p, "#jobYear")));
  // ⑧ the year: 8 days
  const heat = await p.evaluate(() => ({ on: document.querySelectorAll("#bt9Heat .bt9-heat i:not(.lv0):not(.pad)").length, t: document.getElementById("bt9Heat").innerText.replace(/\s+/g, " ") }));
  ok(heat.on === 8 && /働いた日 8\s日/.test(heat.t) && heat.t.includes("2026年の勤務"), "⑧ " + JSON.stringify(heat));
  // ⑦ December: 塾's block not shown
  await p.click("#monthNav .navbtn:nth-of-type(2)"); await p.waitForTimeout(400);
  ok(!(await txt(p, "#jobSum")).includes("塾"), "⑦ 塾 gone from December: " + (await txt(p, "#jobSum")));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
