// バイト その13 ①②④⑥⑦⑧⑨: what is shown (③ は使う人が消した: 2026-11-18)
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
  // ⑦⑧ がんばりの記録 and ⑨ 1週間の勤務: taken out at the user's call (2026-11-19, tools/REMOVED.md)
  ok(!(await p.$("#bt13Miles")) && !(await p.$("#bt13Week")), "⑦⑧⑨ がんばりの記録・1週間の勤務: gone");
  // ①④ お知らせ: 来週のぶん (金曜 20:00), 11/19〜11/21 は休む
  const al = await p.evaluate(() => window.__bt13.alarms(Date.now()).filter((a) => a.url === "./#job").map((a) => [a.tag, new Date(a.at).toISOString()]));
  const tags = al.map((a) => a[0]);
  ok(!tags.includes("bt13-next:2026-11-22") && !tags.includes("bt7-eve:2026-11-20"), "④ held: " + JSON.stringify(al));
  ok(JSON.stringify(al.find((a) => a[0] === "bt13-next:2026-12-06")) === JSON.stringify(["bt13-next:2026-12-06", "2026-12-04T11:00:00.000Z"]) && !tags.includes("bt13-next:2026-11-29"), "① the weeks without a shift: " + JSON.stringify(tags));
  // ①④ the settings
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  const f = await p.evaluate(() => ({ on: document.getElementById("bt13NextOn").checked, wd: document.getElementById("bt13NextWd").value, at: document.getElementById("bt13NextAt").value,
    a: document.getElementById("bt13MuteFrom").value, b: document.getElementById("bt13MuteTo").value, off: !document.getElementById("bt13MuteOff").hidden, foot: document.getElementById("bt13MuteFoot").textContent }));
  ok(f.on && f.wd === "5" && f.at === "20:00" && f.a === "2026-11-19" && f.b === "2026-11-21" && f.off && f.foot.startsWith("11/19〜11/21 は、バイトのお知らせ"), "①④ the settings: " + JSON.stringify(f));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
