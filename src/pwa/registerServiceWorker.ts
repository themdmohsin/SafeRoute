/**
 * Registers the SafeRoute service worker in production builds only.
 * Development uses no service worker so live GPS/telemetry debugging is
 * never shadowed by caching behaviour.
 */
export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('SafeRoute service worker registration failed:', error);
    });
  });
}
