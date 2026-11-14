// insert before:   // ---------- boot ----------
  window.__g10 = { alarms: (n) => alarmTimes(n), path: () => [...mPath], monthSum: (mo) => goals.items.reduce((s, g) => { let n = 0; for (const [d, c] of moveDays(g)) if (d.startsWith(mo)) n += c; return s + n; }, 0) };
