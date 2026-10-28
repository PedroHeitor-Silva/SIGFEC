/*
 * Service worker do SIGFEC (PWA).
 *  - Telas (navegação): rede primeiro; sem rede, abre a última versão salva do app.
 *  - Arquivos estáticos (JS, CSS, ícones): cache primeiro, atualizado em segundo plano.
 *  - API (/api): nunca vai para o cache — dados da fecularia são sempre lidos do servidor.
 */
const VERSAO = 'sigfec-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSAO).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;               // dados: sempre rede
  if (url.pathname.startsWith('/@') || url.pathname.includes('/node_modules/') || url.search.includes('t=')) return; // Vite (dev/HMR)

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { caches.open(VERSAO).then((c) => c.put('/', res.clone())); return res; })
        .catch(() => caches.match('/')),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((emCache) => {
      const daRede = fetch(req).then((res) => {
        if (res.ok) caches.open(VERSAO).then((c) => c.put(req, res.clone()));
        return res;
      }).catch(() => emCache);
      return emCache || daRede;
    }),
  );
});
