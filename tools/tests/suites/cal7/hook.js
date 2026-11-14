// insert before:   // ---------- boot ----------
  window.__cal7 = { alarms: (n) => alarmTimes(n), sig: () => pushSig(), turns: (d) => (turnsByDay(d, d).get(d) || []).map((t) => t.e.title), speech: (d) => cal7SpeechText(d) };
