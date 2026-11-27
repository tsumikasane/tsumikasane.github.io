// この1年 as twelve small months (the user's call, 2026-11-27: as 日記's, for ToDo's 完了のふりかえり, ルーティーン and 目標
// too). ToDo's: 12月 of last year to this month, a square a day, a day a ToDo was done deeper with more; before the twelve
// months, neither shown nor counted; today marked; the words and the read-out; nothing to scroll across; no errors.
// (ルーティーン's: routine3; 目標's: goal15)
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const T = (d, h = 20) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const D = (id, d, h) => ({ id, text: "やること " + id, done: true, doneAt: T(d, h), createdAt: T(d, 8), updatedAt: T(d, h) });
// done: 2025-11-30 (before the twelve months), 2026-06-10, 2026-11-20 twice, today 2026-11-27; one やめた on 11/25 (not done)
const todos = [D("a", "2025-11-30"), D("b", "2026-06-10"), D("c", "2026-11-20", 9), D("d", "2026-11-20", 21), D("e", "2026-11-27", 9),
  { id: "x", text: "やめたもの", done: true, cancelled: true, doneAt: T("2026-11-25"), createdAt: T("2026-11-24"), updatedAt: T("2026-11-25") }, { id: "o", text: "まだ", done: false, createdAt: T("2026-11-26") }];
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-27T12:00:00+09:00"), { deviceScaleFactor: 1 });
  await seed(p, { todos }, "todo"); await p.waitForTimeout(800);
  await p.click("#todoMore"); await p.waitForTimeout(250);
  await p.locator("#todoMenuGroup .ask-btn", { hasText: "完了のふりかえり" }).click(); await p.waitForTimeout(700);
  const y = await p.evaluate(() => {
    const g = document.querySelector("#tdRevBody .yr12"), cs = [...g.querySelectorAll(".yr12-c")], body = document.getElementById("tdRevBody");
    const lv = (c) => (c.className.match(/\bl(\d)\b/) || [0, 0])[1];
    return { mons: [...g.querySelectorAll(".yr12-mon-head")].map((x) => x.textContent), n: cs.length, on: cs.filter((c) => /\bl\d\b/.test(c.className)).map((c) => `${c.title}:${lv(c)}`),
      today: cs.filter((c) => c.classList.contains("today")).map((c) => c.title), none: cs.filter((c) => c.classList.contains("none")).length,
      label: g.getAttribute("aria-label"), role: g.getAttribute("role"), sub: g.closest(".card").querySelector(".sub").textContent.replace(/\s+/g, " "),
      wide: body.scrollWidth <= body.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1 };
  });
  ok(y.mons.length === 12 && y.mons[0] === "2025年12月" && y.mons[1] === "1月" && y.mons[11] === "11月", "twelve months: 2025年12月 to 11月", y.mons);
  ok(y.n === 365 && y.none === 3, "a square a day: 365, the 3 days to come blank", [y.n, y.none]);
  ok(JSON.stringify(y.on) === JSON.stringify(["6/10 1 件:1", "11/20 2 件:2", "11/27 1 件:1"]), "the days done, deeper with more (やめた not, 11/30 of last year not shown)", y.on);
  ok(JSON.stringify(y.today) === JSON.stringify(["11/27 1 件"]), "today marked", y.today);
  ok(y.role === "img" && y.label === "この1年でToDoを終えた日 3 日。いまの連続 1 日、いちばん長い連続 1 日" && y.sub === "終えた日 3 日・いまの連続 1 日・いちばん長い 1 日", "the words and the read-out: 3 days (the one before the months not counted)", [y.label, y.sub]);
  ok(y.wide, "nothing to scroll across");
  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
