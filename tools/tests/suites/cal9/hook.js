// insert before:   // ---------- boot ----------
  window.__cal9 = { turns: (d) => (turnsByDay(d, d).get(d) || []).map((t) => t.e.title), ics: (id) => icsOf([events.get(id)]), alarms: (n) => alarmTimes(n), weekCanvas: (d) => { const c = cal9WeekCanvas(d); return { w: c.width, h: c.height, drawn: c.drawn, url: c.toDataURL("image/png") }; } };
