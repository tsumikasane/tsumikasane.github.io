// 家計簿's 費目ごとの支出, its 円グラフ under the list (the user's call, 2026-11-28: 「費目ごとの%基準で円グラフを表示」).
// Under the list in its card; a slice a 費目 as much of the round as its share of the month's 支出, from the top clockwise
// in the list's order, in its 費目's colour (its bar's, light and dark); its % outside it where it is 5% or more (the
// list's own number), the labels clear of each other, of the round and of the card's edge. A mouse over one, a finger on
// one (again, or elsewhere, to put it away) or the arrow keys: its name, amount and %, the others faded. One 費目: the
// whole round, 100%. Only a budget and nothing spent: no 円グラフ. A 費目 pressed (明細 narrowed): the round still the
// whole month. No errors, no sideways scroll
const { chromium } = require("playwright");
const { phone, seed } = require("./lib");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const rgb = (h) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;
const COL = { 交際費: ["#c08a00", "#f2c443"], 交通費: ["#8d5b31", "#d39a66"], 食費: ["#d9711c", "#ff9d4d"] };
const T0 = Date.parse("2026-11-01T09:00:00+09:00");
const X = (id, date, category, amount, kind = "out") => ({ id, date, kind, ...(category ? { category } : {}), amount, createdAt: T0 });
// the user's own month (their message): 交際費 10,835, 交通費 1,696, 食費 140 (and a 収入, not in it)
const A = [["交際費", 10835], ["交通費", 1696], ["食費", 140]];
const DATA_A = { expenses: [...A.map(([c, a], i) => X("a" + i, `2026-11-0${3 + i}`, c, a)), X("in", "2026-11-25", "給与", 90000, "in")] };
const B = [["食費", 32000], ["交際費", 15000], ["日用品", 9000], ["水道光熱費", 8000], ["衣服", 7000], ["交通費", 6000], ["通信費", 5000], ["美容", 4000], ["教育費", 3000], ["医療費", 2500], ["雑費", 1200]];
const DATA_B = { expenses: B.map(([c, a], i) => X("b" + i, `2026-11-${String(2 + i).padStart(2, "0")}`, c, a)) };
const DATA_C = { expenses: [X("c1", "2026-11-03", "食費", 5000), X("c2", "2026-11-09", "外食", 1200)] }; // (外食 counted as 食費: one 費目)
const DATA_D = { expenses: [X("d1", "2026-11-25", "給与", 90000, "in")], settings: [{ id: "budget", monthly: 100000, cats: { 旅行: 10000 }, updatedAt: T0 }] };
const R = 84;
const center = (p) => p.evaluate(() => { const s = document.querySelector("#catPie"); s.scrollIntoView({ block: "center" }); });
// a point of the round: its angle from the top, clockwise, and how far out (of the radius), where the page shows it
const at = (p, deg, frac) => p.evaluate(({ deg, frac, R }) => {
  const r = document.querySelector("#catPie").getBoundingClientRect(), k = r.width / 260, a = (deg * Math.PI) / 180;
  return { x: r.left + (130 + R * frac * Math.sin(a)) * k, y: r.top + (110 - R * frac * Math.cos(a)) * k };
}, { deg, frac, R });
const hit = (p, pt) => p.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest(".cat-slice")?.getAttribute("data-cat") ?? null, pt);
const tipNow = (p) => p.evaluate(() => {
  const t = document.querySelector("#catPieTip"), s = document.querySelector("#catPie");
  if (!t || t.hidden) return null;
  const tr = t.getBoundingClientRect(), wr = document.querySelector("#catPieWrap").getBoundingClientRect();
  return { text: t.innerText.replace(/\s+/g, " ").trim(), inside: tr.left >= wr.left - 1 && tr.right <= wr.right + 1 && tr.top >= wr.top - 1,
    faded: [...s.querySelectorAll(".cat-slice")].map((x) => [x.getAttribute("data-cat"), getComputedStyle(x).opacity]) };
});
const pie = (p) => p.evaluate(() => {
  const w = document.querySelector("#catPieWrap"), s = document.querySelector("#catPie"), list = document.querySelector("#catList");
  if (!w || !s) return null;
  const sr = s.getBoundingClientRect();
  return {
    shown: !w.hidden && w.offsetHeight > 0, inCard: w.parentElement?.id === "catCard", after: !!(list.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING),
    below: w.hidden ? null : w.getBoundingClientRect().top >= list.getBoundingClientRect().bottom - 1,
    slices: [...s.querySelectorAll(".cat-slice")].map((x) => [x.getAttribute("data-cat"), getComputedStyle(x).fill, x.tagName]),
    labels: [...s.querySelectorAll(".cat-pct")].map((t) => { const b = t.getBoundingClientRect(); return { t: t.textContent, l: b.left, r: b.right, top: b.top, b: b.bottom, color: getComputedStyle(t).fill }; }),
    box: { l: sr.left, r: sr.right, t: sr.top, b: sr.bottom, k: sr.width / 260, cx: sr.left + 130 * (sr.width / 260), cy: sr.top + 110 * (sr.width / 260) },
    aria: s.getAttribute("aria-label") || "", role: s.getAttribute("role"),
    bars: Object.fromEntries([...list.querySelectorAll(".cat-row")].map((r) => [r.querySelector(".cat").textContent, getComputedStyle(r.querySelector(".cat-bar")).backgroundColor])),
    pcts: Object.fromEntries([...list.querySelectorAll(".cat-row")].map((r) => [r.querySelector(".cat").textContent, r.querySelector(".amount small").textContent])),
    sideways: document.documentElement.scrollWidth > window.innerWidth,
  };
});
// the labels: none over another, all within the 円グラフ's box, none over the round
function labelsClear(c) {
  const L = c.labels, k = c.box.k, bad = [];
  for (let i = 0; i < L.length; i++) {
    const a = L[i];
    if (a.l < c.box.l - 1 || a.r > c.box.r + 1 || a.top < c.box.t - 1 || a.b > c.box.b + 1) bad.push(["out", a.t]);
    const nx = Math.min(Math.max(c.box.cx, a.l), a.r), ny = Math.min(Math.max(c.box.cy, a.top), a.b);
    if (Math.hypot(nx - c.box.cx, ny - c.box.cy) < R * k + 1) bad.push(["on the round", a.t]);
    for (let j = i + 1; j < L.length; j++) { const b = L[j]; if (a.l < b.r && b.l < a.r && a.top < b.b && b.top < a.b) bad.push(["over", a.t, b.t]); }
  }
  return bad;
}
(async () => {
  const b = await chromium.launch();
  for (const scheme of ["light", "dark"]) {
    const k = scheme === "light" ? 0 : 1;
    const p = await phone(b, new Date("2026-11-28T20:00:00+09:00"), { deviceScaleFactor: 1, colorScheme: scheme });
    await seed(p, DATA_A, "money"); await p.waitForTimeout(900);
    let c = await pie(p);
    ok(!!c && c.shown && c.inCard && c.after && c.below, `${scheme}: the 円グラフ under 費目ごとの支出's list, in its card`, c && [c.shown, c.inCard, c.after, c.below]);
    if (!c || !c.shown) { await p.context().close(); continue; }
    ok(c.role === "img" && c.aria.includes("交際費 86%、交通費 13%、食費 1%"), `${scheme}: read out as a picture, each 費目 and its %`, c.aria);
    ok(c.slices.map(([n]) => n).join() === "交際費,交通費,食費", `${scheme}: a slice a 費目, in the list's order (no 収入)`, c.slices);
    ok(c.slices.every(([n, f]) => f === rgb(COL[n][k])), `${scheme}: each slice in its 費目's colour`, c.slices);
    ok(c.slices.every(([n, f]) => c.bars[n] === f), `${scheme}: each slice as its bar in the list`, [c.slices, c.bars]);
    ok(c.labels.map((x) => x.t).join() === "86%,13%" && c.pcts["交際費"] === "86%" && c.pcts["交通費"] === "13%", `${scheme}: 86% and 13% beside theirs (1% none), the list's numbers`, [c.labels.map((x) => x.t), c.pcts]);
    ok(c.labels.every((x) => x.color === (scheme === "light" ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)")), `${scheme}: the %s in the text's colour`, c.labels.map((x) => x.color));
    ok(!labelsClear(c).length, `${scheme}: the %s clear of each other, the round and the edge`, labelsClear(c));
    // each slice as much of the round as its share, from the top clockwise (the page's own points)
    await center(p);
    const all = A.reduce((s, [, a]) => s + a, 0);
    let from = 0;
    const wrong = [];
    for (const [n, a] of A) {
      const to = from + (a / all) * 360, mid = (from + to) / 2;
      const got = await hit(p, await at(p, mid, n === "食費" ? 0.85 : 0.6));
      if (got !== n) wrong.push(["mid", n, mid, got]);
      if (to - from > 12) for (const [d, want] of [[from + 4, n], [to - 4, n]]) { const g = await hit(p, await at(p, d, 0.6)); if (g !== want) wrong.push(["edge", n, d, g]); }
      from = to;
    }
    const nb = await hit(p, await at(p, (10835 / all) * 360 + 4, 0.6));
    ok(!wrong.length && nb === "交通費", `${scheme}: each slice its share of the round, from the top clockwise (交際費 to ${Math.round((10835 / all) * 360)}°)`, [wrong, nb]);
    // a mouse over 交通費: its name, amount and %, the others faded; away, gone
    const mid2 = ((10835 + 1696 / 2) / all) * 360;
    let pt = await at(p, mid2, 0.6);
    await p.mouse.move(pt.x, pt.y); await p.waitForTimeout(350);
    let t = await tipNow(p);
    ok(!!t && t.text === "交通費 1,696 円（13%）" && t.inside, `${scheme}: the mouse over 交通費: 「交通費 1,696 円（13%）」 over it, within the card`, t);
    ok(!!t && t.faded.every(([n, o]) => (n === "交通費" ? o === "1" : Number(o) < 0.6)), `${scheme}: the others faded`, t && t.faded);
    await p.mouse.move(2, 2); await p.waitForTimeout(350);
    t = await tipNow(p);
    const unfaded = await p.evaluate(() => [...document.querySelectorAll("#catPie .cat-slice")].every((x) => getComputedStyle(x).opacity === "1"));
    ok(t === null && unfaded, `${scheme}: the mouse away: gone, none faded`, [t, unfaded]);
    // a finger: 交際費 tapped (its words), again (gone); tapped, then the card's head tapped (gone)
    pt = await at(p, ((10835 / 2) / all) * 360, 0.5);
    await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(350);
    t = await tipNow(p);
    ok(!!t && t.text === "交際費 10,835 円（86%）" && t.inside, `${scheme}: 交際費 tapped: 「交際費 10,835 円（86%）」`, t);
    const ring = await p.evaluate(() => { const s = document.querySelector("#catPie"), cs = getComputedStyle(s); return s.matches(":focus-visible") ? "keys" : cs.outlineStyle; });
    ok(ring === "none", `${scheme}: tapped, no ring round the 円グラフ`, ring);
    await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(350);
    ok(await tipNow(p) === null, `${scheme}: tapped again: gone`);
    const pt3 = await at(p, mid2, 0.6);
    await p.touchscreen.tap(pt3.x, pt3.y); await p.waitForTimeout(300);
    const t3 = await tipNow(p);
    const head = await p.locator("#catCard .card-head").boundingBox();
    await p.touchscreen.tap(head.x + 20, head.y + head.height / 2); await p.waitForTimeout(300);
    ok(!!t3 && t3.text.startsWith("交通費") && await tipNow(p) === null, `${scheme}: 交通費 tapped, then elsewhere: gone`, t3);
    // the keys: → the first, → the next, End the last, → round to the first, Escape gone
    await p.focus("#catPie");
    const seen = [];
    for (const key of ["ArrowRight", "ArrowRight", "End", "ArrowRight", "ArrowLeft"]) { await p.keyboard.press(key); await p.waitForTimeout(80); seen.push((await tipNow(p))?.text.split(" ")[0] ?? null); }
    await p.keyboard.press("Escape"); await p.waitForTimeout(80);
    ok(seen.join() === "交際費,交通費,食費,交際費,食費" && await tipNow(p) === null, `${scheme}: the arrow keys from one to the next, Escape puts it away`, seen);
    // a 費目 pressed: 明細 narrowed, the 円グラフ still the whole month
    await p.evaluate(() => document.activeElement?.blur());
    await p.locator('#catList .cat-row:has-text("交通費")').click(); await p.waitForTimeout(400);
    c = await pie(p);
    ok(c.shown && c.slices.map(([n]) => n).join() === "交際費,交通費,食費" && c.labels.map((x) => x.t).join() === "86%,13%" && (await p.textContent("#exFilter")).includes("交通費だけ"), `${scheme}: 交通費 pressed (明細 narrowed): the 円グラフ still the whole month`, c.slices);
    await p.locator('#catList .cat-row:has-text("交通費")').click(); await p.waitForTimeout(300);
    ok(!c.sideways, `${scheme}: no sideways scroll`);
    await p.locator("#catCard").screenshot({ path: `${out}/moneypie-${scheme}.png` }).catch(() => {});
    ok(!p.errs.length, `${scheme}: no page errors`, p.errs);
    await p.context().close();
  }
  // eleven 費目: their %s from 5% (the list's), clear of each other; the colours all there
  {
    const p = await phone(b, new Date("2026-11-28T20:00:00+09:00"), { deviceScaleFactor: 1 });
    await seed(p, DATA_B, "money"); await p.waitForTimeout(900);
    const c = await pie(p);
    const all = B.reduce((s, [, a]) => s + a, 0), want = B.map(([, a]) => Math.round((a / all) * 100)).filter((x) => x >= 5).map((x) => `${x}%`);
    ok(!!c && c.shown && c.slices.length === 11 && c.slices.map(([n]) => n).join() === B.map(([n]) => n).join(), "11 費目: 11 slices in the list's order", c && c.slices.map(([n]) => n));
    ok(!!c && c.labels.map((x) => x.t).join() === want.join() && B.filter(([n]) => Number(c.pcts[n].slice(0, -1)) >= 5).length === want.length, `11 費目: the %s of 5% and more (${want.join(" ")})`, c && c.labels.map((x) => x.t));
    ok(!!c && !labelsClear(c).length, "11 費目: the %s clear of each other, the round and the edge", c && labelsClear(c));
    ok(!!c && new Set(c.slices.map(([, f]) => f)).size === 11 && c.slices.every(([n, f]) => c.bars[n] === f), "11 費目: each its colour, as its bar", c && c.slices);
    ok(!!c && !c.sideways && !p.errs.length, "11 費目: no sideways scroll, no errors", [c && c.sideways, p.errs]);
    await p.locator("#catCard").screenshot({ path: `${out}/moneypie-eleven.png` }).catch(() => {});
    await p.context().close();
  }
  // one 費目 (外食 counted as 食費): the whole round, 100%
  {
    const p = await phone(b, new Date("2026-11-28T20:00:00+09:00"), { deviceScaleFactor: 1 });
    await seed(p, DATA_C, "money"); await p.waitForTimeout(900);
    const c = await pie(p);
    ok(!!c && c.shown && c.slices.length === 1 && c.slices[0][0] === "食費" && c.slices[0][2] === "circle" && c.labels.map((x) => x.t).join() === "100%", "one 費目: the whole round, 100%", c && [c.slices, c.labels.map((x) => x.t)]);
    if (c && c.shown) { await center(p); const pt = await at(p, 200, 0.5); await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(300); }
    const t = await tipNow(p);
    ok(!!t && t.text === "食費 6,200 円（100%）", "one 費目: tapped, 「食費 6,200 円（100%）」", t);
    ok(!p.errs.length, "one 費目: no errors", p.errs);
    await p.context().close();
  }
  // a 費目 with a budget and nothing spent (and a 収入): the list shows it, no 円グラフ
  {
    const p = await phone(b, new Date("2026-11-28T20:00:00+09:00"), { deviceScaleFactor: 1 });
    await seed(p, DATA_D, "money"); await p.waitForTimeout(900);
    const c = await pie(p);
    const card = await p.isVisible("#catCard"), rows = await p.locator("#catList .cat-row").count();
    ok(card && rows === 1 && !!c && !c.shown, "only a budget, nothing spent: the list shows it, no 円グラフ", [card, rows, c && c.shown]);
    ok(!p.errs.length, "only a budget: no errors", p.errs);
    await p.context().close();
  }
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
