// ダイエット その9 ①〜⑩, through the hook build at 8852 (the badges, the months) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8852/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__dt9[f](...a), { f, a });
const flashes = (p) => p.evaluate(() => window.__flashes || []);
const WHEN = new Date("2026-11-14T12:00:00+09:00");
const base = () => ({ weights: D.weights(), meals: D.meals(), workouts: D.workouts(), bodyDays: D.bodyDays(), settings: D.settings() });
async function part(p, k) { await p.evaluate(({ P, k }) => localStorage.setItem(P + "dietPart", k), { P, k }); await p.reload(); await p.waitForTimeout(1000); }
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1, acceptDownloads: true });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.context().addInitScript(() => { window.__flashes = []; document.addEventListener("DOMContentLoaded", () => { const s = document.getElementById("status"); if (s) new MutationObserver(() => { const t = s.textContent; if (t && window.__flashes[window.__flashes.length - 1] !== t) window.__flashes.push(t); }).observe(s, { childList: true, subtree: true, characterData: true }); }); });
  await p.goto(process.env.URL0);
  await seed(p, base(), "diet");

  // ⑨⑩ からだ first: 血圧 over 30 days; the badges there are, taken as seen (none said)
  await part(p, "weight");
  let r = await txt(p, "#dt9Bp");
  ok(/血圧のまとめ この30日・10 日/.test(r) && /平均 133 \/ 82 脈拍 63 拍\/分/.test(r) && /135\/85 以上の日 4 日/.test(r) && /いちばん高かった日 137 \/ 83/.test(r) && /この7日 131 \/ 83 その前の7日 136 \/ 82/.test(r), "⑨ the 30 days", r);
  r = await txt(p, "#dt9Badges");
  const bs = await W(p, "badges");
  const has = (id) => bs.find((x) => x.id === id)?.ok;
  ok(has("w30") && has("l3") && !has("l5") && has("run100") && has("veg") && !has("st10") && !has("goal"), "⑩ earned from the records", bs.filter((x) => x.ok).map((x) => x.id));
  ok(new RegExp(`バッジ ${bs.filter((x) => x.ok).length} / ${bs.length}`).test(r), "⑩ the count", r);
  await p.waitForTimeout(400);
  ok(!(await flashes(p)).some((t) => /バッジ/.test(t)) && ((await setting(p, "dietBadgesSeen"))?.ids || []).length === bs.filter((x) => x.ok).length, "⑩ none said the first time, kept as seen", await flashes(p));
  // ⑧ the month's report: built for print, the rest hidden in print, gone after
  await p.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
  await p.click("#dt9PrintRow button"); await p.waitForTimeout(400);
  r = await p.evaluate(() => document.getElementById("dt9Print")?.textContent || "");
  ok(/2026年11月のダイエットの記録/.test(r) && /はじめ → おわり67\.8 → 67\.2 kg/.test(r) && /血圧測った日10 日平均133 \/ 82 mmHg/.test(r) && /食事記録した日14 日/.test(r) && /運動運動した日\d+ 日/.test(r) && (await p.evaluate(() => !!document.querySelector("#dt9Print img.dt9-print-chart") && window.__printed === 1)), "⑧ the report", r.slice(0, 300));
  await p.emulateMedia({ media: "print" });
  ok(await p.evaluate(() => getComputedStyle(document.getElementById("dt9Print")).display === "block" && document.getElementById("sec-diet").getClientRects().length === 0), "⑧ only it, in print");
  await p.emulateMedia({ media: "screen" });
  await p.evaluate(() => window.dispatchEvent(new Event("afterprint"))); await p.waitForTimeout(100);
  ok(!(await p.$("#dt9Print")), "⑧ gone after");

  await part(p, "meal");
  // ① 食べた理由: picked, kept with the 食事, cleared; under its name; changed in 食事を編集
  ok((await p.locator("#dt9WhyField .dt9-why-chip").count()) === 6, "① the chips");
  await p.click('#dt9WhyField button:has-text("ストレス")');
  await p.click('label:has(input[name="mealSlot"][value="間食"])');
  await p.fill("#mealText", "チョコ"); await p.fill("#mealKcal", "200"); await p.click('#mealForm button[type="submit"]'); await p.waitForTimeout(600);
  let m = (await ls(p, "meals")).find((x) => x.text === "チョコ");
  ok(m && m.why === "stress" && m.slot === "間食", "① kept", m);
  ok((await p.locator('#dt9WhyField [aria-pressed="true"]').count()) === 0, "① cleared");
  ok(/チョコ.*ストレス/.test(await txt(p, "#mealList")), "① under its name", await txt(p, "#mealList"));
  await p.click('#mealList [aria-label="「チョコ」を編集"]'); await p.waitForTimeout(500);
  await p.click('.dt9-why-edit button:has-text("つきあい")'); await p.waitForTimeout(300);
  m = (await ls(p, "meals")).find((x) => x.text === "チョコ");
  ok(m.why === "social", "① changed in 食事を編集", m);
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  r = await txt(p, "#dt9WhyCard");
  ok(/食べた理由/.test(r) && /ストレス \d+ 回/.test(r) && /なんとなく \d+ 回/.test(r) && /間食の \d+% が「ストレス」か「なんとなく」/.test(r), "① the 30 days", r);
  // ③ 食事の先月とくらべる: fewer late days than October
  r = await txt(p, "#dt9MealMonth");
  ok(/11月1〜14日と、10月1〜14日/.test(r) && /記録した日 14 日 ±0/.test(r) && /21時以降に食べた日 0 日 −7 日 10月 7 日/.test(r), "③ the rows", r);
  ok(await p.evaluate(() => [...document.querySelectorAll("#dt9MealMonth .dt8-month-row")].find((x) => /21時以降/.test(x.textContent))?.querySelector(".dt8-delta.up") != null), "③ fewer late days, said as better");
  // ② the day's 食事 as a picture, saved
  await p.click('#dt9DayImg button'); await p.waitForTimeout(1000);
  const img = await p.evaluate(() => { const i = document.getElementById("dt9ImgPic"); return { open: document.getElementById("dt9ImgView")?.open === true, w: i?.naturalWidth, h: i?.naturalHeight }; });
  ok(img.open && img.w === 1080 && img.h === 1350, "② the picture", img);
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 5000 }), p.click("#dt9ImgSave")]);
  ok(dl.suggestedFilename() === "食事_2026-11-14.png", "② saved", dl.suggestedFilename());
  await p.click("#dt9ImgClose"); await p.waitForTimeout(200);

  await part(p, "workout");
  // ④ 体重あたりの強さ: ベンチプレス 70 kg ÷ 67.2 kg
  r = await txt(p, "#dt9Rel");
  ok(/ベンチプレス 推定1RM 70 kg ÷ 体重 67\.2 kg・中級まで あと 約 1\d(\.5)? kg 1\.04 倍 初級/.test(r) && /スクワット/.test(r) && /デッドリフト/.test(r), "④ the lifts", r);
  // ⑤ 日本を旅する: 191 km, between 静岡 and 浜松
  r = await txt(p, "#dt9Trip");
  ok(/191 km/.test(r) && /いま 静岡と浜松のあいだ/.test(r) && /浜松まで あと 59 km/.test(r) && /通った町：横浜（10\/2）・小田原（10\/2）・静岡（11\/5）/.test(r), "⑤ where", r);
  // ⑥ 距離ごとのベスト
  r = await txt(p, "#dt9Dist");
  ok(/3 km .* 15:00/.test(r) && /5 km .* 27:00/.test(r) && /10 km .* 1:00:00/.test(r) && !/ハーフ/.test(r), "⑥ the bests", r);
  // ⑦ 消費カロリーを食べものに
  r = await txt(p, "#dt9Burn");
  ok(/この日の消費 約 \d+ kcal は、ごはん（茶わん1杯）\d+(\.\d)? 杯・おにぎり \d+(\.\d)? 個ぶん/.test(r) && /この7日の [\d,]+ kcal は、体脂肪 約 0\.\d\d kg ぶんです/.test(r), "⑦ as foods", r);
  // ⑩ a new badge (1万歩), said once
  await p.fill("#dt4StepIn", "10500"); await p.press("#dt4StepIn", "Tab"); await p.waitForTimeout(500);
  await part(p, "weight"); await p.waitForTimeout(500);
  ok(await p.evaluate(() => [...document.querySelectorAll("#dt9Badges li.ok .dt9-badge-name")].some((x) => x.textContent === "1万歩")), "⑩ 1万歩 earned");
  ok(((await setting(p, "dietBadgesSeen"))?.ids || []).includes("st10"), "⑩ kept as seen");

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
