// 家計簿 その3 ①⑤⑥⑦⑧⑨ in まとめ
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
  await p.click('#moneyParts button[data-part="stats"]'); await p.waitForTimeout(400);
  // ① 食費: 21,200 against 10,000 × 12/30 = 4,000
  const u = await txt(p, "#mo3Usual");
  ok(u.includes("前の 6 か月の平均") && /食費 11月 21,200 円・ふだん 4,000 円 \+17,200 円/.test(u), "① 食費 above its usual: " + u);
  // ⑦ the biggest five, 固定費 aside
  const big = await txt(p, "#mo3Big");
  ok(big.startsWith("1 スーパー") && big.includes("この 5 件で 29,700 円"), "⑦ big ones: " + big);
  // ⑥ the days of the week
  const wd = await txt(p, "#mo3Wd");
  ok(wd.includes("いちばん使うのは") && wd.includes("日曜日") && wd.includes("土曜日"), "⑥ weekdays: " + wd);
  // ⑧ the months
  const bud = await txt(p, "#mo3Bud");
  ok(bud.includes("終わった 5 か月のうち、4 か月が予算内でした") && bud.includes("× 28,000 円 超えた") && bud.includes("途中・200 円 超え"), "⑧ budget months: " + bud);
  // ⑤ tags: this month's #旅行 and #推し活, every month's #旅行 48,000
  const tg = await txt(p, "#mo3Tags");
  ok(tg.includes("#旅行") && tg.includes("すべての月で 48,000 円") && tg.includes("#推し活"), "⑤ tags: " + tg);
  await p.click("#mo3Tags button.mo3-tag"); await p.waitForTimeout(400);
  ok(await p.isVisible("#moneyBook") && (await p.inputValue("#exFind")) === "#旅行" && (await txt(p, "#exFilter")).includes("2 件"), "⑤ a tag pressed: its 明細");
  // ⑨ the note
  await p.click('#moneyParts button[data-part="stats"]'); await p.waitForTimeout(300);
  ok((await txt(p, "#mo3NoteHead")).includes("11月") && (await p.inputValue("#mo3NoteText")) === "", "⑨ November's empty");
  await p.fill("#mo3NoteText", "外食を減らす"); await p.waitForTimeout(1000);
  const notes = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "settings")).find((s) => s.id === "moNotes").notes, P);
  ok(notes["2026-11"] === "外食を減らす" && notes["2026-10"] === "旅行で使いすぎた", "⑨ kept", notes);
  await p.screenshot({ path: (process.argv[2] || __dirname) + "/money3-stats.png", fullPage: true });
  await p.click("#monthNav .navbtn"); await p.waitForTimeout(400);
  ok((await p.inputValue("#mo3NoteText")) === "旅行で使いすぎた", "⑨ October's");
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
