// つみかさね service worker: keeps the app usable offline.
// The page itself is fetched fresh whenever there is a connection, so an update shows up the next time the app opens
// (GitHub Pages lets a copy stand for 10 minutes, so the page is asked for with "no-cache": the server is checked every
// time, and answers a cheap 304 when nothing changed); the manifest and icons are served from the cache once loaded.
// Bump CACHE when the icons or the manifest change, so phones drop the old ones.
const CACHE = "tsumikasane-v4"; // v4: the manifest's description as the app is now (v3: the 「日々のマス」 icon)
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
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

// a plan's 通知アラーム, sent at its time by the notification server (push/worker.js): shown as it says (iPhone asks that
// each one shows), and a later one of the same plan's turn in place of the one before. Pressed, it opens the app at the
// plan's day: the app open already is brought up and told which (the test version, at an address of its own, has its
// own worker and windows)
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch {}
  const tag = typeof d.tag === "string" && d.tag ? d.tag : undefined;
  event.waitUntil(self.registration.showNotification(typeof d.title === "string" && d.title ? d.title : "つみかさね", {
    body: typeof d.body === "string" ? d.body : "",
    tag, renotify: !!tag,
    icon: new URL("icons/icon-192.png", self.registration.scope).href,
    data: { url: typeof d.url === "string" && d.url ? d.url : "./" },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "./", self.registration.scope).href, scope = new URL(self.registration.scope).pathname;
  const own = (c) => new URL(c.url).pathname.startsWith(scope);
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
    const win = wins.find(own);
    if (!win) return self.clients.openWindow(url);
    win.postMessage({ kind: "open", url });
    return win.focus?.();
  }));
});
