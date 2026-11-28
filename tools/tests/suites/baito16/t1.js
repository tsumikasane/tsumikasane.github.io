// バイト その16 ①〜⑥⑧⑨: what is shown (⑦ は使う人が消した: 2026-11-18)
process.env.URL0 = process.env.URL0 || "http://localhost:8877/";
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
  // ① これから届くお知らせ put away (バイト先の連絡先 till it went into the settings, 2026-11-28; 何時間分？ taken out 2026-11-19)
  ok(await p.evaluate(() => getComputedStyle(document.getElementById("bt10AlarmsCard")).display === "none" && getComputedStyle(document.getElementById("bt6Cal")).display !== "none"), "① これから届くお知らせ put away");
  // ② まだ仮のシフト
  ok((await txt(p, "#bt16Tent")) === "まだ仮のシフト（2） 11/23（月） 17:00〜22:00 カフェ 確定にする 11/27（金） 17:00〜22:00 カフェ 確定にする 2 件をまとめて確定", "② " + (await txt(p, "#bt16Tent")));
  // ③ 定期券, 3 日あと
  ok((await txt(p, "#bt16Pass")) === "定期券の期限 カフェの定期券は 11月23日（月）まで（あと 3 日） 買いかえたら、バイト先の設定で次の期限を入れます。", "③ " + (await txt(p, "#bt16Pass")));
  // ④ 12月のシフト希望, 11/25 まで
  ok((await txt(p, "#bt16Asked")) === "12月のシフト希望：まだ出していません（締め切り 11月25日（水）） 出した", "④ " + (await txt(p, "#bt16Asked")));
  // ⑤ 次のバイト: 17:00 − 通勤 30 分 − 10 分前
  ok((await txt(p, "#bt3Next")).includes("16:20 に出ると間に合います（通勤 30 分・10 分前に着く）"), "⑤ " + (await txt(p, "#bt3Next")));
  // ⑥ カフェ's 11月 against 去年の11月 (2 回・9 時間・9,000 円)
  const note = await p.evaluate(() => [...document.querySelectorAll("#jobSum .job-block")].find((x) => x.innerText.includes("カフェ")).querySelector(".bt16-notes")?.innerText.replace(/\s+/g, " ").trim());
  ok(note === "去年の11月分より +3 回・+16 時間・+16,000 円", "⑥ " + note);
  ok(!(await p.evaluate(() => [...document.querySelectorAll("#jobSum .job-block")].find((x) => x.innerText.includes("塾"))?.querySelector(".bt16-notes"))), "⑥ none for 塾 (no 去年)");
  // ⑧ バイトの日の支出: taken out at the user's call (2026-11-19, tools/REMOVED.md)
  ok(!(await p.$("#bt16Spend")), "⑧ バイトの日の支出: gone");
  // ⑨ 最低賃金 taken out at the user's call (2026-11-25, tools/REMOVED.md): no card, though 1,100 円 stays saved
  ok(!(await p.$("#bt16Min")) && !(await p.evaluate(() => [...document.querySelectorAll("#moneyJob .card")].some((c) => c.innerText.includes("最低賃金")))), "⑨ 最低賃金: gone");
  // ②③④⑤ お知らせ
  const al = await p.evaluate(() => window.__bt16.alarms(Date.now()).filter((a) => /^(bt16-|bt2-ask:|bt7-go:)/.test(a.tag)).map((a) => [a.tag, new Date(a.at).toISOString(), a.title, a.body]).sort((a, b) => a[1].localeCompare(b[1])));
  const by = (t) => al.find((a) => a[0] === t);
  ok(JSON.stringify(by("bt16-tent:tz1:2026-11-23:17:00")) === JSON.stringify(["bt16-tent:tz1:2026-11-23:17:00", "2026-11-21T11:00:00.000Z", "仮のシフトは決まりましたか？", "11月23日（月） 17:00〜22:00（カフェ）が、まだ仮のままです"]) && by("bt16-tent:tz2:2026-11-27:17:00"), "② " + JSON.stringify(al));
  ok(JSON.stringify(by("bt16-pass:j1:2026-11-23:0")) === JSON.stringify(["bt16-pass:j1:2026-11-23:0", "2026-11-22T23:00:00.000Z", "定期券はきょうまでです", "カフェの定期券は 11月23日（月）までです。買いかえたら、バイト先の設定で次の期限を入れましょう"]) && !by("bt16-pass:j1:2026-11-23:3"), "③ " + JSON.stringify(by("bt16-pass:j1:2026-11-23:0")));
  ok(!!by("bt2-ask:2026-11-25"), "④ the 締め切り's お知らせ, not yet given");
  const go = by("bt7-go:tz1:2026-11-23:17:00");
  ok(go && go[1] === "2026-11-23T07:20:00.000Z" && go[3].startsWith("17:00 からカフェ（通勤 30 分・10 分前に着く）"), "⑤ " + JSON.stringify(go));
  // ①③⑤ the settings (⑨ gone)
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  await p.click("#bt16CardsBox summary"); await p.waitForTimeout(300);
  const f = await p.evaluate(() => { const g = (k) => document.querySelector(`#jobForms [data-job="j1"] [data-f="${k}"]`); const c = (id) => document.querySelector(`#bt16Cards [data-card="${id}"]`); return [g("early").value, g("pass").value, !!document.getElementById("bt16MinWage") || [...document.querySelectorAll("h3.group-head")].some((h) => h.textContent.includes("最低賃金")), document.getElementById("bt16TentChk").checked, document.getElementById("bt16PassChk").checked, c("bt10AlarmsCard").checked, c("bt6Cal").checked, document.getElementById("bt16CardsHead").textContent, document.querySelectorAll("#bt16Cards [data-card]").length, [...document.querySelectorAll("#bt16Cards [data-card]")].map((x) => x.dataset.card)]; });
  ok(JSON.stringify(f.slice(0, 8)) === JSON.stringify(["10", "2026-11-23", false, true, true, false, true, "カードを選ぶ（1 こ しまっています）"]) && f[8] >= 23 && !f[9].includes("bt6Notes") && !f[9].includes("bt14People") && !["bt2Calc", "bt14Help", "bt15Tpl", "bt13Week", "bt5Year", "bt13Miles", "bt15Tax", "bt6Feel", "bt6Bulk", "bt7Photos", "bt5Find", "bt12Cost", "bt9GensenCard", "bt12Feel", "bt2Bulk", "bt5Weeks", "bt7Total", "bt8Records", "bt8Ways", "bt9Heat", "bt14What", "bt15Hunt", "bt16Spend", "bt16Min", "bt17Split", "bt10Next"].some((id) => f[9].includes(id)), "①③⑤ the settings (⑨ gone): " + JSON.stringify(f));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
