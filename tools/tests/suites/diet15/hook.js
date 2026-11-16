// insert before:   // ---------- boot ----------
  window.__dt15 = { trend: (n) => dt15Trend(n), prot: () => dt15ProtPlan(), kinds: () => dt15Kinds(), plan: (id) => dt15Plan(dt15Races().find((r) => r.id === id)), longs: () => dt15Longs(), skips: () => dt15Skips(), bed: () => dt15Bed(), issues: () => dt15Issues(), target: () => dt15Target() };
