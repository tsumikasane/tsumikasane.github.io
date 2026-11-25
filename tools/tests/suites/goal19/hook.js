// insert before:   // ---------- boot ----------
  window.__g19 = { alarms: (n) => alarmTimes(n), path: () => [...mPath], open: () => mandalaGoal,
    photo: async (gid, path, t) => { const c = document.createElement("canvas"); c.width = 30; c.height = 40; const x = c.getContext("2d"); x.fillStyle = t; x.fillRect(0, 0, 30, 40); const blob = await new Promise((r) => c.toBlob(r, "image/png")); await addCellPhoto(gid, path, new File([blob], "p.png", { type: "image/png" })); } };
