// カレンダーのバイトの色 (on the hooked copy at 8965): a shift in the calendar in its バイト label's colour, one put in
// with シフトを追加 too; the label 家計簿のバイト is linked by first, then one named バイト・アルバイト, then the job's name
process.env.URL0 = process.env.URL0 || "http://localhost:8965/";
const { chromium } = require("playwright");
const { phone, seed, at, P } = require("./lib");
const { make, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const openDayOf = async (p, md) => { await p.evaluate((md) => [...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith(md)).click(), md); await p.waitForTimeout(700); };
const closeSheet = async (p) => { for (let i = 0; i < 6 && (await p.evaluate(() => document.getElementById("daySheet").open)); i++) { if (await p.evaluate(() => document.getElementById("discardAsk").open)) await p.click("#discardYes"); else await p.keyboard.press("Escape"); await p.waitForTimeout(700); } };
// a day's bars in the month: [text, its --bc]
const bars = (p, md) => p.evaluate((md) => [...[...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith(md)).querySelectorAll(".bar")]
  .map((x) => [x.textContent.trim(), (x.getAttribute("style") || "").replace(/^--bc:\s*/, "").replace(/;\s*$/, "").trim()]), md);
const barOf = async (p, md, word) => ((await bars(p, md)).find(([t]) => t.includes(word)) || [null, null])[1];
const hue = (p, id) => p.evaluate((id) => window.__caljob.hue(id), id);
async function open(data = make()) { const p = await phone(b, at("10:00", today), { deviceScaleFactor: 1 }); await seed(p, data, "calendar"); await p.waitForTimeout(900); return p; }
let b;

(async () => {
  b = await chromium.launch();
  let p = await open();
  ok(!p.errs.length, "the page opens, no error", p.errs);

  // the month: tonight's shift in the バイト label's orange, as tomorrow's バイト plan is (not the job's pink)
  ok(await barOf(p, "11月18日", "カフェ") === "var(--lc-orange)", "the month: the shift in the バイト label's colour", await bars(p, "11月18日"));
  ok(await barOf(p, "11月19日", "バイト") === "var(--lc-orange)", "the month: the バイト plan in the same colour", await bars(p, "11月19日"));
  ok(await barOf(p, "11月18日", "ゼミ") === "var(--lc-blue)", "the month: another label's plan as it was", await bars(p, "11月18日"));

  // the day's list: the shift's row and its time in orange
  await openDayOf(p, "11月18日");
  const row = await p.evaluate(() => { const li = [...document.querySelectorAll("#calDayList li")].find((x) => x.textContent.includes("カフェ")); return li && [li.getAttribute("style"), li.querySelector(".chip.when")?.getAttribute("style")]; });
  ok(row && /--lc:\s*var\(--lc-orange\)/.test(row[0]) && /--chip-c:\s*var\(--lc-orange\)/.test(row[1]), "the day's list: the shift's row in the label's colour", row);

  // シフトを追加 (the day's sheet): the one put in in the same colour, in the list and in the month
  await p.evaluate(() => document.getElementById("dayNext").click()); await p.waitForTimeout(500);
  await p.evaluate(() => document.getElementById("dayNext").click()); await p.waitForTimeout(500);
  ok(await p.isVisible("#dayShiftAdd"), "シフトを追加 there (11/20)");
  await p.locator("#dayShiftAdd").click(); await p.waitForTimeout(400);
  await p.fill("#reStart", "18:00"); await p.fill("#reEnd", "22:00"); await p.locator("#recSave").click(); await p.waitForTimeout(600);
  const added = (await ls(p, "shifts")).find((x) => x.date === "2026-11-20");
  ok(added && added.start === "18:00" && added.jobId === "j1", "シフトを追加: put in", added);
  const row2 = await p.evaluate(() => { const li = [...document.querySelectorAll("#calDayList li")].find((x) => x.textContent.includes("カフェ")); return li && li.getAttribute("style"); });
  ok(/--lc:\s*var\(--lc-orange\)/.test(row2 || ""), "シフトを追加: its row in the バイト label's colour", row2);
  await closeSheet(p);
  ok(await barOf(p, "11月20日", "カフェ") === "var(--lc-orange)", "シフトを追加: its bar in the month too", await bars(p, "11月20日"));

  // the week: its block in orange; ラベルごとの時間: バイト (the shifts) in orange
  await p.click('#calViews [data-view="week"]'); await p.waitForTimeout(700);
  const blk = await p.evaluate(() => document.querySelector('.tg-ev.shift[data-shift="s1"]')?.getAttribute("style") || "");
  ok(/--bc:\s*var\(--lc-orange\)/.test(blk), "the week: the shift's block in the label's colour", blk);
  const hrs = await p.evaluate(() => window.__caljob.hours("2026-11-15", "2026-11-21"));
  ok(hrs.includes("バイト:var(--lc-orange)"), "ラベルごとの時間: the shifts' バイト in the label's colour", hrs);
  ok(!p.errs.length, "no error", p.errs);
  await p.context().close();

  // 家計簿のバイト linked by a label of another name (仕事, purple): that one's colour
  let d = make(); d.settings[0].jobLink = { by: "label", label: "l3", job: "j1" };
  p = await open(d);
  ok(await hue(p, "s1") === "var(--lc-purple)", "linked by 仕事: its colour", await hue(p, "s1"));
  ok(await barOf(p, "11月18日", "カフェ") === "var(--lc-purple)", "linked by 仕事: the month's bar", await bars(p, "11月18日"));
  await p.context().close();

  // no バイト label: the job's own colour, as before; none of its own either: 家計簿's
  d = make(); d.labels[0].name = "部活";
  p = await open(d);
  ok(await hue(p, "s1") === "var(--lc-pink)", "no バイト label: the job's colour", await hue(p, "s1"));
  await p.context().close();
  d = make(); d.labels[0].name = "部活"; delete d.settings[1].items[0].color;
  p = await open(d);
  ok(await hue(p, "s1") === "var(--c-money)", "no label, no job colour: 家計簿's", await hue(p, "s1"));
  await p.context().close();

  // a label named アルバイト（駅前） or as the job (カフェ)
  d = make(); d.labels[0].name = "アルバイト（駅前）";
  p = await open(d);
  ok(await hue(p, "s1") === "var(--lc-orange)", "アルバイト（駅前）: its colour", await hue(p, "s1"));
  await p.context().close();
  d = make(); d.labels[0].name = "部活"; d.labels.push({ id: "l4", name: "カフェ", color: "green", createdAt: 4 });
  p = await open(d);
  ok(await hue(p, "s1") === "var(--lc-green)", "a label named as the job: its colour", await hue(p, "s1"));
  ok(!p.errs.length, "no error", p.errs);

  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
