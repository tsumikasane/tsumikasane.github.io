// 運動's ランレベル as famous distances reached, as milestones (the user's call, 2026-11-27: until now a level by how far
// run, as gems, 水晶〜ダイヤモンド; from now on famous distances, フルマラソン and the like, as its milestones). The same
// count as before (every ランニング's 距離 added up); each milestone a medal (its ribbon, its name and distance on it);
// the card, its page (the medal, the bar to the next, every milestone with the day it was reached, the ones ahead faded),
// a run that reaches one saying so; the medals' shine (kept from the gems), still with 動きを減らす
process.env.URL0 = process.env.URL0 || "http://localhost:8765/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const NAMES = ["スタート", "5km", "10km", "ハーフマラソン", "フルマラソン", "ウルトラマラソン", "箱根駅伝", "東海道五十三次", "四国八十八か所", "おくのほそ道", "日本列島", "万里の長城", "地球一周"];
const DISTS = ["ここから走りはじめ", null, null, "21.0975 km", "42.195 km", "100 km", "217.1 km・往路と復路", "約492 km・日本橋から京都まで", "約1,200 km・お遍路の道のり", "約2,400 km・松尾芭蕉の旅", "約3,000 km・北から南まで", "約21,196 km・長城の全長", "約40,075 km・赤道をひとまわり"];
const KEYS = ["start", "5k", "10k", "half", "full", "ultra", "hakone", "tokaido", "henro", "hosomichi", "japan", "wall", "earth"];
const GEMS = ["水晶", "アメジスト", "トパーズ", "エメラルド", "サファイア", "ルビー", "ダイヤモンド"];
const day = (i) => new Date(Date.UTC(2026, 10, 27) - Math.floor(i / 2) * 864e5).toISOString().slice(0, 10);
const runs = (n, km) => Array.from({ length: n }, (_, i) => ({ id: "w" + i, date: day(i + 2), type: "ランニング", km, minutes: 40, createdAt: Date.parse(`${day(i + 2)}T07:00:00+09:00`) + i }));
async function open(b, workouts, o = {}) {
  const p = await phone(b, new Date("2026-11-27T18:00:00+09:00"), o);
  await seed(p, { workouts }, "diet");
  await p.evaluate((P) => localStorage.setItem(P + "dietPart", "workout"), P); await p.reload(); await p.waitForTimeout(900);
  return p;
}
// the card: its name, what is said under the bar, its medal, the bar's width and colour
const card = (p) => p.evaluate(() => {
  const c = document.getElementById("runLevelCard"), f = c.querySelector(".rl-fill"), cs = f && getComputedStyle(f);
  return { name: c.querySelector(".rl-card-title strong")?.textContent, sub: c.querySelector(".rl-card-sub")?.textContent.replace(/ /g, " "), medal: c.querySelector(".rl-badge")?.dataset.medal,
    size: c.querySelector(".rl-badge svg")?.getAttribute("width"), width: f?.style.width, color: cs?.backgroundColor, image: cs?.backgroundImage };
});
const words = (p) => p.evaluate(() => document.getElementById("sec-diet").innerText + document.getElementById("sec-runlevel").innerText);
(async () => {
  const b = await chromium.launch();
  // no run yet: スタート, 5 km to 5km, its flag (no words on it)
  let p = await open(b, []);
  let c = await card(p);
  ok(c.name === "スタート" && c.sub === "あと 5.00 km で5km" && c.medal === "start" && c.size === "40", "0 km: スタート, あと 5.00 km で5km, its medal", c);
  ok(await p.evaluate(() => { const s = document.querySelector("#runLevelCard .rl-badge svg"); return !s.querySelector("text") && !!s.querySelector("polygon[points^='28,31']") && s.querySelectorAll(".rl-strap").length === 2; }), "スタート's medal: its ribbon, a flag on it");
  ok(!GEMS.some((g) => c.name.includes(g)), "no gem's name");
  await p.close();
  // 30 km: ハーフマラソン, 12.20 km to フルマラソン, the bar 42.2% along in its ribbon's orange
  p = await open(b, runs(5, 6));
  c = await card(p);
  ok(c.name === "ハーフマラソン" && c.sub === "あと 12.20 km でフルマラソン（42.195 km）" && c.medal === "half", "30 km: ハーフマラソン, あと 12.20 km でフルマラソン（42.195 km）", c);
  ok(c.width === "42.2%" && c.color === "rgb(242, 144, 63)", "the bar: 42.2%, in its ribbon's colour", c);
  ok(await p.evaluate(() => [...document.querySelectorAll("#runLevelCard .rl-badge svg text")].map((t) => t.textContent).join("|")) === "ハーフ|21.0975", "its medal: ハーフ, 21.0975 on it");
  // its page: the medal, the next one at the bar's end, every milestone with its distance and the day it was reached, the
  // ones ahead faded
  await p.click("#runLevelCard"); await p.waitForTimeout(700);
  const pg = await p.evaluate(() => {
    const hero = document.getElementById("runLevelHero"), rows = [...document.querySelectorAll("#runLevelList li")];
    return { shown: !document.getElementById("sec-runlevel").hidden, said: hero.querySelector('[role="img"]')?.getAttribute("aria-label"), heroMedal: hero.querySelector('[role="img"] .rl-badge')?.dataset.medal,
      heroSize: hero.querySelector('[role="img"] svg')?.getAttribute("width"), next: hero.querySelector(".rl-next .rl-badge")?.dataset.medal, line: hero.querySelector(".rl-said")?.textContent.replace(/ /g, " "),
      total: hero.querySelector(".rl-total")?.textContent, names: rows.map((r) => r.querySelector(".rl-name")?.firstChild?.textContent),
      dists: rows.map((r) => r.querySelector(".rl-dist")?.textContent.replace(/ /g, " ") ?? null), whens: rows.map((r) => r.querySelector(".rl-when")?.textContent ?? null),
      keys: rows.map((r) => r.querySelector(".rl-badge")?.dataset.medal), now: rows.map((r) => r.getAttribute("aria-current")), here: rows.map((r) => !!r.querySelector(".rl-now")),
      ahead: rows.map((r) => r.classList.contains("ahead") && r.querySelector(".rl-badge").classList.contains("ahead")), straps: rows.map((r) => r.querySelectorAll(".rl-strap").length) };
  });
  ok(pg.shown && pg.said === "いまのランレベルはハーフマラソン（21.0975 km）" && pg.heroMedal === "half" && pg.heroSize === "120", "the page: its ハーフマラソン, large", pg);
  ok(pg.next === "full" && pg.line === "あと 12.20 km でフルマラソン（42.195 km）" && pg.total === "走った距離 30.00 km", "the next, フルマラソン, at the bar's end; what is left said; the distance so far", pg);
  ok(JSON.stringify(pg.names) === JSON.stringify(NAMES), "the milestones: " + pg.names.join("・"), pg.names);
  ok(JSON.stringify(pg.dists) === JSON.stringify(DISTS), "their distances and what they are (5km, 10km: their names say it)", pg.dists);
  ok(JSON.stringify(pg.keys) === JSON.stringify(KEYS) && pg.straps.every((n) => n === 2), "each its own medal, on its ribbon", pg.keys);
  ok(JSON.stringify(pg.whens.slice(0, 4)) === JSON.stringify([null, "11月24日（火）に到達", "11月25日（水）に到達", "11月26日（木）に到達"]) && pg.whens.slice(4).every((w) => w === null), "the days 5km, 10km and ハーフマラソン were reached", pg.whens);
  ok(JSON.stringify(pg.now) === JSON.stringify([null, null, null, "true", ...Array(9).fill(null)]) && pg.here.filter(Boolean).length === 1 && pg.here[3], "ハーフマラソン: いまのレベル", pg.now);
  ok(JSON.stringify(pg.ahead) === JSON.stringify([...Array(4).fill(false), ...Array(9).fill(true)]), "the nine ahead faded", pg.ahead);
  ok(!GEMS.some((g) => pg.names.join("").includes(g)) && !(await p.$("#sec-runlevel .rl-fire, #sec-runlevel .rl-flash, #sec-runlevel .rl-edge")), "no gems left");
  // the shine: in the medals reached a light, a band of light sweeping, glints twinkling; none on the ones ahead nor on the
  // next one's small one. The large one before light rays and a glow, sparkles about it, coming in as the page opens,
  // turned by the pointer (the light following), a press giving a burst of sparkles
  const sh = await p.evaluate(() => {
    const lit = (b) => !!b && b.classList.contains("lit") && !!b.querySelector(".rl-shine[clip-path]") && !!b.querySelector(".rl-sweep") && b.querySelectorAll(".rl-glint").length >= 2;
    const st = document.querySelector("#runLevelHero .rl-stage"), rows = [...document.querySelectorAll("#runLevelList li .rl-badge")];
    return { card: lit(document.querySelector("#runLevelCard .rl-badge")), hero: lit(st?.querySelector(".rl-badge")), spec: !!st?.querySelector(".rl-spec"),
      stage: !!st && st.getAttribute("role") === "img" && !!st.querySelector(".rl-rays") && !!st.querySelector(".rl-glow") && st.querySelectorAll(".rl-spark").length === 7, coming: !!st?.classList.contains("rl-in"),
      next: !!document.querySelector("#runLevelHero .rl-next .rl-badge.lit, #runLevelHero .rl-next .rl-shine"),
      rows: rows.map((x) => x.classList.contains("lit") && !!x.querySelector(".rl-shine")), sweep: getComputedStyle(document.querySelector("#runLevelHero .rl-sweep")).animationName,
      glow: getComputedStyle(document.querySelector("#runLevelHero .rl-glow")).animationName };
  });
  ok(sh.card && sh.hero && sh.spec && sh.stage && sh.coming && !sh.next, "the shine: on the card's medal and the page's, the stage about it", sh);
  ok(JSON.stringify(sh.rows) === JSON.stringify([...Array(4).fill(true), ...Array(9).fill(false)]), "in the list: the four reached lit, the nine ahead not", sh.rows);
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
  // 40 km, and a run of 5 km put in: up to フルマラソン, said so; the runs as they were
  p = await open(b, runs(5, 8));
  ok((await card(p)).name === "ハーフマラソン", "40 km: ハーフマラソン still");
  await p.selectOption("#woType", "ランニング"); await p.waitForTimeout(200);
  await p.fill("#woDist", "5"); await p.fill("#woMin", "30");
  await p.locator("#workoutForm button[type=submit]").click(); await p.waitForTimeout(500);
  const said = await p.evaluate(() => document.querySelector("#status").textContent);
  c = await card(p);
  ok(said.includes("走った距離がフルマラソン（42.195 km）に届きました"), "a run past 42.195 km: 走った距離がフルマラソン（42.195 km）に届きました", said);
  ok(c.name === "フルマラソン" && c.medal === "full" && c.sub === "あと 55.00 km でウルトラマラソン（100 km）" && c.color === "rgb(226, 75, 75)", "and the card: フルマラソン, its medal, its red", c);
  const ws = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "workouts")), P);
  ok(ws.length === 6 && ws.filter((w) => w.km === 8).length === 5 && ws.some((w) => w.km === 5), "the runs: as they were, and the new one", ws.length);
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  // 41,000 km: 地球一周, the last, the bar full in its blue and green
  p = await open(b, runs(82, 500));
  c = await card(p);
  ok(c.name === "地球一周" && c.medal === "earth" && c.sub === "いちばん先の地球一周に届いています", "41,000 km: 地球一周, いちばん先", c);
  ok(c.width === "100%" && /linear-gradient/.test(c.image), "its bar full, its colours along it", c);
  await p.click("#runLevelCard"); await p.waitForTimeout(700);
  ok(await p.evaluate(() => !document.querySelector("#runLevelHero .rl-next") && !document.querySelector("#runLevelList li.ahead")), "nothing ahead: no next medal, none faded");
  ok(await p.evaluate(() => document.querySelectorAll("#runLevelList .rl-badge.lit .rl-shine").length === 13 && document.querySelector("#runLevelHero .rl-stage").dataset.medal === "earth"
    && document.querySelectorAll("#runLevelList .rl-when").length === 12), "all thirteen lit, each reached on its day; 地球's own rays");
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  // 動きを減らす: the shine still, as the medals were drawn; no burst
  p = await open(b, runs(5, 6), { reducedMotion: "reduce" });
  await p.click("#runLevelCard"); await p.waitForTimeout(700);
  const still = await p.evaluate(() => ["#runLevelCard .rl-sweep", "#runLevelHero .rl-sweep", "#runLevelHero .rl-glint", "#runLevelHero .rl-rays", "#runLevelHero .rl-spark", "#runLevelHero .rl-medal"]
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
