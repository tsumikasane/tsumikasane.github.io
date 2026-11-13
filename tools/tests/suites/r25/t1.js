// 目標: a cell held down opens its menu (×で閉じる among it), its check and › too; nothing in the chart picked by holding
process.env.URL0 = process.env.URL0 || "http://localhost:8765/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10";
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const G1 = { id: "g1", title: "TOEIC 800点", criterion: "TOEIC 800点", deadline: "2027-01-31", depth: 2, done: false, createdAt: T("2026-10-01"),
  mandala: [{ t: "単語", c: [{ t: "単語帳1周", d: true, at: T("2026-11-08", 21) }, { t: "単語帳2周" }, null, null, null, null, null, null] },
    { t: "文法", d: true, at: T("2026-11-01", 20) }, { t: "模試", m: "公式問題集" }, { t: "リスニング" }, null, null, null, null] };
const menu = (p) => p.evaluate(() => (document.getElementById("mMenu").hidden ? [] : [...document.querySelectorAll("#mMenu button")].map((x) => x.textContent)));
// a finger held on an element for ms, then lifted (and the click a phone may send after it)
const hold = (p, sel, ms = 700, click = true) => p.evaluate(async ({ sel, ms, click }) => {
  const t = document.querySelector(sel), r = t.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const o = { pointerType: "touch", isPrimary: true, pointerId: 3, clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true };
  t.dispatchEvent(new PointerEvent("pointerdown", o));
  await new Promise((f) => setTimeout(f, ms));
  t.dispatchEvent(new PointerEvent("pointerup", o));
  if (click) t.dispatchEvent(new MouseEvent("click", { clientX: x, clientY: y, bubbles: true, cancelable: true, detail: 1 }));
}, { sel, ms, click });
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("20:00", today), { deviceScaleFactor: 1 });
  await seed(p, { goals: [G1] }, "goal"); await p.waitForTimeout(800);
  await p.locator(".goal-open", { hasText: "TOEIC" }).first().click(); await p.waitForTimeout(700);
  // nothing in the chart to be picked by holding it
  const sel = await p.evaluate(() => ["#mGrid", '.m-cell[data-k="1"]', '.m-cell[data-k="1"] .m-write', '.m-cell[data-k="1"] .m-top', '.m-cell[data-k="1"] textarea', '.m-cell[data-k="1"] [data-role="check"]', ".m-center .m-title"]
    .map((s) => { const n = document.querySelector(s); return n ? getComputedStyle(n).userSelect : "missing"; }));
  ok(sel.every((v) => v === "none"), "nothing in the chart can be picked by holding", sel);
  // a cell held (文法, which could still be split): its menu, ×で閉じる in it; the lift opens nothing more
  await hold(p, '.m-cell[data-k="1"]'); await p.waitForTimeout(200);
  let m = await menu(p);
  ok(m.includes("×で閉じる（この先は分けない）") && m.includes("メモを書く") && m.includes("ほかのマスと入れ替える"), "a cell held: its menu, ×で閉じる in it", m);
  ok(!(await p.evaluate(() => document.querySelector('.m-cell[data-k="1"]').contains(document.activeElement))), "the lift doesn't start writing in it");
  await p.locator("#mMenu button", { hasText: "×で閉じる" }).click(); await p.waitForTimeout(400);
  ok((await ls(p, "goals"))[0].mandala[1].x === true, "×で閉じる: closed");
  // its check (□) held: the same menu, the check left as it was
  const before = (await ls(p, "goals"))[0].mandala[1].d;
  const tools = await p.evaluate(() => [...document.querySelectorAll('.m-cell[data-k="1"] .m-tools button')].map((x) => x.dataset.role || x.getAttribute("aria-label")));
  await hold(p, '.m-cell[data-k="1"] [data-role="check"]'); await p.waitForTimeout(200);
  m = await menu(p);
  ok(m.includes("×をはずす（また分けられるように）") && (await ls(p, "goals"))[0].mandala[1].d === before, "its check held: the menu, the check as it was", { m, tools });
  await p.click("#sheetTitle"); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector("#mMenu").hidden || document.body.click()); await p.waitForTimeout(200);
  // a quick press on the check still checks it
  await p.locator('.m-cell[data-k="1"] [data-role="check"]').click(); await p.waitForTimeout(400);
  ok((await ls(p, "goals"))[0].mandala[1].d !== before, "a quick press on the check: checked or unchecked as before");
  // 単語 (written inside, so no ×), held by its ›
  const arrow = await p.evaluate(() => { const b = [...document.querySelectorAll('.m-cell[data-k="0"] .m-tools button')].find((x) => x.dataset.role !== "check"); if (b) b.setAttribute("data-t", "arrow"); return !!b; });
  if (arrow) {
    const path0 = await p.evaluate(() => document.getElementById("mTrail").textContent);
    await hold(p, '.m-cell[data-k="0"] [data-t="arrow"]'); await p.waitForTimeout(300);
    m = await menu(p);
    ok(m.includes("ほかのマスと入れ替える") && !m.some((w) => w.startsWith("×")) && (await p.evaluate(() => document.getElementById("mTrail").textContent)) === path0, "its › held: the menu (no × with words inside), not opened", m);
    await p.click("#sheetTitle"); await p.waitForTimeout(300);
  }
  // a right click: the menu at once
  await p.locator('.m-cell[data-k="2"]').dispatchEvent("contextmenu"); await p.waitForTimeout(300);
  m = await menu(p);
  ok(m.includes("メモを見る・書く"), "a right click: its menu", m);
  await p.click("#sheetTitle"); await p.waitForTimeout(300);
  // a short press still writes in it; its words can be picked while written in
  await p.evaluate(() => { if (!document.getElementById("mMenu").hidden) document.body.click(); });
  await p.locator('.m-cell[data-k="3"]').click(); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.activeElement?.tagName === "TEXTAREA" && getComputedStyle(document.activeElement).userSelect === "text"), "a tap writes in it, its words can be picked then");
  ok(!p.errs.length, "no error", p.errs);
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  await b.close();
})();
