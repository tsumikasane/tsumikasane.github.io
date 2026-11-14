// insert before:   // ---------- boot ----------
  window.__rt2 = { alarms: (n) => alarmTimes(n).filter((a) => /^rt2-by:/.test(a.tag || "")) };
