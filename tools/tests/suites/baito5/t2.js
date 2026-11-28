// バイト その5 ①②③④⑤⑥: what is typed in
const { chromium } = require("playwright");
const { P, at, phone, seed, openShift } = require("./lib");
const { DATA, today, job } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setting = async (p, id) => (await ls(p, "settings")).find((s) => s.id === id);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  // (no slip, no 有給, no 行かなかった, and the job without its 電話・住所・持ち物・通勤)
  const plain = { id: job.id, name: job.name, wage: 1000, fare: 0, night: true, cutoff: 0, payday: 25 };
  await seed(p, { ...DATA, settings: [{ id: "jobs", items: [plain], updatedAt: 1 }] }, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(800);
  const est = async () => Number(/見込み\s*([\d,]+)\s*円/.exec(await txt(p, "#jobSum"))[1].replace(/,/g, ""));
  const base = await est();
  // ① the form's 時給, for that shift alone
  await p.fill("#shiftDate", "2026-11-29"); await p.fill("#shiftStart", "10:00"); await p.fill("#shiftEnd", "14:00"); await p.fill("#shiftRest", "0"); await p.fill("#shiftWage", "1300");
  await p.locator('#shiftForm button[type="submit"]').click(); await p.waitForTimeout(500);
  let sh = (await ls(p, "shifts")).find((x) => x.date === "2026-11-29");
  ok(sh && sh.wage === 1300 && (await p.inputValue("#shiftWage")) === "" && (await est()) === base + 5200, "① the form: " + JSON.stringify(sh));
  // in the sheet: set and taken off
  await openShift(p, "n1");
  ok((await p.inputValue("#reShiftWage")) === "", "① n1 has none");
  await p.fill("#reShiftWage", "1100"); await p.locator("#recSave").click(); await p.waitForTimeout(600);
  ok((await ls(p, "shifts")).find((x) => x.id === "n1").wage === 1100, "① set in the sheet");
  await openShift(p, "n1");
  await p.fill("#reShiftWage", ""); await p.locator("#recSave").click(); await p.waitForTimeout(600);
  ok(!("wage" in (await ls(p, "shifts")).find((x) => x.id === "n1")), "① taken off");
  // ひとことでシフト: taken out (2026-11-18, the user's call); a shift's own 時給 is the form's, above
  ok(!(await p.$("#bt3QuickText")), "① (taken out) ひとことでシフト: gone");
  // ⑥ 行かなかった: from its sheet, out of the pay; もどす puts it back
  const before = await est();
  await openShift(p, "n3");
  await p.click('#recForm [data-off="absent"]'); await p.waitForTimeout(600);
  const off = (await setting(p, "bt5Off")).items[0];
  ok(!(await ls(p, "shifts")).some((x) => x.id === "n3") && off.why === "absent" && off.shift.id === "n3" && off.shift.memo === "研修" && (await est()) === before - 5000, "⑥ out: " + JSON.stringify(off));
  ok(!(await p.evaluate(() => document.querySelector("dialog[open]"))), "⑥ the sheet closed");
  ok((await txt(p, "#jobSum")).includes("11/16 休んだ"), "⑥ said in the month");
  await p.click("#jobSum .bt5-off-back"); await p.waitForTimeout(600);
  ok((await ls(p, "shifts")).some((x) => x.id === "n3" && x.memo === "研修") && !(await setting(p, "bt5Off")).items.length && (await est()) === before, "⑥ もどす");
  // ② 有給を使った日を記録: taken out with its card at the user's call (2026-11-28, tools/REMOVED.md): nowhere to put one in
  ok(!(await p.$("#bt4Leave")) && !(await p.$(".bt5-leave-open")) && !(await txt(p, "#moneyJob")).includes("有給を使った日を記録") && !(await setting(p, "bt5Leave")) && (await est()) === before, "② 有給を使った日を記録: gone");
  // ③ October's slip, its 給料日 (11/25) gone by
  await p.click("#monthNav .navbtn"); await p.waitForTimeout(400);
  await p.click("#jobSum .bt5-slip-open"); await p.waitForTimeout(300);
  await p.fill('#jobSum [data-s="gross"]', "10000"); await p.fill('#jobSum [data-s="tax"]', "200"); await p.fill('#jobSum [data-s="ins"]', "60");
  await p.click("#jobSum .bt5-slip-form .btn"); await p.waitForTimeout(500);
  const slip = (await setting(p, "bt5Slip")).items["j1|2026-10"];
  ok(slip && slip.gross === 10000 && slip.tax === 200 && slip.ins === 60 && !("other" in slip), "③ kept: " + JSON.stringify(slip));
  ok(/手取り 9,740\s円/.test(await txt(p, "#jobSum")), "③ 手取り");
  // ④⑤ the job's 電話・住所・持ち物・通勤
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  const f = '#jobForms [data-job="j1"]';
  await p.fill(`${f} [data-f="tel"]`, "090-0000-1111"); await p.fill(`${f} [data-f="addr"]`, "駅前ビル 2F"); await p.fill(`${f} [data-f="bring"]`, "エプロン"); await p.fill(`${f} [data-f="commute"]`, "20");
  await p.waitForTimeout(900);
  const j = (await setting(p, "jobs")).items[0];
  ok(j.tel === "090-0000-1111" && j.addr === "駅前ビル 2F" && j.bring === "エプロン" && j.commute === 20, "④⑤ saved: " + JSON.stringify(j));
  await p.fill(`${f} [data-f="addr"]`, ""); await p.waitForTimeout(900);
  ok(!("addr" in (await setting(p, "jobs")).items[0]), "④ emptied: none");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  const nx = await txt(p, "#bt3Next");
  ok(nx.includes("16:40 に出ると間に合います（通勤 20 分）") && nx.includes("持ち物：エプロン") && !(await p.$("#bt3Next a[href*='maps']")), "④⑤ next: " + nx);
  await p.screenshot({ path: (process.argv[2] || __dirname) + "/baito5-form.png", fullPage: true });
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
