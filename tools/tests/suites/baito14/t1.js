// バイト その14 ①②③④⑤⑥⑦⑧⑨: what is shown
process.env.URL0 = process.env.URL0 || "http://localhost:8865/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const block = (p, name) => p.evaluate((name) => [...document.querySelectorAll("#jobSum .job-block")].find((b) => b.innerText.includes(name)), name);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  // ①② カフェ's November: 59 時間 × 1,000 + 8時間 2 時間 × 250 + 週40時間 12 時間 × 250 + 交通費 2,400 − 1,400 = 63,500
  const cafe = await p.evaluate(() => { const b = [...document.querySelectorAll("#jobSum .job-block")].find((x) => x.innerText.includes("カフェ")); const d = b.querySelector("details.bt9-parts"); d.open = true;
    return { pay: b.querySelector(".job-pay").innerText.replace(/\s+/g, ""), notes: b.querySelector(".bt14-notes")?.innerText.replace(/\s+/g, " ").trim(), parts: [...d.querySelectorAll("li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()) }; });
  ok(cafe.pay === "63,500円", "①② the month: " + cafe.pay);
  ok(cafe.notes === "週40時間をこえた分：12 時間・+3,000 円 交通費は1か月 1,000 円 まで：−1,400 円", "①② notes: " + cafe.notes);
  ok(cafe.parts.includes("週40時間をこえた分の割増 3,000 円") && cafe.parts.includes("8時間をこえた分の割増 500 円") && cafe.parts.includes("交通費 2,400 円") && cafe.parts.includes("交通費の上限 −1,400 円") && cafe.parts.includes("合計 63,500 円"), "①② parts: " + JSON.stringify(cafe.parts));
  ok((await txt(p, '#shiftList li[data-shift="w21"]')).includes("12,800 円") && (await txt(p, '#shiftList li[data-shift="w20"]')).includes("5,300 円") && (await txt(p, '#shiftList li[data-shift="w19"]')).includes("8,300 円"), "① each shift");
  // ③④ お知らせ: 給料日の次の朝 (カフェ 10月分・11月分, 塾 10月分), 12/1 に年の目安 (73,300 / 90,000)
  const al = await p.evaluate(() => window.__bt14.alarms(Date.now()).filter((a) => /^bt14-/.test(a.tag)).map((a) => [a.tag, new Date(a.at).toISOString(), a.title, a.body]));
  const by = (t) => al.find((a) => a[0] === t);
  ok(JSON.stringify(by("bt14-pay:j1|2026-10")) === JSON.stringify(["bt14-pay:j1|2026-10", "2026-11-26T00:00:00.000Z", "給料は入りましたか？", "カフェの10月分（見込み 約 5,300円）。入っていたら、家計簿の収入に入れましょう"]) && by("bt14-pay:j1|2026-11") && by("bt14-pay:j2|2026-10"), "③ " + JSON.stringify(al));
  ok(JSON.stringify(by("bt14-wall:2026-12")) === JSON.stringify(["bt14-wall:2026-12", "2026-12-01T00:00:00.000Z", "年の目安に近づいています", "2026年の見込み 約 73,300円・目安 90,000円まで あと 約 16,700円"]) && !by("bt14-wall:2027-01"), "④ " + JSON.stringify(by("bt14-wall:2026-12")));
  // ⑧ 塾, left on 10/31
  const lf = await txt(p, "#bt14Left");
  ok(lf === "やめたあとにすること 塾（10/31にやめた） ・ 最後の給料日 11月25日（水）（10月分 約 4,500 円） あと 5 日 ・ 2026年の源泉徴収票 やめてから1か月以内にもらえる決まりです。もらったら「源泉徴収票」に記録しましょう ・ 返していないもの：制服 返したら「借りているもの」で「返した」を押します", "⑧ " + lf);
  // ⑨ これからとすんだ
  const seps = await p.evaluate(() => [...document.querySelectorAll("#shiftList > li")].map((li) => li.classList.contains("bt14-sep") ? "|" + li.textContent.replace(/\s+/g, " ") : li.dataset.shift));
  ok(JSON.stringify(seps) === JSON.stringify(["|これからの勤務（2）", "w21", "w20", "|すんだ勤務（6）", "w19", "w18", "w17", "w16", "w15", "n2"]), "⑨ " + JSON.stringify(seps));
  // ⑤ 連絡先
  await p.click("#bt14People summary"); await p.waitForTimeout(300);
  const pe = await p.evaluate(() => [...document.querySelectorAll('#bt14PeopleBody [data-job="j1"] li')].map((li) => [li.querySelector("span").textContent, li.querySelector("a")?.getAttribute("href") || ""]));
  ok(JSON.stringify(pe) === JSON.stringify([["お店", "tel:0312345678"], ["店長 田中", "tel:09011112222"]]) && !(await p.$('#bt14PeopleBody [data-job="j2"]')), "⑤ " + JSON.stringify(pe));
  // ⑥ ヘルプに入れる日: 11/22〜12/4 (13 日), ゼミ の 11/24 は外して
  await p.click("#bt14Help summary"); await p.waitForTimeout(300);
  const hp = await p.evaluate(() => [...document.querySelectorAll("#bt14HelpBody li")].map((li) => [li.querySelector("input").dataset.day, li.querySelector("input").checked, li.querySelector("small")?.textContent || ""]));
  ok(hp.length === 13 && hp[0][0] === "2026-11-22" && hp.filter((x) => x[1]).length === 12 && JSON.stringify(hp.find((x) => x[0] === "2026-11-24")) === JSON.stringify(["2026-11-24", false, "予定：ゼミ（13:00〜15:00）"]), "⑥ " + JSON.stringify(hp.slice(0, 4)));
  // ⑦ 1,050 円なら: この3か月 54 時間 (月 18 時間)
  await p.click("#bt14What summary"); await p.waitForTimeout(300);
  ok((await p.inputValue("#bt14WhatWage")) === "1050" && (await txt(p, "#bt14WhatOut")) === "いまの 1,000円 から 1,050円 になると、この3か月の平均（月 約 18 時間）で 月 +900 円・年 +10,800 円 年の目安まで働けるのは あと 約 16 時間 → 約 15 時間", "⑦ " + (await txt(p, "#bt14WhatOut")));
  // ②③④ the settings
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  const f = await p.evaluate(() => ({ max: document.querySelector('#jobForms [data-job="j1"] [data-f="fareMax"]').value, pay: document.getElementById("bt14PayChk").checked, wall: document.getElementById("bt14WallChk").checked,
    ot: document.querySelector('#jobForms [data-job="j1"] [data-f="ot"]').closest("label").textContent }));
  ok(f.max === "1000" && f.pay && f.wall && f.ot.startsWith("1日8時間・週40時間をこえた分は"), "①②③④ the settings: " + JSON.stringify(f));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
