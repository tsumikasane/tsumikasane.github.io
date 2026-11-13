// insert before:   // ---------- boot ----------
  window.__cal4 = { alarms: (n) => alarmTimes(n), sig: () => pushSig(), clashes: (d, s, e, id) => calClashes(d, s, e, id), free: (d) => freeSlots(d, turnsByDay(d, d).get(d) || [], [], true), agenda: (d) => dayAgenda(turnsByDay(d, d).get(d) || [], []) };
