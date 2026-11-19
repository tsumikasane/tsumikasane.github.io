// insert before:   // ---------- boot ----------
  window.__g8 = { alarms: (n) => alarmTimes(n), path: () => [...mPath], focusK: () => document.activeElement?.dataset?.k ?? null };
