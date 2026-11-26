// バイト その4 ①②③⑥⑧⑨⑩: the pay, its parts, 給料日's 収入, 有給, 予定とのかぶり, CSV
const { chromium } = require("playwright");
const fs = require("fs");
const { P, at, phone, seed, shiftRow } = require("./lib");
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
  const row = (id) => shiftRow(p, id); // (from 勤務カレンダー: the month's list was taken out, 2026-11-26)
  ok((await row("n1")).includes("8,950 円"), "① 8 時間をこえた分: " + (await row("n1")));
  ok((await row("n2")).includes("4,000 円"), "② 時間帯: " + (await row("n2")));
  // ④ メモ, ⑨ 予定
  const r3 = await row("n3");
  ok(r3.includes("研修"), "④ メモ (⑨ 予定とのかぶり was said on the month's list, taken out with it 2026-11-26): " + r3);
  const sum = await txt(p, "#jobSum");
  ok(/8時間をこえた分：1\s時間・\+250\s円/.test(sum) && /6:00〜9:00の時給アップ：3\s時間・\+300\s円/.test(sum) && /引かれる額：−900\s円（3\s回）/.test(sum), "①②③ the month: " + sum);
  ok(sum.includes("12/25 に、自動で収入に入ります"), "⑥ said: " + sum);
  // ⑧ 有給休暇のめやす: taken out at the user's call (2026-11-19, tools/REMOVED.md); the card is その5 ② 有給を使った日 now
  const lv = await txt(p, "#bt4Leave");
  ok(lv.startsWith("有給を使った日") && lv.includes("有給を使った日を記録") && !lv.includes("めやす") && !lv.includes("もらえます"), "⑧ gone, 有給を使った日 there: " + lv);
  // ⑩ 表（CSV）で書き出す: taken out with the month's list at the user's call (2026-11-26, tools/REMOVED.md)
  ok(!(await p.$("#bt4Csv")) && !(await p.$("#bt2Share")) && !(await p.$("#shiftList")), "⑩ CSV: gone with the month's list");
  await p.screenshot({ path: (process.argv[2] || __dirname) + "/baito4-job.png", fullPage: true });
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
