// insert before:   // ---------- boot ----------
  window.__h5 = { since: (x) => h5SinceOf(x), url: (s) => h5Url(s), year: () => h5Year(), annivs: () => h5Annivs().map((x) => [x.s, x.e.title, x.y]), prefs: () => homePrefs(), setting: (id) => settings.get(id) };
