// insert before:   // ---------- boot ----------
  window.__ts = { geo: () => tsumiGeo, alarms: (n) => alarmTimes(n), sig: () => pushSig(), look: (n) => nekoLook(n), memos: () => tsMemos(), lines: () => nekoLines(), list: () => tsumiList(), shown: () => tsumiShown, anim: () => tsumiAnim, pick: () => tsumiPick, cal: () => tsumiCal };
