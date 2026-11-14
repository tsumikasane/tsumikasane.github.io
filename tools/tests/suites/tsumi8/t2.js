// つみかさね その8 10 なかよし度: つみねこ petted, counted 10 a day at most, through the hook build at 8840
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
  const f0 = await p.evaluate(() => window.__ts8.friend());
  ok(f0.pets === 25 && f0.days === 1 && f0.pts === 26 && f0.name === "顔見知り", "the pets so far, and the day stacked", f0);
  for (let i = 0; i < 12; i++) await p.evaluate(() => window.__ts8.pet());
  const kept = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "tsumiPets")), P), f1 = await p.evaluate(() => window.__ts8.friend());
  ok(kept.day === today && kept.n === 10 && kept.total === 35 && f1.pts === 36 && f1.name === "なかよし", "12 pets today: 10 counted (yesterday's 10 not holding it back)", { kept, f1 });
  ok(!p.errs.length, "no errors: " + p.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
