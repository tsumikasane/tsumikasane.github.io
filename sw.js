// つみかさね service worker: keeps the app usable offline.
// The page itself is fetched fresh whenever there is a connection, so an update shows up the next time the app opens
// (GitHub Pages lets a copy stand for 10 minutes, so the page is asked for with "no-cache": the server is checked every
// time, and answers a cheap 304 when nothing changed); the manifest and icons are served from the cache once loaded.
// Bump CACHE when the icons or the manifest change, so phones drop the old ones.
const CACHE = "tsumikasane-v4"; // v4: the manifest's description as the app is now (v3: the 「日々のマス」 icon)
// the test version (test/, made by tools/make-test.py) has a worker and copies of its own: this one leaves its pages alone,
// and drops only its own old copies (CACHE's kind: tsumikasane-v…, the test's being tsumikasane-test-v…)
const KIND = CACHE.replace(/\d+$/, ""), TEST = new URL("./test/", self.location).pathname;
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k.startsWith(KIND)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // this app's own files, and Firebase's parts for sync (their address carries the version, so a kept copy stays right);
  // the sync's own traffic and anything else goes to the network untouched, never answered from the cache
  const url = new URL(req.url);
  if (url.origin !== self.location.origin && url.hostname !== "www.gstatic.com") return;
  if (url.origin === self.location.origin && url.pathname.startsWith(TEST)) return; // the test version's, its own worker's

  // the page: network first, checked with the server past any copy the browser keeps; the last copy when offline.
  // (A navigation request can't be copied with new options, so it is asked for again by its address; should that end in
  // a redirect, the plain request is sent instead, as a page may not be answered with a redirected response.)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req.url, { cache: "no-cache", credentials: "same-origin" })
        .then((res) => (res.redirected ? fetch(req) : res))
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put("./index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // everything else: cache first, filled as things are used
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
      }
      return res;
    }))
  );
});
