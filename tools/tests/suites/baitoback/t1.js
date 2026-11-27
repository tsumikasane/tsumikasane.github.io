// バイト: what was taken off beyond the words asked for (2026-11-27), back at the user's call the same day: 次の休みは ○ から
// ○ 連休 and 次の休みは ○ (with shifts after it), the mark ahead under ○年の月ごとの給料 (○月ごろに目安の … を超えそうです,
// 目安の … まで、約 … の余裕があります) and before a month was paid 給料の入った月がたまると、年末までの見通しが出ます (with a
// mark), and ○ まで（残り …） while a shift goes on. What was asked to go stays gone: ○月の休み ○ 日, （この先の勤務はまだ
// 入っていません）, このペース…年末までに約…, あと ○ 時間 to the next, そのあと：…
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const T0 = Date.parse("2026-07-01T09:00:00+09:00");
const S = (id, date, start = "10:00", end = "18:00") => ({ id, date, start, end, rest: 0, jobId: "j1", createdAt: T0 });
// カフェ, 時給 1,000円, 末日締め・翌月10日払い: 8/5, 9/5, 10/5 (paid 9/10, 10/10, 11/10, 8,000 each), today 11/27 (金) 10〜18,
// then 12/1 (off 11/28〜11/30)
const SH = [S("a", "2026-08-05"), S("b", "2026-09-05"), S("c", "2026-10-05"), S("t", "2026-11-27"), S("n", "2026-12-01")];
const jobs = (wall) => ({ id: "jobs", items: [{ id: "j1", name: "カフェ", wage: 1000, fare: 0, night: true, cutoff: 0, payday: 10 }], ...(wall ? { wall } : {}), updatedAt: T0 });
async function open(b, hm, data) {
  const p = await phone(b, new Date(`2026-11-27T${hm}:00+09:00`), { deviceScaleFactor: 1 });
  await seed(p, data, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(1000);
  return p;
}
(async () => {
  const b = await chromium.launch();

  // ---- 12:00, the shift under way; a mark of 30,000 to be passed in 12月 ----
  let p = await open(b, "12:00", { shifts: SH, settings: [jobs(30000)] });
  const nx = await txt(p, "#bt3Next");
  ok(nx.startsWith("いまはバイトの時間です") && nx.includes("18:00 まで（残り 6 時間）") && !nx.includes("そのあと"), "while it goes on: 18:00 まで（残り 6 時間）", nx);
  const cal = await txt(p, "#bt6Cal");
  ok((await txt(p, "#bt6Cal .bt8-off")) === "次の休みは あしたから 3 連休" && !cal.includes("の休み ") && !cal.includes("この先の勤務"), "次の休みは あしたから 3 連休 (the month's count not said)", cal);
  let yr = await txt(p, "#bt2Year");
  ok(yr.includes("2026年の月ごとの給料") && yr.includes("12月ごろに目安の 30,000 円 を超えそうです。") && !yr.includes("このペース") && !yr.includes("年末までに約") && (await p.locator("#bt2Year .bt2-pace.warn").count()) === 1, "the mark ahead: 12月ごろに超えそう (warn), no このペース", yr);
  ok(!p.errs.length, "no errors", p.errs);
  await p.close();

  // ---- 8:00, before it; a mark of 100,000: room left ----
  p = await open(b, "08:00", { shifts: SH, settings: [jobs(100000)] });
  const nx2 = await txt(p, "#bt3Next");
  ok(nx2.startsWith("次のバイト") && !/あと\s*\d/.test(nx2) && !nx2.includes("残り"), "before it: no あと ○ 時間 (as asked)", nx2);
  yr = await txt(p, "#bt2Year");
  ok(yr.includes("目安の 100,000 円 まで、約 68,000 円 の余裕があります。") && (await p.locator("#bt2Year .bt2-pace.warn").count()) === 0, "the mark ahead: 目安の 100,000 円 まで、約 68,000 円 の余裕", yr);
  ok((await txt(p, "#bt6Cal .bt8-off")) === "次の休みは あしたから 3 連休", "次の休み: the same at 8:00");
  ok(!p.errs.length, "no errors", p.errs);
  await p.close();

  // ---- no month paid yet: with a mark, 給料の入った月がたまると…; without, nothing ----
  const NEW = [S("t", "2026-11-27"), S("n", "2026-12-01")];
  p = await open(b, "20:00", { shifts: NEW, settings: [jobs(30000)] });
  yr = await txt(p, "#bt2Year") || "";
  ok(await p.isVisible("#bt2Year") && yr.includes("給料の入った月がたまると、年末までの見通しが出ます。"), "no month paid, a mark: 給料の入った月がたまると…", yr);
  await p.close();
  p = await open(b, "20:00", { shifts: NEW, settings: [jobs(0)] });
  yr = await txt(p, "#bt2Year") || "";
  ok(!yr.includes("見通し") && !yr.includes("目安"), "no month paid, no mark: nothing said of it", yr);
  // (today's shift over at 18:00, 20:00 now: the next day off is still tomorrow's)
  ok((await txt(p, "#bt6Cal .bt8-off")) === "次の休みは あしたから 3 連休", "20:00: 次の休みは あしたから 3 連休");
  await p.close();

  // ---- no shift after the next day off: nothing said (この先の勤務はまだ入っていません stays gone) ----
  p = await open(b, "12:00", { shifts: [S("t", "2026-11-27")], settings: [jobs(0)] });
  ok(!(await p.$("#bt6Cal .bt8-off")) && !(await txt(p, "#bt6Cal")).includes("この先の勤務"), "no shift ahead: no 次の休み", await txt(p, "#bt6Cal"));
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
