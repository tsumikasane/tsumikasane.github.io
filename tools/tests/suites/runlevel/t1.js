// 運動's ランレベル as gems by their rank (the user's call, 2026-11-24: the levels by 宝石のグレード, not colours; 案A 宝石の格):
// 水晶・アメジスト・トパーズ・エメラルド・サファイア・ルビー・ダイヤモンド, from the same km as before, each its own cut; the card,
// its page (the gem, the bar in its colour, every level, the ones ahead faded), a run that takes it up saying so
process.env.URL0 = process.env.URL0 || "http://localhost:8765/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const NAMES = ["水晶", "アメジスト", "トパーズ", "エメラルド", "サファイア", "ルビー", "ダイヤモンド"];
const RANGES = ["0〜49.99 km", "50.00〜249.9 km", "250.0〜999.9 km", "1,000〜2,499 km", "2,500〜4,999 km", "5,000〜14,999 km", "15,000 km〜"];
const CUTS = ["crystal", "cushion", "pear", "step", "oval", "heart", "brilliant"];
const day = (i) => new Date(Date.UTC(2026, 10, 24) - Math.floor(i / 2) * 864e5).toISOString().slice(0, 10);
const runs = (n, km) => Array.from({ length: n }, (_, i) => ({ id: "w" + i, date: day(i + 2), type: "ランニング", km, minutes: 40, createdAt: Date.parse(`${day(i + 2)}T07:00:00+09:00`) + i }));
async function open(b, workouts) {
  const p = await phone(b, new Date("2026-11-24T18:00:00+09:00"));
  await seed(p, { workouts }, "diet");
  await p.evaluate((P) => localStorage.setItem(P + "dietPart", "workout"), P); await p.reload(); await p.waitForTimeout(900);
  return p;
}
// the card: its name, what is said under the bar, its gem, the bar's width and colour
const card = (p) => p.evaluate(() => {
  const c = document.getElementById("runLevelCard"), f = c.querySelector(".rl-fill"), cs = f && getComputedStyle(f);
  return { name: c.querySelector(".rl-card-title strong")?.textContent, sub: c.querySelector(".rl-card-sub")?.textContent, gem: c.querySelector(".rl-badge")?.dataset.gem,
    size: c.querySelector(".rl-badge svg")?.getAttribute("width"), width: f?.style.width, color: cs?.backgroundColor, image: cs?.backgroundImage };
});
(async () => {
  const b = await chromium.launch();
  // no run yet: 水晶, 50 km to アメジスト
  let p = await open(b, []);
  let c = await card(p);
  ok(c.name === "水晶" && c.sub === "あと 50.00 km でアメジスト レベル" && c.gem === "crystal" && c.size === "40", "0 km: 水晶, あと 50.00 km でアメジスト レベル, its crystal", c);
  await p.close();
  // 320 km: トパーズ, 680 km to エメラルド, the bar a tenth along in トパーズ's colour
  p = await open(b, runs(40, 8));
  c = await card(p);
  ok(c.name === "トパーズ" && c.sub === "あと 680.00 km でエメラルド レベル" && c.gem === "pear", "320 km: トパーズ, あと 680.00 km でエメラルド レベル, its pear", c);
  ok(c.width === "9.3%" && c.color === "rgb(245, 174, 62)", "the bar: 9.3%, in トパーズ's colour", c);
  // its page: the gem, the next one at the bar's end, every level as before but gems, the ones ahead faded
  await p.click("#runLevelCard"); await p.waitForTimeout(700);
  const pg = await p.evaluate(() => {
    const hero = document.getElementById("runLevelHero"), rows = [...document.querySelectorAll("#runLevelList li")];
    return { shown: !document.getElementById("sec-runlevel").hidden, said: hero.querySelector('[role="img"]')?.getAttribute("aria-label"), heroGem: hero.querySelector('[role="img"] .rl-badge')?.dataset.gem,
      heroSize: hero.querySelector('[role="img"] svg')?.getAttribute("width"), next: hero.querySelector(".rl-next .rl-badge")?.dataset.gem, line: hero.querySelector(".rl-said")?.textContent,
      names: rows.map((r) => r.querySelector(".rl-name")?.firstChild?.textContent), ranges: rows.map((r) => r.querySelector(".rl-range")?.textContent.replace(/\u00a0/g, " ")),
      gems: rows.map((r) => r.querySelector(".rl-badge")?.dataset.gem), now: rows.map((r) => r.getAttribute("aria-current")), here: rows.map((r) => !!r.querySelector(".rl-now")),
      ahead: rows.map((r) => r.classList.contains("ahead") && r.querySelector(".rl-badge").classList.contains("ahead")),
      facets: rows.map((r) => r.querySelectorAll("svg polygon").length), edges: rows.map((r) => r.querySelector("svg .rl-edge")?.getAttribute("points")),
      pennant: !!document.querySelector('#sec-runlevel path[d^="M3 3h54v49"]') };
  });
  ok(pg.shown && pg.said === "いまはトパーズ レベル" && pg.heroGem === "pear" && pg.heroSize === "120", "the page: its トパーズ, large", pg);
  ok(pg.next === "step" && pg.line === "あと 680.00 km でエメラルド レベル", "the next, エメラルド's cut, at the bar's end; what is left said", pg);
  ok(JSON.stringify(pg.names) === JSON.stringify(NAMES), "the levels: " + pg.names.join("・"), pg.names);
  ok(JSON.stringify(pg.ranges) === JSON.stringify(RANGES), "their ranges as before", pg.ranges);
  ok(JSON.stringify(pg.gems) === JSON.stringify(CUTS) && new Set(pg.edges).size === 7 && pg.facets.every((n) => n >= 7), "each its own cut, drawn in facets", pg);
  ok(JSON.stringify(pg.now) === JSON.stringify([null, null, "true", null, null, null, null]) && JSON.stringify(pg.here) === JSON.stringify([false, false, true, false, false, false, false]), "トパーズ: いまのレベル", pg);
  ok(JSON.stringify(pg.ahead) === JSON.stringify([false, false, false, true, true, true, true]), "the four ahead faded", pg.ahead);
  ok(!pg.pennant, "no pennant with a runner left");
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  // 995 km, and a run of 10 km put in: up to エメラルド, said so
  p = await open(b, runs(199, 5));
  ok((await card(p)).name === "トパーズ", "995 km: トパーズ still");
  await p.selectOption("#woType", "ランニング"); await p.waitForTimeout(200);
  await p.fill("#woDist", "10"); await p.fill("#woMin", "60");
  await p.locator("#workoutForm button[type=submit]").click(); await p.waitForTimeout(500);
  const said = await p.evaluate(() => document.querySelector("#status").textContent);
  c = await card(p);
  ok(said.includes("ランレベルがエメラルドになりました"), "a run past 1,000 km: ランレベルがエメラルドになりました", said);
  ok(c.name === "エメラルド" && c.gem === "step" && c.sub === "あと 1,495.00 km でサファイア レベル" && c.color === "rgb(39, 176, 107)", "and the card: エメラルド, its step cut, its green", c);
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  // 15,200 km: ダイヤモンド, the last, the bar full in its fire
  p = await open(b, runs(152, 100));
  c = await card(p);
  ok(c.name === "ダイヤモンド" && c.gem === "brilliant" && c.sub === "いちばん上のダイヤモンド レベルです", "15,200 km: ダイヤモンド, いちばん上", c);
  ok(c.width === "100%" && /linear-gradient/.test(c.image), "its bar full, its colours running along it", c);
  await p.click("#runLevelCard"); await p.waitForTimeout(700);
  ok(await p.evaluate(() => !document.querySelector("#runLevelHero .rl-next") && !document.querySelector("#runLevelList li.ahead")), "nothing ahead: no next gem, none faded");
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
