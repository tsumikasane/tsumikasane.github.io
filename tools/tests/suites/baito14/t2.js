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
  // ③ 給料の入金のたしかめ (the お知らせ the day after a 給料日) taken out at the user's call (2026-11-25, tools/REMOVED.md): none,
  // its switch kept on; the month's block still says a 給料日 gone by while its pay isn't in 家計簿 (カフェ 10月分, 11/25), until it is
  ok(!(await tags(p)).some((t) => t.startsWith("bt14-pay:")), "③ お知らせ: gone " + JSON.stringify(await tags(p)));
  const past = async () => { await p.click("#monthNav .navbtn"); await p.waitForTimeout(400); // (前月)
    return p.evaluate(() => { const b = [...document.querySelectorAll("#jobSum .job-block")].find((x) => x.innerText.includes("カフェ")); return b ? b.querySelector(".bt14-notes .warn")?.innerText.replace(/\s+/g, " ").trim() || "" : "(no カフェ)"; }); };
  await p.clock.setFixedTime(at("12:00", "2026-11-26")); await p.reload(); await p.waitForTimeout(900);
  ok((await past()) === "給料日（11/25）をすぎています。入った額を「収入に入れる」で家計簿に入れましょう", "③ the month's note, kept: " + (await p.evaluate(() => document.querySelector("#jobSum")?.innerText.replace(/\s+/g, " ").slice(0, 300))));
  await p.evaluate((P) => { const l = JSON.parse(localStorage.getItem(P + "expenses") || "[]"); l.push({ id: "in1", kind: "in", amount: 5300, date: "2026-11-25", category: "給与", pay: "j1|2026-10", createdAt: 1 }); localStorage.setItem(P + "expenses", JSON.stringify(l)); }, P);
  await p.reload(); await p.waitForTimeout(900);
  ok((await past()) === "", "③ in 家計簿: no note");
  await p.clock.setFixedTime(at("12:00", today)); await p.reload(); await p.waitForTimeout(900);
  // ⑥ ヘルプに入れる日を文字で: taken out at the user's call (2026-11-19, tools/REMOVED.md)
  ok(!(await p.$("#bt14Help")), "⑥ gone");
  // ⑤ 社員 佐藤 in; 店長 田中 off and back
  await p.click("#moneySettings"); await p.waitForTimeout(600); // (in バイト's settings since 2026-11-28)
  await p.fill('#bt14PeopleBody [data-job="j1"] [data-p="name"]', "社員 佐藤"); await p.fill('#bt14PeopleBody [data-job="j1"] [data-p="tel"]', "080-3333-4444");
  await p.click('#bt14PeopleBody [data-job="j1"] .bt4-adv-form button'); await p.waitForTimeout(400);
  const pe = (await job(p, "j1")).people;
  ok(pe.length === 2 && pe[1].name === "社員 佐藤" && pe[1].tel === "080-3333-4444" && (await p.getAttribute('#bt14PeopleBody [data-job="j1"] li:last-child a', "href")) === "tel:08033334444", "⑤ in: " + JSON.stringify(pe));
  await p.click('#bt14PeopleBody [data-job="j1"] li:nth-child(2) .bt4-adv-x'); await p.waitForTimeout(400);
  ok(JSON.stringify((await job(p, "j1")).people.map((x) => x.name)) === '["社員 佐藤"]', "⑤ off");
  await p.click(".toast.show .toast-undo"); await p.waitForTimeout(400);
  ok((await job(p, "j1")).people.length === 2, "⑤ back");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  // ⑦ 時給が変わったら: taken out at the user's call (2026-11-19)
  ok(!(await p.$("#bt14What")), "⑦ 時給が変わったら: gone");
  // ⑩ 給料明細の写真: before 勤務カレンダー, where シフト表の写真 was (taken off 2026-11-18); shown large
  await p.click("#bt14Slips summary"); await p.waitForTimeout(300);
  await p.setInputFiles("#bt14SlipFile", { name: "slip.png", mimeType: "image/png", buffer: PNG }); await p.waitForTimeout(1200);
  ok((await p.$$("#bt14SlipList img")).length === 1 && (await txt(p, "#bt14SlipHead")) === "11月分の給料明細の写真（1）" && !(await p.$("#bt7Photos")) && (await p.evaluate(() => document.getElementById("bt14Slips").nextElementSibling?.id)) === "bt6Cal", "⑩ " + (await txt(p, "#bt14SlipHead")));
  await p.click("#bt14SlipList .bt7-photo-open"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById("bt7PhotoView").open && document.querySelector("#bt7PhotoView img")?.alt === "給料明細の写真"), "⑩ shown large");
  await p.click("#bt7PhotoView .bt7-photo-close"); await p.waitForTimeout(200);
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
