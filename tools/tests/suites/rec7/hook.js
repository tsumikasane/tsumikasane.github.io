// insert before:   // ---------- boot ----------
  window.__rec7 = { open: async (k) => { if (k === "copies") { copyPending = null; $("copyAsk").hidden = true; rec6CopyClose(); await renderCopies(); } showTab(k); } };
