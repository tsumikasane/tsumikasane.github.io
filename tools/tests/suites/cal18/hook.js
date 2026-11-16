// insert before:   // ---------- boot ----------
  window.__cal18 = { alarms: (n) => alarmTimes(n), tt: () => openTT(), day: () => calDay, free: (d) => freeSlots(d, turnsByDay(d, d).get(d) || [], shiftsByDay(d, d).get(d) || [], true).map(slotText) };
