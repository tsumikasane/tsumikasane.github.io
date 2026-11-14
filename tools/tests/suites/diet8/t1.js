// ダイエット その8 ①〜⑩, through the hook build at 8851 (the words parsed, the records) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8851/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__dt8[f](...a), { f, a });
const WHEN = new Date("2026-11-14T12:00:00+09:00");
const base = () => ({ weights: D.weights(), meals: D.meals(), workouts: D.workouts(), bodyDays: D.bodyDays(), settings: D.settings() });
async function part(p, k) { await p.evaluate(({ P, k }) => localStorage.setItem(P + "dietPart", k), { P, k }); await p.reload(); await p.waitForTimeout(1000); }
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1, permissions: ["clipboard-read", "clipboard-write"], acceptDownloads: true });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.goto(process.env.URL0);
  await seed(p, base(), "diet");
  await part(p, "meal");

  // ② PFCバランス: today's トースト alone has PFC (P 40・F 45・C 200 kcal)
  let r = await txt(p, "#mealGoalCard .dt8-pfc");
  ok(/たんぱく質 14%/.test(r) && /脂質 16%/.test(r) && /炭水化物 70%/.test(r) && /脂質が少なめ・炭水化物が多め/.test(r) && /PFCのある 1 \/ 2 品から/.test(r), "② the shares and the words", r);
  // ③ 食事の記録: 7 days on end, 18 the longest, 25 of 30 days, 朝食 missed twice
  r = await txt(p, "#dt8Log");
  ok(/続けて記録した日 7 日 いちばん長かったのは 18 日/.test(r) && /記録した日 25 \/ 30 日/.test(r) && /朝食を抜いた日 2 日/.test(r), "③ the days", r);
  // ① 文でまとめて入れる: the words parsed (区分, kcal given, kcal guessed), then put in, no time
  const pz = await W(p, "parse", "朝 トースト 200、納豆（1パック）\n昼 定食 700\n夜 カレー\n夜食 300、おにぎり 2個", "間食");
  ok(pz.length === 6 && pz[0].slot === "朝食" && pz[0].kcal === 200 && pz[1].kcal === 86 && pz[1].guessed && pz[2].slot === "昼食" && pz[3].slot === "夕食" && pz[3].kcal === 750 && pz[3].guessed
    && pz[4].text === "夜食" && pz[4].slot === "夕食" && pz[4].kcal === 300 && pz[5].text === "おにぎり 2個" && pz[5].kcal === undefined, "① parsed", pz);
  await p.click("#dt8Bulk > summary"); await p.waitForTimeout(200);
  await p.fill("#dt8BulkText", "朝 トースト 200、納豆（1パック）\n昼 定食 700\n夜 カレー"); await p.waitForTimeout(200);
  r = await txt(p, "#dt8BulkList");
  ok(/朝食 トースト 200 kcal/.test(r) && /朝食 納豆（1パック） 約 86 kcal/.test(r) && /昼食 定食 700 kcal/.test(r) && /夕食 カレー 約 750 kcal/.test(r), "① the preview", r);
  ok((await txt(p, "#dt8BulkGo")) === "4品をきょうに追加", "① the button", await txt(p, "#dt8BulkGo"));
  const n0 = (await ls(p, "meals")).length;
  await p.click("#dt8BulkGo"); await p.waitForTimeout(600);
  const ms = (await ls(p, "meals")).slice(n0);
  ok(ms.length === 4 && ms.every((m) => m.date === D.DAY && !m.at) && ms.find((m) => m.text === "カレー")?.kcal === 750 && ms.find((m) => m.text === "納豆（1パック）")?.p === 7.4, "① put in, without a time", ms);
  ok((await p.inputValue("#dt8BulkText")) === "", "① the words cleared");

  await part(p, "workout");
  // ⑤ 自己ベストの更新: 5, the fastest run newest
  r = await txt(p, "#dt8Prs");
  ok(/この30日に 5 回/.test(r) && /ラン 最速 .*前は 6:00\/km 5:24\/km/.test(r) && /ベンチプレス .*前は 55 kg × 6 回 60 kg × 5 回/.test(r), "⑤ the list", r);
  ok((await W(p, "prs")).length === 5, "⑤ five");
  // ⑥ よくやった種目: スクワット 4 days first
  r = await txt(p, "#dt8Moves .dt8-move-list li");
  ok(/スクワット 4 日/.test(r) && /12 セット/.test(r), "⑥ the first", r);
  // ⑦ 先月とくらべる: 7 days against 2
  r = await txt(p, "#dt8Month");
  ok(/11月1〜14日と、10月1〜14日/.test(r) && /運動した日 7 日 \+5 日 10月 2 日/.test(r), "⑦ the days", r);
  // ④ ストップウォッチ: 2:05, then into 時間 (2 分), kept on this device; リセット
  await p.click('#dt8Watch button:has-text("スタート")'); await p.waitForTimeout(200);
  ok(!!JSON.parse(await p.evaluate((P) => localStorage.getItem(P + "dt8Watch"), P) || "{}").start, "④ kept on this device");
  await p.clock.setFixedTime(new Date(WHEN.getTime() + 125000)); await p.waitForTimeout(600);
  ok((await txt(p, "#dt8WTime")) === "2:05", "④ counting", await txt(p, "#dt8WTime"));
  await p.click('#dt8Watch button:has-text("一時停止")'); await p.waitForTimeout(200);
  await p.clock.setFixedTime(new Date(WHEN.getTime() + 300000)); await p.waitForTimeout(400);
  ok((await txt(p, "#dt8WTime")) === "2:05", "④ paused", await txt(p, "#dt8WTime"));
  await p.click('#dt8Watch button:has-text("時間に入れる")'); await p.waitForTimeout(300);
  ok((await p.inputValue("#woMin")) === "2" && (await p.inputValue("#woType")) === "ランニング", "④ into 時間", await p.inputValue("#woMin"));
  await p.click('#dt8Watch button:has-text("リセット")'); await p.waitForTimeout(200);
  ok((await txt(p, "#dt8WTime")) === "0:00" && (await p.isVisible('#dt8Watch button:has-text("スタート")')), "④ reset");

  await part(p, "weight");
  // ⑧ 週のまとめ: the week's words, copied; ‹ the week before
  r = await txt(p, "#dt8Week");
  ok(/のダイエット/.test(r) && /体重 平均 \d+\.\d kg（前の週より −0\.\d kg）/.test(r) && /食事 記録 \d 日・1日 平均/.test(r) && /運動 \d 日/.test(r) && /歩数 1日 平均 8,000 歩/.test(r) && /睡眠 平均 7/.test(r), "⑧ the words", r);
  await p.click('#dt8Week button:has-text("文字でコピー")'); await p.waitForTimeout(300);
  const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  ok(/のダイエット\n体重 平均/.test(clip), "⑧ copied", clip);
  const head0 = await txt(p, "#dt8Week .dt8-week-ym");
  await p.click('#dt8Week [aria-label="前の週"]'); await p.waitForTimeout(200);
  ok((await txt(p, "#dt8Week .dt8-week-ym")) !== head0, "⑧ the week before", await txt(p, "#dt8Week .dt8-week-ym"));
  // ⑨ 健康診断: two days, the latest against the one before, 判定値's words
  ok(/健康診断の結果/.test(await txt(p, "#dt8Hc")), "⑨ none yet", await txt(p, "#dt8Hc"));
  await p.click('#dt8Hc button:has-text("記録する")'); await p.waitForTimeout(200);
  await p.fill("#dt8HcDate", "2025-11-01"); await p.fill('#dt8Hc input[data-k="waist"]', "88"); await p.fill('#dt8Hc input[data-k="tg"]', "180"); await p.fill('#dt8Hc input[data-k="a1c"]', "5.4");
  await p.click('#dt8Hc button[type="submit"]'); await p.waitForTimeout(400);
  await p.click('#dt8Hc button:has-text("記録する")'); await p.waitForTimeout(200);
  await p.fill("#dt8HcDate", "2026-11-01"); await p.fill('#dt8Hc input[data-k="waist"]', "84.5"); await p.fill('#dt8Hc input[data-k="tg"]', "160"); await p.fill('#dt8Hc input[data-k="a1c"]', "5.4");
  await p.click('#dt8Hc button[type="submit"]'); await p.waitForTimeout(400);
  const hc = (await setting(p, "healthChecks"))?.list || [];
  ok(hc.length === 2 && hc[0].date === "2026-11-01" && hc[0].waist === 84.5 && hc[1].tg === 180, "⑨ kept", hc);
  r = await txt(p, "#dt8Hc .dt8-hc-list");
  ok(/腹囲 84.5 cm ↓ 3.5/.test(r) && /中性脂肪 160 mg\/dL ↓ 20 高め/.test(r) && /HbA1c 5.4 % →/.test(r) && !/HbA1c 5.4 % → 高め/.test(r), "⑨ against the one before", r);
  ok((await W(p, "flag", "hdl", 38)) === "低め" && (await W(p, "flag", "ldl", 150)) === "高い", "⑨ 判定値");
  // ⑩ 画像: 90 days as a PNG, saved
  await p.selectOption("#dt8ImgDays", "90");
  await p.click('#dt8Img button:has-text("グラフを画像にする")'); await p.waitForTimeout(800);
  const img = await p.evaluate(() => { const i = document.getElementById("dt8ImgPic"); return { open: document.getElementById("dt8ImgView")?.open === true, src: (i?.src || "").slice(0, 5), w: i?.naturalWidth, h: i?.naturalHeight }; });
  ok(img.open && img.src === "blob:" && img.w === 1200 && img.h === 800, "⑩ the picture", img);
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 5000 }), p.click("#dt8ImgSave")]);
  ok(dl.suggestedFilename() === "体重_2026-11-14.png", "⑩ saved", dl.suggestedFilename());
  await p.click("#dt8ImgClose"); await p.waitForTimeout(200);

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(wide <= 393, "no sideways scroll", wide);
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
