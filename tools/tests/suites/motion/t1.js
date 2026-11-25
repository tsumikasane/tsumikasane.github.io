// 動き (the user's call, 2026-11-25): HIG's motion all over the app, the charts drawn as infographics. Driven as a user
// would, with the motion asked for (window.__moForce: a test program's browser has none, so the other suites read the
// page as it is drawn), and without it, and with Reduce Motion
const { chromium } = require("playwright");
const { URL0, phone } = require("./lib");
const recseed = require("../../cmp/recseed.js");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const NOW = new Date("2026-11-25T10:00:00+09:00");
// the Web Animations of the page (not the CSS ones), by what they move
const mine = (p) => p.evaluate(() => document.getAnimations().filter((a) => !(a instanceof CSSAnimation) && !(a instanceof CSSTransition)).map((a) => {
  const t = a.effect && a.effect.target, kf = a.effect.getKeyframes();
  return { tag: t ? t.tagName.toLowerCase() : "", cls: t ? (t.getAttribute("class") || "") : "", id: t ? (t.id || "") : "", state: a.playState, props: Object.keys(kf[0] || {}).filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)) };
}));
async function open(b, hash, o = {}) {
  const p = await phone(b, NOW, { deviceScaleFactor: 1, ...o });
  if (!o.plain) await p.context().addInitScript(() => { window.__moForce = true; });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.goto(URL0); await recseed(p);
  await p.goto(URL0 + "#" + hash); await p.reload(); await p.waitForTimeout(2400);
  return p;
}
const tab = async (p, key) => { await p.evaluate((k) => document.querySelector(`.menu button[data-tab="${k}"]`).click(), key); };
const settled = async (p) => (await mine(p)).filter((a) => a.state === "running").length;
const wide = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
(async () => {
  const b = await chromium.launch();

  // ---- a page shown: its cards rise in one after another, the calendar's days come in as a wave, the tab bounces ----
  let p = await open(b, "home");
  ok(await p.evaluate(() => document.documentElement.classList.contains("mo")), "html.mo: the motion is on");
  await tab(p, "calendar"); await p.waitForTimeout(60);
  let a = await mine(p);
  const rise = a.filter((x) => /(^| )(card|sec-head|group-head)( |$)/.test(x.cls) && x.props.includes("transform") && x.props.includes("opacity"));
  const days = a.filter((x) => /(^| )cal-day( |$)/.test(x.cls));
  ok(rise.length >= 2, "カレンダー shown: its cards and heading rise in", rise.length);
  ok(days.length >= 28, "its month's days come in as a wave", days.length);
  ok(a.some((x) => x.cls === "mi" && x.props.includes("transform")), "the tab's icon bounces", a.filter((x) => x.cls === "mi"));
  ok(await wide(p), "no sideways scroll mid-motion");
  await p.waitForTimeout(1800);
  ok((await settled(p)) === 0, "all settled in a moment", await settled(p));
  ok(await p.evaluate(() => [...document.querySelectorAll("#sec-calendar .card, #calGrid > *")].filter((x) => x.getClientRects().length).every((x) => getComputedStyle(x).opacity === "1" && getComputedStyle(x).transform === "none")),
    "and as they are drawn after it (no opacity or transform left)");

  // ---- the charts: the weight's lines draw from left to right, dots pop in, the area rises ----
  await p.close();
  p = await open(b, "diet");
  const held = await p.evaluate(() => document.getAnimations().filter((x) => x.playState === "paused").length);
  ok(held > 0, "those out of sight are held till they are scrolled to", held);
  await p.evaluate(() => { const w = document.getElementById("wtChartWrap"); window.scrollTo(0, w.getBoundingClientRect().top + scrollY - 200); });
  await p.waitForTimeout(260);
  const drawing = await p.evaluate(() => {
    const line = document.querySelector("#wtChart path.line, #wtChart path.avg-line"), dot = document.querySelector("#wtChart circle.dot:not([visibility])"), area = document.querySelector("#wtChart path.area");
    const kf = (x) => (x ? x.getAnimations().map((a) => Object.keys(a.effect.getKeyframes()[0] || {})).flat() : []);
    return { line: kf(line), dot: kf(dot), area: kf(area), offset: line ? parseFloat(getComputedStyle(line).strokeDashoffset) : -1 };
  });
  ok(drawing.line.includes("strokeDashoffset") && drawing.offset > 0, "the line draws from the left (scrolled to)", drawing);
  ok(drawing.dot.includes("transform") && drawing.area.includes("transform"), "its dots pop in, its area rises", drawing);
  await p.waitForTimeout(1900);
  const after = await p.evaluate(() => { const line = document.querySelector("#wtChart path.line"); return { dash: getComputedStyle(line).strokeDasharray, n: document.querySelector("#wtChart").getAnimations({ subtree: true }).length, style: [...document.querySelectorAll("#wtChart [style]")].length }; });
  ok(after.dash === "none" && after.n === 0 && after.style === 0, "then the chart as it is drawn (its dashes and the boxes it moved by taken off)", after);
  ok(await wide(p), "no sideways scroll on からだ");
  // a check pressed pops
  await p.close();
  p = await open(b, "routine");
  const chk = await p.$("#sec-routine li[data-rt] .check");
  if (chk) {
    await chk.click(); await p.waitForTimeout(60);
    ok((await mine(p)).some((x) => /(^| )check( |$)/.test(x.cls) && x.props.includes("transform")), "a check pressed pops");
  } else ok(false, "a ルーティーン's check to press");
  // bars: 家計簿's grow from nothing
  await p.close();
  p = await open(b, "money", {});
  await p.evaluate(() => window.scrollTo(0, 0));
  const bars = await p.evaluate(() => [...document.querySelectorAll("#sec-money [style*='%']")].filter((x) => x.getClientRects().length).map((x) => x.getAnimations().map((a) => a.effect.getKeyframes()[0]).filter(Boolean).map((k) => k.width || k.height || "")).flat());
  ok(bars.length === 0 || bars.every((w) => w === "0%"), "家計簿's bars grew from nothing (or have grown)", bars);
  // printing: whatever is held is shown as it is
  await p.evaluate(() => dispatchEvent(new Event("beforeprint"))); await p.waitForTimeout(50);
  ok(await p.evaluate(() => document.getAnimations().filter((x) => x.playState === "paused").length === 0), "before printing, nothing held");
  ok(!p.errs.length, "no page errors (motion)", p.errs);
  await p.close();

  // ---- Reduce Motion: none of it ----
  p = await open(b, "home", { reducedMotion: "reduce" });
  ok(!(await p.evaluate(() => document.documentElement.classList.contains("mo"))), "Reduce Motion: no html.mo");
  await tab(p, "calendar"); await p.waitForTimeout(60);
  ok((await mine(p)).length === 0, "nothing moves as a page shows", await mine(p));
  await p.close();
  // ---- a test program's browser, unasked: none of it (the other suites read the page as drawn) ----
  p = await open(b, "home", { plain: true });
  ok(!(await p.evaluate(() => document.documentElement.classList.contains("mo"))), "a test program's browser: no html.mo");
  await tab(p, "calendar"); await p.waitForTimeout(60);
  ok((await mine(p)).length === 0, "and nothing moves", await mine(p));
  ok(!p.errs.length, "no page errors (unasked)", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
