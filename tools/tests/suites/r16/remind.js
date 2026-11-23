// ⑩ 記録し忘れのお知らせ: in つみかさね's 毎日の記録のお知らせ since 2026-11-23 (the user's call; suites/recremind has the
// rest): 食事 picked there, today's says 食事 while the day has none, and goes once one is in; its own (meal-remind) none
process.env.URL0 = "http://localhost:8768/";
const { chromium } = require("playwright");
const { at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10", T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const base = { settings: [{ id: "mealRemind", on: true, at: { 朝食: "", 昼食: "14:00", 夕食: "21:00" }, updatedAt: T("2026-11-01") }, { id: "recRemind", on: true, kinds: ["meal"], times: ["21:00"], updatedAt: T("2026-11-01") }] };
const rec = (p) => p.evaluate(() => window.__alarmTimes(Date.now()).filter((x) => /^(?:tsumi-remind|rec-remind):/.test(x.tag)));
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await seed(p, base, "diet");
  let a = await rec(p);
  ok(a.length === 40 && a[0].tag === "tsumi-remind:2026-11-10" && a[0].body === "きょうは食事の記録がまだです" && a[0].url === "./#meal" && new Date(a[0].at).toISOString() === "2026-11-10T12:00:00.000Z", "⑩ 食事 picked: each day at 21:00, 40 days: " + a.length + " " + JSON.stringify(a.slice(0, 1)));
  ok(!(await p.evaluate(() => window.__alarmTimes(Date.now()).some((x) => x.tag.startsWith("meal-remind")))), "⑩ its own (meal-remind): none, though its setting is on");
  const sig1 = await p.evaluate(() => window.__pushSig());
  await p.evaluate(({ T, today }) => { const k = "tsumikasane:meals"; localStorage.setItem(k, JSON.stringify([{ id: "b", date: today, slot: "昼食", text: "うどん", kcal: 320, createdAt: T }])); }, { T: T(today, 12), today });
  await p.reload(); await p.waitForTimeout(700);
  a = await rec(p);
  const sig2 = await p.evaluate(() => window.__pushSig());
  ok(a.length === 39 && a[0].tag === "tsumi-remind:2026-11-11" && sig1 !== sig2, "⑩ a 食事 in: today's gone, sent again: " + a[0].tag);
  ok(!p.errs.length, "no page errors: " + p.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
