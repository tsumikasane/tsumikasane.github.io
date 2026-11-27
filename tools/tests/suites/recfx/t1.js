// 記録のボタン (the user's call, 2026-11-27: 「記録を確定するボタンのエフェクトについて、UI UX animation をふんだんに」,
// asked twice): a press ripples; a record put in pops the button, fills it with its kind's colour and draws a tick, a ring
// spreads, small blocks burst, and a block made on つみかさね flies to its tab with ＋1 (in a sheet, ＋1 over the button);
// nothing put in, the button shakes; laid over the button where it is after; gone a moment after. Driven as a user would,
// with the motion asked for (window.__moForce), and with Reduce Motion, and as a test program's browser is (none)
const { chromium } = require("playwright");
const { URL0, P, phone } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const NOW = new Date("2026-11-27T10:00:00+09:00");
async function open(b, part, o = {}) {
  const p = await phone(b, NOW, { deviceScaleFactor: 1, ...(o.reduce ? { reducedMotion: "reduce" } : {}) });
  if (!o.plain) await p.context().addInitScript(() => { window.__moForce = true; });
  await p.goto(URL0);
  await p.evaluate(({ P, part }) => { localStorage.clear(); localStorage.setItem(P + "dietPart", part); }, { P, part });
  await p.goto(URL0 + "#diet"); await p.reload(); await p.waitForTimeout(1600);
  return p;
}
// what is laid over the buttons now: its classes, and (in a sheet) so said
const fx = (p) => p.evaluate(() => [...document.querySelectorAll(".rfx")].map((n) => (n.closest("dialog") ? "dialog " : "") + n.className.replace(/^rfx /, "")));
const count = (l, k) => l.filter((x) => x === k).length;
async function tap(p, sel, fx = .5) {
  const l = p.locator(sel).first();
  await l.scrollIntoViewIfNeeded(); await p.waitForTimeout(250);
  const r = await l.boundingBox();
  await p.touchscreen.tap(r.x + r.width * fx, r.y + r.height / 2);
}
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const wide = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
(async () => {
  const b = await chromium.launch();

  // ---- からだ: nothing typed, the button shakes its head; then a weight put in ----
  let p = await open(b, "weight");
  await tap(p, "#wtSubmit"); await p.waitForTimeout(140);
  const shake = await p.evaluate(() => document.getElementById("wtSubmit").getAnimations().filter((a) => JSON.stringify(a.effect.getKeyframes()).includes("translateX")).length);
  ok(shake === 1 && !(await fx(p)).some((x) => x.includes("rfx-done")) && (await ls(p, "weights")).length === 0, "nothing typed: 記録する shakes its head, nothing filled", { shake, fx: await fx(p) });
  await p.waitForTimeout(700);
  await p.fill("#wtInput", "60.4");
  await tap(p, "#wtSubmit", .7); await p.waitForTimeout(40);
  ok((await fx(p)).includes("rfx-box rfx-press"), "pressed: a ripple from the finger", await fx(p));
  await p.waitForTimeout(140);
  let f = await fx(p);
  ok(count(f, "rfx-box rfx-done") === 1 && count(f, "rfx-ring") === 1 && count(f, "rfx-bit") === 14 && count(f, "rfx-fly") === 1, "put in: filled with a tick, a ring, 14 blocks bursting, one flying to つみかさね", f);
  const over = await p.evaluate(() => {
    const box = document.querySelector(".rfx-done"), bt = document.getElementById("wtSubmit"), a = box.getBoundingClientRect(), c = bt.getBoundingClientRect(), fill = box.querySelector(".rfx-fill");
    // (centres: the button is mid-pop, a little larger for the moment)
    return { d: Math.round(Math.abs(a.left + a.width / 2 - c.left - c.width / 2) + Math.abs(a.top + a.height / 2 - c.top - c.height / 2)), bg: getComputedStyle(fill).backgroundColor, tick: !!box.querySelector(".rfx-check path"),
      pop: bt.getAnimations().some((x) => JSON.stringify(x.effect.getKeyframes()).includes("scale(1.07)")), label: bt.textContent };
  });
  ok(over.d <= 3 && over.bg === "rgb(86, 74, 222)" && over.tick && over.pop && over.label === "更新する", "over the button where it is after (記録する became 更新する and moved), in からだ's colour, the button popping", over);
  await p.waitForTimeout(1000);
  f = await fx(p);
  const land = await p.evaluate(() => { const m = document.querySelector('.menu button[data-tab="tsumi"] .mi'), t = document.querySelector(".rfx-plus"); return { plus: t ? t.textContent : null, bounce: m ? m.getAnimations().length : -1, fixed: t ? getComputedStyle(t).position : null }; });
  ok(land.plus === "＋1" && land.bounce >= 1 && land.fixed === "fixed" && !f.includes("rfx-fly"), "the block landed: つみかさね's tab bounces with ＋1", land);
  await p.waitForTimeout(1400);
  ok((await fx(p)).length === 0 && (await ls(p, "weights")).length === 1, "all gone a moment after, the weight kept", await fx(p));
  ok(await wide(p) && !p.errs.length, "no sideways scroll, no errors", p.errs);
  await p.close();

  // ---- 食事: its screen's 追加, in its sheet (＋1 over the button: the tab bar is under it) ----
  p = await open(b, "meal");
  await p.evaluate(() => document.querySelector("#mealSlots button[data-slot]").click()); await p.waitForTimeout(700);
  await p.fill("#mealText", "おにぎり"); await p.waitForTimeout(400);
  await tap(p, "#mealRecAdd"); await p.waitForTimeout(200);
  f = await fx(p);
  ok(count(f, "dialog rfx-box rfx-done") === 1 && count(f, "dialog rfx-bit") === 14 && count(f, "dialog rfx-plus") === 1 && !f.some((x) => x.includes("rfx-fly")), "食事's 追加: all in its sheet, つみかさね ＋1 over the button, no block flying under it", f);
  ok((await p.evaluate(() => document.querySelector("dialog .rfx-plus")?.textContent)) === "つみかさね ＋1", "its words: つみかさね ＋1");
  await p.waitForTimeout(2400);
  ok((await fx(p)).length === 0 && (await ls(p, "meals")).length === 1 && !p.errs.length, "gone, the meal kept, no errors", p.errs);
  await p.close();

  // ---- すきま運動's chip: the same, a chip never shaking ----
  p = await open(b, "workout");
  await tap(p, '#dt13Quick button[aria-label="スクワット 20回を記録する"]'); await p.waitForTimeout(200);
  f = await fx(p);
  ok(count(f, "rfx-box rfx-done") === 1 && count(f, "rfx-fly") === 1 && (await ls(p, "workouts")).length === 1, "すきま運動: filled, a block to つみかさね, the move kept", f);
  await p.waitForTimeout(2400);
  // (a second the same day: a block more for つみかさね too)
  await tap(p, '#dt13Quick button[aria-label="合掌プレス 30秒を記録する"]'); await p.waitForTimeout(200);
  ok((await fx(p)).includes("rfx-box rfx-done"), "another chip: filled again");
  await p.waitForTimeout(2400);
  ok((await fx(p)).length === 0 && !p.errs.length, "gone, no errors", p.errs);
  await p.close();

  // ---- with Reduce Motion, and in a test program's browser: none, the record kept as ever ----
  for (const [o, name] of [[{ reduce: true }, "Reduce Motion"], [{ plain: true }, "a test program's browser (no __moForce)"]]) {
    p = await open(b, "weight", o);
    await p.fill("#wtInput", "61.0");
    await tap(p, "#wtSubmit"); await p.waitForTimeout(200);
    ok((await fx(p)).length === 0 && (await ls(p, "weights")).length === 1 && !p.errs.length, `${name}: nothing laid over, the weight kept`, await fx(p));
    await p.close();
  }
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
