// insert before:   // ---------- boot ----------
  window.__rt3 = { alarms: (n, re) => alarmTimes(n).filter((a) => re.test(a.tag || "")).map((a) => ({ at: a.at, tag: a.tag, body: a.body })) };
