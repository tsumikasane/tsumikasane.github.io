// insert before:   // ---------- boot ----------
  window.__wx5 = { alarms: (n) => wxAlarms(n), parts: () => wxPushParts(), speech: (d) => wx5SpeechText(d), moon: (d, la, lo) => wx5MoonTimes(d, la, lo), phases: (f, n) => wx5Phases(f, n), dry: (d) => wx5Dry(d), redraw: () => renderWxPage() };
