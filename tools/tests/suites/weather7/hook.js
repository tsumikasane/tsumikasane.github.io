// insert before:   // ---------- boot ----------
  window.__wx7 = { places: () => wxPlaces(), place: () => wxPlace(), redraw: () => renderWxPage() };
  window.__wx8 = { alarms: (n) => wxAlarms(n), names: (w) => wx8Names(w), take: (d) => wx8Take(d).map(([, t]) => t), redraw: () => renderWxPage() };
