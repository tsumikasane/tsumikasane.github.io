// insert before:   // ---------- boot ----------
  window.__rt5 = { heard: (t) => rt5CheckHeard(t), hear: (t) => rt5Hear(t).map((r) => r.name) };
