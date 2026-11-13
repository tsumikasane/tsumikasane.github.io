// insert before:   // ---------- boot ----------
  window.__td = { alarms: (n) => alarmTimes(n), sig: () => pushSig(), stale: () => tdStaleList().map((x) => x.t.text + "|" + x.why), share: () => tdShareText(), sort: () => tdSort, panel: () => tdPanel, credit: (id, m) => focusCredit({ todoId: id }, m) };
