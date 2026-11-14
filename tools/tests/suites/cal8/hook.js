// insert before:   // ---------- boot ----------
  window.__cal8 = { free: (d) => freeSlots(d, turnsByDay(d, d).get(d) || [], shiftsByDay(d, d).get(d) || [], true), view: () => calView, month: () => calMonth, tt: () => openTT() };
