// insert before:   // ---------- boot ----------
  window.__cal10 = { turns: (d) => (turnsByDay(d, d).get(d) || []).map((t) => t.e.title), ics: (id) => icsOf([events.get(id)]), alarms: (n) => alarmTimes(n), free: (d) => freeSlots(d, turnsByDay(d, d).get(d) || [], shiftsByDay(d, d).get(d) || [], true) };
