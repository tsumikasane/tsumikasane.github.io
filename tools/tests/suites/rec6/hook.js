// insert before:   // ---------- boot ----------
  window.__rec6 = { open: async (k) => { if (k === "copies") { copyPending = null; $("copyAsk").hidden = true; rec6CopyClose(); await renderCopies(); } if (k === "sync") renderSync(); showTab(k); } };
