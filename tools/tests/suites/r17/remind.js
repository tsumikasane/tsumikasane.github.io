// ⑥ 測り忘れのお知らせ: in つみかさね's 毎日の記録のお知らせ since 2026-11-23 (the user's call; suites/recremind has the
// rest): からだ picked there, today's says からだ while the day has no weight, and goes once it has one; off, none; its own
// (weight-remind) none; ./#weight opens からだ
process.env.URL0 = "http://localhost:8768/";
const { chromium } = require("playwright");
const { at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10", T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const base = { settings: [{ id: "recRemind", on: true, kinds: ["weight"], times: ["07:30"], updatedAt: T("2026-11-01") }, { id: "weightRemind", on: true, at: "07:30", updatedAt: T("2026-11-01") }], weights: [{ id: "2026-11-09", date: "2026-11-09", kg: 60, createdAt: T("2026-11-09") }] };
const rec = (p) => p.evaluate(() => window.__alarmTimes(Date.now()).filter((x) => /^(?:tsumi-remind|rec-remind):/.test(x.tag)));
(async () => {
  const b = await chromium.launch();
  let p = await phone(b, at("06:00", today));
  await seed(p, base, "diet");
  let a = await rec(p);
  ok(a.length === 40 && a[0].tag === "tsumi-remind:2026-11-10" && a[0].title === "記録のお知らせ" && a[0].body === "きょうはからだの記録がまだです" && a[0].url === "./#weight" && new Date(a[0].at).toISOString() === "2026-11-09T22:30:00.000Z", "⑥ からだ picked: each day at 07:30, 40 days ahead: " + a.length + " " + JSON.stringify(a[0]));
  ok(!(await p.evaluate(() => window.__alarmTimes(Date.now()).some((x) => x.tag.startsWith("weight-remind")))), "⑥ its own (weight-remind): none, though its setting is on");
  const sig1 = await p.evaluate(() => window.__pushSig());
  await p.evaluate(({ T, today }) => { const k = "tsumikasane:weights", list = JSON.parse(localStorage.getItem(k)); list.push({ id: today, date: today, kg: 59.8, createdAt: T }); localStorage.setItem(k, JSON.stringify(list)); }, { T: T(today, 6), today });
  await p.reload(); await p.waitForTimeout(700);
  a = await rec(p);
  const sig2 = await p.evaluate(() => window.__pushSig());
  ok(a.length === 39 && a[0].tag === "tsumi-remind:2026-11-11" && sig1 !== sig2, "⑥ weighed today: today's gone, sent again: " + a[0].tag);
  // off: none
  await p.evaluate(() => { const k = "tsumikasane:settings", list = JSON.parse(localStorage.getItem(k)); list[0].on = false; localStorage.setItem(k, JSON.stringify(list)); });
  await p.reload(); await p.waitForTimeout(700);
  ok((await rec(p)).length === 0, "⑥ off: none");
  ok(!p.errs.length, "no page errors: " + p.errs.join(" | "));
  await b.close();
  // the notification's link, the app opened by it
  const b2 = await chromium.launch();
  const q = await phone(b2, at("08:00", today));
  await q.goto("http://localhost:8765/#weight"); await q.waitForTimeout(900);
  ok(await q.evaluate(() => !document.querySelector("#part-weight").hidden && document.querySelector('[data-part="weight"]')?.getAttribute("aria-pressed") === "true"), "⑥ ./#weight opens からだ");
  await b2.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
