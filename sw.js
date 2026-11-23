// Service worker de Crónicas de Avaloria. Rutas relativas: el sitio vive en /Avaloria-beta/.
// Para publicar una versión nueva: subir el cambio y subir el número de CACHE_NAME (v5 → v6).
const CACHE_NAME = 'avaloria-cache-v5';

// Shell + fuentes: se guardan al instalar.
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './js/puente-narrador.js',
  './fonts/cinzel-latin-400-normal.woff2',
  './fonts/cinzel-latin-700-normal.woff2',
  './fonts/cormorant-garamond-latin-400-normal.woff2',
  './fonts/cormorant-garamond-latin-700-normal.woff2',
  './fonts/cormorant-garamond-latin-400-italic.woff2',
  './fonts/cormorant-garamond-latin-700-italic.woff2'
];

// Cache en ejecución: carpetas que el navegador pide al jugar.
const RUNTIME_DIRS = ['narrador/', 'core/', 'persistencia/', 'data/'];

self.addEventListener('install', event => {
  // Sin skipWaiting automático: la versión nueva espera hasta que el jugador toque "Recargar".
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))))
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
          if (response && response.ok && (esRuntime(url) || SHELL.some(p => new URL(p, self.registration.scope).href === url.href))) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    })
  );
});
