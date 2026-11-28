// バイト その16 ①②③④⑤⑨⑩: what is pressed and typed
process.env.URL0 = process.env.URL0 || "http://localhost:8877/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setting = async (p, id) => (await ls(p, "settings")).find((s) => s.id === id);
const job = async (p, id) => (await setting(p, "jobs")).items.find((j) => j.id === id);
const tags = (p) => p.evaluate(() => window.__bt16.alarms(Date.now()).map((a) => a.tag));
const shown = (p, id) => p.evaluate((id) => getComputedStyle(document.getElementById(id)).display !== "none" && !document.getElementById(id).hidden, id);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  // ② 11/23 確定, and back; then both at once
  await p.click('#bt16Tent li[data-shift="tz1"] .btn'); await p.waitForTimeout(400);
  ok(!(await ls(p, "shifts")).find((x) => x.id === "tz1").tentative && (await txt(p, "#bt16Tent")).startsWith("まだ仮のシフト（1）") && !(await tags(p)).includes("bt16-tent:tz1:2026-11-23:17:00"), "② 確定: " + (await txt(p, "#bt16Tent")));
  await p.click(".toast.show .toast-undo"); await p.waitForTimeout(400);
  ok((await ls(p, "shifts")).find((x) => x.id === "tz1").tentative === true, "② back to 仮");
  await p.click("#bt16FixAll"); await p.waitForTimeout(400);
  ok(!(await ls(p, "shifts")).some((x) => x.tentative) && (await p.isHidden("#bt16Tent")), "② all 確定");
  // ④ 出した: the 締め切り's お知らせ quiet; 取り消す
  await p.click("#bt16AskBtn"); await p.waitForTimeout(400);
  ok((await setting(p, "bt16")).asked["2026-12"] === "2026-11-20" && !(await tags(p)).includes("bt2-ask:2026-11-25") && (await txt(p, "#bt16Asked")) === "12月のシフト希望：出しました（11/20） 取り消す", "④ given: " + (await txt(p, "#bt16Asked")));
  await p.click("#bt16AskBtn"); await p.waitForTimeout(400);
  ok(!("2026-12" in (await setting(p, "bt16")).asked) && (await tags(p)).includes("bt2-ask:2026-11-25"), "④ taken back");
  // ① from the page's foot: 勤務カレンダー put away, これから届くお知らせ back (バイト先の連絡先 till it went into the settings, 2026-11-28;
  // バイトの日の支出, 1週間の勤務, 何時間分？ taken out 2026-11-19)
  await p.click("#bt16CardsLink"); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.getElementById("bt16CardsBox").open), "① the cards opened");
  await p.click('#bt16Cards [data-card="bt6Cal"]'); await p.click('#bt16Cards [data-card="bt10AlarmsCard"]'); await p.waitForTimeout(400);
  ok(JSON.stringify((await setting(p, "bt16")).hide) === JSON.stringify(["bt6Cal"]) && (await txt(p, "#bt16CardsHead")) === "カードを選ぶ（1 こ しまっています）", "① kept: " + JSON.stringify((await setting(p, "bt16")).hide));
  // ⑤ 早めに着く 0, ③ 定期券 12/31 (⑨ 最低賃金 taken out at the user's call, 2026-11-25: its 1,100 円 stays saved)
  await p.fill('#jobForms [data-job="j1"] [data-f="early"]', ""); await p.fill('#jobForms [data-job="j1"] [data-f="pass"]', "2026-12-31"); await p.waitForTimeout(900);
  const j1 = await job(p, "j1");
  ok(!("early" in j1) && j1.pass === "2026-12-31" && (await setting(p, "bt16")).minWage === 1100, "③⑤ kept (⑨'s 1,100 円 too): " + JSON.stringify(j1));
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  ok(!(await shown(p, "bt6Cal")) && (await shown(p, "bt10AlarmsCard")), "① on the page");
  ok((await txt(p, "#bt3Next")).includes("16:30 に出ると間に合います（通勤 30 分）"), "⑤ no minutes early: " + (await txt(p, "#bt3Next")));
  ok((await p.isHidden("#bt16Pass")) && JSON.stringify((await tags(p)).filter((t) => t.startsWith("bt16-pass"))) === JSON.stringify(["bt16-pass:j1:2026-12-31:3"]), "③ 12/31: " + JSON.stringify(await tags(p)));
  ok(!(await p.$("#bt16Min")), "⑨ 最低賃金: gone");
  // ⑩ 9:00〜1:00 (16 時間): said as it goes in (on its row too, till the month's list was taken out, 2026-11-26)
  await p.clock.setFixedTime(at("12:01", today));
  await p.selectOption("#shiftJob", "j1"); await p.fill("#shiftDate", "2026-11-28"); await p.fill("#shiftStart", "09:00"); await p.fill("#shiftEnd", "01:00"); await p.fill("#shiftRest", "0");
  await p.locator('#shiftForm button[type="submit"]').click(); await p.waitForTimeout(500);
  ok((await txt(p, "#status")).includes("09:00〜01:00は 16 時間の勤務です（次の日の 01:00 まで）。時刻をたしかめてください"), "⑩ said: " + (await txt(p, "#status")));
  const nw = (await ls(p, "shifts")).find((x) => x.date === "2026-11-28");
  ok(nw && nw.start === "09:00" && nw.end === "01:00", "⑩ it went in: " + JSON.stringify(nw));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
