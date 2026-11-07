#!/usr/bin/env python3
"""テスト版を作る (the user's call: a change is tried in a test version before it goes out to the app itself).

The app at the top of the site (index.html, sw.js, manifest.webmanifest, icons/) is copied into test/, served at
https://tsumikasane.github.io/test/, as a version of its own that keeps away from the app's records:

- its records are kept under their own names (tsumikasane-test:…, and IndexedDB's tsumikasane-test-records and
  tsumikasane-test-copies), so nothing done in it touches the app's; the first time it opens, the app's records are
  copied in, to try things on them as they are
- it doesn't sync (no Firebase), so nothing goes from it to the other devices; its notifications are its own (it turns them
  on for itself, under its own id at the notification server, and sends only to itself)
- its worker and its copies for offline use are its own (tsumikasane-test-v…), and the app's worker leaves its pages alone
- its name says so: テスト版 on its title, on the home screen and on a small label at the top; that label pressed starts
  it over from the app's records as they are now (clearing the site's data would clear the app's records too)

Run from anywhere: python3 tools/make-test.py [path of the index.html to try; the app's own by default]. Each change is
looked for once and only once, so a version that would share the app's records is never made: the script stops instead.
"""
import json
import pathlib
import re
import shutil
import sys

TOP = pathlib.Path(__file__).resolve().parent.parent
OUT = TOP / "test"


def swap(text, old, new, what, regex=False):
    found = len(re.findall(old, text, flags=re.S)) if regex else text.count(old)
    if found != 1:
        sys.exit(f"make-test: {what} was found {found} times, not once; the test version wasn't made")
    return re.sub(old, new, text, count=1, flags=re.S) if regex else text.replace(old, new, 1)


# what the test version does as it starts, before any record is read: its own records, the app's copied in the first time
COPY_IN = r'''const LS_PREFIX = "tsumikasane-test:";
  // テスト版 (tools/make-test.py): its records are its own, apart from the app's; the first time it opens, the app's are
  // copied in (a kind kept in IndexedDB too, and then it opens again to read it), to try things on them as they are
  (() => {
    const MAIN = "tsumikasane:", bigs = [];
    let keys = [];
    try { keys = Object.keys(localStorage); } catch { return; }
    if (keys.some((k) => k.startsWith(LS_PREFIX))) return;
    for (const k of keys) {
      if (!k.startsWith(MAIN)) continue;
      const rest = k.slice(MAIN.length);
      if (rest === "push") continue; // the app's own notifications (this device's id at the server): the test version has its own
      if (rest.startsWith("big:")) { bigs.push(rest.slice(4)); continue; }
      try { localStorage.setItem(LS_PREFIX + rest, localStorage.getItem(k)); } catch {}
    }
    try { localStorage.setItem(LS_PREFIX + "testFrom", String(Date.now())); } catch {}
    if (!bigs.length) return;
    const open = (name) => new Promise((resolve, reject) => {
      const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => r.result.createObjectStore("stores", { keyPath: "name" });
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
    (async () => {
      const from = await open("tsumikasane-records"), to = await open("tsumikasane-test-records");
      const rows = await new Promise((resolve, reject) => { const r = from.transaction("stores").objectStore("stores").getAll(); r.onsuccess = () => resolve(r.result || []); r.onerror = () => reject(r.error); });
      await new Promise((resolve, reject) => {
        const tx = to.transaction("stores", "readwrite");
        for (const row of rows) if (bigs.includes(row.name)) tx.objectStore("stores").put(row);
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
      });
      from.close(); to.close();
      for (const name of bigs) localStorage.setItem(LS_PREFIX + "big:" + name, "1");
      location.reload();
    })().catch(() => {});
  })();
  // the label pressed: the test version's records thrown away and copied in again from the app's as they are now; its
  // notifications turned off first (at the server too), so the ones it had set don't keep coming
  document.getElementById("testRibbon")?.addEventListener("click", async () => {
    if (!confirm("テスト版の記録をすべて消して、本番の記録をもう一度コピーしますか？（本番の記録は変わりません）")) return;
    const soon = (p) => Promise.race([p, new Promise((resolve) => setTimeout(resolve, 5000))]).catch(() => {});
    let mine = null;
    try { mine = JSON.parse(localStorage.getItem(LS_PREFIX + "push") || "null"); } catch {}
    let server = "";
    try { server = PUSH_SERVER; } catch {} // (not there should the page have stopped short of it: the rest still goes)
    if (mine?.id && server) await soon(fetch(server + "/d/" + mine.id, { method: "DELETE" }));
    if (mine?.endpoint && navigator.serviceWorker) await soon(navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then((s) => s?.unsubscribe()));
    try { for (const k of Object.keys(localStorage)) if (k.startsWith(LS_PREFIX)) localStorage.removeItem(k); } catch {}
    const gone = (name) => new Promise((resolve) => { const r = indexedDB.deleteDatabase(name); r.onsuccess = r.onerror = r.onblocked = () => resolve(); });
    Promise.all([gone("tsumikasane-test-records"), gone("tsumikasane-test-copies")]).then(() => location.reload());
  });'''

