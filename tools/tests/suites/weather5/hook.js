// insert before:   // ---------- boot ----------
  window.__wx5 = { alarms: (n) => wxAlarms(n), parts: () => wxPushParts(), moon: (d, la, lo) => wx5MoonTimes(d, la, lo), phases: (f, n) => wx5Phases(f, n), redraw: () => renderWxPage() };
