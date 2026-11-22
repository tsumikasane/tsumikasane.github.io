// insert before:   // ---------- boot ----------
  window.__pay2 = { parts: (id, ym) => payParts(jobOf(id), ym).map((p) => ({ n: p.n, key: p.key, start: p.start, end: p.end, payday: p.payday, amount: p.amount, last: p.last, count: p.list.length })),
    month: (id, ym) => { const p = paySummary(jobOf(id), ym); return { start: p.start, end: p.end, payday: p.payday, amount: p.amount, count: p.list.length }; },
    of: (id, d) => periodOf(jobOf(id), d), year: (y) => yearPay(y), alarms: (n) => alarmTimes(n) };
