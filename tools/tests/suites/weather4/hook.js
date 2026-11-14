// insert before:   // ---------- boot ----------
  window.__wx4 = { alarms: (n) => wxAlarms(n), parts: () => wxPushParts(), area: (m) => wx4AreaCode(m), shift: () => wx4WearShift(), wear: (d) => wxWear(d), com: () => wx4Com(), place: () => wxPlace(), redraw: () => renderWxPage() };
