// バイト その10 ①②③⑤⑥⑦⑧⑨: what is shown
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
  // ① 出勤前にやること: a shift today, not at work yet
  const ck = await txt(p, "#bt2Clock .bt10-checks");
  ok(ck === "出勤前にやること あと 2 名札をつける シフト表を見る" && (await p.$$("#bt2Clock .bt10-checks input[type=checkbox]")).length === 2, "① before: " + ck);
  ok(!(await p.$("#bt10Break")), "⑩ no 休憩 before 出勤");
  // ⑥ 次の給料日: カフェ's 10月分 on 11/25 (10 時間 × 1,000 + 交通費 2 × 300), 配達's 11月分 on 12/10 (6 時間 × 1,000 + 20 件 × 300)
  const nx = await txt(p, "#bt10Next");
  ok(nx === "次の給料日 11月25日（水）（あと 9 日） カフェ：約 10,600 円（10月分） 12月10日（木）（あと 24 日） 配達：約 12,000 円（11月分）", "⑥ " + nx);
  // ② いっしょに入った人: 田中 3, 佐藤 1; on the rows
  const w = await p.evaluate(() => [...document.querySelectorAll("#bt10With .chip-btn")].map((x) => x.innerText.replace(/\s+/g, " ").trim()));
  ok((await txt(p, "#bt10With")).startsWith("いっしょに入った人（この3か月）") && JSON.stringify(w) === JSON.stringify(["田中 3 回", "佐藤 1 回"]), "② " + JSON.stringify(w));
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
  // ⑨ 借りているもの: 1 in the head
  ok((await txt(p, "#bt10LentHead")) === "借りているもの（1）", "⑨ head: " + (await txt(p, "#bt10LentHead")));
  // ⑤ 就活用のまとめ
  await p.click("#bt10SkillsCard summary"); await p.waitForTimeout(300);
  ok((await txt(p, '#bt10SkillsBody [data-job="j1"]')).includes("レジ（6/10）") && (await txt(p, '#bt10SkillsBody [data-job="j2"]')).includes("まだありません"), "④ the list");
  await p.click("#bt10Resume"); await p.waitForTimeout(300);
  const cp = await p.evaluate(() => window.__copied);
  ok(cp === "【カフェ】2026年10月〜現在（1か月）\n・勤務 4 回・のべ 20 時間\n・いつも入っている曜日：月\n・できるようになったこと：レジ（2026年6月）\n・時給：950円 → 1,000円\n\n【配達】2026年11月〜現在（1か月）\n・勤務 2 回・のべ 6 時間", "⑤ " + JSON.stringify(cp));
  // ①⑦⑧ the job's form
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  const f = await p.evaluate(() => { const v = (j, k) => document.querySelector(`#jobForms [data-job="${j}"] [data-f="${k}"]`); return [v("j1", "checksIn").value, v("j1", "checksOut").value, v("j1", "contractEnd").value, v("j1", "contractAlarm").checked, v("j2", "unitPrice").value, v("j2", "contractEnd").value]; });
  ok(JSON.stringify(f) === JSON.stringify(["名札をつける\nシフト表を見る", "レジ締め", "2026-11-27", true, "300", ""]), "①⑦⑧ the form: " + JSON.stringify(f));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
