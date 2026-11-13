// insert before:   // ---------- boot ----------
  window.__cal6 = { ics: (id) => icsOf([events.get(id)]), expenses: () => expenses.items.map((x) => ({ ...x })) };
