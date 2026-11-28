// 家計簿's 明細, the × at a row's end (the user's call, 2026-11-28: it showed 「削除する」 when pressed; taken out). No × on
// any 明細 row: newest first, in order of amount, one 費目 pressed, words looked for. Each row's 費目, words and amount as
// before, the amount at the row's end. A record still deleted from its own sheet (この記録を削除, twice), the others kept;
// 運動's × kept (not this); no errors
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const T0 = Date.parse("2026-11-01T09:00:00+09:00");
const X = (id, date, category, amount, memo, kind = "out") => ({ id, date, kind, category, amount, ...(memo ? { memo } : {}), createdAt: T0 });
// the user's own 明細 (their message): 11/26 交通費 169 ×2 and 交際費 プレゼント 10,835; 11/25 交通費 679 ×2 and 食費
const DATA = {
  expenses: [X("a1", "2026-11-26", "交通費", 169), X("a2", "2026-11-26", "交通費", 169), X("a3", "2026-11-26", "交際費", 10835, "プレゼント"),
    X("b1", "2026-11-25", "交通費", 679), X("b2", "2026-11-25", "交通費", 679), X("b3", "2026-11-25", "食費", 140, "パン"), X("c1", "2026-11-20", "給与", 30000, "バイト代", "in")],
  workouts: [{ id: "w1", date: "2026-11-28", type: "エアロバイク", minutes: 30, createdAt: T0 }],
};
const rows = (p) => p.evaluate(() => [...document.querySelectorAll("#exList > li[data-ex]")].map((li) => {
  const a = li.querySelector(".amount"), r = li.getBoundingClientRect(), ar = a ? a.getBoundingClientRect() : null;
  return { id: li.dataset.ex, del: li.querySelectorAll(".del, button[aria-label*='削除']").length, chip: li.querySelector(".chip")?.textContent, words: li.querySelector(".row-link")?.textContent,
    amount: a?.textContent, end: ar ? Math.round(r.right - ar.right) : null };
}));
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-28T20:00:00+09:00"), { deviceScaleFactor: 1 });
  await seed(p, DATA, "money"); await p.waitForTimeout(900);
  let r = await rows(p);
  ok(r.length === 7 && r.every((x) => x.del === 0), "newest first: no × on any 明細 row", r.map((x) => [x.id, x.del]));
  const a3 = r.find((x) => x.id === "a3"), c1 = r.find((x) => x.id === "c1");
  ok(!!a3 && a3.chip === "交際費" && a3.words === "プレゼント" && a3.amount === "10,835 円" && !!c1 && c1.amount === "+30,000 円", "each row's 費目, words and amount as before", [a3, c1]);
  ok(r.every((x) => x.end !== null && x.end <= 20), "the amount at the row's end", r.map((x) => [x.id, x.end]));
  // in order of amount, one 費目 pressed, words looked for: none either
  await p.selectOption("#mo3Sort", "amt"); await p.waitForTimeout(400);
  r = await rows(p);
  ok(r.length === 7 && r[0].id === "c1" && r.every((x) => x.del === 0), "in order of amount: no ×", r.map((x) => [x.id, x.del]));
  await p.selectOption("#mo3Sort", ""); await p.waitForTimeout(300);
  await p.locator('#catList .cat-row:has-text("交通費")').click(); await p.waitForTimeout(400);
  r = await rows(p);
  ok(r.length === 4 && r.every((x) => x.del === 0), "交通費 pressed: its 4 and no ×", r.map((x) => [x.id, x.del]));
  await p.locator('#catList .cat-row:has-text("交通費")').click(); await p.waitForTimeout(300);
  await p.fill("#exFind", "プレゼント"); await p.waitForTimeout(400);
  r = await rows(p);
  ok(r.length === 1 && r[0].id === "a3" && r[0].del === 0, "words looked for: the one, no ×", r);
  await p.fill("#exFind", ""); await p.waitForTimeout(400);
  // still deleted from its own sheet: パン's words pressed, この記録を削除 twice; the others kept
  await p.locator('#exList li[data-ex="b3"] .row-link').click(); await p.waitForTimeout(500);
  const del = await p.evaluate(() => { const d = document.getElementById("recDelete"); return d && !d.closest("[hidden]") ? d.textContent : null; });
  ok(del === "この記録を削除", "パン's sheet: この記録を削除 there", del);
  await p.click("#recDelete"); await p.waitForTimeout(150);
  const armed = await p.textContent("#recDelete");
  await p.click("#recDelete"); await p.waitForTimeout(700);
  const kept = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "expenses") || "[]").map((e) => e.id).sort().join(), P);
  r = await rows(p);
  ok(armed === "もう一度押すと削除します" && kept === "a1,a2,a3,b1,b2,c1" && !r.some((x) => x.id === "b3") && r.length === 6, "この記録を削除 twice: パン deleted, the others kept", [armed, kept, r.length]);
  // 運動's × kept (not this)
  await p.evaluate((P) => localStorage.setItem(P + "dietPart", "workout"), P);
  await p.goto(p.url().replace(/#.*$/, "") + "#diet"); await p.reload(); await p.waitForTimeout(900);
  const woDel = await p.locator("#workoutList > li .del").count();
  ok(woDel === 1, "運動's rows: their × kept", woDel);
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
