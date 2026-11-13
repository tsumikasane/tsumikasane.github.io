// insert before:   // ---------- boot ----------
  window.__bd2 = { effects: () => bd2TagEffects(), plateau: () => bd2Plateau(), alarms: (n) => bd2WeekAlarms(n), week: (d) => bd2WeekText(d), parse: (t) => bd2Parse(t), sleepAvg: (d) => bd2SleepAvg(d), sig: () => pushSig(), miles: () => bd2Miles() };
