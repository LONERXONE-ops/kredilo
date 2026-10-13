// Minimal service worker — makes Kredilo installable ("Add to Home Screen").
// Intentionally network-only (no caching) so users always get the latest build,
// while still satisfying the browser's install criteria via a fetch handler.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  /* pass through to the network — no offline cache, no stale builds */
});
