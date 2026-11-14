// insert before:   // ---------- boot ----------
  window.__dt8 = { parse: (t, s) => dt8Parse(t, s), prs: () => dt8Prs(), flag: (k, v) => dt8HcFlag(k, v), week: (d) => dt8WeekLines(d) };
