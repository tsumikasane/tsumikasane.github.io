// insert before:   // ---------- boot ----------
  window.__g8 = { alarms: (n) => alarmTimes(n), month: (id, mo) => monthMoves(goals.get(id), mo), path: () => [...mPath], focusK: () => document.activeElement?.dataset?.k ?? null };
