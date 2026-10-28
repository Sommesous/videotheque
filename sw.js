// Service worker : garde l'application disponible hors connexion.
// Les échanges avec Supabase ne passent pas par ici (autre domaine).
const CACHE = "videotheque-sync-v3";
const FILES = ["./", "./index.html", "./config.js", "./lib/supabase.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function networkFirst(req, cacheKey) {
  return fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(cacheKey || req, copy)); }
    return r;
  }).catch(() => caches.match(cacheKey || req));
}

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (req.mode === "navigate") { e.respondWith(networkFirst(req, "./index.html")); return; }
  // config.js en réseau d'abord : une clé modifiée arrive tout de suite sur les appareils.
  if (url.pathname.endsWith("/config.js")) { e.respondWith(networkFirst(req)); return; }
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
