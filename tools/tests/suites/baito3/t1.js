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
  // ① the next shift
  const nx = await txt(p, "#bt3Next");
  ok(nx.includes("次のバイト") && nx.includes("あした 11/13（金） 17:00〜22:00") && /あと 1\s日/.test(nx) && nx.includes("そのあと：11/20"), "① next: " + nx);
  // ④ this week 11/8〜11/14: 7h + 4.5h = 11.5h of 20; ⑤ the aim
  const aim = await txt(p, "#bt3Aim2");
  ok(aim.includes("今週（11/8〜11/14）は 11.5 時間") && aim.includes("上限 20 時間まで あと 8.5 時間"), "④ week: " + aim);
  // November: 6×4h + 7h + 4.5h + 5h = 40.5h → 48,600 + night 0 + fare 9×300 = 51,300
  ok(aim.includes("11月分の目標 60,000 円") && aim.includes("あと 8,700 円（約 8 時間）"), "⑤ aim: " + aim);
  const sum = await txt(p, "#jobSum");
  ok(sum.includes("1時間あたり 1,267 円（交通費をのぞくと 1,200 円）"), "⑦ an hour: " + sum);
  ok(/先月より \+7\s回・\+30.5\s時間・\+38,700\s円/.test(sum), "⑩ against October: " + sum);
  ok(sum.includes("6 連勤があります（11/2〜11/7）"), "③ 6 in a row: " + sum);
  const row = await txt(p, '#shiftList li:has([data-edit="n9"])');
  ok(row.includes("休憩が足りないかも（6時間をこえたら45分）"), "③ rest: " + row);
  // ② a shift in a few words
  await p.fill("#bt3QuickText", "土 9-13 休憩30"); await p.waitForTimeout(200);
  ok((await txt(p, "#bt3QuickSay")).includes("11/14（土） 09:00〜13:00・休憩 30分"), "② said: " + (await txt(p, "#bt3QuickSay")));
  await p.fill("#bt3QuickText", "あした 9時から17時 休憩1時間"); await p.waitForTimeout(200);
  ok((await txt(p, "#bt3QuickSay")).includes("あした 11/13（金） 09:00〜17:00・休憩 60分"), "② another: " + (await txt(p, "#bt3QuickSay")));
  await p.fill("#bt3QuickText", "11/21 22-5"); await p.press("#bt3QuickText", "Enter"); await p.waitForTimeout(400);
  ok((await ls(p, "shifts")).some((x) => x.date === "2026-11-21" && x.start === "22:00" && x.end === "05:00" && x.jobId === "j1"), "② 11/21 22-5 put in");
  await p.fill("#bt3QuickText", "ランチ"); await p.press("#bt3QuickText", "Enter"); await p.waitForTimeout(200);
  ok((await txt(p, "#bt3QuickSay")).includes("時間も書いてください"), "② no times");
  // ④ a shift past the week's limit: said
  await p.fill("#bt3QuickText", "土 9-19 休憩60"); await p.press("#bt3QuickText", "Enter"); await p.waitForTimeout(400);
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
