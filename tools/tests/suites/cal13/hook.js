// insert before:   // ---------- boot ----------
  window.__cal13 = { turns: (d) => (turnsByDay(d, d).get(d) || []).map((t) => t.e.title), alarms: (n) => alarmTimes(n), ev: (d) => cal13EvName(d), view: (v, d) => setCalView(v, d), sig: () => pushSig() };
