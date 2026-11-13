// バイト その4 ④⑤⑦ and the job's settings (①②③⑥): what is typed in
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setting = async (p, id) => (await ls(p, "settings")).find((s) => s.id === id);
const job = async (p, id) => (await setting(p, "jobs")).items.find((j) => j.id === id);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  // (塾 only from 11/1, so its 有給 and its months stay out of the way)
  const data = { ...DATA, shifts: DATA.shifts.filter((x) => x.jobId === "j1"), settings: [{ ...DATA.settings[0], items: DATA.settings[0].items.map((j) => (j.id === "j1" ? { ...j, autoIn: undefined } : j)) }] };
  await seed(p, data, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(800);
  // ④ a メモ from the form, kept on the shift and gone from the field
  await p.fill("#shiftDate", "2026-11-29"); await p.fill("#shiftStart", "10:00"); await p.fill("#shiftEnd", "14:00"); await p.fill("#shiftRest", "0");
  await p.fill("#shiftMemo", "代わり（田中さん）");
  await p.locator('#shiftForm button[type="submit"]').click(); await p.waitForTimeout(500);
  let sh = (await ls(p, "shifts")).find((x) => x.date === "2026-11-29");
  ok(sh && sh.memo === "代わり（田中さん）" && (await p.inputValue("#shiftMemo")) === "", "④ the form's メモ: " + JSON.stringify(sh));
  // and changed in its sheet
  await p.click(`#shiftList [data-edit="${sh.id}"]`); await p.waitForTimeout(500);
  ok((await p.inputValue("#reShiftMemo")) === "代わり（田中さん）", "④ in the sheet");
  await p.fill("#reShiftMemo", "代わり"); await p.locator("#recSave").click(); await p.waitForTimeout(600);
  ok((await ls(p, "shifts")).find((x) => x.id === sh.id).memo === "代わり", "④ changed");
  await p.click(`#shiftList [data-edit="${sh.id}"]`); await p.waitForTimeout(500);
  await p.fill("#reShiftMemo", ""); await p.locator("#recSave").click(); await p.waitForTimeout(600);
  ok(!("memo" in (await ls(p, "shifts")).find((x) => x.id === sh.id)), "④ taken off");
  // ⑤ 休憩の目安: off, nothing; on, by the length, till one is typed
  await p.fill("#shiftRest", ""); await p.fill("#shiftStart", "09:00"); await p.fill("#shiftEnd", "18:00"); await p.dispatchEvent("#shiftEnd", "change");
  ok((await p.inputValue("#shiftRest")) === "", "⑤ off: left empty");
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  await p.evaluate(() => { const c = document.getElementById("bt4AutoRest"); c.checked = true; c.dispatchEvent(new Event("change")); }); await p.waitForTimeout(300);
  ok((await setting(p, "bt4")).autoRest === true, "⑤ turned on");
  // ①②③⑥ the job's rows, there and saved
  const f = '#jobForms [data-job="j1"]';
  ok(await p.isChecked(`${f} [data-f="ot"]`) && (await p.inputValue(`${f} [data-f="bandFrom"]`)) === "06:00" && (await p.inputValue(`${f} [data-f="bandPlus"]`)) === "100" && (await p.inputValue(`${f} [data-f="deduct"]`)) === "300" && !(await p.isChecked(`${f} [data-f="autoIn"]`)), "①②③⑥ the job's form");
  await p.locator(`${f} [data-f="ot"]`).uncheck({ force: true }); await p.locator(`${f} [data-f="autoIn"]`).check({ force: true }); await p.waitForTimeout(800);
  let j1 = await job(p, "j1");
  ok(j1.ot === false && j1.autoIn === today && j1.band.plus === 100 && j1.deduct === 300, "① off, ⑥ on from today: " + JSON.stringify(j1));
  await p.fill(`${f} [data-f="deduct"]`, ""); await p.waitForTimeout(900);
  ok(!("deduct" in (await job(p, "j1"))), "③ emptied: none");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  if (await p.evaluate(() => !!document.querySelector("dialog[open]"))) { await p.click("#sheetClose").catch(() => {}); await p.waitForTimeout(400); }
  // ① off: 11/2's 9 時間 is 9,000 (no 250), ③ none taken
  ok((await txt(p, '#shiftList li:has([data-edit="n1"])')).includes("9,000 円"), "① off: " + (await txt(p, '#shiftList li:has([data-edit="n1"])')));
  // ⑤ on: 9:00〜18:00 is 60, 9:00〜16:00 45; one typed stays
  await p.fill("#shiftRest", ""); await p.fill("#shiftStart", "09:00"); await p.fill("#shiftEnd", "18:00"); await p.dispatchEvent("#shiftEnd", "change");
  ok((await p.inputValue("#shiftRest")) === "60", "⑤ 9 時間: 60");
  await p.fill("#shiftEnd", "16:00"); await p.dispatchEvent("#shiftEnd", "change");
  ok((await p.inputValue("#shiftRest")) === "45", "⑤ 7 時間: 45");
  await p.fill("#shiftRest", "30"); await p.fill("#shiftEnd", "18:00"); await p.dispatchEvent("#shiftEnd", "change");
  ok((await p.inputValue("#shiftRest")) === "30", "⑤ typed: kept");
  // ⑤④ ひとことで: the rest by its length, the words left as メモ
  await p.fill("#bt3QuickText", "あした 10-18 研修"); await p.waitForTimeout(200);
  ok((await txt(p, "#bt3QuickSay")).includes("11/27（金） 10:00〜18:00・休憩 45分（目安）・カフェ「研修」"), "⑤④ said: " + (await txt(p, "#bt3QuickSay")));
  await p.press("#bt3QuickText", "Enter"); await p.waitForTimeout(400);
  sh = (await ls(p, "shifts")).find((x) => x.date === "2026-11-27");
  ok(sh && sh.rest === 45 && sh.memo === "研修", "⑤④ put in: " + JSON.stringify(sh));
  await p.fill("#bt3QuickText", "土曜 9-13 休憩なし"); await p.waitForTimeout(200);
  ok((await txt(p, "#bt3QuickSay")).includes("11/28（土） 09:00〜13:00") && !(await txt(p, "#bt3QuickSay")).includes("休憩"), "⑤ 休憩なし: " + (await txt(p, "#bt3QuickSay")));
  await p.fill("#bt3QuickText", "");
  // ⑦ 前払い: 5,000 from November's; what is left for 給料日; 収入に入れる puts in that; deleted with its 収入
  const blk = '#jobSum .job-block';
  const before = await txt(p, blk);
  const m = /見込み\s*([\d,]+)\s*円/.exec(before), est = Number(m[1].replace(/,/g, ""));
  await p.click(`${blk} .bt4-adv-open`); await p.waitForTimeout(300);
  await p.fill(`${blk} [data-a="amount"]`, "5000");
  await p.click(`${blk} .bt4-adv-form .btn`); await p.waitForTimeout(500);
  const adv = (await setting(p, "bt4Adv")).items[0], inc = (await ls(p, "expenses")).find((e) => e.id === adv.ex);
  ok(adv.jobId === "j1" && adv.ym === "2026-11" && adv.amount === 5000 && adv.date === today && inc && inc.kind === "in" && inc.amount === 5000 && inc.memo === "カフェの前払い（11月分）", "⑦ kept: " + JSON.stringify([adv, inc]));
  const after = await txt(p, blk), left = (est - 5000).toLocaleString("en-US");
  ok(after.includes("前払い 11/26 5,000 円") && after.includes(`給料日（12/25）に入るのは 約 ${left} 円`), "⑦ said: " + after);
  await p.click(`${blk} .job-act`); await p.waitForTimeout(500);
  ok((await p.inputValue("#exAmount")) === String(est - 5000), "⑦ 収入に入れる: what is left " + (await p.inputValue("#exAmount")));
  await p.locator('#exForm button[type="submit"]').click(); await p.waitForTimeout(500);
  ok((await ls(p, "expenses")).some((e) => e.pay === "j1|2026-11" && e.amount === est - 5000), "⑦ marked as the month's pay");
  await p.click('#moneyParts button[data-part="job"]'); await p.waitForTimeout(400);
  await p.click("#monthNav .navbtn"); await p.waitForTimeout(400); // (収入に入れる went to 12月, the month of 給料日)
  ok((await txt(p, blk)).includes("実際の給料") && (await txt(p, blk)).includes("見込みどおり"), "⑦ その3 ⑥ against what was left: " + (await txt(p, blk)));
  await p.click(`${blk} .bt4-adv-x`); await p.waitForTimeout(500);
  ok(!(await setting(p, "bt4Adv")).items.length && !(await ls(p, "expenses")).some((e) => e.id === adv.ex), "⑦ deleted with its 収入");
  await p.screenshot({ path: (process.argv[2] || __dirname) + "/baito4-form.png", fullPage: true });
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
