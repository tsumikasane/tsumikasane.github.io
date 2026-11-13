// insert before:   // ---------- boot ----------
  window.__h3 = { prog: (t) => h3Progress(new Date(t)), streaks: () => h3Streaks(), week: () => h3Week(), line: () => h3Line(), spend: () => h3Spend(), now: () => h3Now(), recs: () => h3Recs(), greet: () => h3Greet(), water: () => h3Water(), setting: (id) => settings.get(id) };
