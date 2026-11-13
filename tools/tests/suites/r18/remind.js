process.env.URL0 = "http://localhost:8768/";
const { chromium } = require("playwright");
const { at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10", T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const base = {
  settings: [{ id: "calMorning", on: true, at: "07:00", updatedAt: 1 }, { id: "jobs", items: [{ id: "j1", name: "コンビニ", wage: 1000 }], updatedAt: 1 }],
  events: [
    { id: "e1", date: today, title: "授業", time: "10:00", endTime: "12:00", createdAt: 1 },
    { id: "e2", date: today, title: "誕生日", createdAt: 2 },
    { id: "e3", date: "2026-11-12", title: "ゼミ", time: "13:00", repeat: "weekly", repeatUntil: "2026-11-26", createdAt: 3 },
  ],
  shifts: [{ id: "s1", date: today, start: "17:00", end: "22:00", jobId: "j1", createdAt: 1 }],
};
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("06:00", today));
  await seed(p, base, "calendar");
  let a = await p.evaluate(() => window.__alarmTimes(Date.now()).filter((x) => x.tag.startsWith("cal-morning")));
  ok(a.length === 4 && a[0].tag === "cal-morning:2026-11-10" && a[0].title === "きょうの予定 3件" && a[0].body === "誕生日、10:00 授業、17:00 コンビニ" && a[0].url === "./#calendar:2026-11-10" && new Date(a[0].at).toISOString() === "2026-11-09T22:00:00.000Z",
    "⑨ the days with plans, at 7:00, the day's in a line: " + a.length + " " + JSON.stringify(a[0]));
  ok(a.slice(1).map((x) => x.tag.slice(-10)).join(" ") === "2026-11-12 2026-11-19 2026-11-26" && a[1].body === "13:00 ゼミ" && a[1].title === "きょうの予定 1件", "⑨ a repeat's days, none on days without", a.slice(1).map((x) => x.tag));
  const sig1 = await p.evaluate(() => window.__pushSig());
  await p.evaluate(({ T }) => { const k = "tsumikasane:events", list = JSON.parse(localStorage.getItem(k)); list.push({ id: "e9", date: "2026-11-11", title: "歯医者", time: "15:00", createdAt: T }); localStorage.setItem(k, JSON.stringify(list)); }, { T: T(today, 6) });
  await p.reload(); await p.waitForTimeout(700);
  a = await p.evaluate(() => window.__alarmTimes(Date.now()).filter((x) => x.tag.startsWith("cal-morning")));
  ok(a.length === 5 && a[1].tag === "cal-morning:2026-11-11" && sig1 !== (await p.evaluate(() => window.__pushSig())), "⑨ a plan added: its morning, sent again");
  // after 7:00, today's is gone
  const q = await phone(b, at("08:00", today));
  await seed(q, base, "calendar");
  a = await q.evaluate(() => window.__alarmTimes(Date.now()).filter((x) => x.tag.startsWith("cal-morning")));
  ok(a[0].tag === "cal-morning:2026-11-12", "⑨ past 7:00: from the next day with plans");
  ok(!p.errs.length && !q.errs.length, "no page errors: " + p.errs.concat(q.errs).join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
