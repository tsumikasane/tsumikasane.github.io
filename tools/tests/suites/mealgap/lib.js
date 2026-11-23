const URL0 = process.env.URL0 || "http://localhost:8765/", P = process.env.PFX || "tsumikasane:";
const at = (hm, day = "2026-11-09") => new Date(`${day}T${hm}:00+09:00`);
// a phone, its clock fixed at when (timers still running), Japan's time
async function phone(b, when, o = {}) {
  const { menuFold, ...opts } = o;
  const c = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, timezoneId: "Asia/Tokyo", locale: "ja-JP", ...opts });
  await c.clock.setFixedTime(when);
  // ToDo その9 ② puts a row menu's less used items under ほかの操作 (folded); the tests written before it see the whole
  // menu, as the app shows it once ほかの操作 is pressed. A test of the fold itself: phone(b, when, { menuFold: true })
  if (!menuFold) await c.addInitScript(() => {
    new MutationObserver(() => {
      const more = document.querySelector("#todoMenuGroup .td9-more");
      if (!more) return;
      for (let n = more.nextElementSibling; n; n = n.nextElementSibling) if (n.classList.contains("ask-btn") && !n.classList.contains("danger")) n.hidden = false;
      more.remove();
    }).observe(document, { childList: true, subtree: true });
  });
  const p = await c.newPage(); p.errs = []; p.on("pageerror", (e) => p.errs.push(e.message));
  return p;
}
// stores and settings put in as they would be kept, then the app opened at a page
async function seed(p, data, hash = "home") {
  await p.goto(URL0);
  await p.evaluate(({ data, P }) => { localStorage.clear(); for (const [k, v] of Object.entries(data)) localStorage.setItem(P + k, JSON.stringify(v)); }, { data, P });
  await p.goto(URL0 + "#" + hash); await p.reload(); await p.waitForTimeout(700);
}
const T0 = Date.parse("2026-11-01T09:00:00+09:00");
module.exports = { URL0, P, at, phone, seed, T0 };
