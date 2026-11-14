// insert before:   // ---------- boot ----------
  window.__jn6 = { alarms: (n) => alarmTimes(n).filter((a) => /^jn6-week:/.test(a.tag || "")) };
