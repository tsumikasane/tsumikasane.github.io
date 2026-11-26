// バイト その14 ①②③④⑤⑥⑦⑧⑨: what is shown (⑨ これからとすんだ: taken out with the month's list of shifts, 2026-11-26)
process.env.URL0 = process.env.URL0 || "http://localhost:8865/";
const { chromium } = require("playwright");
const { P, at, phone, seed, shiftRow } = require("./lib");
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
  ok((await shiftRow(p, "w21")).includes("12,800 円") && (await shiftRow(p, "w20")).includes("5,300 円") && (await shiftRow(p, "w19")).includes("8,300 円"), "① each shift (in 勤務カレンダー's day)");
  // ④ お知らせ: 12/1 に年の目安 (73,300 / 90,000); ③ 給料の入金のたしかめ (給料日の次の朝) taken out at the user's call
  // (2026-11-25, tools/REMOVED.md): none, though its switch (payChk) stays saved on
  const al = await p.evaluate(() => window.__bt14.alarms(Date.now()).filter((a) => /^bt14-/.test(a.tag)).map((a) => [a.tag, new Date(a.at).toISOString(), a.title, a.body]));
  const by = (t) => al.find((a) => a[0] === t);
  ok(al.length && !al.some((a) => a[0].startsWith("bt14-pay:")), "③ 給料の入金のたしかめ: gone " + JSON.stringify(al));
  ok(JSON.stringify(by("bt14-wall:2026-12")) === JSON.stringify(["bt14-wall:2026-12", "2026-12-01T00:00:00.000Z", "年の目安に近づいています", "2026年の見込み 約 73,300円・目安 90,000円まで あと 約 16,700円"]) && !by("bt14-wall:2027-01"), "④ " + JSON.stringify(by("bt14-wall:2026-12")));
  // ⑧ 塾, left on 10/31
  const lf = await txt(p, "#bt14Left");
  ok(lf === "やめたあとにすること 塾（10/31にやめた） ・ 最後の給料日 11月25日（水）（10月分 約 4,500 円） あと 5 日", "⑧ (返していないもの と 源泉徴収票 は消した: 2026-11-18) " + lf);
  // ⑨ これからとすんだ (the month's list in two parts): taken out with the list at the user's call (2026-11-26, tools/REMOVED.md)
  ok(!(await p.$("#shiftList")) && !(await p.$(".bt14-sep")), "⑨ gone, with the month's list");
  // ⑤ 連絡先
  await p.click("#bt14People summary"); await p.waitForTimeout(300);
  const pe = await p.evaluate(() => [...document.querySelectorAll('#bt14PeopleBody [data-job="j1"] li')].map((li) => [li.querySelector("span").textContent, li.querySelector("a")?.getAttribute("href") || ""]));
  ok(JSON.stringify(pe) === JSON.stringify([["お店", "tel:0312345678"], ["店長 田中", "tel:09011112222"]]) && !(await p.$('#bt14PeopleBody [data-job="j2"]')), "⑤ " + JSON.stringify(pe));
  // ⑥ ヘルプに入れる日を文字で: taken out at the user's call (2026-11-19, tools/REMOVED.md)
  ok(!(await p.$("#bt14Help")), "⑥ gone");
  // ⑦ 時給が変わったら（もしもの計算）: taken out at the user's call (2026-11-19, tools/REMOVED.md)
  ok(!(await p.$("#bt14What")), "⑦ 時給が変わったら: gone");
  // ②③④ the settings
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  const f = await p.evaluate(() => ({ max: document.querySelector('#jobForms [data-job="j1"] [data-f="fareMax"]').value, pay: !!document.getElementById("bt14PayChk") || [...document.querySelectorAll("h3.group-head")].some((h) => h.textContent.includes("給料の入金")), wall: document.getElementById("bt14WallChk").checked,
    ot: document.querySelector('#jobForms [data-job="j1"] [data-f="ot"]').closest("label").textContent }));
  ok(f.max === "1000" && !f.pay && f.wall && f.ot.startsWith("1日8時間・週40時間をこえた分は"), "①②④ the settings (③ gone): " + JSON.stringify(f));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
