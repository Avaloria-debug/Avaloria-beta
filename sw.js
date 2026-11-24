// Service worker de Crónicas de Avaloria. Rutas relativas: el sitio vive en /Avaloria-beta/.
// NO se edita a mano para publicar: tools/construir.mjs (lo corre el workflow) completa CACHE_NAME con una huella
// del contenido y PRECACHE con todos los archivos publicados. Sin construir (desarrollo) queda 'dev' y sin precache.
const CACHE_NAME = 'avaloria-cache-dev';

// Todo el juego: se guarda al instalar, así funciona sin conexión desde la primera visita.
const PRECACHE = []; // lo completa tools/construir.mjs

// Cache en ejecución: carpetas que el navegador pide al jugar.
const RUNTIME_DIRS = ['narrador/', 'core/', 'persistencia/', 'data/'];

self.addEventListener('install', event => {
  // Sin skipWaiting automático: la versión nueva espera hasta que el jugador toque "Recargar".
  event.waitUntil(
    // Sin catch: si algún archivo falla, la instalación falla entera y se reintenta en la próxima visita
    // (antes quedaba instalado con la caché vacía y sin aviso).
    // cache: 'reload' salta la caché HTTP (GitHub Pages sirve con max-age=600): si no, el SW nuevo podría guardar
    // archivos viejos bajo la huella nueva y servirlos para siempre (cache-first).
    caches.open(CACHE_NAME).then(cache => Promise.all(PRECACHE.map(url => cache.add(new Request(url, { cache: 'reload' })))))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      // Solo las cachés de este juego: el origen github.io lo comparten otros sitios del mismo usuario.
      .then(names => Promise.all(names.filter(name => name.startsWith('avaloria-cache-') && name !== CACHE_NAME).map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function esRuntime(url) {
  const base = new URL('./', self.registration.scope).pathname;
  const ruta = url.pathname.startsWith(base) ? url.pathname.slice(base.length) : '';
  return RUNTIME_DIRS.some(d => ruta.startsWith(d));
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Groq, WebLLM y modelos: no pasan por acá
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;
      return fetch(req)
        .then(response => {
          if (response && response.ok && (esRuntime(url) || PRECACHE.some(p => new URL(p, self.registration.scope).href === url.href))) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    })
  );
});
