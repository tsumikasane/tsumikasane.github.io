// 目標: the empty cells filled with × (the button under the eight, an empty cell held), taken off, written over
process.env.URL0 = process.env.URL0 || "http://localhost:8765/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const chart = async (p) => (await ls(p, "goals"))[0].mandala;
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
const menu = (p) => p.evaluate(() => (document.getElementById("mMenu").hidden ? [] : [...document.querySelectorAll("#mMenu button")].map((x) => x.textContent)));
const G1 = { id: "g1", title: "TOEIC 800点", criterion: "TOEIC 800点", deadline: "2027-01-31", depth: 2, done: false, createdAt: T("2026-10-01"),
  mandala: [{ t: "単語", c: [{ t: "単語帳1周", d: true, at: T("2026-11-08", 21) }, { t: "単語帳2周" }, { t: "毎日30語" }, null, null, null, null, null] },
    { t: "文法", d: true, at: T("2026-11-01", 20) }, { t: "模試" }, { t: "リスニング" }, { t: "長文" }, { t: "語彙アプリ" }, null, null] };
const hold = (p, sel, ms = 700) => p.evaluate(async ({ sel, ms }) => {
  const t = document.querySelector(sel), r = t.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const o = { pointerType: "touch", isPrimary: true, pointerId: 3, clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true };
  t.dispatchEvent(new PointerEvent("pointerdown", o)); await new Promise((f) => setTimeout(f, ms)); t.dispatchEvent(new PointerEvent("pointerup", o));
  t.dispatchEvent(new MouseEvent("click", { clientX: x, clientY: y, bubbles: true, cancelable: true, detail: 1 }));
}, { sel, ms });
const undo = async (p) => { await p.locator(".toast.show button", { hasText: "元に戻す" }).first().click(); await p.waitForTimeout(500); };
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-11T12:00:00+09:00"), { deviceScaleFactor: 1 });
  await seed(p, { goals: [G1] }, "goal"); await p.waitForTimeout(800);
  await p.locator(".goal-open", { hasText: "TOEIC" }).first().click(); await p.waitForTimeout(800);
  const pct0 = await txt(p, "#mProgress");
  // the button under the eight
  ok(await p.isVisible("#mCrossAll") && (await txt(p, "#mCrossAll")) === "空いている 2 マスを×で埋める", "the button: 空いている 2 マスを×で埋める", await txt(p, "#mCrossAll"));
  await p.click("#mCrossAll"); await p.waitForTimeout(500);
  let m = await chart(p);
  ok(JSON.stringify(m[6]) === '{"t":"","x":true}' && JSON.stringify(m[7]) === '{"t":"","x":true}' && (await toast(p)).includes("空いていた 2 マスを×で埋めました"), "both filled with ×, said", [m[6], m[7]]);
  ok(await p.evaluate(() => document.querySelector('.m-cell[data-k="6"]').classList.contains("crossed") && document.querySelector('.m-cell[data-k="7"]').classList.contains("crossed")), "drawn crossed");
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.m-cell[data-k="6"]'), "::before").content !== "none" && getComputedStyle(document.querySelector('.m-cell[data-k="6"] .m-plus')).display === "none"), "a large × in place of the ＋");
  ok(await p.isHidden("#mCrossRow"), "no empty one left: the button goes");
  ok((await txt(p, "#mProgress")) === pct0, "the progress as it was");
  await undo(p);
  m = await chart(p);
  ok(m[6] === null && m[7] === null && !(await p.evaluate(() => document.querySelector('.m-cell[data-k="6"]').classList.contains("crossed"))), "元に戻す: empty again");
  // one held: its menu
  await hold(p, '.m-cell[data-k="6"]'); await p.waitForTimeout(200);
  let w = await menu(p);
  ok(w.join("|") === "×で埋める（このマスは使わない）|空いているマスをぜんぶ×で埋める（2マス）|ほかのマスと入れ替える", "an empty cell held: ×で埋める, all, 入れ替え", w);
  await p.locator("#mMenu button", { hasText: "×で埋める（このマスは使わない）" }).click(); await p.waitForTimeout(400);
  m = await chart(p);
  ok(m[6]?.x === true && m[7] === null, "that one alone");
  await hold(p, '.m-cell[data-k="6"]'); await p.waitForTimeout(200);
  w = await menu(p);
  ok(w.join("|") === "×をはずす|ほかのマスと入れ替える", "a crossed one held: ×をはずす, 入れ替え", w);
  await p.locator("#mMenu button", { hasText: "×をはずす" }).click(); await p.waitForTimeout(400);
  ok((await chart(p))[6] === null, "×をはずす: empty again");
  // a crossed one tapped and left: still crossed; written in: a cell as any other
  await p.click("#mCrossAll"); await p.waitForTimeout(400);
  await p.locator('.m-cell[data-k="6"]').click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.activeElement?.dataset?.k !== "6" && getComputedStyle(document.querySelector('.m-cell[data-k="6"]'), "::before").content !== "none"), "tapped: no writing (the user's call), the × stays");
  await p.click("#mHint"); await p.waitForTimeout(400);
  ok((await chart(p))[6]?.x === true, "left empty: still crossed");
  await hold(p, '.m-cell[data-k="7"]'); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "×をはずす" }).first().click(); await p.waitForTimeout(400);
  await p.locator('.m-cell[data-k="7"]').click(); await p.waitForTimeout(300);
  await p.keyboard.type("過去問"); await p.click("#mHint"); await p.waitForTimeout(500);
  m = await chart(p);
  ok(JSON.stringify(m[7]) === '{"t":"過去問"}' && !(await p.evaluate(() => document.querySelector('.m-cell[data-k="7"]').classList.contains("crossed"))), "written in: an ordinary cell", m[7]);
  // inside 単語: its five empty ones
  await p.locator('.m-cell[data-k="0"] [data-role="open"]').click(); await p.waitForTimeout(600);
  ok((await txt(p, "#mCrossAll")) === "空いている 5 マスを×で埋める", "inside a cell: its own empty ones", await txt(p, "#mCrossAll"));
  await p.click("#mCrossAll"); await p.waitForTimeout(400);
  m = await chart(p);
  ok(m[0].c.slice(3).every((c) => c?.x === true && c.t === "") && m[0].c[0].d === true, "the five crossed, the rest as they were");
  ok((await txt(p, "#mTrail")) !== null, "still inside");
  await p.click("#mRoot").catch(() => {}); await p.evaluate(() => document.getElementById("sheetCancel")?.click()); await p.waitForTimeout(500);
  // 全体: ×s in the squares
  await p.click('button[data-view="whole"]'); await p.waitForTimeout(500);
  const whole = await p.evaluate(() => ({ mini: document.querySelectorAll(".m-mini.crossed").length, block: document.querySelectorAll(".m-block.crossed").length, x: [...document.querySelectorAll(".m-mini.crossed")].every((x) => x.textContent === "×") }));
  ok(whole.mini >= 6 && whole.block === 1 && whole.x, "全体: an × in each crossed square, the crossed element closed", whole);
  ok(!p.errs.length, "no error", p.errs);
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  await b.close();
})();
