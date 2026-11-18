// insert before:   // ---------- boot ----------
  window.__caljob = { hue: (id) => cjHue(shifts.get(id)), hours: (a, b) => hoursByLabel(a, b).map((x) => `${x.name}:${x.hue}`) };
