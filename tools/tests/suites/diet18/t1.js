// ダイエット その18 ①〜⑩, through the hook build at 8855 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8855/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__dt18[f](...a), { f, a });
const WHEN = new Date("2026-11-16T12:00:00+09:00"), N = new Intl.NumberFormat("ja-JP");
const base = () => ({ weights: D.weights(), meals: D.meals(), workouts: D.workouts(), events: D.events(), settings: D.settings() });
async function part(p, k) { await p.evaluate(({ P, k }) => localStorage.setItem(P + "dietPart", k), { P, k }); await p.reload(); await p.waitForTimeout(1000); }
// (食事の記録画面, 2026-11-18) a 区分's screen opened (the one picked when none is given), and a tile's panel; closed
async function rec(p, slot, panel) {
  if (!(await p.evaluate(() => document.getElementById("mealRec").open))) { const s = slot || (await p.evaluate(() => document.querySelector('input[name="mealSlot"]:checked')?.value || "朝食")); await p.click(`#mealSlots button[data-slot="${s}"]`); await p.waitForTimeout(300); }
  else if (slot) { await p.click(`#mealRecSlots button:has-text("${slot}")`); await p.waitForTimeout(200); }
  if (panel && !(await p.evaluate((k) => document.getElementById({ often: "mealOften", sets: "dt4Sets", recipe: "dt18Recipe", label: "dt18Label", bulk: "dt8Bulk" }[k])?.classList.contains("mr-on"), panel))) { await p.click(panel === "bulk" ? "#mealRecBulk" : `#mealRecTiles button[data-tile="${panel}"]`); await p.waitForTimeout(250); }
}
async function unrec(p) { if (await p.evaluate(() => document.getElementById("mealRec").open)) { await p.click("#mealRecClose"); await p.waitForTimeout(200); } }
// the app's reckonings, done here from the example
const days = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
const ws = D.weights(), kgOn = new Map(ws.map((w) => [w.id, w.kg]));
const avg7 = (d) => { const xs = ws.filter((w) => w.id <= d && w.id >= D.addDays(d, -6)); return xs.reduce((s, w) => s + w.kg, 0) / xs.length; };
const mmss = (s) => `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.goto(process.env.URL0);
  await seed(p, base(), "diet");
  await part(p, "meal");

  // ① 手作り料理のカロリー: the カレー kept, put in; a サンドイッチ written (ゆで卵 the last time's, からし none), kept; カレー mended
  await rec(p, null, "recipe");
  let r = await txt(p, "#dt18Recipe");
  ok(/^手作り料理のカロリー 保存 1 カレー 1人分 350 kcal（4 人分） 記録 直す 消す レシピを作る/.test(r), "① the one kept", r);
  const slot = await p.evaluate(() => document.querySelector('input[name="mealSlot"]:checked')?.value || "朝食");
  await p.click('#dt18Recipe button[aria-label="「カレー」を1人分記録する"]'); await p.waitForTimeout(400);
  let m = (await ls(p, "meals")).find((x) => x.text === "カレー");
  ok(m && m.kcal === 350 && m.date === D.DAY && m.slot === slot, "① カレー put in", [m, slot]);
  await p.click(".toast-undo >> visible=true"); await p.waitForTimeout(400);
  ok(!(await ls(p, "meals")).some((x) => x.text === "カレー"), "① taken back");
  await p.click("#dt18Recipe .dt18-r-make > summary"); await p.waitForTimeout(200);
  await p.fill("#dt18RName", "サンドイッチ"); await p.fill("#dt18RServ", "2");
  await p.fill("#dt18RText", "食パン 4枚 600\nゆで卵\nハム 4枚 80\nレタス 20\nマヨネーズ 大さじ1 100\nからし 少々"); await p.waitForTimeout(200);
  r = await txt(p, "#dt18Recipe .dt18-r-make");
  ok(/食パン 4枚 600 kcal ゆで卵 約 70 kcal ハム 4枚 80 kcal レタス 20 kcal マヨネーズ 大さじ1 100 kcal からし 少々 kcal なし 1人分 435 kcal ?（ぜんぶで 870 kcal・2 人分） kcal のない材料が 1 つあります/.test(r) && (await p.locator("#dt18RList li.none").count()) === 1, "① lines read", r);
  await p.click("#dt18RSave"); await p.waitForTimeout(400);
  let rs = (await setting(p, "recipes"))?.list || [];
  ok(rs.length === 2 && rs[0].name === "サンドイッチ" && rs[0].one === 435 && rs[0].kcal === 870 && rs[0].serv === 2 && !(await p.inputValue("#dt18RText")), "① kept", rs);
  await p.click('#dt18Recipe button[aria-label="「カレー」を直す"]'); await p.waitForTimeout(300);
  ok((await p.inputValue("#dt18RName")) === "カレー" && (await p.inputValue("#dt18RText")) === D.CURRY && /「カレー」を直す/.test(await txt(p, "#dt18Recipe summary")), "① カレー in to mend");
  await p.fill("#dt18RServ", "5"); await p.waitForTimeout(150);
  await p.click("#dt18RSave"); await p.waitForTimeout(400);
  rs = (await setting(p, "recipes"))?.list || [];
  ok(rs.length === 2 && rs[0].name === "カレー" && rs[0].id === "r1" && rs[0].one === 280 && rs[0].serv === 5, "① mended", rs);
  await p.click('#dt18Recipe button[aria-label="「サンドイッチ」を消す"]'); await p.waitForTimeout(400);
  ok(((await setting(p, "recipes"))?.list || []).length === 1, "① taken out");
  await p.click(".toast-undo >> visible=true"); await p.waitForTimeout(400);
  ok(((await setting(p, "recipes"))?.list || []).length === 2, "① brought back");
  // ② 栄養成分表示から: 100 g あたり 250 kcal・P 10・F 8・C 35, 120 g eaten; then 1袋 180 kcal × 2
  await rec(p, null, "label");
  await p.fill("#dt18L-kcal", "250"); await p.fill("#dt18L-amt", "120"); await p.fill("#dt18L-p", "10"); await p.fill("#dt18L-f", "8"); await p.fill("#dt18L-c", "35"); await p.waitForTimeout(150);
  r = await txt(p, "#dt18LOut");
  ok(r === "120 gで 300 kcal（P 12 g・F 9.6 g・C 42 g）", "② worked out", r);
  await p.click("#dt18LGo"); await p.waitForTimeout(300);
  const form = await p.evaluate(() => ["mealKcal", "mealP", "mealF", "mealC"].map((id) => document.getElementById(id).value));
  ok(form.join() === "300,12,9.6,42", "② put in the form", form);
  await rec(p, null, "label");
  await p.click('#dt18Label .dt18-l-per button:has-text("1個・1袋あたり")'); await p.waitForTimeout(200);
  await p.fill("#dt18L-kcal", "180"); await p.fill("#dt18L-amt", "2"); await p.fill("#dt18L-p", ""); await p.fill("#dt18L-f", ""); await p.fill("#dt18L-c", ""); await p.waitForTimeout(150);
  ok((await txt(p, "#dt18LOut")) === "2 個で 360 kcal" && (await p.textContent("#dt18LUnit")) === "個", "② by the 袋", await txt(p, "#dt18LOut"));
  await p.evaluate(() => { for (const id of ["mealKcal", "mealP", "mealF", "mealC"]) document.getElementById(id).value = ""; });
  await unrec(p);
  // ③ がまんできたもの: the chips (ポテトチップス, チョコ, then ケーキ, アイス), ケーキ pressed, ドーナツ 300 typed; one out and back
  const chips = await W(p, "chips");
  ok(JSON.stringify(chips) === '[["ポテトチップス",330],["チョコ",250],["ケーキ",400],["アイス",250]]', "③ the chips", chips);
  await p.click('#dt18Resist button[aria-label="「ケーキ」をがまんできた（400 kcal）"]'); await p.waitForTimeout(400);
  await p.fill("#dt18Resist .dt18-g-what", "ドーナツ"); await p.fill("#dt18Resist .dt18-g-kcal", "300"); await p.click('#dt18Resist button:has-text("残す")'); await p.waitForTimeout(400);
  let gs = (await setting(p, "resisted"))?.list || [];
  r = await txt(p, "#dt18Resist");
  ok(gs.length === 2 && gs[1].text === "ドーナツ" && gs[1].kcal === 300 && gs[0].kcal === 400 && gs.every((x) => x.date === D.DAY) && /^がまんできたもの 11月 700 kcal /.test(r) && r.includes("11月は 2 回・700 kcal。体重にすると 約 0.10 kg 分です。"), "③ two kept", [gs, r]);
  await p.click('#dt18Resist button[aria-label="「ケーキ」を消す"]'); await p.waitForTimeout(400);
  ok(((await setting(p, "resisted"))?.list || []).length === 1 && /11月 300 kcal/.test(await txt(p, "#dt18Resist")), "③ one out");
  await p.click(".toast-undo >> visible=true"); await p.waitForTimeout(400);
  ok(((await setting(p, "resisted"))?.list || []).length === 2, "③ back");
  // ④ 食べる予定の前に: ランチ tomorrow and 忘年会 on Thursday (焼肉 called off, 歯医者 and 新年会 not)
  const ps = await W(p, "parties");
  r = await txt(p, "#dt18Party");
  ok(ps.length === 2 && ps[0].title === "○○さんとランチ" && ps[1].title === "忘年会", "④ the plans found", ps);
  ok(/^食べる予定の前に カレンダーから 11\/17（火） 12:00 ○○さんとランチ あした 外食は、ふだんより 約 400 kcal 多くなりがちです。きょうを 400 kcal 軽めにすると、ならせます。 定食なら/.test(r)
    && r.includes("11/19（木） 19:00 忘年会 あと 3 日 飲み会は、ふだんより 約 1,000 kcal 多くなりがちです。きょうから 3 日を 340 kcal ずつ軽めにすると、ならせます。"), "④ what to do", r);

  // ⑤ ピッチのメトロノーム: 170, スタート (beats), とめる; ＋ and 180
  await part(p, "workout");
  r = await txt(p, "#dt18Metro");
  ok(/^ピッチのメトロノーム − 170 歩\/分 ＋ 160 165 170 175 180 185 スタート/.test(r), "⑤ at first", r);
  await p.click("#dt18Metro .dt18-m-go"); await p.waitForTimeout(1500);
  let mt = await W(p, "metro");
  ok(mt.on && mt.played >= 3 && (await p.textContent("#dt18Metro .dt18-m-go")) === "とめる", "⑤ beating", mt);
  await p.click("#dt18Metro .dt18-m-go"); await p.waitForTimeout(300);
  mt = await W(p, "metro");
  const played = mt.played; await p.waitForTimeout(400);
  ok(!mt.on && (await W(p, "metro")).played === played && (await p.textContent("#dt18Metro .dt18-m-go")) === "スタート", "⑤ stopped", mt);
  await p.click('#dt18Metro button[aria-label="1 増やす"]'); await p.waitForTimeout(300);
  ok((await setting(p, "cadence"))?.bpm === 171 && /171 歩\/分/.test(await txt(p, "#dt18Metro")), "⑤ one up");
  await p.click('#dt18Metro .dt18-m-pre button:has-text("180")'); await p.waitForTimeout(300);
  ok((await setting(p, "cadence"))?.bpm === 180 && (await p.getAttribute('#dt18Metro .dt18-m-pre button:has-text("180")', "aria-pressed")) === "true", "⑤ 180 pressed");
  // ⑥ ジムの会費の元: 8,000 円, 6 days (1,333 円), October 8 (1,000 円), 2 more for 1,000; then every day of 運動 (9)
  let g = await W(p, "gym");
  r = await txt(p, "#dt18Gym");
  ok(g.now === 6 && g.was === 8 && g.cur === 1333 && g.more === 2 && /^ジムの会費の元 1回 1,333 円 月の会費 円 数える日 筋トレの日 運動した日 今月（11\/16まで） 6 日 1回 1,333 円 10月 8 日 1回 1,000 円 あと 2 日行くと、1回 1,000 円 以下になります。$/.test(r), "⑥ the fee a visit", [g, r]);
  await p.selectOption("#dt18Gym select", "all"); await p.waitForTimeout(400);
  g = await W(p, "gym");
  ok((await setting(p, "gymFee"))?.count === "all" && (await setting(p, "gymFee"))?.yen === 8000 && g.now === 9 && g.cur === 889, "⑥ every day of 運動", g);
  await p.fill("#dt18Gym input", "10000"); await p.press("#dt18Gym input", "Tab"); await p.waitForTimeout(400);
  ok((await setting(p, "gymFee"))?.yen === 10000 && (await W(p, "gym")).cur === 1111, "⑥ the fee changed");
  // ⑦ 同じコースのラン: 川沿い (best 27:30, last 28:20) and 公園 (the last the best)
  const cs = await W(p, "courses");
  r = await txt(p, "#dt18Course");
  ok(cs.length === 2 && cs[0].name === "川沿い" && cs[0].n === 4 && cs[1].name === "公園"
    && /^同じコースのラン 川沿い（5 km） 4 回 ベスト 27:30（10\/3）・前回 28:20（11\/14）・ベストより \+0:50 このコースで記録 公園（3 km） 2 回 ベスト 17:30（11\/12）・前回がベストです このコースで記録/.test(r), "⑦ the courses", [cs, r]);
  await p.click('#dt18Course button[aria-label="「川沿い」のランを記録に入れる"]'); await p.waitForTimeout(300);
  ok((await p.inputValue("#woType")) === "ランニング" && (await p.inputValue("#woDist")) === "5" && (await p.inputValue("#woNote")) === "川沿い", "⑦ put in the form");
  await p.evaluate(() => { for (const id of ["woDist", "woNote"]) document.getElementById(id).value = ""; document.activeElement?.blur(); });
  // ⑧ 運動のきつさ: today's two, 3 hard days on end, the 4 weeks, the runs of きつさ 6 (5:44 → 5:40); チェストプレス 6 on and off
  const rp = await W(p, "rpe");
  r = await txt(p, "#dt18Rpe");
  ok(rp.n === 4 && rp.run === 3 && rp.same?.r === 6 && rp.same.a === "2026-10-17" && rp.same.b === "2026-11-14"
    && /^運動のきつさ きょう レッグプレス 40 kg × 10 回 × 3 セット 8・きつい 1 2 3 4 5 6 7 8 9 10 チェストプレス 40 kg × 10 回 × 3 セット 1 2 3 4 5 6 7 8 9 10 1〜2 楽/.test(r)
    && r.includes("この4週 4 回・ラン 平均 6・筋トレ 平均 8.3") && r.includes("きつい日（8以上）が 3 日続いています。") && r.includes("きつさ 6 のランのペース：5:44/km（10/17）→ 5:40/km（11/14）。同じきつさで、速く走れるようになっています。"), "⑧ the きつさ", [rp, r]);
  const chest = '#dt18Rpe [aria-label="「チェストプレス」のきつさ"] button[aria-label="6（ややきつい）"]';
  await p.click(chest); await p.waitForTimeout(400);
  let wk = (await ls(p, "workouts")).find((x) => x.date === D.DAY && x.exercise === "チェストプレス");
  ok(wk.rpe === 6 && (await p.getAttribute(chest, "aria-pressed")) === "true" && /この4週 5 回/.test(await txt(p, "#dt18Rpe")), "⑧ 6 pressed", wk);
  await p.click(chest); await p.waitForTimeout(400);
  wk = (await ls(p, "workouts")).find((x) => x.date === D.DAY && x.exercise === "チェストプレス");
  ok(!("rpe" in wk) && wk.kg === 40 && wk.sets === 3, "⑧ taken off", wk);

  // ⑨ 予定の線: 9/1's 7日平均 to 68 kg on 12/31, against today's
  await part(p, "weight");
  const startKg = avg7("2026-09-01"), span = days("2026-09-01", "2026-12-31"), cur = avg7(D.DAY), plan = startKg + ((68 - startKg) * days("2026-09-01", D.DAY)) / span, ahead = plan - cur, a1 = Math.round(ahead * 10) / 10;
  const need = Math.round((((68 - cur) / days(D.DAY, "2026-12-31")) * 7200) / 10) * 10, pl = await W(p, "plan");
  r = await txt(p, "#dt18Plan");
  const head = a1 >= 0.1 ? `予定より ${a1.toFixed(1)} kg 先` : a1 <= -0.1 ? `予定より ${(-a1).toFixed(1)} kg おくれ` : "予定どおり";
  ok(pl && Math.abs(pl.startKg - startKg) < 1e-9 && Math.abs(pl.cur - cur) < 1e-9 && Math.abs(pl.plan - plan) < 1e-9 && pl.need === need && r.startsWith(`予定の線 ${head}`) && r.includes(`予定では 11/16（月）に ${plan.toFixed(1)} kg、7日平均は ${cur.toFixed(1)} kg です。`) && (await p.locator("#dt18Plan line.plan").count()) === 1 && (await p.locator("#dt18Plan polyline.real").count()) === 1, "⑨ the plan", [pl, { startKg, cur, plan, need, head }, r]);
  ok(a1 <= -0.1 ? r.includes(`期限に間に合わせるには、1日 約 ${N.format(Math.abs(need))} kcal へらすペースです。`) : a1 >= 0.1 ? r.includes("予定より先を行っています。") : r.includes("予定どおりに進んでいます。"), "⑨ what it says", r);
  // ⑩ 日々のゆれの幅: the band 8 days in 10 stay in, today 0.8 over
  const devs = [];
  for (const w of ws) { if (w.id < D.addDays(D.DAY, -29)) continue; const prev = Array.from({ length: 7 }, (_, i) => kgOn.get(D.addDays(w.id, -1 - i))).filter((v) => v > 0); if (prev.length >= 3) devs.push(Math.round((w.kg - prev.reduce((s, v) => s + v, 0) / prev.length) * 100) / 100); }
  const abs = devs.map(Math.abs).sort((x, y) => x - y), band = Math.max(0.1, Math.ceil(abs[Math.ceil(abs.length * 0.8) - 1] * 10 - 1e-6) / 10), last = devs[devs.length - 1], inside = devs.filter((v) => Math.abs(v) <= band + 1e-6).length;
  const nz = await W(p, "noise");
  r = await txt(p, "#dt18Noise");
  ok(nz && nz.band === band && nz.n === devs.length && nz.inside === inside && Math.abs(nz.last.dev - last) < 1e-9 && last > band && r.startsWith(`日々のゆれの幅 ±${band.toFixed(1)} kg 11/16（月）の 70.7 kg は、前の7日の平均より +${last.toFixed(1)} kg。ふだんのゆれ（±${band.toFixed(1)} kg）より大きめです。`) && r.includes(`この30日、体重を測った ${devs.length} 日のうち ${inside} 日が ±${band.toFixed(1)} kg の中です。`), "⑩ the band", [nz, { band, n: devs.length, inside, last }, r]);
  ok((await p.locator("#dt18Noise circle").count()) === devs.length && (await p.locator("#dt18Noise circle.last.out").count()) === 1, "⑩ the dots");

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);

  // a new account: only the tools (①②⑤) shown
  await seed(p, { settings: [] }, "diet");
  for (const k of ["meal", "workout", "weight"]) {
    await part(p, k);
    const shown = await p.evaluate(() => ["dt18Resist", "dt18Party", "dt18Gym", "dt18Course", "dt18Rpe", "dt18Plan", "dt18Noise"].filter((id) => { const e = document.getElementById(id); return e && !e.hidden; }));
    ok(!shown.length, `nothing but the tools on a new account (${k})`, shown);
  }
  ok(!p.errs.length, "no errors on a new account", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
