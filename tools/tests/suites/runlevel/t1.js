// 運動's ランレベル as gems by their rank (the user's call, 2026-11-24: the levels by 宝石のグレード, not colours; 案A 宝石の格):
// 水晶・アメジスト・トパーズ・エメラルド・サファイア・ルビー・ダイヤモンド, from the same km as before, each its own cut; the card,
// its page (the gem, the bar in its colour, every level, the ones ahead faded), a run that takes it up saying so; the
// gems' shine (the user's call, 2026-11-25: 輝き and light on them), still with 動きを減らす
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
  // the shine: in the gems reached a light, facets flashing, a band of light sweeping, glints twinkling; none on the ones
  // ahead nor on the next one's small badge. The large one before light rays and a glow, sparkles about it, coming in as
  // the page opens, turned by the pointer (the light following), a press giving a burst of sparkles
  const sh = await p.evaluate(() => {
    const lit = (b) => !!b && b.classList.contains("lit") && !!b.querySelector(".rl-shine[clip-path]") && !!b.querySelector(".rl-sweep") && b.querySelectorAll(".rl-flash").length >= 2 && b.querySelectorAll(".rl-glint").length >= 2;
    const st = document.querySelector("#runLevelHero .rl-stage"), rows = [...document.querySelectorAll("#runLevelList li .rl-badge")];
    return { card: lit(document.querySelector("#runLevelCard .rl-badge")), hero: lit(st?.querySelector(".rl-badge")), spec: !!st?.querySelector(".rl-spec"),
      stage: !!st && st.getAttribute("role") === "img" && !!st.querySelector(".rl-rays") && !!st.querySelector(".rl-glow") && st.querySelectorAll(".rl-spark").length === 7, coming: !!st?.classList.contains("rl-in"),
      next: !!document.querySelector("#runLevelHero .rl-next .rl-badge.lit, #runLevelHero .rl-next .rl-shine"),
      rows: rows.map((x) => x.classList.contains("lit") && !!x.querySelector(".rl-shine")), sweep: getComputedStyle(document.querySelector("#runLevelHero .rl-sweep")).animationName,
      glow: getComputedStyle(document.querySelector("#runLevelHero .rl-glow")).animationName };
  });
  ok(sh.card && sh.hero && sh.spec && sh.stage && sh.coming && !sh.next, "the shine: on the card's gem and the page's, the stage about it", sh);
  ok(JSON.stringify(sh.rows) === JSON.stringify([true, true, true, false, false, false, false]), "in the list: the three reached lit, the four ahead not", sh.rows);
  ok(sh.sweep === "rl-sweep" && /rl-glow-in/.test(sh.glow), "moving: the sweep, the glow coming in", sh);
  const stage = await p.$("#runLevelHero .rl-stage"), box = await stage.boundingBox();
  await p.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.5); await p.waitForTimeout(200);
  const turned = await p.evaluate(() => { const st = document.querySelector("#runLevelHero .rl-stage"); return [st.classList.contains("rl-held"), parseFloat(st.style.getPropertyValue("--ry")), parseFloat(st.style.getPropertyValue("--lx"))]; });
  ok(turned[0] && turned[1] > 5 && turned[2] > 5, "turned by the pointer, the light following", turned);
  await p.mouse.move(2, 2); await p.waitForTimeout(200);
  ok(await p.evaluate(() => { const st = document.querySelector("#runLevelHero .rl-stage"); return !st.classList.contains("rl-held") && !st.style.getPropertyValue("--ry"); }), "let go: back to its sway");
  await stage.click(); await p.waitForTimeout(250);
  const burst = await p.evaluate(() => [document.querySelectorAll("#runLevelHero .rl-burst").length, document.querySelector("#runLevelHero .rl-stage").classList.contains("rl-pop")]);
  ok(burst.join() === "12,true", "a press: a burst of 12 sparkles", burst);
  await p.waitForTimeout(1300);
  ok(await p.evaluate(() => !document.querySelector("#runLevelHero .rl-burst") && !document.querySelector("#runLevelHero .rl-stage.rl-pop")), "and they are gone");
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
  ok(await p.evaluate(() => document.querySelectorAll("#runLevelList .rl-badge.lit .rl-shine").length === 7 && document.querySelector("#runLevelHero .rl-stage").dataset.gem === "brilliant"
    && document.querySelectorAll("#runLevelHero .rl-fire").length === 3), "all seven lit; ダイヤモンド's own rays, its fire");
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  // 動きを減らす: the shine still, as the gems were drawn; no burst
  p = await phone(b, new Date("2026-11-24T18:00:00+09:00"), { reducedMotion: "reduce" });
  await seed(p, { workouts: runs(40, 8) }, "diet");
  await p.evaluate((P) => localStorage.setItem(P + "dietPart", "workout"), P); await p.reload(); await p.waitForTimeout(900);
  await p.click("#runLevelCard"); await p.waitForTimeout(700);
  const still = await p.evaluate(() => ["#runLevelCard .rl-sweep", "#runLevelHero .rl-sweep", "#runLevelHero .rl-flash", "#runLevelHero .rl-glint", "#runLevelHero .rl-rays", "#runLevelHero .rl-spark", "#runLevelHero .rl-gem"]
    .map((q) => getComputedStyle(document.querySelector(q)).animationName));
  ok(still.every((n) => n === "none"), "動きを減らす: nothing moving", still);
  await p.click("#runLevelHero .rl-stage"); await p.waitForTimeout(200);
  ok(!(await p.$("#runLevelHero .rl-burst")), "動きを減らす: no burst");
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
