import { registerSW } from 'virtual:pwa-register'

/** Registers the PWA service worker and keeps it current.
 *
 * vite.config.ts's registerType: 'autoUpdate' is what makes a new
 * deployment's service worker take over automatically instead of sitting
 * "waiting" until every open tab closes — but that only works end to end
 * if something actually calls registerSW() from this virtual module.
 * Relying only on vite-plugin-pwa's auto-injected fallback script (the
 * default when this isn't done) just calls
 * navigator.serviceWorker.register() with no update/reload wiring at
 * all, so an already-open tab — or the installed app, reopened from the
 * background — keeps running the OLD JavaScript bundle indefinitely.
 * That's what caused a stale build to route to nowhere (a "Page not
 * found" for a page/redirect that only exists in a newer build) on a
 * device that had visited before this update shipped.
 *
 * registerType: 'autoUpdate' makes registerSW() reload the page
 * automatically once a new service worker takes control — no prompt.
 * The visibilitychange listener additionally forces a fresh update check
 * whenever the app regains focus (e.g. reopening the installed app after
 * it was backgrounded), since iOS Safari in particular can otherwise go
 * a long time before checking on its own. */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update()
      })
    },
  })
}
