// insert before:   // ---------- boot ----------
  window.__cal14 = { turns: (d) => (turnsByDay(d, d).get(d) || []).map((t) => t.e.title), alarms: (n) => alarmTimes(n), tt: () => openTT(), sig: () => pushSig() };
