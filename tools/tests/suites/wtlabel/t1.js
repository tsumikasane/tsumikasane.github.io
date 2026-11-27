// 体重のグラフの上の今の数字 (the user's call, 2026-11-27: 「体ページの体重のグラフ上に表示される現在体重88.2と現在体脂肪率27.2
// の表示を削除して」): the latest value by the last point, on 体重's plot and 体脂肪率's, taken out, in every period (1週間,
// 1か月, 全部). The rest of the plots as they were: the points, the line, 7日平均, the 目標 line, the scale; a point
// pressed still says its value; サイズ's plot keeps its latest value; no errors
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-28";
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const T = (d, h = 7) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
// 90.5 → 88.2 kg and 28.0 → 27.2 % over the last 4 days, as in the user's picture; ウエスト on two days
const W = [["2026-11-25", 90.5, 28.0], ["2026-11-26", 89.0, 27.6], ["2026-11-27", 88.4, 27.4], ["2026-11-28", 88.2, 27.2]];
const weights = W.map(([d, kg, fat], i) => ({ id: d, date: d, kg, fat, ...(i === 0 ? { waist: 92.0 } : i === 3 ? { waist: 90.5 } : {}), createdAt: T(d), updatedAt: T(d) }));
const SET = [{ id: "body", height: 175, age: 25, sex: "m", updatedAt: T("2026-11-01") }, { id: "weight", target: 85, updatedAt: T("2026-11-01") }, { id: "fat", target: 25, updatedAt: T("2026-11-01") }];
const plot = (p, id) => p.evaluate((id) => {
  const s = document.getElementById(id);
  return { end: [...s.querySelectorAll(".endlabel")].map((t) => t.textContent), texts: [...s.querySelectorAll("text")].map((t) => t.textContent), dots: s.querySelectorAll("circle.dot").length,
    lines: s.querySelectorAll("path, polyline").length, goal: [...s.querySelectorAll("text")].some((t) => t.textContent.startsWith("目標")) };
}, id);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date(today + "T06:34:00+09:00"));
  await seed(p, { weights, settings: SET }, "weight");
  await p.waitForTimeout(600);
  for (const range of ["30", "7", "0"]) {
    await p.click(`#wtRanges button[data-range="${range}"]`); await p.waitForTimeout(400);
    const w = await plot(p, "wtChart"), f = await plot(p, "fatChart");
    ok(!w.end.length && !w.texts.includes("88.2") && w.dots >= 4 && w.lines >= 1, `体重 (${range}): no 88.2 by the last point, the points and lines kept`, w);
    ok(!f.end.length && !f.texts.includes("27.2") && f.dots >= 4 && f.lines >= 1, `体脂肪率 (${range}): no 27.2 by the last point, the points and lines kept`, f);
  }
  await p.click('#wtRanges button[data-range="30"]'); await p.waitForTimeout(400);
  const w = await plot(p, "wtChart"), f = await plot(p, "fatChart");
  ok(w.goal && f.goal, "the 目標 lines kept", [w.goal, f.goal]);
  // a point pressed: its value said, as before
  await p.focus("#wtChart"); await p.keyboard.press("End"); await p.waitForTimeout(200);
  const tip = await p.evaluate(() => { const t = document.getElementById("wtTip"); return t.hidden ? null : t.textContent; });
  ok(!!tip && tip.includes("88.2 kg") && tip.includes("7日平均"), "a point pressed: 88.2 kg said in its tip", tip);
  // サイズ's plot keeps its latest value
  const s = await p.evaluate(() => { const box = document.getElementById("sizePlot"); return { shown: !box.hidden, end: [...document.querySelectorAll("#sizeChart .endlabel")].map((t) => t.textContent) }; });
  ok(s.shown && s.end.length === 1 && s.end[0] === "90.5", "サイズ's plot: its latest value kept (90.5)", s);
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
