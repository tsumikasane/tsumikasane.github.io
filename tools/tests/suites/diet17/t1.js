// ダイエット その17 ①〜⑩, through the hook build at 8895 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8895/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const put = (p, k, v) => p.evaluate(({ P, k, v }) => localStorage.setItem(P + k, JSON.stringify(v)), { P, k, v });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__dt17[f](...a), { f, a });
const WHEN = new Date("2026-11-16T12:00:00+09:00"), N = new Intl.NumberFormat("ja-JP");
const base = () => ({ weights: D.weights(), meals: D.meals(), workouts: D.workouts(), bodyDays: D.bodyDays(), settings: D.settings() });
async function part(p, k) { await p.evaluate(({ P, k }) => localStorage.setItem(P + "dietPart", k), { P, k }); await p.reload(); await p.waitForTimeout(1000); }
// the 7日平均 of the records to a day, as the app reckons it
const avg7 = (ws, d) => { const xs = ws.filter((w) => w.id <= d && w.id >= D.addDays(d, -6)); return xs.reduce((s, w) => s + w.kg, 0) / xs.length; };
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.goto(process.env.URL0);
  await seed(p, base(), "diet");
  await part(p, "meal");

  // ① 食後の満足度 and ② 主食・主菜・副菜: taken out at the user's call (2026-11-23, tools/REMOVED.md): no cards, nor their
  // もくじ's lines; the full put in (1〜3) kept
  let r;
  const fulls = (await ls(p, "meals")).filter((m) => [1, 2, 3].includes(m.full)).length, toc17 = await p.evaluate(() => document.getElementById("dt16Toc-meal")?.textContent || "");
  ok(!(await p.$("#dt17Full")) && !(await p.$("#dt17Bal")) && !(await p.$(".dt17-full-btn")) && !/食後の満足度|主食・主菜・副菜/.test(toc17) && fulls > 0 && fulls === D.meals().filter((m) => m.full).length, "①② gone, the full put in kept", [fulls, toc17]);
  // (the みそ汁 ② added to today's, kept as it was)
  await put(p, "meals", [...(await ls(p, "meals")), { id: "miso", date: D.DAY, slot: "朝食", text: "みそ汁", kcal: 40, createdAt: D.T(D.DAY, 8) }]);
  await part(p, "meal");
  ok(!(await p.$("#dt17Full")) && !(await p.$("#dt17Bal")), "①② not drawn after a 食事 is added either");
  // ③ 揚げ物・甘い飲みもの: 4 and 3 these 7 days, 1 and 1 the 7 before
  r = await txt(p, "#dt17Fry");
  ok(/^揚げ物・甘い飲みもの この7日 揚げ物 4 回 1,400 kcal・前の7日は 1 回・週2回までにすると、カロリーと脂質をおさえられます 甘い飲みもの 3 回 525 kcal・前の7日は 1 回・お茶や無糖のものにかえると、それだけで減らせます 食べたものの名前から数えています。$/.test(r) && (await p.locator("#dt17Fry .num.over").count()) === 2, "③ the 7 days", r);

  // ⑤ 自重トレのステップアップ
  await part(p, "workout");
  r = await txt(p, "#dt17Ladder");
  ok(/^自重トレのステップアップ 腕立て伏せ いまは 膝つき腕立て伏せ（ベスト 20 回） 壁腕立て伏せ 膝つき腕立て伏せ 腕立て伏せ 足上げ腕立て伏せ 20 回できたので、次は「腕立て伏せ」へ進めます。 スクワット いまは スクワット（ベスト 20 回） 椅子スクワット スクワット ブルガリアンスクワット ピストルスクワット スクワットで 30 回できたら、次は「ブルガリアンスクワット」へ（あと 10 回）。 プランク いまは プランク（ベスト 30 秒） 膝つきプランク プランク 片足プランク プランクで 90 秒できたら、次は「片足プランク」へ（あと 60 秒）。 この8週の記録から。/.test(r), "⑤ the steps", r);
  ok((await p.locator("#dt17Ladder li.now").count()) === 3 && (await p.locator("#dt17Ladder .dt17-lad-up").count()) === 1, "⑤ the steps marked");
  await p.click('#dt17Ladder button[aria-label="腕立て伏せを記録に入れる"]'); await p.waitForTimeout(300);
  ok((await p.inputValue("#woType")) === "筋トレ" && (await p.inputValue("#woExercise")) === "腕立て伏せ", "⑤ a step put in the form", [await p.inputValue("#woType"), await p.inputValue("#woExercise")]);
  await p.fill("#woExercise", ""); await p.evaluate(() => document.activeElement?.blur());
  // ⑥ ランの強さの配分: 20 km ゆっくり (6:30), 10 ふつう (5:30), 5 速め (5:00)
  const z = await W(p, "zones");
  r = await txt(p, "#dt17Zones");
  ok(z.km.join() === "20,10,5" && z.easy === 57 && /^ランの強さの配分 ゆっくり 57% ゆっくり 20 km ふつう 10 km 速め 5 km ゆっくり走が少なめです。ふだんのランの8割をゆっくりにすると、疲れにくく、速くもなりやすいと言われています。 この4週のラン 7 回・35 km。ゆっくりは 6:00\/km より遅いペースです。$/.test(r), "⑥ the runs", [z, r]);
  ok((await p.locator("#dt17Zones .dt17-z-bar i").count()) === 3, "⑥ the bar");
  // ④ きょうのおすすめ: taken out at the user's call (2026-11-22, tools/REMOVED.md); not shown either with つかれ and a knee
  // (bodyDays pain, kept), 6 days in a row or 運動 done
  ok(!(await p.$("#dt17Today")), "④ gone");
  const days = await ls(p, "bodyDays");
  await put(p, "bodyDays", days.map((x) => (x.id === D.DAY ? { ...x, pain: ["knee", "tired"] } : x)));
  const wos = await ls(p, "workouts");
  await put(p, "workouts", [...wos, { id: "walk", date: D.addDays(D.DAY, -1), type: "ウォーキング", minutes: 30, createdAt: D.T(D.addDays(D.DAY, -1), 18) }]); await part(p, "workout");
  ok(!(await p.$("#dt17Today")), "④ gone with つかれ, a knee and 6 days in a row");
  await put(p, "workouts", [...(await ls(p, "workouts")), { id: "sq", date: D.DAY, type: "筋トレ", exercise: "スクワット", reps: 30, sets: 2, createdAt: D.T(D.DAY, 11) }]); await part(p, "workout");
  ok(!(await p.$("#dt17Today")) && JSON.stringify((await ls(p, "bodyDays")).find((x) => x.id === D.DAY)?.pain) === '["knee","tired"]', "④ gone with 運動 done, the pains kept");
  ok(/スクワット いまは スクワット（ベスト 30 回） .* 30 回できたので、次は「ブルガリアンスクワット」へ進めます。/.test(await txt(p, "#dt17Ladder")), "⑤ the next step ready", await txt(p, "#dt17Ladder"));

  // ⑦ 脈拍の変化: taken out at the user's call (2026-11-24, tools/REMOVED.md), as 脈拍 can't be put in any more: no card, nor
  // its もくじ's line; the 脈拍 put in kept
  await part(p, "weight");
  const toc7 = await p.evaluate(() => document.getElementById("dt16Toc-weight")?.textContent || "");
  ok(!(await p.$("#dt17Pulse")) && !/脈拍の変化/.test(toc7) && toc7.length > 0 && (await ls(p, "bodyDays")).some((x) => x.pulse > 0), "⑦ 脈拍の変化 gone, the 脈拍 kept", toc7);
  // ⑧ 去年とくらべるグラフ
  const ws = D.weights(), diff = Math.round((avg7(ws, D.DAY) - avg7(ws, "2025-11-16")) * 10) / 10, ly = await W(p, "lastYear");
  r = await txt(p, "#dt17LastYear");
  ok(ly.diff === diff && diff < 0 && r.startsWith(`去年とくらべるグラフ −${Math.abs(diff).toFixed(1)} kg`) && r.includes(`去年のいまごろより ${Math.abs(diff).toFixed(1)} kg 軽くなっています。`) && (await p.locator("#dt17LastYear polyline").count()) === 2, "⑧ the two lines", [ly.diff, diff, r]);
  // ⑨ 週のふりかえりメモ and ⑩ 体重以外の変化: taken out at the user's call (2026-11-24, tools/REMOVED.md): no cards, nor their
  // もくじ's lines; what was written (settings weekNotes, nsv: one each) kept
  const toc9 = await p.evaluate(() => document.getElementById("dt16Toc-weight")?.textContent || "");
  ok(!(await p.$("#dt17Review")) && !(await p.$("#dt17Nsv")) && !/週のふりかえりメモ|体重以外の変化/.test(toc9) && toc9.length > 0 && ((await setting(p, "weekNotes"))?.list || []).length === 1 && ((await setting(p, "nsv"))?.list || []).length === 1, "⑨⑩ gone, what was written kept", toc9);

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);

  // a new account: none of them shown
  await seed(p, { settings: [] }, "diet");
  for (const k of ["meal", "workout", "weight"]) {
    await part(p, k);
    const shown = await p.evaluate(() => ["dt17Fry", "dt17Ladder", "dt17Zones", "dt17LastYear"].filter((id) => { const e = document.getElementById(id); return e && !e.hidden; }));
    ok(!shown.length, `nothing shown on a new account (${k})`, shown);
  }
  ok(!p.errs.length, "no errors on a new account", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
