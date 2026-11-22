// ダイエット その19 ①〜⑩, through the hook build at 8856 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8856/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__dt19[f](...a), { f, a });
const WHEN = new Date("2026-11-16T12:00:00+09:00");
const base = () => ({ weights: D.weights(), meals: D.meals(), workouts: D.workouts(), bodyDays: D.bodyDays(), settings: D.settings() });
async function part(p, k) { await p.evaluate(({ P, k }) => localStorage.setItem(P + "dietPart", k), { P, k }); await p.reload(); await p.waitForTimeout(1000); }
// (食事の記録画面, 2026-11-18) a 区分's screen opened (the one picked when none is given), and a tile's panel; closed
async function rec(p, slot, panel) {
  if (!(await p.evaluate(() => document.getElementById("mealRec").open))) { const s = slot || (await p.evaluate(() => document.querySelector('input[name="mealSlot"]:checked')?.value || "朝食")); await p.click(`#mealSlots button[data-slot="${s}"]`); await p.waitForTimeout(300); }
  else if (slot) { await p.click(`#mealRecSlots button:has-text("${slot}")`); await p.waitForTimeout(200); }
  if (panel && !(await p.evaluate((k) => document.getElementById({ often: "mealOften", sets: "dt4Sets", recipe: "dt18Recipe", label: "dt18Label", bulk: "dt8Bulk" }[k])?.classList.contains("mr-on"), panel))) { await p.click(panel === "bulk" ? "#mealRecBulk" : `#mealRecTiles button[data-tile="${panel}"]`); await p.waitForTimeout(250); }
}
async function unrec(p) { if (await p.evaluate(() => document.getElementById("mealRec").open)) { await p.click("#mealRecClose"); await p.waitForTimeout(200); } }
// the app's reckonings, done here from the example
const ws = D.weights(), kgOn = new Map(ws.map((w) => [w.id, w.kg]));
const avg7 = (d) => { const xs = ws.filter((w) => w.id <= d && w.id >= D.addDays(d, -6)); return xs.reduce((s, w) => s + w.kg, 0) / xs.length; };
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.goto(process.env.URL0);
  await seed(p, base(), "diet");
  await part(p, "meal");

  // ① 作りおきの残り: カレー 2 left from 11/13 (its 4th day), one eaten, 冷凍した, another made
  await rec(p, null, "recipe");
  let r = await txt(p, "#dt19Stock");
  ok(/^作りおきの残り 2 人分 カレー 1人分 350 kcal 残り 2 \/ 4 11\/13（金）に作った・作って4日目です。きょうのうちに食べるか、冷凍しましょう。 1人分 食べた 冷凍した なくなった レシピで作ったら： ＋ カレー（4 人分）$/.test(r) && (await p.locator("#dt19Stock .sub.warn").count()) === 1, "① what is left", r);
  const slot = await p.evaluate(() => document.querySelector('input[name="mealSlot"]:checked')?.value || "朝食");
  await p.click('#dt19Stock button[aria-label="「カレー」を1人分食べた"]'); await p.waitForTimeout(400);
  let m = (await ls(p, "meals")).filter((x) => x.text === "カレー");
  let st = (await setting(p, "mealStock"))?.list || [];
  ok(m.length === 1 && m[0].kcal === 350 && m[0].slot === slot && m[0].date === D.DAY && st.length === 1 && st[0].left === 1 && /残り 1 \/ 4/.test(await txt(p, "#dt19Stock")), "① one eaten", [m, st]);
  await p.click(".toast-undo >> visible=true"); await p.waitForTimeout(400);
  ok(!(await ls(p, "meals")).some((x) => x.text === "カレー") && ((await setting(p, "mealStock"))?.list || [])[0]?.left === 2, "① taken back");
  await p.click('#dt19Stock button:has-text("冷凍した")'); await p.waitForTimeout(400);
  st = (await setting(p, "mealStock"))?.list || [];
  ok(st[0].frozen === D.DAY && /冷凍中（11\/16から）。1か月ほどが目安です。/.test(await txt(p, "#dt19Stock")) && (await p.getAttribute("#dt19Stock .dt19-st-ice", "aria-pressed")) === "true", "① 冷凍した", st);
  await p.click('#dt19Stock button[aria-label="「カレー」を 4 人分 作った"]'); await p.waitForTimeout(400);
  st = (await setting(p, "mealStock"))?.list || [];
  ok(st.length === 2 && st[1].left === 4 && st[1].made === D.DAY && st[1].rid === "r1" && /^作りおきの残り 6 人分/.test(await txt(p, "#dt19Stock")), "① another made", st);
  await unrec(p);
  // ② 食べすぎたあとの戻り: 11/2, 11/8 and 11/13
  const bk = await W(p, "back");
  r = await txt(p, "#dt19Back");
  ok(bk && bk.n === 3 && bk.mid === 2 && bk.in3 === 2 && bk.up === 0.8 && bk.xs.map((x) => [x.d, x.back, x.peak].join()).join("|") === "2026-11-13,,1|2026-11-08,2,0.5|2026-11-02,3,0.8", "② the days", bk);
  ok(/^食べすぎたあとの戻り ふだん 2 日 次の3日でふえた分（平均） \+0\.8 kg 3日以内に戻った 2 \/ 3 回 この120日、目安より 600 kcal 以上多かった日は 3 日。体重は、ふつう 2 日で、その朝の体重に戻っています。/.test(r) && r.endsWith("11/13（金）（3,200 kcal）：3 日たって、いま +0.2 kg です。"), "② what it says", r);

  // ③ 汗の量: taken out at the user's call (2026-11-19, tools/REMOVED.md); what was put in stays
  await part(p, "workout");
  ok(!(await p.$("#dt19Sweat")), "③ gone");
  // ④ 運動と睡眠: 7h30 after 運動 (15), 6h30 (15)
  const nt = await W(p, "nights");
  r = await txt(p, "#dt19Nights");
  ok(nt && nt.a === 450 && nt.b === 390 && nt.na === 15 && nt.nb === 15 && nt.qa === 100 && nt.qb === 0 && /^運動と睡眠 この60日 運動した日の夜 .* 15 晩 しなかった日の夜 .* 15 晩 運動した日のほうが、.+長く眠れています。 「ぐっすり」の夜：運動した日 100%・しなかった日 0%$/.test(r), "④ the nights", [nt, r]);
  // ⑤ ウォーキングの速さ: 5.0 km/h (4.0 before), 速歩き 9%
  const wk = await W(p, "walks");
  r = await txt(p, "#dt19Walk");
  ok(wk && wk.n === 11 && wk.now === 5 && wk.was === 4 && wk.z.join() === "30,270,30" && wk.fast === 9 && wk.last === "2026-11-14" && wk.lastKmh === 6
    && r.startsWith("ウォーキングの速さ 時速 5.0 km ゆっくり 30 分 ふつう 270 分 速歩き 30 分 この4週 11 回の平均 時速 5.0 km・その前の4週 4.0 km・速歩き 9% 11/14（土）：3 km・30 分・10:00/km（時速 6.0 km）"), "⑤ the walks", [wk, r]);

  // ⑥ 夜の体重: the 30 days' (11/9〜11/15), then tonight's 70.4
  await part(p, "weight");
  const ups = [], downs = [];
  for (let d = "2026-11-09"; d <= "2026-11-15"; d = D.addDays(d, 1)) { const n = Math.round((kgOn.get(d) + 0.7) * 10) / 10; ups.push(n - kgOn.get(d)); downs.push(kgOn.get(D.addDays(d, 1)) - n); }
  const mean = (xs) => Math.round((xs.reduce((s, v) => s + v, 0) / xs.length) * 10) / 10, sg = (v) => (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toFixed(1);
  let nw = await W(p, "night");
  r = await txt(p, "#dt19Night");
  ok(nw.up === mean(ups) && nw.down === mean(downs) && r.includes(`この30日の平均：日中 ${sg(mean(ups))} kg・夜のあいだ ${sg(mean(downs))} kg`), "⑥ the 30 days", [nw, mean(ups), mean(downs), r]);
  await p.fill("#dt19Night input", "70.4"); await p.press("#dt19Night input", "Enter"); await p.waitForTimeout(400);
  const bd = (await ls(p, "bodyDays")).find((x) => x.id === D.DAY);
  ok(bd?.night === 70.4 && (await txt(p, "#dt19Night")).includes("朝 69.9 → 夜 70.4 kg（日中 +0.5 kg）"), "⑥ tonight's", [bd, await txt(p, "#dt19Night")]);
  await p.fill("#dt19Night input", ""); await p.press("#dt19Night input", "Enter"); await p.waitForTimeout(400);
  ok(!("night" in ((await ls(p, "bodyDays")).find((x) => x.id === D.DAY) || {})), "⑥ taken out");
  // ⑦ これまでのあゆみ: the start, the whole kg, the runs, the ウエスト and ベルト
  const story = await W(p, "story"), kgs = [];
  let mark = Math.floor(avg7("2026-10-01"));
  for (const w of ws.filter((x) => x.id > "2026-10-01")) { const v = avg7(w.id); while (v < mark) { kgs.push(`${w.id} 7日平均が ${mark} kg を切った`); mark--; } }
  const want = ["2026-11-16 はじめて 10 km を走った（1:00:00）", "2026-11-15 ウエスト 83.6 cm（はじめから −2.4 cm）", "2026-11-12 5 km の自己ベスト 28:00（−2:00）", "2026-11-10 はじめて 5 km を走った（30:00）", "2026-11-08 ベルトの穴がひとつ縮んだ", "2026-11-05 ウエスト 84.8 cm（はじめから −1.2 cm）", ...kgs, "2026-10-01 ダイエットをはじめた（7日平均 71.0 kg）"];
  const got = story.map((x) => `${x.d} ${x.text}`), sorted = [...want].sort((x, y) => y.slice(0, 10).localeCompare(x.slice(0, 10)));
  ok(got.length === want.length && sorted.every((x) => got.includes(x)) && got.every((x, i) => i === 0 || got[i - 1].slice(0, 10) >= x.slice(0, 10)), "⑦ the events", [got, sorted]);
  r = await txt(p, "#dt19Story");
  ok(r.startsWith("これまでのあゆみ 47 日目 走 11/16（月） はじめて 10 km を走った（1:00:00） 測 11/15（日） ウエスト 83.6 cm") && (await p.locator("#dt19Story li").count()) === Math.min(8, got.length), "⑦ the newest 8", r);
  if (got.length > 8) { await p.click('#dt19Story button:has-text("ぜんぶ見る")'); await p.waitForTimeout(200); ok((await p.locator("#dt19Story li").count()) === got.length, "⑦ ぜんぶ見る"); }
  // ⑧ はじめにやること: 4 of 5 (no 期限); 決める opens the settings at it; とじる. 食事をはじめて記録 and 運動をはじめて記録:
  // taken out at the user's call (2026-11-22, tools/REMOVED.md)
  r = await txt(p, "#dt19Setup");
  ok(/^はじめにやること 4 \/ 5 ✓ 身長・年齢・性別 できました ✓ 目標体重 できました 目標の期限 決める ✓ 食事の目安（1日の kcal） できました ✓ 体重をはじめて記録 できました/.test(r) && !/食事をはじめて記録|運動をはじめて記録/.test(r)
    && JSON.stringify(await W(p, "setup")) === JSON.stringify([["身長・年齢・性別", true], ["目標体重", true], ["目標の期限", false], ["食事の目安（1日の kcal）", true], ["体重をはじめて記録", true]]), "⑧ the steps", r);
  await p.click('#dt19Setup button[aria-label="目標の期限へ"]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.activeElement?.id === "wtBy"), "⑧ to the 期限", await p.evaluate(() => document.activeElement?.id));
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  await p.click('#dt19Setup button:has-text("とじる")'); await p.waitForTimeout(400);
  ok((await setting(p, "dietSetup"))?.closed === true && !(await p.isVisible("#dt19Setup")), "⑧ closed");

  // ⑨ よく見るカードを上に: 主食・主菜・副菜 (meal) put up under the day's records, kept after a reload, taken back
  await part(p, "meal");
  const before = await p.evaluate(() => [...document.getElementById("part-meal").children].findIndex((e) => e.id === "dt17Bal"));
  await p.click("#dt16Toc-meal summary"); await p.waitForTimeout(200);
  await p.click('#dt16Toc-meal button[aria-label="「主食・主菜・副菜」を上に出す"]'); await p.waitForTimeout(400);
  const after = () => p.evaluate(() => document.getElementById("mealTotal").nextElementSibling?.id);
  ok((await after()) === "dt17Bal" && (await W(p, "pinned")).map((x) => x.id).join() === "dt17Bal" && await p.evaluate(() => document.getElementById("dt17Bal").classList.contains("dt19-pinned")), "⑨ put up", await after());
  await part(p, "meal");
  ok((await after()) === "dt17Bal", "⑨ kept after a reload");
  await p.click("#dt16Toc-meal summary"); await p.waitForTimeout(200);
  await p.click('#dt16Toc-meal button[aria-label="「主食・主菜・副菜」を元の場所に戻す"]'); await p.waitForTimeout(400);
  const now = await p.evaluate(() => [...document.getElementById("part-meal").children].findIndex((e) => e.id === "dt17Bal"));
  ok((await after()) !== "dt17Bal" && now === before && !(await W(p, "pinned")).length && !(await p.evaluate(() => document.getElementById("dt17Bal").classList.contains("dt19-pinned"))), "⑨ taken back where it was", [before, now]);
  // ⑩ カードを名前で探す: 睡眠 from 食事's もくじ, 運動と睡眠 gone to
  const found = await W(p, "find", "睡眠");
  ok(found.some((x) => x.id === "dt19Nights" && x.part === "workout") && found.every((x) => x.name.includes("睡眠")), "⑩ found in every part", found);
  await p.fill("#dt16Toc-meal .dt19-find-in", "睡眠"); await p.waitForTimeout(200);
  ok((await p.locator("#dt16Toc-meal .dt19-find-go").count()) === found.length, "⑩ listed", await txt(p, "#dt16Toc-meal .dt19-find-list"));
  await p.click('#dt16Toc-meal .dt19-find-go[data-id="dt19Nights"]');
  let top = 9999;
  for (let i = 0; i < 30 && !(top >= 0 && top < 852); i++) { await p.waitForTimeout(200); top = await p.evaluate(() => document.getElementById("dt19Nights").getBoundingClientRect().top); }
  ok(await p.evaluate(() => !document.getElementById("part-workout").hidden) && top >= 0 && top < 852, "⑩ gone to it", top);

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);

  // a new account: はじめにやること (0 of 5) only
  await seed(p, { settings: [] }, "diet");
  for (const k of ["meal", "workout", "weight"]) {
    await part(p, k);
    const shown = await p.evaluate(() => ["dt19Stock", "dt19Back", "dt19Sweat", "dt19Nights", "dt19Walk", "dt19Night", "dt19Story"].filter((id) => { const e = document.getElementById(id); return e && !e.hidden; }));
    ok(!shown.length && /^はじめにやること 0 \/ 5/.test(await txt(p, "#dt19Setup")) && !/食事をはじめて記録|運動をはじめて記録/.test(await txt(p, "#dt19Setup")), `a new account (${k})`, shown);
  }
  ok(!p.errs.length, "no errors on a new account", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
