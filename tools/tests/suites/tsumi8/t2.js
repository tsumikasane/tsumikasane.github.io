// つみかさね その8 10 なかよし度: taken out at the user's call (2026-11-21, tools/REMOVED.md). つみねこ pressed still says
// its words; the times it was petted, kept in this browser before, are left as they were, counted no more. Through the
// hook build at 8840
process.env.URL0 = process.env.URL0 || "http://localhost:8840/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-14";
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("10:00", today), { deviceScaleFactor: 1 });
  await seed(p, { meals: [{ id: "m1", date: today, slot: "朝食", text: "パン", createdAt: Date.parse(`${today}T08:00:00+09:00`) }], tsumiPets: { day: "2026-11-13", n: 10, total: 25 } }, "tsumi");
  await p.waitForTimeout(800);
  await p.click("#tsumiToTop").catch(() => {}); await p.waitForTimeout(300);
  const xy = await p.evaluate(() => { const g = window.__ts8.geo(), r = document.getElementById("tsumiCanvas").getBoundingClientRect(); return g?.nekoAt ? { x: r.left + (g.nekoAt.x0 + g.nekoAt.x1) / 2, y: r.top + (g.nekoAt.y0 + g.nekoAt.y1) / 2 + 6 } : null; });
  ok(!!xy, "つみねこ on the stairs");
  if (xy) for (let i = 0; i < 3; i++) { await p.mouse.click(xy.x, xy.y); await p.waitForTimeout(300); }
  ok(await p.isVisible("#nekoSay"), "pressed: its words, as before");
  const kept = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "tsumiPets")), P);
  ok(kept && kept.day === "2026-11-13" && kept.n === 10 && kept.total === 25, "pressed 3 times: nothing counted, the pets kept before left as they were", kept);
  ok(!(await p.$("#ts8Friend")), "no なかよし度");
  ok(!p.errs.length, "no errors: " + p.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