RIBBON_CSS = """<style>
/* テスト版: a small label at the top, under the clock, so it is never taken for the app itself */
.test-ribbon { position: fixed; top: max(4px, env(safe-area-inset-top, 0px)); left: 50%; z-index: 100; transform: translateX(-50%);
  padding: 1px 10px; border: 0; border-radius: 999px; background: #ff9f0a; color: #000; font: 700 11px/1.5 -apple-system, system-ui, sans-serif;
  letter-spacing: .04em; cursor: pointer; }
.test-ribbon::after { content: ""; position: absolute; inset: -10px -6px; }  /* a finger's reach */
</style>
</head>"""


def main():
    src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else TOP / "index.html"
    page = src.read_text(encoding="utf-8")
    page = swap(page, "<title>つみかさね</title>", "<title>つみかさね（テスト版）</title>", "the title")
    page = swap(page, '<meta name="apple-mobile-web-app-title" content="つみかさね">', '<meta name="apple-mobile-web-app-title" content="テスト版">', "the home screen name")
    page = swap(page, "</head>", RIBBON_CSS, "</head>")
    page = swap(page, r"(?m)^<body>$", '<body>\n<button type="button" class="test-ribbon" id="testRibbon" aria-label="テスト版。押すと、テスト版の記録を本番の記録からコピーし直します">テスト版</button>', "the <body> tag", regex=True)
    page = swap(page, 'const LS_PREFIX = "tsumikasane:";', COPY_IN, "the records' names (LS_PREFIX)")
    page = swap(page, 'const BIG_DB = "tsumikasane-records";', 'const BIG_DB = "tsumikasane-test-records";', "the bigger storage (BIG_DB)")
    page = swap(page, 'const SNAP_DB = "tsumikasane-copies"', 'const SNAP_DB = "tsumikasane-test-copies"', "the copies' storage (SNAP_DB)")
    page = swap(page, r"const FIREBASE_CONFIG = \{.*?\n  \};", "const FIREBASE_CONFIG = null; // the test version doesn't sync: its records stay on this device", "the sync's config (FIREBASE_CONFIG)", regex=True)

    worker = (TOP / "sw.js").read_text(encoding="utf-8")
    worker = swap(worker, r'const CACHE = "tsumikasane-v(\d+)";', r'const CACHE = "tsumikasane-test-v\1";', "the worker's CACHE", regex=True)

    manifest = json.loads((TOP / "manifest.webmanifest").read_text(encoding="utf-8"))
    manifest.update(name="つみかさね テスト版", short_name="テスト版")

    OUT.mkdir(exist_ok=True)
    (OUT / "index.html").write_text(page, encoding="utf-8")
    (OUT / "sw.js").write_text(worker, encoding="utf-8")
    (OUT / "manifest.webmanifest").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    shutil.copytree(TOP / "icons", OUT / "icons", dirs_exist_ok=True)
    print(f"make-test: test/ made from {src.relative_to(TOP) if src.is_relative_to(TOP) else src}")


if __name__ == "__main__":
    main()
