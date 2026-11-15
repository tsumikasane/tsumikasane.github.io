// insert before:   // ---------- boot ----------
  window.__rt4 = { alarms: (n, src) => alarmTimes(n).filter((a) => new RegExp(src).test(a.tag || "")).map((a) => ({ at: a.at, tag: a.tag, body: a.body })) };
