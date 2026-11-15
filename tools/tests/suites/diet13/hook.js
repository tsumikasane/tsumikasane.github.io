// insert before:   // ---------- boot ----------
  window.__dt13 = { cost: () => dt13Cost(), protSrc: () => dt13ProtSrc(), stall: () => dt13Stall(), wd: () => dt13Wd(), sim: (k) => dt13Sim(k), debt: () => dt13Debt(),
    addPhoto: async (date, color) => { const c = document.createElement("canvas"); c.width = 30; c.height = 40; const g = c.getContext("2d"); g.fillStyle = color; g.fillRect(0, 0, 30, 40);
      const blob = await new Promise((r) => c.toBlob(r, "image/png")), p = { id: uid(), date, blob, w: 30, h: 40, createdAt: Date.now() }; await photoTx("readwrite", (os) => os.put(p)); (await loadPhotos()).push(p); renderAll(); return p.id; } };
