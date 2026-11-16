// insert before:   // ---------- boot ----------
  window.__rt7 = { facts: () => rt7Facts(), pairs: () => rt7Pairs(sortedRoutines()).map((x) => [x.a.name, x.b.name, x.p1, x.p0]), recap: () => { const x = rt7Recap(); return x && rt7RecapLines(x); }, csv: (a, b) => rt7CsvRows(a, b) };
