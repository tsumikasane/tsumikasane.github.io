// insert before:   // ---------- boot ----------
  window.__cal15 = { alarms: (n) => alarmTimes(n), csv: () => csvOf(cal15CsvRows()), tt: () => openTT(), ttDrawn: () => cal15TTCanvas(ttGet()).drawn, push: () => cal15Push(), day: () => calDay };
