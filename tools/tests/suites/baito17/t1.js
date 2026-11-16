// バイト その17 ①②③④⑤⑥⑦⑧⑨: what is shown
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
  // ⑤ 11/25 の給料 (カフェ 10月分 20,000 円): 貯金 30%・自由 20%・のこり 50%
  ok((await txt(p, "#bt17Split")) === "給料の使いみち 11月25日（水）の給料 約 20,000 円（カフェ） 貯金 30% 6,000 円 自由 20% 4,000 円 のこり 50% 10,000 円", "⑤ " + (await txt(p, "#bt17Split")));
  // ⑥ カフェ 1 年 on 11/25
  ok((await txt(p, "#bt17Anniv")) === "カフェで働きはじめて 1 年 11月25日（水）・あと 5 日 2025/11/25から これまで 14 回・70 時間・約 70,000 円", "⑥ " + (await txt(p, "#bt17Anniv")));
  const al = await p.evaluate(() => window.__bt17.alarms(Date.now()).filter((a) => /^bt17-/.test(a.tag)).map((a) => [a.tag, new Date(a.at).toISOString(), a.title, a.body]));
  ok(JSON.stringify(al) === JSON.stringify([["bt17-anniv:j1:2026-11-25", "2026-11-25T00:00:00.000Z", "カフェで働きはじめて 1 年です", "2025/11/25から 14 回・70 時間。おつかれさまです"]]), "⑥ お知らせ: " + JSON.stringify(al));
  // ⑦ 11/20 まで: 去年 15,000 円 (塾) → 今年 37,500 円
  ok((await txt(p, "#jobYear .bt17-year")) === "11/20までに入った給料：去年 15,000 円 → 今年 37,500 円（+22,500 円）", "⑦ " + (await txt(p, "#jobYear .bt17-year")));
  // ⑧ 立ち仕事 2.5 × 50 kg × 5 時間 × 1.05 × 3 回 (11/23 はまだ)
  ok((await p.evaluate(() => [...document.querySelectorAll("#jobSum .job-block")].find((x) => x.innerText.includes("カフェ")).querySelector(".bt17-notes p")?.innerText.replace(/\s+/g, " ").trim())) === "消費の目安：ここまで 約 1,970 kcal（1回 約 660 kcal）", "⑧");
  // ⑨ 定期と1回ごと: nothing typed yet
  await p.click("#bt17Pass summary"); await p.waitForTimeout(300);
  ok((await txt(p, "#bt17PassOut")) === "1回（往復）と定期（1か月）の金額を入れると、どちらが得かが出ます。", "⑨ " + (await txt(p, "#bt17PassOut")));
  // ①②③④⑤⑥⑧ the settings
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  const f = await p.evaluate(() => { const g = (k) => document.querySelector(`#jobForms [data-job="j1"] [data-f="${k}"]`); const v = (id) => document.getElementById(id); return [g("app").value, g("roles").value, g("raiseH").value, g("raisePlus").value, g("move").value, v("bt17MonthMax").value, v("bt17WeekDays").value, v("bt17S0n").value, v("bt17S0p").value, v("bt17S1n").value, v("bt17S2n").value, v("bt17AnnivChk").checked]; });
  ok(JSON.stringify(f) === JSON.stringify(["https://shift.example.com/cafe", "レジ、キッチン", "100", "30", "stand", "20", "2", "貯金", "30", "自由", "", true]), "the settings: " + JSON.stringify(f));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
