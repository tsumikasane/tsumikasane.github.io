// 目標: a cell filled with × takes no writing (a tap, keys, Enter's jump); held, its menu; ×をはずす, then written
process.env.URL0 = process.env.URL0 || "http://localhost:8765/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const chart = async (p) => (await ls(p, "goals"))[0].mandala;
const menu = (p) => p.evaluate(() => (document.getElementById("mMenu").hidden ? [] : [...document.querySelectorAll("#mMenu button")].map((x) => x.textContent)));
const G1 = { id: "g1", title: "TOEIC 800点", criterion: "TOEIC 800点", deadline: "2027-01-31", depth: 2, done: false, createdAt: T("2026-10-01"),
  mandala: [{ t: "単語", c: [{ t: "単語帳1周", d: true, at: T("2026-11-08", 21) }, null, null, null, null, null, null, null] },
    { t: "文法" }, { t: "模試" }, { t: "リスニング" }, { t: "長文" }, { t: "語彙アプリ" }, { t: "", x: true }, { t: "", x: true }] };
const hold = (p, sel, ms = 700) => p.evaluate(async ({ sel, ms }) => {
  const t = document.querySelector(sel), r = t.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const o = { pointerType: "touch", isPrimary: true, pointerId: 3, clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true };
  t.dispatchEvent(new PointerEvent("pointerdown", o)); await new Promise((f) => setTimeout(f, ms)); t.dispatchEvent(new PointerEvent("pointerup", o));
  t.dispatchEvent(new MouseEvent("click", { clientX: x, clientY: y, bubbles: true, cancelable: true, detail: 1 }));
}, { sel, ms });
const focusedK = (p) => p.evaluate(() => (document.activeElement?.tagName === "TEXTAREA" ? document.activeElement.dataset.k : null));
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-11T12:00:00+09:00"), { deviceScaleFactor: 1 });
  await seed(p, { goals: [G1] }, "goal"); await p.waitForTimeout(800);
  await p.locator(".goal-open", { hasText: "TOEIC" }).first().click(); await p.waitForTimeout(800);
  // a tap on one filled with ×: nothing
  await p.locator('.m-cell[data-k="6"]').click(); await p.waitForTimeout(300);
  ok((await focusedK(p)) !== "6" && (await menu(p)).length === 0, "a tap on a × cell: no writing, no menu", await focusedK(p));
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.m-cell[data-k="6"]'), "::before").content !== "none" && getComputedStyle(document.querySelector('.m-cell[data-k="6"]')).cursor === "default"), "its × stays, no I-beam");
  // keys on its field (got to by a keyboard): nothing goes in
  await p.evaluate(() => document.querySelector('textarea[data-k="6"]').focus()); await p.keyboard.type("abc"); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('textarea[data-k="6"]').blur()); await p.waitForTimeout(400);
  ok(JSON.stringify((await chart(p))[6]) === '{"t":"","x":true}' && (await p.inputValue('textarea[data-k="6"]')) === "", "keys on it: nothing written");
  // Enter in a written cell: not to a × one (none other empty: the writing ends)
  await p.locator('.m-cell[data-k="5"]').click(); await p.waitForTimeout(300);
  ok((await focusedK(p)) === "5", "a written cell still takes writing");
  await p.keyboard.press("End"); await p.keyboard.press("Enter"); await p.waitForTimeout(300);
  ok(!["6", "7"].includes(await focusedK(p)), "Enter: not on to a × cell", await focusedK(p));
  // its menu from the keyboard (the key for it) while its field has the focus
  await p.evaluate(() => { const t = document.querySelector('textarea[data-k="7"]'); t.focus(); t.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })); }); await p.waitForTimeout(300);
  ok((await menu(p))[0] === "×をはずす", "its menu called up from its field", await menu(p));
  await p.click("#sheetTitle"); await p.waitForTimeout(300);
  // held: its menu; ×をはずす, then it is written in as any
  await hold(p, '.m-cell[data-k="6"]'); await p.waitForTimeout(300);
  ok((await menu(p)).join("|") === "×をはずす|×をぜんぶはずす（2マス）|ほかのマスと入れ替える", "held: its menu", await menu(p));
  await p.locator("#mMenu button", { hasText: "×をはずす" }).first().click(); await p.waitForTimeout(400);
  ok((await chart(p))[6] === null && !(await p.evaluate(() => document.querySelector('textarea[data-k="6"]').readOnly)), "×をはずす: empty, writable again");
  await p.locator('.m-cell[data-k="6"]').click(); await p.waitForTimeout(300);
  await p.keyboard.type("過去問"); await p.click("#sheetTitle"); await p.waitForTimeout(500);
  ok(JSON.stringify((await chart(p))[6]) === '{"t":"過去問"}', "then written in", (await chart(p))[6]);
  // 入れ替え with a × cell still moves it
  await hold(p, '.m-cell[data-k="1"]'); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "ほかのマスと入れ替える" }).click(); await p.waitForTimeout(300);
  await p.locator('.m-cell[data-k="7"]').click(); await p.waitForTimeout(500);
  const c = await chart(p);
  ok(c[7]?.t === "文法" && c[1]?.x === true && !c[1]?.t, "入れ替え with a × cell: they change places", [c[1], c[7]]);
  // 全体: an element filled with × pressed: its eight, nothing being written
  await p.click('button[data-view="whole"]'); await p.waitForTimeout(500);
  await p.locator(".m-block.crossed").first().click(); await p.waitForTimeout(500);
  ok(!(await p.evaluate(() => document.getElementById("mGrid").classList.contains("whole"))) && (await focusedK(p)) === null, "全体: a × element pressed opens the eight, no writing");
  ok(!p.errs.length, "no error", p.errs);
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  await b.close();
})();
