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
  await part(p, "meal");

  // ① 区分ごとの目安: ふつう, then 夜しっかり
  let r = await txt(p, "#dt16Slots");
  ok(/区分ごとの目安 朝食 400 \/ 500 kcal あと 100 kcal 昼食 0 \/ 700 kcal まだ（目安 700 kcal） 夕食 0 \/ 600 kcal まだ（目安 600 kcal） 間食 0 \/ 200 kcal まだ（目安 200 kcal）/.test(r), "① ふつう", r);
  await p.selectOption("#dt16Slots select", "night"); await p.waitForTimeout(400);
  ok((await setting(p, "slotShare"))?.preset === "night" && /朝食 400 \/ 400 kcal あと 0 kcal 昼食 0 \/ 600 kcal まだ（目安 600 kcal） 夕食 0 \/ 800 kcal/.test(await txt(p, "#dt16Slots")), "① 夜しっかり", await txt(p, "#dt16Slots"));
  // ② 間食をよく食べる時間: 午後 6, 夜 3, 昼 1
  r = await txt(p, "#dt16Snack");
  ok(/この30日 10 回 朝 0 昼 1 午後 6 夕方 0 夜 3 深夜 0 いちばん多いのは午後です。/.test(r), "② the hours", r);
  // ③ 夜に食べなかった日: 2 in a row (11/13 was late), the best 9
  r = await txt(p, "#dt16Night");
  ok(/夜に食べなかった日 2 日続いています きょうも続けば 3 日・この90日でいちばん長いのは 9 日/.test(r) && (await p.locator("#dt16Night .dt16-n-dots i.late").count()) === 3, "③ the nights", r);
  // ⑨ もくじ: open, a card gone to
  await p.click("#dt16Toc-meal summary"); await p.waitForTimeout(200);
  r = await txt(p, "#dt16Toc-meal summary");
  const shownMeal = await p.evaluate(() => [...document.getElementById("part-meal").children].filter((e) => e.id && e.matches(".card, details") && !e.hidden && !e.classList.contains("dt16-off") && !["mealForm", "mealList", "mealGoalCard", "dt16Toc-meal"].includes(e.id)).length);
  ok(r === `もくじ（${shownMeal}）` && (await p.locator("#dt16Toc-meal .dt16-toc-go").count()) === shownMeal, "⑨ every card shown listed", [r, shownMeal]);
  const lastId = await p.getAttribute("#dt16Toc-meal .dt16-toc-go >> nth=-1", "data-id");
  await p.click("#dt16Toc-meal .dt16-toc-go >> nth=-1");
  let top = 9999;
  for (let i = 0; i < 30 && !(top >= 0 && top < 852); i++) { await p.waitForTimeout(200); top = await p.evaluate((id) => document.getElementById(id).getBoundingClientRect().top, lastId); }
  ok(top >= 0 && top < 852, "⑨ gone to (the card in sight)", [lastId, top]);
  // ⑩ かくす: 区分ごとの目安 hidden, taken back, hidden again and shown
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.click('#dt16Toc-meal button[aria-label="「区分ごとの目安」をかくす"]'); await p.waitForTimeout(400);
  ok(await off(p, "dt16Slots") && !(await p.isVisible("#dt16Slots")) && ((await setting(p, "dietHide"))?.list || []).some((x) => x.id === "dt16Slots" && x.name === "区分ごとの目安"), "⑩ hidden");
  ok(/かくしたカード 1/.test(await txt(p, "#dt16Toc-meal summary")) && /かくしたカード 区分ごとの目安 出す/.test(await txt(p, "#dt16Toc-meal")), "⑩ listed as hidden", await txt(p, "#dt16Toc-meal"));
  await p.click(".toast-undo >> visible=true"); await p.waitForTimeout(400);
  ok(!(await off(p, "dt16Slots")) && await p.isVisible("#dt16Slots"), "⑩ taken back");
  await p.click('#dt16Toc-meal button[aria-label="「区分ごとの目安」をかくす"]'); await p.waitForTimeout(400);
  await part(p, "meal");
  ok(await off(p, "dt16Slots"), "⑩ still hidden after a reload");
  await p.click("#dt16Toc-meal summary"); await p.waitForTimeout(200);
  await p.click('#dt16Toc-meal button[aria-label="「区分ごとの目安」を出す"]'); await p.waitForTimeout(400);
  ok(!(await off(p, "dt16Slots")) && !(((await setting(p, "dietHide"))?.list || []).length), "⑩ shown again");

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
