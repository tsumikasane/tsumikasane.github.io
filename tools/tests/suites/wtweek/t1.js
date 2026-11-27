// 体重のグラフの「1週間」 (the user's call, 2026-11-27: 「体重記録のグラフが1か月3か月1年全部しかないけど、それに加えて
// 1週間のグラフ機能も実装してほしい」, asked twice): the periods 1週間・1か月・3か月・1年・全部 (1か月 at first); 1週間 the
// 7 days to today on 体重's and 体脂肪率's plots, each day under its point with its weekday, the first day's date whole
// and the others the day alone; the words of the period (1週間の変化, 1週間で, the plot's read-out); the values of the
// lines as they are (a line at 62.25 not said 62.3); back to 1か月 as before; 全部 as short a week's too; on a narrow phone
// the dates apart and the buttons one line each; no errors, no sideways scroll
const { chromium } = require("playwright");
const { URL0, P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-27"; // a Friday
const NOW = new Date(today + "T12:30:00+09:00");
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const T = (d, h = 7) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const r1 = (v) => Math.round(v * 10) / 10;
const signed = (n) => (n > 0 ? "+" : n < 0 ? "−" : "±") + Math.abs(n).toFixed(1);
// 41 days going down, 11/24 and every fifth day missed; 体脂肪率 the last 20 days
const weights = [];
for (let i = 40; i >= 0; i--) {
  if (i === 3 || i % 5 === 4) continue;
  const d = addDays(today, -i), r = { id: d, date: d, kg: r1(64 - (40 - i) * 0.04 + (((i * 7) % 5) - 2) * 0.2), createdAt: T(d), updatedAt: T(d) };
  if (i < 20) r.fat = r1(21 - (20 - i) * 0.05);
  weights.push(r);
}
const SET = [{ id: "body", height: 170, age: 30, sex: "m", updatedAt: T("2026-11-01") }, { id: "weight", target: 62, updatedAt: T("2026-11-01") }];
const week = weights.filter((r) => r.id >= addDays(today, -6)), first = week[0], last = week[week.length - 1];
const fatWeek = week.filter((r) => r.fat > 0);
const md = (d) => `${+d.slice(5, 7)}/${+d.slice(8, 10)}`;
const WD = ["日", "月", "火", "水", "木", "金", "土"];
const wdOf = (d) => WD[new Date(d + "T12:00:00Z").getUTCDay()];
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
// the plot's dates (the row under it) and weekdays, the points' x, and its lines with their values
const plot = (p, id) => p.evaluate((id) => {
  const svg = document.getElementById(id), H = +svg.getAttribute("height"), ts = [...svg.querySelectorAll("text.axis-text")];
  // (the dates of a week's centred under their points: a value of a line can sit at the same height)
  const row = (y, mid = true) => ts.filter((t) => +t.getAttribute("y") === y && (!mid || t.getAttribute("text-anchor") === "middle"))
    .map((t) => { const bb = t.getBBox(); return { s: t.textContent, x: +t.getAttribute("x"), b: { x: bb.x, width: bb.width } }; });
  const dots = [...svg.querySelectorAll("circle.dot:not([visibility])")].map((c) => +c.getAttribute("cx"));
  const grid = [...svg.querySelectorAll("line.gridline")].map((l) => +l.getAttribute("y1"));
  const vals = ts.filter((t) => t.getAttribute("text-anchor") === "start" && /^\d+(\.\d)?$/.test(t.textContent)).map((t) => ({ v: t.textContent, y: +t.getAttribute("y") - 4 }));
  return { H, dates: row(H - 24), wds: row(H - 7), low: row(H - 8, false), dots, grid, vals, wd: svg.querySelectorAll(".axis-wd").length, aria: svg.getAttribute("aria-label") };
}, id);
// each line's value from two of the values said: every value said is its line's, the lines not said not at one place
function linesTrue(pl) {
  if (pl.vals.length < 2) return { ok: false, why: "fewer than 2 values", pl };
  const [a, b] = pl.vals, per = (Number(b.v) - Number(a.v)) / (b.y - a.y), at = (y) => Number(a.v) + (y - a.y) * per;
  const said = pl.vals.every((x) => pl.grid.some((g) => Math.abs(g - x.y) < 0.01) && Math.abs(at(x.y) - Number(x.v)) < 1e-6);
  const unsaid = pl.grid.filter((g) => !pl.vals.some((x) => Math.abs(g - x.y) < 0.01)).every((g) => Math.abs(Number(at(g).toFixed(1)) - at(g)) > 1e-6);
  return { ok: said && unsaid, vals: pl.vals.map((x) => x.v), lines: pl.grid.map((g) => Math.round(at(g) * 1000) / 1000) };
}
(async () => {
  const b = await chromium.launch();
  let p = await phone(b, NOW, { deviceScaleFactor: 1 });
  await seed(p, { weights, settings: SET }, "diet"); await p.evaluate((P) => localStorage.setItem(P + "dietPart", "weight"), P); await p.reload(); await p.waitForTimeout(1200);

  // the periods, 1か月 at first
  const btns = () => p.$$eval("#wtRanges button", (l) => l.map((x) => x.textContent + (x.getAttribute("aria-pressed") === "true" ? "*" : "")));
  ok(JSON.stringify(await btns()) === JSON.stringify(["1週間", "1か月*", "3か月", "1年", "全部"]), "the periods: 1週間 first, 1か月 pressed at first", await btns());
  let w = await plot(p, "wtChart");
  ok(w.wd === 0 && w.dates.length === 0 && w.low.length >= 3, "1か月 as it was: dates every week, no weekdays", w.low.map((x) => x.s));

  // 1週間
  await p.click('#wtRanges button[data-range="7"]'); await p.waitForTimeout(500);
  ok(JSON.stringify(await btns()) === JSON.stringify(["1週間*", "1か月", "3か月", "1年", "全部"]), "1週間 pressed", await btns());
  w = await plot(p, "wtChart");
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const wantDates = days.map((d, i) => (i === 0 || d.endsWith("-01") ? md(d) : String(+d.slice(8, 10))));
  ok(JSON.stringify(w.dates.map((x) => x.s)) === JSON.stringify(wantDates) && JSON.stringify(w.wds.map((x) => x.s)) === JSON.stringify(days.map(wdOf)), "the 7 days: 11/21 then the day alone, each with its weekday", { dates: w.dates.map((x) => x.s), wds: w.wds.map((x) => x.s) });
  ok(w.dates.every((x, i) => Math.abs(x.x - w.wds[i].x) < 0.01), "each weekday under its date");
  const xOf = new Map(days.map((d, i) => [d, w.dates[i].x]));
  ok(w.dots.length === week.length && week.every((r, i) => Math.abs(w.dots[i] - xOf.get(r.id)) < 0.5), "体重: a point for each record of the 7 days, each over its date", { dots: w.dots, want: week.map((r) => xOf.get(r.id)) });
  ok(w.aria.includes(`1週間で${week.length}回の記録、${md(first.id)}の${first.kg.toFixed(1)} kgから${md(last.id)}の${last.kg.toFixed(1)} kg`), "its read-out: 1週間で", w.aria);
  let lt = linesTrue(w);
  ok(lt.ok, "体重: each value said is its line's (none rounded to one place)", lt);
  const f = await plot(p, "fatChart");
  ok(f.dots.length === fatWeek.length && f.wds.length === 7 && fatWeek.every((r, i) => Math.abs(f.dots[i] - f.dates[days.indexOf(r.id)].x) < 0.5), "体脂肪率: the same 7 days, its points over their dates", { dots: f.dots, n: fatWeek.length });
  lt = linesTrue(f);
  ok(lt.ok, "体脂肪率: each value said is its line's", lt);
  const st = await txt(p, "#wtStats");
  ok(st.includes(`1週間の変化 ${signed(last.kg - first.kg)} kg ${md(first.id)} から ${week.length} 回記録`) && st.includes(`1週間で ${signed(fatWeek[fatWeek.length - 1].fat - fatWeek[0].fat)}%`), "the stats say 1週間", st);
  // the last point's tip
  const bb = await p.locator("#wtChart").boundingBox();
  await p.mouse.move(bb.x + bb.width - 50, bb.y + 100); await p.waitForTimeout(200);
  ok((await txt(p, "#wtTip")) === `${last.kg.toFixed(1)} kg ${md(last.id)}（${wdOf(last.id)}） 7日平均 ${(() => { const xs = weights.filter((r) => r.id >= addDays(last.id, -6) && r.id <= last.id); return (xs.reduce((s, r) => s + r.kg, 0) / xs.length).toFixed(1); })()} kg`, "the last point: its tip", await txt(p, "#wtTip"));

  // back to 1か月: as it was
  await p.click('#wtRanges button[data-range="30"]'); await p.waitForTimeout(500);
  w = await plot(p, "wtChart");
  ok(w.wd === 0 && w.dates.length === 0 && JSON.stringify(w.low.map((x) => x.s)) === JSON.stringify(["10/30", "11/6", "11/13", "11/20", "11/27"]) && w.dots.length === weights.filter((r) => r.id >= addDays(today, -29)).length, "1か月 again: as it was", w.low.map((x) => x.s));
  ok(!(await txt(p, "#wtStats")).includes("1週間"), "its stats: 1か月 again");
  ok(!p.errs.length && (await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)), "no errors, no sideways scroll", p.errs);
  await p.close();

  // 全部, the records 3 days long: a week's too
  p = await phone(b, NOW, { deviceScaleFactor: 1 });
  await seed(p, { weights: weights.filter((r) => r.id >= addDays(today, -2)), settings: SET }, "diet"); await p.evaluate((P) => localStorage.setItem(P + "dietPart", "weight"), P); await p.reload(); await p.waitForTimeout(1200);
  await p.click('#wtRanges button[data-range="0"]'); await p.waitForTimeout(500);
  w = await plot(p, "wtChart");
  ok(JSON.stringify(w.dates.map((x) => x.s)) === JSON.stringify([md(addDays(today, -2)), String(+addDays(today, -1).slice(8, 10)), String(+today.slice(8, 10))]) && w.wds.length === 3, "全部, 3 days of records: their dates and weekdays", w.dates.map((x) => x.s));
  ok(!p.errs.length, "no errors", p.errs);
  await p.close();

  // a narrow phone (320): the dates apart, each button one line
  p = await phone(b, NOW, { deviceScaleFactor: 1, viewport: { width: 320, height: 640 } });
  await seed(p, { weights, settings: SET }, "diet"); await p.evaluate((P) => localStorage.setItem(P + "dietPart", "weight"), P); await p.reload(); await p.waitForTimeout(1200);
  await p.click('#wtRanges button[data-range="7"]'); await p.waitForTimeout(500);
  w = await plot(p, "wtChart");
  const gaps = w.dates.slice(1).map((x, i) => Math.round(x.b.x - (w.dates[i].b.x + w.dates[i].b.width)));
  ok(w.dates.length === 7 && gaps.every((g) => g >= 4), "320 wide: the 7 dates apart", gaps);
  const tall = await p.$$eval("#wtRanges button", (l) => l.map((x) => Math.round(x.getBoundingClientRect().height)));
  ok(tall.every((h) => h <= 34), "320 wide: the 5 periods each one line", tall);
  ok(!p.errs.length && (await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)), "320 wide: no errors, no sideways scroll", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
