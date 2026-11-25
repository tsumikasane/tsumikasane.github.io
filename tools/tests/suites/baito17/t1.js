// バイト その17 ①〜⑧: what is shown (⑨ は使う人が消した: 2026-11-18)
process.env.URL0 = process.env.URL0 || "http://localhost:8879/";
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
  // ① シフトのアプリ: on the next shift's card and in カフェ's month
  ok(await p.evaluate(() => [...document.querySelectorAll("#bt3Next a.bt17-app")].map((a) => a.getAttribute("href")).join() === "https://shift.example.com/cafe"), "① the next shift's card");
  const cafe = () => p.evaluate(() => [...document.querySelectorAll("#jobSum .job-block")].find((x) => x.innerText.includes("カフェ")));
  ok(await p.evaluate(() => { const b = [...document.querySelectorAll("#jobSum .job-block")].find((x) => x.innerText.includes("カフェ")); const t = [...document.querySelectorAll("#jobSum .job-block")].find((x) => x.innerText.includes("塾")); return !!b.querySelector(".bt17-notes a.bt17-app") && !t.querySelector(".bt17-notes"); }), "① カフェ's month, not 塾's");
  // ② 担当 on the rows, and the last 3 months' hours of each
  ok((await txt(p, '#shiftList li[data-shift="n2"]')).includes("担当：キッチン") && !(await txt(p, '#shiftList li[data-shift="n4"]')).includes("担当"), "② on the rows");
  ok((await txt(p, "#bt17Roles")) === "担当ごとの時間（この3か月） カフェ レジ 15 時間 キッチン 5 時間 担当なし 15 時間", "② " + (await txt(p, "#bt17Roles")));
  // ③ 100 時間 for +30 円: 70 時間 since the first shift
  ok((await txt(p, "#bt17Raise")) === "時給アップまで カフェ：あと 30 時間（いつもの勤務で約 6 回） で +30 円 2025/11/25から 70 時間・100 時間で時給アップ", "③ " + (await txt(p, "#bt17Raise")));
  // ④ 11月 30 時間 (カフェ 20・塾 10; 上限 20), 今週 2 日 (上限 2); the bar there (その3 ⑤'s too had none)
  ok(await p.evaluate(() => document.querySelector("#bt17Caps .bar-track").getBoundingClientRect().height === 8), "④ the bar");
  ok((await txt(p, "#bt17Caps")) === "11月は 30 時間・上限 20 時間を 10 時間 こえています 今週（11/15〜11/21）は 2 日・上限 2 日まで あと 0 日", "④ " + (await txt(p, "#bt17Caps")));
  // ⑤ 給料の使いみち taken out at the user's call (2026-11-25, tools/REMOVED.md): no card, though 貯金 30%・自由 20% stay saved
  ok(!(await p.$("#bt17Split")) && !(await p.evaluate(() => [...document.querySelectorAll("#moneyJob .card")].some((c) => c.innerText.includes("使いみち")))), "⑤ 給料の使いみち: gone");
  // ⑥ カフェ 1 年 on 11/25: the card, kept; its お知らせ taken out at the user's call (2026-11-25, tools/REMOVED.md), its switch kept on
  ok((await txt(p, "#bt17Anniv")) === "カフェで働きはじめて 1 年 11月25日（水）・あと 5 日 2025/11/25から これまで 14 回・70 時間・約 70,000 円", "⑥ " + (await txt(p, "#bt17Anniv")));
  const al = await p.evaluate(() => window.__bt17.alarms(Date.now()).filter((a) => /^bt17-/.test(a.tag)).map((a) => [a.tag, new Date(a.at).toISOString(), a.title, a.body]));
  ok(JSON.stringify(al) === "[]", "⑥ お知らせ: gone " + JSON.stringify(al));
  // ⑦ 11/20 まで: 去年 15,000 円 (塾) → 今年 37,500 円
  ok((await txt(p, "#jobYear .bt17-year")) === "11/20までに入った給料：去年 15,000 円 → 今年 37,500 円（+22,500 円）", "⑦ " + (await txt(p, "#jobYear .bt17-year")));
  // ⑧ 立ち仕事 2.5 × 50 kg × 5 時間 × 1.05 × 3 回 (11/23 はまだ)
  ok((await p.evaluate(() => [...document.querySelectorAll("#jobSum .job-block")].find((x) => x.innerText.includes("カフェ")).querySelector(".bt17-notes p")?.innerText.replace(/\s+/g, " ").trim())) === "消費の目安：ここまで 約 1,970 kcal（1回 約 660 kcal）", "⑧");
  // ①②③④⑧ the settings (⑤ and ⑥'s お知らせ gone)
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  const f = await p.evaluate(() => { const g = (k) => document.querySelector(`#jobForms [data-job="j1"] [data-f="${k}"]`); const v = (id) => document.getElementById(id); return [g("app").value, g("roles").value, g("raiseH").value, g("raisePlus").value, g("move").value, v("bt17MonthMax").value, v("bt17WeekDays").value, !!v("bt17S0n") || !!v("bt17SplitForm"), !!v("bt17AnnivChk"), [...document.querySelectorAll("h3.group-head")].filter((h) => /使いみち|勤続/.test(h.textContent)).length]; });
  ok(JSON.stringify(f) === JSON.stringify(["https://shift.example.com/cafe", "レジ、キッチン", "100", "30", "stand", "20", "2", false, false, 0]), "the settings: " + JSON.stringify(f));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
