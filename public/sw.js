/**
 * Service worker de la PWA.
 *
 * Alcance deliberadamente conservador -- este sistema tiene sesiones con
 * cookie firmada, formularios con Server Actions (POST) y datos que
 * cambian todo el tiempo (pedidos, leads, reportes). Cachear eso de forma
 * agresiva podría mostrarle a alguien un panel de otro refugio, o un
 * formulario "viejo" que ya no aplica. Así que:
 *
 *  - Solo se intercepta GET. Cualquier POST/PUT/DELETE (Server Actions,
 *    login, checkout) pasa derecho a la red, siempre, sin pasar por el
 *    Service Worker.
 *  - Para navegación entre páginas: "network-first" -- intenta la red,
 *    y solo si falla (sin internet) muestra /offline.html. Nunca sirve una
 *    versión vieja de una página con datos si hay red disponible.
 *  - Para archivos estáticos (JS/CSS de Next, iconos, fuentes): cache-first
 *    con actualización en segundo plano -- estos sí son seguros de cachear
 *    porque Next les pone un hash en el nombre (cambian de URL cuando
 *    cambia el contenido).
 */

const STATIC_CACHE = "rescate-static-v1";
const PRECACHE_URLS = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/") ||
    /\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // nunca tocar Server Actions / POST
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // nunca tocar terceros (píxeles, etc.)

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res.ok) caches.open(STATIC_CACHE).then((cache) => cache.put(request, res.clone()));
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
