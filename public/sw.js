// Kill switch for the PWA service worker this app used to register (see the
// "Remove all PWA functionality" commit). This file is now a plain static
// asset — Vite copies public/* to the build output verbatim, and Vercel
// serves an existing static file directly rather than falling through to
// the SPA rewrite (confirmed: without this file, a request for /sw.js fell
// through to index.html with a text/html content type, which fails a
// browser's service-worker byte-compare update check outright since it's
// not valid JavaScript — meaning anyone who had the old worker installed
// would stay stuck on it indefinitely, with no way for this app to ever
// tell them to stop).
//
// Any browser that still has the old workbox-generated worker active will,
// on its own next update check, fetch this exact URL and find it byte-
// different — the browser installs it as the new worker, which immediately
// unregisters itself, clears every cache the old worker created, and
// reloads whatever page(s) it was controlling so they load fresh (with no
// service worker at all) on the very next paint.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys()
      await Promise.all(cacheKeys.map((key) => caches.delete(key)))
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        client.navigate(client.url)
      }
    })(),
  )
})
