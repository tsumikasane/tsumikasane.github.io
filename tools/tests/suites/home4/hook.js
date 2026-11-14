// insert before:   // ---------- boot ----------
  window.__h4 = { parse: (s) => h4Parse(s), say: (s) => h4Parse(s).items.map(h4Say), cats: () => exCats("out"), sekki: (d) => h4Sekki(d), koyomi: (d) => h4Koyomi(d), speak: () => h4SpeakText(), tab: () => tab, calDay: () => calDay, setting: (id) => settings.get(id) };
