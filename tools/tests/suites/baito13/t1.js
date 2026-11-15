// バイト その13 ①②③④⑥⑦⑧⑨: what is shown
process.env.URL0 = process.env.URL0 || "http://localhost:8864/";
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
  // ② 冬休み: 11月の 4 回 × 5,300 + 塾 4,500 = 25,700; 11/20 のぶん 5,300 をふくめて 31,000
  const g = await txt(p, "#bt13Goal");
  ok(g === "期間の目標 足す 冬休み 11/1〜11/30・目標 50,000 円 いま 25,700 円（予定をふくめると 31,000 円） あと 19,000 円（時給 1,000円で 約 19 時間）", "② " + g);
  ok(await p.evaluate(() => { const b = document.querySelector('#bt13Goal [data-goal="g1"] .bt13-bar'); return b.querySelector("i.done").style.width === "51%" && b.querySelector("i.plan").style.width === "62%"; }), "② the bar");
  // ⑥ 代わりの貸し借り: 田中 1 and 1, 佐藤 1 and 0
  const sw = await txt(p, "#bt13Swap");
  ok(sw.startsWith("代わりの貸し借り（この1年） 田中 代わりに入った 1 回・代わってもらった 1 回 おあいこ 佐藤 代わりに入った 1 回・代わってもらった 0 回 入ったほうが 1 回多い"), "⑥ " + sw);
  ok((await txt(p, '#shiftList li[data-shift="r1"]')).includes("代わり：田中さん"), "⑥ the row");
  // ⑦⑧ がんばりの記録
  const m = await txt(p, "#bt13Miles");
  ok(m === "がんばりの記録 通算 32 回・158 時間・約 168,800 円 おめでとうございます！ 通算 30 回をこえました 休まず続けて 8 回出勤しています（いちばん長いのは 24 回） 次は 通算 50 回（あと 18 回）・通算 200 時間（あと 42 時間）・合計 30万円（あと 131,200 円）", "⑦⑧ " + m);
  // ⑨ the week: 11/15〜11/21
  const wk = await p.evaluate(() => {
    const box = document.getElementById("bt13Week"), day = (d) => [...box.querySelectorAll(".bt13-day")][d];
    const bars = (d) => [...day(d).querySelectorAll(".bt13-track i")].map((i) => [i.className, i.style.left, i.style.width, /--lc-(\w+)/.exec(i.getAttribute("style") || "")?.[1] || ""]);
    return { head: box.querySelector(".bt13-week-head strong").textContent, mon: bars(1), tue: bars(2), wed: bars(3), thu: bars(4), fri: bars(5), sat: bars(6), today: day(3).classList.contains("today"),
      label: day(2).getAttribute("aria-label"), legend: box.querySelector(".bt13-legend").innerText.replace(/\s+/g, " ").trim(), sum: box.querySelector("p.sub").textContent.replace(/\s+/g, " ") };
  });
  ok(wk.head === "11/15〜11/21の勤務" && wk.mon.length === 0 && wk.today, "⑨ the head: " + JSON.stringify(wk));
  ok(JSON.stringify(wk.tue) === JSON.stringify([["bt13-shift", "75%", "12.5%", "green"]]) && JSON.stringify(wk.wed) === JSON.stringify([["bt13-shift", "70.83%", "20.83%", "blue"]]), "⑨ 塾 and カフェ: " + JSON.stringify([wk.tue, wk.wed]));
  ok(JSON.stringify(wk.thu) === JSON.stringify([["bt13-plan", "54.17%", "8.33%", ""]]) && JSON.stringify(wk.fri) === JSON.stringify([["bt13-shift", "91.67%", "8.33%", "blue"]]) && JSON.stringify(wk.sat) === JSON.stringify([["bt13-shift", "0%", "8.33%", "blue"]]), "⑨ ゼミ, and past midnight: " + JSON.stringify([wk.thu, wk.fri, wk.sat]));
  ok(wk.label === "11/17（火）：塾 18:00〜21:00" && wk.legend === "カフェ 塾 カレンダーの予定" && wk.sum === "この週 3 回・12 時間・約 15,100 円", "⑨ words: " + JSON.stringify([wk.label, wk.legend, wk.sum]));
  // ①④ お知らせ: 来週のぶん (金曜 20:00), 11/19〜11/21 は休む
  const al = await p.evaluate(() => window.__bt13.alarms(Date.now()).filter((a) => a.url === "./#job").map((a) => [a.tag, new Date(a.at).toISOString()]));
  const tags = al.map((a) => a[0]);
  ok(!tags.includes("bt13-next:2026-11-22") && !tags.includes("bt7-eve:2026-11-20"), "④ held: " + JSON.stringify(al));
  ok(JSON.stringify(al.find((a) => a[0] === "bt13-next:2026-12-06")) === JSON.stringify(["bt13-next:2026-12-06", "2026-12-04T11:00:00.000Z"]) && !tags.includes("bt13-next:2026-11-29"), "① the weeks without a shift: " + JSON.stringify(tags));
  // ③ シフト希望: 12月 ○ 2 日 × 5,300, △ 1 日
  await p.click("#bt3Ask summary"); await p.waitForTimeout(300);
  ok((await txt(p, "#bt3AskBody .bt13-askpay")) === "○ の 2 日ぜんぶ入ると 約 10,600 円・△ もふくめると 約 15,900 円（いつもの 10:00〜15:00 で）", "③ " + (await txt(p, "#bt3AskBody .bt13-askpay")));
  // ①④ the settings
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  const f = await p.evaluate(() => ({ on: document.getElementById("bt13NextOn").checked, wd: document.getElementById("bt13NextWd").value, at: document.getElementById("bt13NextAt").value,
    a: document.getElementById("bt13MuteFrom").value, b: document.getElementById("bt13MuteTo").value, off: !document.getElementById("bt13MuteOff").hidden, foot: document.getElementById("bt13MuteFoot").textContent }));
  ok(f.on && f.wd === "5" && f.at === "20:00" && f.a === "2026-11-19" && f.b === "2026-11-21" && f.off && f.foot.startsWith("11/19〜11/21 は、バイトのお知らせ"), "①④ the settings: " + JSON.stringify(f));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
