// ダイエット その16 ①〜⑩, through the hook build at 8894 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8894/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__dt16[f](...a), { f, a });
const WHEN = new Date("2026-11-16T12:00:00+09:00"), N = new Intl.NumberFormat("ja-JP");
const base = () => ({ weights: D.weights(), meals: D.meals(), workouts: D.workouts(), bodyDays: D.bodyDays(), settings: D.settings() });
async function part(p, k) { await p.evaluate(({ P, k }) => localStorage.setItem(P + "dietPart", k), { P, k }); await p.reload(); await p.waitForTimeout(1000); }
const off = (p, id) => p.evaluate((id) => document.getElementById(id)?.classList.contains("dt16-off"), id);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.goto(process.env.URL0);
  await seed(p, base(), "diet");
  await p.evaluate((P) => { const s = JSON.parse(localStorage.getItem(P + "settings") || "[]"); s.push({ id: "slotShare", preset: "night", updatedAt: 1 }); localStorage.setItem(P + "settings", JSON.stringify(s)); }, P);
  await part(p, "meal");

  // ① 区分ごとの目安 and ③ 夜に食べなかった日: taken out at the user's call (2026-11-24, tools/REMOVED.md): no cards, nor their
  // もくじ's lines; the way chosen (slotShare) kept
  let r;
  ok(!(await p.$("#dt16Slots")) && !(await p.$("#dt16Night")) && !(await p.evaluate(() => [...document.querySelectorAll("#dt16Toc-meal .dt16-toc-go")].some((b) => ["dt16Slots", "dt16Night"].includes(b.dataset.id)))) && (await setting(p, "slotShare"))?.preset === "night", "①③ gone, slotShare kept");
  // ② 間食をよく食べる時間: 午後 6, 夜 3, 昼 1
  r = await txt(p, "#dt16Snack");
  ok(/この30日 10 回 朝 0 昼 1 午後 6 夕方 0 夜 3 深夜 0 いちばん多いのは午後です。/.test(r), "② the hours", r);
  // ⑨ 食事's もくじ: taken out at the user's call (2026-11-27, tools/REMOVED.md): none on 食事, its words nowhere; a 食事's
  // card kept hidden before (dietHide) shown, the setting as it was. からだ's and 運動's もくじ kept (⑨ ⑩ through 運動's)
  const mealWords = await txt(p, "#part-meal");
  ok(!(await p.$("#dt16Toc-meal")) && !mealWords.includes("もくじ") && !mealWords.includes("名前を押すと、そのカードへ行きます"), "⑨ no もくじ on 食事", mealWords.slice(0, 120));
  await p.evaluate((P) => { const s = JSON.parse(localStorage.getItem(P + "settings") || "[]"); s.push({ id: "dietHide", list: [{ id: "dt16Snack", name: "間食をよく食べる時間" }], updatedAt: 1 }); localStorage.setItem(P + "settings", JSON.stringify(s)); }, P);
  await part(p, "meal");
  ok(!(await off(p, "dt16Snack")) && await p.isVisible("#dt16Snack") && ((await setting(p, "dietHide"))?.list || []).some((x) => x.id === "dt16Snack"), "⑩ 食事's card hidden before: shown, dietHide kept");
  await p.evaluate((P) => { const s = JSON.parse(localStorage.getItem(P + "settings") || "[]").filter((x) => x.id !== "dietHide"); localStorage.setItem(P + "settings", JSON.stringify(s)); }, P);
  // ⑨ もくじ (運動's): open, a card gone to
  await part(p, "workout");
  await p.click("#dt16Toc-workout summary"); await p.waitForTimeout(200);
  r = await txt(p, "#dt16Toc-workout summary");
  const shownWo = await p.evaluate(() => [...document.getElementById("part-workout").children].filter((e) => e.id && e.matches(".card, details") && !e.hidden && !e.classList.contains("dt16-off") && !["workoutForm", "workoutList", "dt16Toc-workout"].includes(e.id)).length);
  ok(r === `もくじ（${shownWo}）` && (await p.locator("#dt16Toc-workout .dt16-toc-go").count()) === shownWo, "⑨ every card shown listed (運動)", [r, shownWo]);
  const lastId = await p.getAttribute("#dt16Toc-workout .dt16-toc-go >> nth=-1", "data-id");
  await p.click("#dt16Toc-workout .dt16-toc-go >> nth=-1");
  let top = 9999;
  for (let i = 0; i < 30 && !(top >= 0 && top < 852); i++) { await p.waitForTimeout(200); top = await p.evaluate((id) => document.getElementById(id).getBoundingClientRect().top, lastId); }
  ok(top >= 0 && top < 852, "⑨ gone to (the card in sight)", [lastId, top]);
  // ⑩ かくす (運動's): 1年の距離 hidden, taken back, hidden again and shown
  await p.evaluate(() => window.scrollTo(0, 0));
  const ynm = await p.evaluate(() => document.querySelector('#dt16Toc-workout .dt16-toc-go[data-id="dt16Year"]')?.textContent);
  await p.click(`#dt16Toc-workout button[aria-label="「${ynm}」をかくす"]`); await p.waitForTimeout(400);
  ok(!!ynm && await off(p, "dt16Year") && !(await p.isVisible("#dt16Year")) && ((await setting(p, "dietHide"))?.list || []).some((x) => x.id === "dt16Year" && x.name === ynm), "⑩ hidden", ynm);
  ok(/かくしたカード 1/.test(await txt(p, "#dt16Toc-workout summary")) && (await txt(p, "#dt16Toc-workout")).includes(`かくしたカード ${ynm} 出す`), "⑩ listed as hidden", await txt(p, "#dt16Toc-workout"));
  await p.click(".toast-undo >> visible=true"); await p.waitForTimeout(400);
  ok(!(await off(p, "dt16Year")) && await p.isVisible("#dt16Year"), "⑩ taken back");
  await p.click(`#dt16Toc-workout button[aria-label="「${ynm}」をかくす"]`); await p.waitForTimeout(400);
  await part(p, "workout");
  ok(await off(p, "dt16Year"), "⑩ still hidden after a reload");
  await p.click("#dt16Toc-workout summary"); await p.waitForTimeout(200);
  await p.click(`#dt16Toc-workout button[aria-label="「${ynm}」を出す"]`); await p.waitForTimeout(400);
  ok(!(await off(p, "dt16Year")) && !(((await setting(p, "dietHide"))?.list || []).length), "⑩ shown again");

  // ④ 1年の距離の目標: none, then 500 km
  await part(p, "workout");
  let y = await W(p, "year");
  r = await txt(p, "#dt16Year");
  ok(y.km === 230 && r.includes(`2026年のラン 230 km このペースなら年末に ${N.format(y.pace)} km。`), "④ none set", [y, r]);
  await p.selectOption("#dt16Year select", "500"); await p.waitForTimeout(400);
  y = await W(p, "year"); r = await txt(p, "#dt16Year");
  ok((await setting(p, "yearKm"))?.km === 500 && y.should === Math.round((500 * y.done) / y.days) && r.includes(`230 / 500 km`) && r.includes(`予定より ${String(Math.round((y.should - 230) * 10) / 10)} km おくれ`) && r.includes(`このペースなら年末に ${N.format(y.pace)} km`), "④ against 500", [y, r]);
  // ⑤ 運動の内訳: 78 分 this week (ラン 30, 筋トレ 7.5, ウォーキング 40)
  const mx = await W(p, "mix"); r = await txt(p, "#dt16Mix");
  ok(mx.total === 78 && mx.now.join() === "30,8,40,0,0" && /今週 1 時間 18 分/.test(r) && /ラン 38% 筋トレ 10% ウォーキング 51%/.test(r), "⑤ this week", [mx, r]);
  // ⑥ 部位ごとのセット数の推移: 脚 none these 2 weeks
  const pt = await W(p, "parts"); r = await txt(p, "#dt16Parts");
  ok(JSON.stringify(pt.none) === '["脚"]' && /脚は、この2週間やっていません。/.test(r) && pt.rows.find((x) => x.p === "胸").sets.join() === "6,6,6,6,6,6,6,3", "⑥ the weeks", [pt, r]);

  // ⑦ 水分と次の朝の体重
  await part(p, "weight");
  r = await txt(p, "#dt16Water");
  ok(/2,000 ml 以上飲んだ日 −0\.20 kg 15 日の、次の朝の体重の変化 少なかった日 \+0\.10 kg 15 日 水分を目標まで飲んだ日のほうが、次の朝 0\.3 kg ほど軽くなっています。/.test(r), "⑦ the mornings", r);
  // ⑧ ウエスト・ヒップ比
  r = await txt(p, "#dt16Whr");
  ok(/ウエスト・ヒップ比 0\.89 11\/14（土）：ウエスト 85\.0 cm ÷ ヒップ 96\.0 cm 0\.90 未満で、内臓脂肪型ではありません。 9\/27（日）は 0\.94（−0\.05）/.test(r), "⑧ the ratio", r);
  // ⑨ the もくじ of からだ too
  ok(/^もくじ（\d+）$/.test(await txt(p, "#dt16Toc-weight summary")), "⑨ からだ's もくじ", await txt(p, "#dt16Toc-weight summary"));

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
