// バイト その4 ①②③⑥⑧⑨⑩: the pay, its parts, 給料日's 収入, 有給, 予定とのかぶり, CSV
const { chromium } = require("playwright");
const fs = require("fs");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today), { acceptDownloads: true });
  await p.addInitScript(() => { Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true }); });
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(800);
  // ⑥ October's pay (11/25) put in by itself: 5 時間 × 1,000 − 300
  const ex = (await ls(p, "expenses")).find((e) => e.id === "pay-j1-2026-10");
  ok(ex && ex.amount === 4700 && ex.date === "2026-11-25" && ex.kind === "in" && ex.pay === "j1|2026-10" && ex.memo === "カフェの給料（10/1〜10/31）", "⑥ put in: " + JSON.stringify(ex));
  ok((await ls(p, "expenses")).length === 1, "⑥ once");
  await p.reload(); await p.waitForTimeout(800);
  ok((await ls(p, "expenses")).length === 1, "⑥ not again");
  // ① 9 時間: 9,000 + 1 時間 × 250 − 300 = 8,950; ② 4 時間: 4,000 + 3 時間 × 100 − 300 = 4,000
  const row = (id) => txt(p, `#shiftList li:has([data-edit="${id}"])`);
  ok((await row("n1")).includes("8,950 円"), "① 8 時間をこえた分: " + (await row("n1")));
  ok((await row("n2")).includes("4,000 円"), "② 時間帯: " + (await row("n2")));
  // ④ メモ, ⑨ 予定
  const r3 = await row("n3");
  ok(r3.includes("研修") && r3.includes("予定「歯医者」とかぶっています"), "④⑨ " + r3);
  const sum = await txt(p, "#jobSum");
  ok(/8時間をこえた分：1\s時間・\+250\s円/.test(sum) && /6:00〜9:00の時給アップ：3\s時間・\+300\s円/.test(sum) && /引かれる額：−900\s円（3\s回）/.test(sum), "①②③ the month: " + sum);
  ok(sum.includes("12/25 に、自動で収入に入ります"), "⑥ said: " + sum);
  // ⑧ 塾: from 2025-11-04, 5/4 に (6 か月で週2日 ≈ 年104日: 3 日), 次は 2027/5/4
  const lv = await txt(p, "#bt4Leave");
  ok(lv.includes("有給休暇のめやす") && /塾：5\/4 に 3\s日（2028\/5\/3まで使えます）/.test(lv) && /次は 2027\/5\/4 に 4\s日のめやす（いまのペースは 年に約 \d+\s日の勤務）/.test(lv), "⑧ " + lv);
  ok(lv.includes("カフェ：働きはじめて6か月の 2027/4/5 から、有給休暇がもらえます。"), "⑧ カフェ, from 10/5: " + lv);
  // ⑩ CSV
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#bt4Csv")]);
  const csv = fs.readFileSync(await dl.path(), "utf8");
  const lines = csv.replace(/^﻿/, "").trim().split(/\r\n/);
  ok(dl.suggestedFilename() === "tsumikasane-baito-2026-11-26.csv" && lines[0] === "日付,曜日,バイト先,始まり,終わり,休憩(分),働いた時間(時間),うち深夜(時間),給料の見込み(円),メモ", "⑩ head: " + lines[0]);
  ok(lines.includes("2026-11-02,月,カフェ,09:00,19:00,60,9,0,8950,") && lines.includes("2026-11-28,土,カフェ,17:00,22:00,0,5,0,4700,研修") && lines.length === DATA.shifts.length + 1, "⑩ rows: " + lines.length);
  await p.screenshot({ path: (process.argv[2] || __dirname) + "/baito4-job.png", fullPage: true });
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
