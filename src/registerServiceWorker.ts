import { registerSW } from 'virtual:pwa-register'

/** Registers the PWA service worker and keeps it current, WITHOUT ever
 * force-reloading the page out from under whatever the user is doing.
 *
 * vite.config.ts's registerType: 'autoUpdate' is what makes a new
 * deployment's service worker take over automatically instead of sitting
 * "waiting" until every open tab closes — but that only works end to end
 * if something actually calls registerSW() from this virtual module.
 * Relying only on vite-plugin-pwa's auto-injected fallback script (the
 * default when this isn't done) just calls
 * navigator.serviceWorker.register() with no update wiring at all, so an
 * already-open tab — or the installed app, reopened from the background —
 * keeps running the OLD JavaScript bundle indefinitely.
 *
 * BUT registerSW()'s own default behavior for registerType: 'autoUpdate'
 * (see node_modules/vite-plugin-pwa/dist/client/build/register.js) is to
 * call window.location.reload() itself, synchronously, the instant the
 * service worker's "activated" event reports isUpdate or isExternal —
 * with no way to defer it. That fires for a genuine new deployment, but
 * also whenever this specific page's Workbox instance simply observes an
 * already-active worker it didn't personally watch install (a fresh
 * Workbox instance has no memory of a PREVIOUS page load's install, even
 * within the same tab/session) — e.g. exactly when the periodic
 * visibilitychange update check below finds a newer build mid-session.
 * A forced reload landing at an arbitrary moment — mid-login, right after
 * logging back out and in — was interrupting client-side routing and
 * landing on a URL nothing matched ("Page not found").
 *
 * Passing onNeedReload (even a no-op) overrides that automatic reload —
 * the new service worker still activates via skipWaiting()/clientsClaim()
 * in the background exactly the same either way; it just takes effect on
 * the NEXT natural full navigation (e.g. next time the app is opened)
 * instead of yanking the current page out from under the user. */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  registerSW({
    immediate: true,
    onNeedReload() {
      // Deliberately empty — see doc comment above.
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      // A background-only check (never itself forces a reload) so a
      // newer version is still found reasonably promptly — iOS Safari in
      // particular can otherwise go a long time before checking on its
      // own — without that check being what triggers a disruptive reload.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update()
      })
    },
  })
}
