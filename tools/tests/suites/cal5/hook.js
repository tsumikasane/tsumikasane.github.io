// insert before:   // ---------- boot ----------
  window.__cal5 = { alarms: (n) => alarmTimes(n), sig: () => pushSig(), turns: (d) => (turnsByDay(d, d).get(d) || []).map((t) => t.e.title) };
