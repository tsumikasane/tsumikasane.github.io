// バイト：締め日と給料日を2回ずつ (the user's call, 2026-11-22: "2回ずつにできれば十分")
process.env.URL0 = process.env.URL0 || "http://localhost:8966/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, jobs, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s || "").replace(/\s+/g, " ").trim();
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setting = async (p, id) => (await ls(p, "settings")).find((s) => s.id === id);
const job = async (p, id) => (await setting(p, "jobs")).items.find((j) => j.id === id);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__pay2[f](...a), { f, a });
const blocks = (p) => p.$$eval("#jobSum .job-block", (l) => l.map((b) => b.innerText.replace(/\s+/g, " ").trim()));
async function open(b, data = DATA) {
  const p = await phone(b, at("12:00", today));
  await seed(p, data, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b);
  // the parts: 11/1〜11/15 paid 11/25, 11/16〜11/30 paid 12/10; the month's all of November, both together
  const parts = await W(p, "parts", "j1", "2026-11");
  ok(parts.length === 2 && parts[0].key === "j1|2026-11" && parts[0].start === "2026-11-01" && parts[0].end === "2026-11-15" && parts[0].payday === "2026-11-25" && parts[0].amount === 8000 && !parts[0].last
    && parts[1].key === "j1|2026-11|2" && parts[1].start === "2026-11-16" && parts[1].end === "2026-11-30" && parts[1].payday === "2026-12-10" && parts[1].amount === 8000 && parts[1].last, "two parts in November", parts);
  const m = await W(p, "month", "j1", "2026-11");
  ok(m.start === "2026-11-01" && m.end === "2026-11-30" && m.amount === 16000 && m.count === 4, "the month: both parts", m);
  const oct = await W(p, "parts", "j1", "2026-10");
  ok(oct[1].start === "2026-10-16" && oct[1].end === "2026-10-31" && oct[1].payday === "2026-11-10" && oct[1].amount === 4000 && oct[0].amount === 0, "October's second part: 10/28, paid 11/10", oct);
  ok(JSON.stringify(await W(p, "of", "j1", "2026-11-10")) === JSON.stringify({ ym: "2026-11", n: 1 }) && JSON.stringify(await W(p, "of", "j1", "2026-11-20")) === JSON.stringify({ ym: "2026-11", n: 2 }), "a day's part");
  // 塾, paid once: as before
  const juku = await W(p, "parts", "j2", "2026-11");
  ok(juku.length === 1 && juku[0].key === "j2|2026-11" && juku[0].start === "2026-11-01" && juku[0].end === "2026-11-30" && juku[0].payday === "2026-12-10" && juku[0].amount === 3000 && juku[0].n === 0, "paid once: as before", juku);
  // the month's blocks: カフェ 1回目・2回目, then 塾
  let bl = await blocks(p);
  ok(bl.length === 3 && bl[0].includes("11月分・1回目（11/1〜11/15）の見込み") && bl[0].includes("8,000") && bl[0].includes("給料日 11月25日（水）") && bl[0].includes("収入に入れる")
    && bl[1].includes("11月分・2回目（11/16〜11/30）の見込み") && bl[1].includes("8,000") && bl[1].includes("給料日 12月10日（木）")
    && bl[2].includes("11月分（11/1〜11/30）の見込み") && !bl[2].includes("回目"), "the card: a block a pay", bl);
  ok((await p.$$eval("#bt6Cal .bt6-d", (l) => l.reduce((n, d) => n + Number((d.getAttribute("aria-label").match(/勤務 (\d+) 回/) || [0, 0])[1]), 0))) === 5, "the month's shifts: all of them (in 勤務カレンダー: the month's list was taken out, 2026-11-26)");
  ok((await W(p, "year", 2026)) === 23000 && flat(await p.textContent("#jobYear")).includes("23,000"), "the year: each part by its 給料日 (4,000 + 8,000 + 8,000 + 塾 3,000)", await W(p, "year", 2026));
  // (このペース（最近の月 平均 …）なら、年末までに約 … under 2026年の月ごとの給料: taken out at the user's call, 2026-11-27,
  // tools/REMOVED.md; the months' bars stay)
  const yr2 = await p.evaluate(() => document.getElementById("bt2Year")?.innerText.replace(/\s+/g, " ") || "");
  ok(yr2.includes("2026年の月ごとの給料") && !yr2.includes("このペース") && !yr2.includes("年末までに") && !yr2.includes("見通し"), "the year's pay by the month, without このペース…年末までに", yr2);
  // the お知らせ: each 給料日 and each 締め日
  const al = await W(p, "alarms", Date.parse("2026-11-20T12:00:00+09:00"));
  const tags = al.map((a) => a.tag).filter((t) => /^bt(3-pay|12-cut):j1:/.test(t)).sort();
  ok(JSON.stringify(tags) === JSON.stringify(["bt12-cut:j1:2026-11-30", "bt12-cut:j1:2026-12-15", "bt3-pay:j1:2026-11-25", "bt3-pay:j1:2026-12-10", "bt3-pay:j1:2026-12-25"]), "給料日・締め日のお知らせ: each", tags);
  const cut = al.find((a) => a.tag === "bt12-cut:j1:2026-11-30");
  ok(cut && cut.body.startsWith("11月分（11/16〜11/30）は 2 回"), "締め日: its part's days", cut && cut.body);
  // 収入に入れる: the first part's, under its own key; the second's still to go in
  await p.click('#jobSum .job-block[data-pay="j1|2026-11"] .job-act'); await p.waitForTimeout(500);
  ok((await p.inputValue("#exAmount")) === "8000" && (await p.inputValue("#exDate")) === "2026-11-25", "収入に入れる: 8,000円 on 11/25", [await p.inputValue("#exAmount"), await p.inputValue("#exDate")]);
  await p.evaluate(() => document.getElementById("exForm").requestSubmit()); await p.waitForTimeout(500);
  const ex = (await ls(p, "expenses")).find((e) => e.pay === "j1|2026-11");
  ok(ex && ex.amount === 8000 && ex.date === "2026-11-25", "put in under j1|2026-11", ex);
  await p.click('#moneyParts button[data-part="job"]'); await p.waitForTimeout(500);
  bl = await blocks(p);
  ok(bl[0].includes("収入に入れました") && bl[1].includes("収入に入れる") && !bl[1].includes("収入に入れました"), "the first in, the second still to go", bl.slice(0, 2));
  // the settings: the second 締め日 and 給料日 shown; なし makes it a month paid once again
  await p.click("#moneySettings"); await p.waitForTimeout(600);
  const f = '#jobForms [data-job="j1"]';
  ok((await p.inputValue(`${f} [data-f="cutoff2"]`)) === "0" && (await p.inputValue(`${f} [data-f="payday2"]`)) === "10" && flat(await p.textContent(`${f} .job-when`)).includes("11月分・1回目（11/1〜11/15）は、11月25日（水）に入ります。")
    && flat(await p.textContent(`${f} .job-when`)).includes("11月分・2回目（11/16〜11/30）は、12月10日（木）に入ります。"), "the settings: 2回目の締め日 末日, 2回目の給料日 10日", flat(await p.textContent(`${f} .job-when`)));
  await p.selectOption(`${f} [data-f="cutoff2"]`, ""); await p.waitForTimeout(900);
  let j1 = await job(p, "j1");
  ok(!("cutoff2" in j1) && !("payday2" in j1) && j1.cutoff === 15 && j1.payday === 25, "なし: neither kept", j1);
  ok(flat(await p.textContent(`${f} .job-when`)) === "12月分（11/16〜12/15）は、12月25日（金）に入ります。", "paid once: 15日締め・25日払い", flat(await p.textContent(`${f} .job-when`)));
  // and back: 2回目 末日・翌月10日
  await p.selectOption(`${f} [data-f="cutoff2"]`, "0"); await p.selectOption(`${f} [data-f="payday2"]`, "10"); await p.waitForTimeout(900);
  j1 = await job(p, "j1");
  ok(j1.cutoff2 === 0 && j1.payday2 === 10, "2回目 again", j1);
  // 塾's form: the second as なし
  ok((await p.inputValue('#jobForms [data-job="j2"] [data-f="cutoff2"]')) === "" && !("cutoff2" in (await job(p, "j2"))), "塾: なし");
  await p.screenshot({ path: (process.argv[2] || __dirname) + "/pay2-settings.png" });
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();

  // 給料日に自動で収入に入れる (from 11/1): October's second part (paid 11/10) under its own id and key
  p = await open(b, { ...DATA, settings: [jobs({ autoIn: "2026-11-01" })] });
  await p.waitForTimeout(1200);
  const auto = (await ls(p, "expenses")).filter((e) => typeof e.pay === "string" && e.pay.startsWith("j1|"));
  ok(auto.length === 1 && auto[0].id === "pay-j1-2026-10-2" && auto[0].pay === "j1|2026-10|2" && auto[0].amount === 4000 && auto[0].date === "2026-11-10", "自動で入る: 10/16〜10/31 on 11/10", auto);
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
