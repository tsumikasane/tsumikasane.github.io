// バイト その15 ①②④⑤⑥⑧⑨⑩: what is shown (⑦ 年末調整と源泉徴収票 は使う人が消した: 2026-11-18; its ticks stay in the data)
process.env.URL0 = process.env.URL0 || "http://localhost:8876/";
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
  // ② カフェ's November: 11/9 の 17:03〜22:07 を 15分ごとに 17:15〜22:00 (−19 分・−346 円); まかない 200 円 × 5 も内訳に
  const cafe = await p.evaluate(() => { const b = [...document.querySelectorAll("#jobSum .job-block")].find((x) => x.innerText.includes("カフェ")); const d = b.querySelector("details.bt9-parts"); d.open = true;
    return { pay: b.querySelector(".job-pay").innerText.replace(/\s+/g, ""), notes: b.querySelector(".bt15-notes")?.innerText.replace(/\s+/g, " ").trim(), parts: [...d.querySelectorAll("li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()) }; });
  ok(cafe.pay === "24,625円", "② the month: " + cafe.pay);
  ok(cafe.notes === "15分ごとに数えて：−19 分・−346 円（本当は1分ごとに払う決まりです）", "② notes: " + cafe.notes);
  ok(cafe.parts.includes("端数の切り捨て（15分ごと） −346 円") && cafe.parts.includes("引かれる額 −1,000 円") && cafe.parts.includes("合計 24,625 円"), "② parts: " + JSON.stringify(cafe.parts));
  ok((await txt(p, '#shiftList li[data-shift="c2"]')).includes("4,550 円"), "② the shift: " + (await txt(p, '#shiftList li[data-shift="c2"]')));
  // ① 終電 and ⑨ the plans before and after, on the rows to come
  const c4 = await txt(p, '#shiftList li[data-shift="c4"]'), c5 = await txt(p, '#shiftList li[data-shift="c5"]');
  ok(c4.includes("終電（23:40）に間に合わないかも") && !c5.includes("終電"), "① " + c4);
  ok(c4.includes("次の日のサークル（9:00）まで 9 時間") && c5.includes("ゼミ（〜16:40）のあと 20 分・通勤 30 分") && !(await txt(p, '#shiftList li[data-shift="c3"]')).includes("のあと"), "⑨ " + JSON.stringify([c4, c5]));
  // ④ 掛け持ち: 11/14 は合わせて 10 時間
  const mu = await txt(p, "#bt15Multi");
  ok(mu.startsWith("11月の掛け持ちの日 11/14（土） カフェ 5 時間＋塾 5 時間 ＝ 10 時間 合わせて8時間をこえています") && mu.endsWith("あとから雇ったお店が払います。") && (await p.$$("#bt15Multi li")).length === 1, "④ " + mu);
  // ⑤ バイトと勉強: 8 週, この4週間の平均 (バイト 1,504 分・勉強 240 分 ÷ 4)
  const st = await p.evaluate(() => ({ rows: [...document.querySelectorAll("#bt15Study .bt15-weeks li")].map((li) => li.getAttribute("aria-label")), text: [...document.querySelectorAll("#bt15Study > p")].map((x) => x.innerText.replace(/\s+/g, " ").trim()),
    bars: [...document.querySelectorAll("#bt15Study .bt15-weeks li")].map((li) => [...li.querySelectorAll("i")].map((i) => i.style.width)), keys: [...document.querySelectorAll("#bt15Study .bt15-key")].map((k) => k.textContent), table: document.querySelectorAll("#bt15Study tbody tr").length }));
  ok(st.rows.length === 8 && st.rows[6] === "11/8からの週：バイト 15.1 時間、勉強 1.5 時間" && st.rows[7] === "今週（ここまで）：バイト 0 時間、勉強 1 時間", "⑤ rows: " + JSON.stringify(st.rows));
  ok(JSON.stringify(st.text) === JSON.stringify(["この4週間の平均：バイト 週 6.3 時間・勉強 週 1 時間", "今週（ここまで）：バイト 0 時間・勉強 1 時間"]), "⑤ " + JSON.stringify(st.text));
  ok(JSON.stringify(st.bars[6]) === JSON.stringify(["100%", "10%"]) && JSON.stringify(st.keys) === JSON.stringify(["バイト", "勉強"]) && st.table === 8, "⑤ bars: " + JSON.stringify(st.bars));
  // ⑥ 次の給料日まで: 11/10 から 収入 7,500・支出 4,200・11/23 のスマホ 2,500 → のこり 800 ÷ 5 日
  ok((await txt(p, "#bt15Purse")) === "次の給料日までのやりくり 1日あたり 160 円 使えます 11月25日（水）の給料日まで あと 5 日（見込み 約 4,800 円・カフェ） 11/10からの収入 7,500 円 11/10からの支出 −4,200 円 これからの固定費（11/23 スマホ） −2,500 円 のこり 800 円 前の給料日からの、家計簿の収入と支出で数えています。", "⑥ " + (await txt(p, "#bt15Purse")));
  ok(!(await p.$("#bt15Tax")), "⑦ gone");
  // ⑧ お知らせ: 面接の1時間前 (⑦ 12/1 の年末調整 no more, its taxChk though still in the data)
  const al = await p.evaluate(() => window.__bt15.alarms(Date.now()).filter((a) => /^bt15-/.test(a.tag)).map((a) => [a.tag, new Date(a.at).toISOString(), a.title, a.body]).sort((a, b) => a[1].localeCompare(b[1])));
  ok(JSON.stringify(al) === JSON.stringify([["bt15-hunt:h1|2026-11-21T15:00", "2026-11-21T05:00:00.000Z", "面接まで1時間", "15:00から「本屋」の面接です（駅前）"]]), "⑧ " + JSON.stringify(al));
  // ⑩ 目標まで 10,375 円: いつもの 17:00〜22:00 (4,800 円) を、よく入る月曜から 3 日
  ok((await txt(p, "#bt15Reach")) === "目標に届く入れ方 いつもの 17:00〜22:00（カフェ）で あと 3 回入れると届きます 11/23（月）・11/28（土）・11/30（月） この日を仮のシフトで入れる", "⑩ " + (await txt(p, "#bt15Reach")));
  // ③⑧ the cards
  ok(!(await p.isHidden("#bt15Tpl")) && !(await p.isHidden("#bt15Hunt")), "③⑧ there");
  // ①②⑧ the settings (⑦'s rows no more)
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  const f = await p.evaluate(() => { const g = (k, id = "j1") => document.querySelector(`#jobForms [data-job="${id}"] [data-f="${k}"]`); return [g("lastTrain").value, g("toStation").value, g("round").value, g("round", "j2").value, document.getElementById("bt15HuntChk").checked, !g("fuyo") && !document.getElementById("bt15TaxChk")]; });
  ok(JSON.stringify(f) === JSON.stringify(["23:40", "15", "15", "0", true, true]), "①②⑧ the settings: " + JSON.stringify(f));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
