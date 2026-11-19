// バイト その10 ①②③⑥⑦⑧: what is shown (④⑤⑨ は使う人が消した: 2026-11-18)
process.env.URL0 = process.env.URL0 || "http://localhost:8869/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const block = (p, name) => p.evaluate((name) => [...document.querySelectorAll("#jobSum .job-block")].find((b) => b.innerText.includes(name))?.innerText.replace(/\s+/g, " ") || "", name);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await p.addInitScript(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); window.__copied = ""; Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true }); });
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  // ① 出勤前・退勤前にやること: gone with 出勤・退勤
  ok(!(await p.$("#bt2Clock")) && !(await p.$(".bt10-checks")), "① gone");
  ok(!(await p.$("#bt10Break")), "⑩ no 休憩 before 出勤");
  // ⑥ 次の給料日: カフェ's 10月分 on 11/25 (10 時間 × 1,000 + 交通費 2 × 300), 配達's 11月分 on 12/10 (6 時間 × 1,000 + 20 件 × 300)
  const nx = await txt(p, "#bt10Next");
  ok(nx === "次の給料日 11月25日（水）（あと 9 日） カフェ：約 10,600 円（10月分） 12月10日（木）（あと 24 日） 配達：約 12,000 円（11月分）", "⑥ " + nx);
  // ② いっしょに入った人: 田中 3, 佐藤 1; on the rows
  ok((await txt(p, "#bt10With")) === "いっしょに入った人（この3か月） 田中 3 回・佐藤 1 回 名前は勤務の編集で入れられます。" && !(await p.$("#bt10With button")), "② (a line: 勤務を探す taken off 2026-11-18) " + (await txt(p, "#bt10With")));
  ok((await txt(p, '#shiftList li:has([data-edit="c3"])')).includes("いっしょ：田中"), "② on the row");
  // ⑦ 出来高: on the row, the month (20 件 × 300), its parts
  ok((await txt(p, '#shiftList li:has([data-edit="d1"])')).includes("12 件 × 300円"), "⑦ on the row: " + (await txt(p, '#shiftList li:has([data-edit="d1"])')));
  const dl = await block(p, "配達");
  ok(/出来高 20\s件・\+6,000\s円/.test(dl), "⑦ the month: " + dl);
  const parts = await p.evaluate(() => { const b = [...document.querySelectorAll("#jobSum .job-block")].find((x) => x.innerText.includes("配達")); const d = b.querySelector("details.bt9-parts"); d.open = true; return [...d.querySelectorAll("li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()); });
  ok(parts.includes("出来高 6,000 円") && parts.includes("合計 12,000 円"), "⑦ parts: " + JSON.stringify(parts));
  // ⑧ 契約: in カフェ's month, and its お知らせ 7 days before (30 days before is past)
  ok((await block(p, "カフェ")).includes("契約は 11月27日（金） まで（あと 11 日）"), "⑧ the month: " + (await block(p, "カフェ")));
  const al = await p.evaluate(() => window.__bt10.alarms(Date.now()).filter((a) => a.tag.startsWith("bt10-contract")).map((a) => [a.tag, new Date(a.at).toISOString(), a.title]));
  ok(JSON.stringify(al) === JSON.stringify([["bt10-contract:j1:2026-11-27:7", "2026-11-20T00:00:00.000Z", "契約の終わる日が近づいています"]]), "⑧ alarms: " + JSON.stringify(al));
  // ③ これから届くお知らせ: the 7 days' of バイト
  await p.click("#bt10AlarmsCard summary"); await p.waitForTimeout(300);
  const ab = await txt(p, "#bt10AlarmsBody");
  ok(ab.includes("11/20（金） 9:00 契約の終わる日が近づいています カフェの契約は 11月27日（金） までです（あと 7 日）") && /^これから届くお知らせ（\d+）$/.test(await txt(p, "#bt10AlarmsHead")), "③ " + ab);
  // ⑦⑧ the job's form (① 出勤前・退勤前にやること went with 出勤・退勤)
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  const f = await p.evaluate(() => { const v = (j, k) => document.querySelector(`#jobForms [data-job="${j}"] [data-f="${k}"]`); return [!v("j1", "checksIn") && !v("j1", "checksOut"), v("j1", "contractEnd").value, v("j1", "contractAlarm").checked, v("j2", "unitPrice").value, v("j2", "contractEnd").value]; });
  ok(JSON.stringify(f) === JSON.stringify([true, "2026-11-27", true, "300", ""]), "⑦⑧ the form: " + JSON.stringify(f));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
