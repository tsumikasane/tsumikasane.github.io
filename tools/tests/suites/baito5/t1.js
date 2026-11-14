// バイト その5 ①②③⑤⑥⑦⑧⑨⑩ and ④⑤ in 次のバイト: what is shown
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
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(800);
  // ① 11/9 at its own 1,500円: 7,500
  const r2 = await txt(p, '#shiftList li:has([data-edit="n2"])');
  ok(r2.includes("時給 1,500円") && r2.includes("7,500 円"), "① この回だけの時給: " + r2);
  // ② November: 22,500 of shifts + 有給 5 時間 5,000 = 27,500; その3 ⑦ without the 有給
  const sum = await txt(p, "#jobSum");
  ok(/見込み 27,500\s?円/.test(sum) && /有給 1\s日（5\s時間・\+5,000\s円）/.test(sum), "② 有給 in the month: " + sum);
  ok(/1時間あたり 1,125\s円/.test(sum), "② その3 ⑦ the 有給 aside");
  // ⑤ with the way there: 22,500 / (20 時間 + 往復 1 時間 × 4)
  ok(/移動もふくめると 1時間あたり 938\s円（通勤 往復 1\s時間 × 4\s回）/.test(sum), "⑤ " + sum);
  // ⑥ 行かなかった勤務
  ok(/行かなかった勤務 1\s回：/.test(sum) && sum.includes("11/12 代わってもらった") && sum.includes("もどす"), "⑥ " + sum);
  ok(!(await p.$('#shiftList [data-edit="n9"]')), "⑥ not in the list");
  // ④⑤ 次のバイト: あした 17:00, 16:30 に出る, 持ち物, 電話・地図
  const nx = await txt(p, "#bt3Next");
  ok(nx.includes("16:30 に出ると間に合います（通勤 30 分）") && nx.includes("持ち物：エプロン、名札"), "④⑤ next: " + nx);
  ok(await p.getAttribute("#bt3Next a[href^='tel:']", "href") === "tel:0312345678" && (await p.getAttribute("#bt3Next a[href*='maps.apple.com']", "href")).includes(encodeURIComponent("東京都新宿区1-2-3")), "④ 電話・地図");
  // ⑦ the weeks: 12, this one 11/22〜 with 5 時間, the limit at 20
  const wk = await p.evaluate(() => ({ n: document.querySelectorAll("#bt5Weeks .bt5-weeks > div").length, label: document.querySelector("#bt5Weeks .bt5-weeks").getAttribute("aria-label"), limit: !!document.querySelector("#bt5Weeks .bt5-limit"), hidden: document.getElementById("bt5Weeks").hidden }));
  ok(!wk.hidden && wk.n === 12 && wk.label.includes("11/22の週 5時間") && wk.label.includes("11/1の週 5時間") && wk.limit, "⑦ " + JSON.stringify(wk));
  // ⑧ 勤務を探す
  await p.click("#bt5Find summary"); await p.waitForTimeout(300);
  const find = async (q) => { await p.fill("#bt5FindText", q); await p.waitForTimeout(200); return txt(p, "#bt5FindSay"); };
  ok((await find("研修")).startsWith("1 件") && (await txt(p, "#bt5FindList")).includes("11/16"), "⑧ 研修");
  ok((await find("月")).startsWith("3 件"), "⑧ 月曜: " + (await find("月")));
  ok((await find("11/9")).startsWith("1 件"), "⑧ 11/9");
  ok((await find("10月 17:00")).startsWith("2 件"), "⑧ 10月 17:00: " + (await find("10月 17:00")));
  ok((await find("あいう")) === "見つかりませんでした。", "⑧ none");
  // ⑨ シフト希望: 12/5 has a plan; × at once
  await p.click("#bt3Ask summary"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('#bt3AskBody button[data-day="2026-12-05"]').classList.contains("plan")), "⑨ 12/5 marked as a day with a plan");
  await p.click("#bt5AskPlans"); await p.waitForTimeout(300);
  ok(await p.getAttribute('#bt3AskBody button[data-day="2026-12-05"]', "data-m") === "x" && await p.getAttribute('#bt3AskBody button[data-day="2026-12-06"]', "data-m") === "", "⑨ × on it alone");
  // ⑩ 2026 年: 10月分 10,000 + 11月分 27,500
  const yr = await txt(p, "#bt5Year");
  ok(yr.includes("2026年のバイトのまとめ") && yr.includes("37,500 円") && /30\s時間/.test(yr) && /6\s回/.test(yr), "⑩ " + yr);
  ok(/1時間あたり 平均 1,083\s円/.test(yr) && /有給を使った日 1\s日/.test(yr) && /いちばん働いたのは 11月分（20\s時間）/.test(yr) && /給料明細 1 か月分：総支給 10,000\s円・所得税 0\s円・手取り 9,940\s円/.test(yr), "⑩ notes: " + yr);
  // ③ October's slip
  await p.click("#monthNav .navbtn"); await p.waitForTimeout(400);
  const oct = await txt(p, "#jobSum");
  ok(/給料明細：総支給 10,000\s円・引かれた額 60\s円（保険 60）・手取り 9,940\s円/.test(oct) && oct.includes("総支給は見込みどおりです"), "③ " + oct);
  await p.screenshot({ path: (process.argv[2] || __dirname) + "/baito5-oct.png", fullPage: true });
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
