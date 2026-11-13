// insert before:   // ---------- boot ----------
  window.__jn2 = { alarms: (n) => alarmTimes(n).filter((a) => /^jn2-mem:/.test(a.tag || "")), entry: (d) => ({ ...(journal.get(d) || {}) }), photos: () => photoTx("readonly", (os) => os.getAll()).then((all) => (all || []).map((p) => ({ id: p.id, jnDay: p.jnDay, date: p.date, mealId: p.mealId }))) };
