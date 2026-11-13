// insert before:   // ---------- boot ----------
  window.__g6 = { pct: (id) => goalPct(goals.get(id)), noDrag: () => sixNoDrag(), fill: (id) => { const f = fillOf(goals.get(id)); return { all: f.all, put: f.put, x: f.x, first: f.first }; }, path: () => [...mPath], week: () => { const w = sixWeek(); return { now: w.now, last: w.last, days: w.days }; } };
