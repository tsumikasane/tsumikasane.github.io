// バイト その9 ⑦⑩: what is pressed and typed (② 源泉徴収票 は使う人が消した: 2026-11-18)
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setting = async (p, id) => (await ls(p, "settings")).find((s) => s.id === id);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  // ⑩ 選ぶ (and その11 ⑥ 時刻を変える in it): taken out at the user's call (2026-11-19, tools/REMOVED.md)
  ok(!(await p.$("#bt9Pick")) && !(await p.$("#bt9Sel")) && !(await p.$("#bt11Time")) && !(await p.$("#shiftList input[type=checkbox]")), "⑩ 選ぶ: gone");
  await p.click('#shiftList [data-edit="a1"]'); await p.waitForTimeout(500);
  ok((await p.evaluate(() => document.querySelectorAll("dialog[open]").length)) === 1 && !(await p.$("#bt7CopyDay")), "a row opens its sheet (その7 ⑨ ほかの日にもコピー: gone)");
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  ok(!!(await p.$('#shiftList li[data-shift="a1"] .del, #shiftList li[data-shift="a1"] button[aria-label*="削除"]')), "a row's 削除 there");
  ok(!(await p.$("#bt9GensenCard")), "② 源泉徴収票: gone");
  // ⑦ やめた: undone for 塾; カフェ asked first
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  ok((await txt(p, '#jobForms [data-job="j2"] .bt9-end')) === "やめたのを取り消す（11/10にやめた）", "⑦ 塾's");
  await p.click('#jobForms [data-job="j2"] .bt9-end'); await p.waitForTimeout(500);
  ok(!("ended" in (await setting(p, "jobs")).items.find((j) => j.id === "j2")), "⑦ 塾 back");
  await p.click('#jobForms [data-job="j1"] .bt9-end'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById("confirmAsk").open), "⑦ asked first");
  await p.click("#confirmYes"); await p.waitForTimeout(500);
  ok((await setting(p, "jobs")).items.find((j) => j.id === "j1").ended === today, "⑦ カフェ ended today");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  ok(await p.evaluate(() => [...document.querySelectorAll("#shiftJob option")].map((o) => o.value).join(",")) === "j1,j2", "⑦ ended today still in the menu");
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
