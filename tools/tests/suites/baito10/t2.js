// バイト その10 ①②⑦⑧⑩: what is pressed and typed (④⑨ は使う人が消した: 2026-11-18)
process.env.URL0 = process.env.URL0 || "http://localhost:8869/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setting = async (p, id) => (await ls(p, "settings")).find((s) => s.id === id);
const job = async (p, id) => (await setting(p, "jobs")).items.find((j) => j.id === id);
const shift = async (p, id) => (await ls(p, "shifts")).find((x) => x.id === id);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  // ① 出勤前: one ticked, kept on this device
  await p.click('#bt2Clock .bt10-checks input[data-chk="0"]'); await p.waitForTimeout(300);
  ok((await txt(p, "#bt2Clock .bt10-checks-head")) === "出勤前にやること あと 1" && await p.isChecked('#bt2Clock .bt10-checks input[data-chk="0"]'), "① ticked: " + (await txt(p, "#bt2Clock .bt10-checks-head")));
  ok(JSON.stringify(await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "bt10Chk"))[`2026-11-16|j1|in`], P)) === "[0]", "① kept");
  // 出勤: 退勤前 and 休憩
  await p.click('#bt2Clock .bt2-clock-row .btn'); await p.waitForTimeout(400);
  ok((await txt(p, "#bt2Clock .bt10-checks")) === "退勤前にやること あと 1 レジ締め" && (await txt(p, "#bt10Break")) === "休憩に入る", "① after 出勤: " + (await txt(p, "#bt2Clock .bt10-checks")));
  // ⑩ 休憩 12:10〜12:40
  await p.clock.setFixedTime(at("12:10", today));
  await p.click("#bt10Break"); await p.waitForTimeout(300);
  ok((await setting(p, "bt2Clock")).breakAt === at("12:10", today).getTime() && (await txt(p, "#bt10Break")) === "休憩からもどる", "⑩ 休憩に入る");
  await p.clock.setFixedTime(at("12:40", today));
  await p.reload(); await p.waitForTimeout(900);
  const cl = await txt(p, "#bt2Clock");
  ok(cl.includes("休憩中（30 分）") && /ここまで 約 167\s円/.test(cl), "⑩ on 休憩, the pay without it: " + cl);
  await p.click("#bt10Break"); await p.waitForTimeout(300);
  const c = await setting(p, "bt2Clock");
  ok(c.rest === 30 && !("breakAt" in c) && (await txt(p, "#bt2Clock .bt10-break")).includes("休憩 30 分"), "⑩ もどる: " + JSON.stringify(c));
  // ① a tick on the list after 出勤; ⑩ 退勤 at 13:00: the plan's shift with 30 分 of 休憩
  await p.click('#bt2Clock .bt10-checks input[data-chk="0"]'); await p.waitForTimeout(300);
  ok((await txt(p, "#bt2Clock .bt10-checks-head")) === "退勤前にやること ぜんぶできました", "① all done");
  await p.clock.setFixedTime(at("13:00", today));
  await p.click('#bt2Clock .bt2-clock-row .btn'); await p.waitForTimeout(500);
  const td = await shift(p, "td");
  ok(td.start === "12:00" && td.end === "13:00" && td.rest === 30 && td.clocked === true && !(await setting(p, "bt2Clock")), "⑩ 退勤: " + JSON.stringify(td));
  // ② いっしょ in the sheet
  await p.click('#shiftList [data-edit="c3"]'); await p.waitForTimeout(500);
  ok((await p.inputValue("#reShiftWith")) === "田中", "② in the sheet");
  await p.fill("#reShiftWith", "田中、 鈴木・田中"); await p.locator("#recSave").click(); await p.waitForTimeout(600);
  ok(JSON.stringify((await shift(p, "c3")).with) === JSON.stringify(["田中", "鈴木"]), "② kept: " + JSON.stringify((await shift(p, "c3")).with));
  // ⑦ 件数 in the sheet
  await p.click('#shiftList [data-edit="d1"]'); await p.waitForTimeout(500);
  ok((await p.inputValue("#reShiftUnits")) === "12", "⑦ in the sheet");
  await p.fill("#reShiftUnits", "15"); await p.locator("#recSave").click(); await p.waitForTimeout(600);
  ok((await shift(p, "d1")).units === 15, "⑦ kept");
  ok(/出来高 23\s件・\+6,900\s円/.test(await p.evaluate(() => [...document.querySelectorAll("#jobSum .job-block")].find((b) => b.innerText.includes("配達"))?.innerText.replace(/\s+/g, " ") || "")), "⑦ the month again");
  // ② the names, 鈴木 too (pressed to look for until 勤務を探す was taken off 2026-11-18)
  const w = await txt(p, "#bt10With p.bt10-with");
  ok(w.startsWith("田中 3 回・") && w.includes("鈴木 1 回") && w.split("・").length === 3 && !(await p.$("#bt10With button")), "② the names: " + w);
  // ⑦ ひとことで: 件数
  await p.fill("#bt3QuickText", "11/20 17-20 配達 10件"); await p.waitForTimeout(200);
  ok((await txt(p, "#bt3QuickSay")).includes("・10 件"), "⑦ said: " + (await txt(p, "#bt3QuickSay")));
  await p.press("#bt3QuickText", "Enter"); await p.waitForTimeout(400);
  ok((await ls(p, "shifts")).some((x) => x.date === "2026-11-20" && x.start === "17:00" && x.end === "20:00" && x.jobId === "j2" && x.units === 10), "⑦ put in");
  // as カフェ is left: 借りているもの no more said (消した: 2026-11-18); not left
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  await p.click('#jobForms [data-job="j1"] .bt9-end'); await p.waitForTimeout(300);
  ok((await txt(p, "#confirmMsg")).startsWith("「カフェ」をやめたことにしますか？") && !(await txt(p, "#confirmMsg")).includes("借りているもの"), "no 借りているもの: " + (await txt(p, "#confirmMsg")));
  await p.click("#confirmNo"); await p.waitForTimeout(300);
  ok(!("ended" in (await job(p, "j1"))), "not left");
  // ⑧ its お知らせ off; ① a line more; ⑦ the price changed
  await p.uncheck('#jobForms [data-job="j1"] [data-f="contractAlarm"]'); await p.waitForTimeout(700);
  ok((await job(p, "j1")).contractAlarm === false && !(await p.evaluate(() => window.__bt10.alarms(Date.now()).some((a) => a.tag.startsWith("bt10-contract")))), "⑧ off");
  await p.fill('#jobForms [data-job="j1"] [data-f="checksOut"]', "レジ締め\n\n  ゴミを出す  "); await p.waitForTimeout(900);
  ok(JSON.stringify((await job(p, "j1")).checks) === JSON.stringify({ in: ["名札をつける", "シフト表を見る"], out: ["レジ締め", "ゴミを出す"] }), "① the list changed: " + JSON.stringify((await job(p, "j1")).checks));
  await p.fill('#jobForms [data-job="j2"] [data-f="unitPrice"]', "350"); await p.waitForTimeout(900);
  ok((await job(p, "j2")).unitPrice === 350, "⑦ the price");
  await p.fill('#jobForms [data-job="j1"] [data-f="contractEnd"]', ""); await p.waitForTimeout(900);
  ok(!("contractEnd" in (await job(p, "j1"))), "⑧ the contract's end taken off");
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
