// バイト その3 ①②③④⑤⑥⑦⑩ on バイト
process.env.URL0 = process.env.URL0 || "http://localhost:8861/";
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
  await seed(p, { ...DATA, moneyPart: undefined }, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(800);
  // ① the next shift (the time to it, あと 1 日, and the ones after it, そのあと：…, taken out at the user's call, 2026-11-27,
  // tools/REMOVED.md)
  const nx = await txt(p, "#bt3Next");
  ok(nx.includes("次のバイト") && nx.includes("あした 11/13（金） 17:00〜22:00") && !/あと\s*\d/.test(nx) && !nx.includes("そのあと"), "① next: " + nx);
  // ④ this week 11/8〜11/14: 7h + 4.5h = 11.5h of 20; ⑤ the aim
  const aim = await txt(p, "#bt3Aim2");
  ok(aim.includes("今週（11/8〜11/14）は 11.5 時間") && aim.includes("上限 20 時間まで あと 8.5 時間"), "④ week: " + aim);
  // November: 6×4h + 7h + 4.5h + 5h = 40.5h → 48,600 + night 0 + fare 9×300 = 51,300
  ok(aim.includes("11月分の目標 60,000 円") && aim.includes("あと 8,700 円（約 8 時間）"), "⑤ aim: " + aim);
  const sum = await txt(p, "#jobSum");
  ok(sum.includes("1時間あたり 1,267 円（交通費をのぞくと 1,200 円）"), "⑦ an hour: " + sum);
  ok(/先月より \+7\s回・\+30.5\s時間・\+38,700\s円/.test(sum), "⑩ against October: " + sum);
  ok(sum.includes("6 連勤があります（11/2〜11/7）"), "③ 6 in a row: " + sum);
  // (③ 休憩が足りないかも on a shift's row: went with the month's list at the user's call, 2026-11-26, tools/REMOVED.md)
  // ② ひとことでシフト: taken out at the user's call (2026-11-18, tools/REMOVED.md)
  ok(!(await p.$("#bt3QuickText")) && !(await p.$("#bt3QuickSay")), "② (taken out) ひとことでシフト: gone");
  // ④ a shift past the week's limit, put in from the form (11/14 is this week's 土): said
  await p.fill("#shiftDate", "2026-11-14"); await p.fill("#shiftStart", "09:00"); await p.fill("#shiftEnd", "19:00"); await p.fill("#shiftRest", "60");
  await p.locator('#shiftForm button[type="submit"]').click(); await p.waitForTimeout(500);
  ok((await ls(p, "shifts")).some((x) => x.date === "2026-11-14" && x.start === "09:00" && x.end === "19:00" && x.rest === 60 && x.jobId === "j1"), "④ 11/14 9-19 put in");
  ok(/上限の 20\s時間を超えています/.test(await p.evaluate(() => document.body.innerText)), "④ over the limit said");
  // ⑥ the pay as it came
  await p.evaluate((P) => { const e = JSON.parse(localStorage.getItem(P + "expenses") || "[]"); e.push({ id: "pay1", date: "2026-11-25", kind: "in", category: "給与", amount: 70000, pay: "j1|2026-11", createdAt: 1 }); localStorage.setItem(P + "expenses", JSON.stringify(e)); }, P);
  await p.reload(); await p.waitForTimeout(800);
  const s2 = await txt(p, "#jobSum");
  ok(/実際の給料 70,000 円（見込みより [+−][\d,]+ 円）/.test(s2), "⑥ as it came: " + s2);
  await p.screenshot({ path: (process.argv[2] || __dirname) + "/baito3-job.png", fullPage: true });
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
