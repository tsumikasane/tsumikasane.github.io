// 家計簿のまとめの文字 (the user's call, 2026-11-27, asked twice): seven of its words taken off. None of them anywhere in
// まとめ nor in 貯金の目標's settings; いつもとくらべる (till 2 months are there) and タグごとの支出 (till a tag is written),
// nothing but those words before, away as cards till then and back after; what stays stays (the totals under the
// calendar, the five 大きな支出, the budget's months and 終わった ○ か月のうち, 貯金の目標を決める, the まとめ's line of how a
// goal stands, 金額を入れると… for a goal with no amount); the records and settings as they were; no errors
const { chromium } = require("playwright");
const { P, at, phone, seed, T0 } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-27";
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const X = (id, date, category, amount, memo) => ({ id, date, kind: "out", category, amount, ...(memo ? { memo } : {}), createdAt: T0 });
const I = (id, date, amount) => ({ id, date, kind: "in", category: "給与", amount, memo: "バイト代", createdAt: T0 });
// the words taken off (as the user had them, the numbers any)
// (いつもとくらべる's own 「…きょうまでの分でくらべています。」 stays: not among them)
const GONE = [/2か月以上記録すると/, /月の予算 [\d,]+ 円 でくらべています/, /＋がついているのは収入/, /使わなかった日は/, /件で [\d,]+ 円、/, /の支出の \d+% です/, /のように書くと、/, /タグごとに合計が出ます/,
  /のような目標を決めると/, /毎月の黒字でどこまで貯まったか/, /いま [−\d,]+ 円（/];
const gone = (s) => GONE.filter((r) => r.test(s)).map(String);
const NOV = [I("i11", "2026-11-25", 80000), X("a1", "2026-11-02", "食費", 1200, "パン"), X("a2", "2026-11-05", "食費", 3000, "外食"), X("a3", "2026-11-10", "日用品", 2500, "洗剤"),
  X("a4", "2026-11-15", "交際費", 5000, "飲み会"), X("a5", "2026-11-20", "衣服", 900, "靴下"), X("a6", "2026-11-21", "食費", 400)];
const SET = [{ id: "budget", monthly: 50000, updatedAt: T0 }];
async function stats(b, data) {
  const p = await phone(b, at("12:00", today), { deviceScaleFactor: 1 });
  await seed(p, data, "money");
  await p.click('#moneyParts button[data-part="stats"]'); await p.waitForTimeout(500);
  return p;
}
(async () => {
  const b = await chromium.launch();

  // ---- one month of records, no tag, no goal ----
  let p = await stats(b, { expenses: NOV, settings: SET });
  let all = await txt(p, "#moneyStats");
  ok(gone(all).length === 0, "none of the words in まとめ", gone(all));
  ok(await p.isHidden("#mo3UsualCard") && await p.isHidden("#mo3TagCard"), "いつもとくらべる and タグごとの支出 (their words alone before): away as cards");
  ok((await txt(p, "#exCalKey")) === "収入 +80,000 円・支出 13,000 円・収支 +67,000 円", "the calendar: the totals under it stay", await txt(p, "#exCalKey"));
  ok((await p.locator("#mo3Big li").count()) === 5 && (await txt(p, "#mo3Big")).startsWith("1 飲み会"), "大きな支出: the five stay", await txt(p, "#mo3Big"));
  const bud = await txt(p, "#mo3Bud");
  ok(/^11月/.test(bud) && !bud.includes("終わった") && (await p.locator("#mo3Bud .mo3-bud-row").count()) === 1, "予算を守れた月: this month's bar alone (no month over yet)", bud);
  ok((await txt(p, "#saveList")) === "貯金の目標を決める" && (await p.locator("#saveList .link-btn").count()) === 1, "貯金の目標: 貯金の目標を決める alone", await txt(p, "#saveList"));
  // a goal: no amount yet, its note as before; an amount and a 期限, no note (まとめ says how it stands)
  await p.locator("#saveList .link-btn").click(); await p.waitForTimeout(600);
  await p.locator("#saveAdd").click(); await p.waitForTimeout(300);
  const fid = await p.evaluate(() => document.querySelector("#saveForms [data-save]").dataset.save);
  ok((await txt(p, `[data-save="${fid}"] .save-when`)) === "金額を入れると、まとめに進み具合が出ます。" && await p.isVisible(`[data-save="${fid}"] .save-when`), "a goal with no amount: 金額を入れると… as before");
  await p.fill(`#svName-${fid}`, "旅行"); await p.fill(`#svTarget-${fid}`, "1000000"); await p.selectOption(`#svUntil-${fid}`, "2027-12"); await p.waitForTimeout(800);
  ok(await p.isHidden(`[data-save="${fid}"] .save-when`) && gone(await txt(p, "#saveForms")).length === 0 && !(await txt(p, "#saveForms")).includes("ずつ"), "with an amount and a 期限: no いま ○ 円（○%）・毎月 ○ 円 ずつ", await txt(p, "#saveForms"));
  await p.locator("#sheetDone").click(); await p.waitForTimeout(800);
  const sv = (await ls(p, "settings")).find((s) => s.id === "savings");
  ok(sv?.items.length === 1 && sv.items[0].target === 1000000 && sv.items[0].until === "2027-12", "the goal kept", sv);
  const goal = await txt(p, "#saveList");
  ok(/^旅行 67,000 円 \/ 1,000,000 円 6%・2026年11月から・2027年12月までに、毎月 [\d,]+ 円 ずつ$/.test(goal), "まとめ: how the goal stands, as before", goal);
  all = await txt(p, "#moneyStats");
  ok(gone(all).length === 0, "none of the words in まとめ, with a goal", gone(all));
  ok(!p.errs.length, "no errors", p.errs);
  await p.close();

  // ---- 3 months of records, tags: いつもとくらべる and タグごとの支出 back; a month before them, away again ----
  const MORE = [...NOV, X("s1", "2026-09-10", "食費", 20000), X("s2", "2026-09-12", "交際費", 6000, "#旅行 宿"), X("o1", "2026-10-10", "食費", 22000), X("o2", "2026-10-15", "交通費", 8000, "#旅行 新幹線"),
    X("a7", "2026-11-22", "食費", 2000, "#推し活 グッズ")];
  p = await stats(b, { expenses: MORE, settings: SET });
  ok(await p.isVisible("#mo3UsualCard") && (await txt(p, "#mo3Usual")).includes("前の 2 か月の平均") && await p.isVisible("#mo3TagCard") && (await txt(p, "#mo3Tags")).includes("#推し活"), "2 months before and tags: both cards back", { u: await txt(p, "#mo3Usual"), t: await txt(p, "#mo3Tags") });
  all = await txt(p, "#moneyStats");
  ok(gone(all).length === 0, "none of the words, the cards back", gone(all));
  await p.click("#monthNav .navbtn"); await p.waitForTimeout(500); // 10月: only 9月 before it
  ok(await p.isHidden("#mo3UsualCard") && await p.isVisible("#mo3TagCard"), "10月 (1 month before it): いつもとくらべる away again, the tags there");
  ok(gone(await txt(p, "#moneyStats")).length === 0, "none of the words in 10月");
  ok((await ls(p, "expenses")).length === MORE.length && !p.errs.length, "the records as they were, no errors", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
