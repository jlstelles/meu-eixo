// Service worker: deixa o app abrir offline. Não faz sincronização nem envia dados.
// Os marcadores abaixo são preenchidos por scripts/build.mjs; no modo "dev" a lista fica vazia
// e o cache é preenchido conforme os arquivos são pedidos.
const BUILD_ID = '/*__BUILD_ID__*/';
const CACHE = `meu-eixo-${BUILD_ID}`;
const ASSETS = /*__ASSETS__*/[];
// Sem build (npm run dev) o marcador continua no lugar: não faz cache, para não servir arquivos velhos.
const DEV = BUILD_ID.includes('__BUILD_ID__');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('meu-eixo-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (DEV || req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => (req.mode === 'navigate' ? caches.match('./') : Response.error()));
    }),
  );
});

// Toque em uma notificação do app: abre/foca o Meu Eixo.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow('./');
    }),
  );
});
