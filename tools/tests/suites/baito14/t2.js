// バイト その14 ②③④⑤⑥⑦⑩: what is pressed and typed
process.env.URL0 = process.env.URL0 || "http://localhost:8865/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setting = async (p, id) => (await ls(p, "settings")).find((s) => s.id === id);
const job = async (p, id) => (await setting(p, "jobs")).items.find((j) => j.id === id);
const tags = (p) => p.evaluate(() => window.__bt14.alarms(Date.now()).filter((a) => /^bt14-/.test(a.tag)).map((a) => a.tag));
// a 2 × 2 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==", "base64");
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await p.addInitScript(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); window.__copied = ""; Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true }); });
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  // ③ カフェ's 10月分 in 家計簿: its お知らせ no more
  ok((await tags(p)).includes("bt14-pay:j1|2026-10"), "③ before");
  await p.evaluate((P) => { const l = JSON.parse(localStorage.getItem(P + "expenses") || "[]"); l.push({ id: "in1", kind: "in", amount: 5300, date: "2026-11-25", category: "給与", pay: "j1|2026-10", createdAt: 1 }); localStorage.setItem(P + "expenses", JSON.stringify(l)); }, P);
  await p.reload(); await p.waitForTimeout(900);
  ok(!(await tags(p)).includes("bt14-pay:j1|2026-10") && (await tags(p)).includes("bt14-pay:j1|2026-11"), "③ in 家計簿: " + JSON.stringify(await tags(p)));
  // ⑥ two days, a word: in words
  await p.click("#bt14Help summary"); await p.waitForTimeout(300);
  await p.evaluate(() => { for (const b of document.querySelectorAll("#bt14HelpBody li input")) if (b.checked && !["2026-11-22", "2026-11-25"].includes(b.dataset.day)) b.click(); });
  await p.fill('#bt14HelpBody input[type="text"]', "17時から入れます");
  await p.click("#bt14HelpSend"); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__copied)) === "ヘルプに入れる日です。\n11/22（日）\n11/25（水）\n17時から入れます", "⑥ " + JSON.stringify(await p.evaluate(() => window.__copied)));
  // ⑤ 社員 佐藤 in; 店長 田中 off and back
  await p.click("#bt14People summary"); await p.waitForTimeout(300);
  await p.fill('#bt14PeopleBody [data-job="j1"] [data-p="name"]', "社員 佐藤"); await p.fill('#bt14PeopleBody [data-job="j1"] [data-p="tel"]', "080-3333-4444");
  await p.click('#bt14PeopleBody [data-job="j1"] .bt4-adv-form button'); await p.waitForTimeout(400);
  const pe = (await job(p, "j1")).people;
  ok(pe.length === 2 && pe[1].name === "社員 佐藤" && pe[1].tel === "080-3333-4444" && (await p.getAttribute('#bt14PeopleBody [data-job="j1"] li:last-child a', "href")) === "tel:08033334444", "⑤ in: " + JSON.stringify(pe));
  await p.click('#bt14PeopleBody [data-job="j1"] li:nth-child(2) .bt4-adv-x'); await p.waitForTimeout(400);
  ok(JSON.stringify((await job(p, "j1")).people.map((x) => x.name)) === '["社員 佐藤"]', "⑤ off");
  await p.click(".toast.show .toast-undo"); await p.waitForTimeout(400);
  ok((await job(p, "j1")).people.length === 2, "⑤ back");
  // ⑦ 950 円なら
  await p.click("#bt14What summary"); await p.waitForTimeout(300);
  await p.fill("#bt14WhatWage", "950"); await p.waitForTimeout(200);
  ok((await txt(p, "#bt14WhatOut")).includes("月 −900 円・年 −10,800 円"), "⑦ " + (await txt(p, "#bt14WhatOut")));
  // ⑩ 給料明細の写真: kept apart from シフト表の写真
  await p.click("#bt14Slips summary"); await p.waitForTimeout(300);
  await p.setInputFiles("#bt14SlipFile", { name: "slip.png", mimeType: "image/png", buffer: PNG }); await p.waitForTimeout(1200);
  ok((await p.$$("#bt14SlipList img")).length === 1 && (await txt(p, "#bt14SlipHead")) === "11月分の給料明細の写真（1）" && (await txt(p, "#bt7PhotoHead")) === "11月のシフト表の写真", "⑩ " + JSON.stringify([await txt(p, "#bt14SlipHead"), await txt(p, "#bt7PhotoHead")]));
  await p.click("#bt7Photos summary"); await p.waitForTimeout(400);
  ok((await p.$$("#bt7PhotoList img")).length === 0, "⑩ not among シフト表の写真");
  ok(JSON.stringify(await p.evaluate(() => [window.__bt14.what("tsumikasane-baito-photos", { kind: "pay", ym: "2026-11" }), window.__bt14.what("tsumikasane-baito-photos", { ym: "2026-11" })])) === '["給料明細の写真","シフト表の写真"]', "⑩ apart in 記録's 写真とファイルを書き出す");
  // ②④ the cap taken off; 年の目安 off
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  await p.fill('#jobForms [data-job="j1"] [data-f="fareMax"]', ""); await p.waitForTimeout(900);
  ok(!("fareMax" in (await job(p, "j1"))), "② no cap");
  await p.click("#bt14WallChk"); await p.waitForTimeout(300);
  ok((await setting(p, "bt14")).wallChk === false && !(await tags(p)).some((t) => t.startsWith("bt14-wall")), "④ off");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  ok(await p.evaluate(() => [...document.querySelectorAll("#jobSum .job-block")].find((x) => x.innerText.includes("カフェ")).querySelector(".job-pay").innerText.replace(/\s+/g, "") === "64,900円"), "② the month without the cap");
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
