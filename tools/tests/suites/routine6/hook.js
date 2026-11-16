// insert before:   // ---------- boot ----------
  window.__rt6 = { lines: (t) => rt6Lines(t), span: (d) => rt6Span(d), usual: (d) => rt6Usual(d), run: (id, d) => { const q = rt6QuitList().find((x) => x.id === id); return q ? [rt6QuitRun(q, d), rt6QuitBest(q)] : null; } };
