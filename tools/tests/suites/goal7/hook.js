// insert before:   // ---------- boot ----------
  window.__g7 = { pct: (id) => goalPct(goals.get(id)), alarms: (n) => alarmTimes(n), next: () => goalNextAll(9).map((x) => x.name), leaves: (id) => goalNextFor(goals.get(id)).map((x) => x.name), earned: () => gpEarned() };
