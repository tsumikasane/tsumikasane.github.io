const { chromium } = require('playwright');
const out = process.argv[2];
const pages = ["home", "calendar", "todo", "records", "goal", "journal", "meal", "workout", "study", "routine", "weight", "money"];
(async () => {
  const b = await chromium.launch();
  for (const [w, scheme] of [[393, 'light'], [320, 'light'], [393, 'dark']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 852 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, colorScheme: scheme });
    for (const key of pages) {
      const p = await ctx.newPage();
      const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
      await p.goto('http://localhost:8765/#' + key); await p.waitForTimeout(350);
      const r = await p.evaluate(() => {
        const W = innerWidth, over = [];
        for (const el of document.querySelectorAll('body *')) {
          if (!el.getClientRects().length) continue;
          const b = el.getBoundingClientRect();
          if (b.width && (b.right > W + 1 || b.left < -1) && !el.closest('dialog:not([open])') && getComputedStyle(el).position !== 'fixed') {
            // ignore things clipped by an overflow:hidden ancestor
            let a = el.parentElement, clipped = false;
            while (a && a !== document.body) { const o = getComputedStyle(a); if (/(hidden|clip|auto|scroll)/.test(o.overflowX)) { const ab = a.getBoundingClientRect(); if (ab.right <= W + 1 && ab.left >= -1) { clipped = true; break; } } a = a.parentElement; }
            if (!clipped) over.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + [...el.classList].join('.')) + ` [${Math.round(b.left)},${Math.round(b.right)}]`);
          }
        }
        return { scrollW: document.documentElement.scrollWidth, over: over.slice(0, 6) };
      });
      if (r.scrollW > w || r.over.length || errs.length) console.log(w, scheme, key, JSON.stringify(r), errs.join(' | '));
      await p.screenshot({ path: `${out}/walk/${w}_${scheme}_${key}.png` });
      await p.close();
    }
    await ctx.close();
  }
  console.log('done');
  await b.close();
})();
