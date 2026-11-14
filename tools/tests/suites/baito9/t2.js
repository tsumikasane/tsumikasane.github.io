// バイト その9 ②⑦⑩: what is pressed and typed
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
  // ⑩ 選ぶ: two picked, 仮, 確定, deleted
  await p.click("#bt9Pick"); await p.waitForTimeout(300);
  ok((await txt(p, "#bt9Sel")).includes("勤務を押して選びます"), "⑩ the bar");
  await p.click('#shiftList li[data-shift="a1"] .body'); await p.waitForTimeout(200);
  ok(!(await p.evaluate(() => document.querySelectorAll("dialog[open]").length)), "⑩ a row pressed is not opened");
  await p.click('#shiftList input.bt9-box[data-shift="a2"]'); await p.waitForTimeout(300);
  ok(/2\s件・10\s時間・10,600\s円/.test(await txt(p, "#bt9Sel")), "⑩ two: " + (await txt(p, "#bt9Sel")));
  await p.click("#bt9Tent"); await p.waitForTimeout(400);
  let sh = await ls(p, "shifts");
  ok(sh.find((x) => x.id === "a1").tentative === true && sh.find((x) => x.id === "a2").tentative === true, "⑩ 仮にする");
  ok(/2\s件/.test(await txt(p, "#bt9Sel")), "⑩ still picked after 仮にする");
  await p.click("#bt9Settle"); await p.waitForTimeout(400);
  sh = await ls(p, "shifts");
  ok(!("tentative" in sh.find((x) => x.id === "a1")) && !("tentative" in sh.find((x) => x.id === "a2")), "⑩ 確定にする");
  await p.click('#shiftList li[data-shift="a1"] .body'); await p.click('#shiftList li[data-shift="a2"] .body'); await p.click('#shiftList li[data-shift="o2"] .body'); await p.waitForTimeout(200);
  ok(/^1\s件/.test(await txt(p, "#bt9Sel")), "⑩ o2 alone: " + (await txt(p, "#bt9Sel")));
  await p.click("#bt9Del"); await p.waitForTimeout(400);
  ok(!(await ls(p, "shifts")).some((x) => x.id === "o2") && (await ls(p, "shifts")).some((x) => x.id === "a1"), "⑩ deleted");
  await p.click("#bt9Pick"); await p.waitForTimeout(300);
  ok(await p.isHidden("#bt9Sel") && !!(await p.$('#shiftList li[data-shift="a1"] .del, #shiftList li[data-shift="a1"] button[aria-label*="削除"]')), "⑩ done");
  // ② 源泉徴収票
  await p.click("#bt9GensenCard summary"); await p.waitForTimeout(300);
  ok((await txt(p, "#bt9GensenHead")) === "源泉徴収票（2026年）" && (await p.$$("#bt9GensenBody .bt9-gensen")).length === 2, "② both jobs of 2026");
  await p.fill('#bt9GensenBody [data-key="2026|j1"] [data-g="pay"]', "20000"); await p.fill('#bt9GensenBody [data-key="2026|j1"] [data-g="tax"]', "300");
  await p.dispatchEvent('#bt9GensenBody [data-key="2026|j1"] [data-g="tax"]', "change"); await p.waitForTimeout(400);
  const g = (await setting(p, "bt9Gensen")).items["2026|j1"];
  ok(g && g.pay === 20000 && g.tax === 300, "② kept: " + JSON.stringify(g));
  await p.click("#bt9GensenCard summary"); await p.click("#bt9GensenCard summary"); await p.waitForTimeout(300);
  const gt = await txt(p, '#bt9GensenBody [data-key="2026|j1"]');
  ok(/このアプリの見込み [\d,]+\s円（支払金額との差 [+−][\d,]+\s円）/.test(gt) && gt.includes("もどることがあります"), "② against the year: " + gt);
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
