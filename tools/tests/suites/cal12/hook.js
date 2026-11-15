// insert before:   // ---------- boot ----------
  window.__cal12 = { turns: (d) => (turnsByDay(d, d).get(d) || []).map((t) => t.e.title), alarms: (n) => alarmTimes(n), free: (d) => freeSlots(d, turnsByDay(d, d).get(d) || [], shiftsByDay(d, d).get(d) || [], true), tt: () => openTT(), sig: () => pushSig() };
