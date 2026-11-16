// insert before:   // ---------- boot ----------
  window.__h4 = { parse: (s) => h4Parse(s), say: (s) => h4Parse(s).items.map(h4Say), cats: () => exCats("out"), speak: () => h4SpeakText(), tab: () => tab, calDay: () => calDay, setting: (id) => settings.get(id) };
