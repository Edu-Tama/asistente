// Service worker: guarda la app para que abra al instante y sin conexión.
// Los datos NO pasan por aquí (van directos a Supabase); la app guarda su propia copia.
const VERSION = 'asistente-v3';
const ARCHIVOS = [
  './', 'index.html', 'styles.css', 'app.js', 'config.js', 'vendor/supabase.js', 'manifest.webmanifest',
  'fonts/fraunces-latin-600-normal.woff2', 'fonts/ibm-plex-sans-latin-400-normal.woff2',
  'fonts/ibm-plex-sans-latin-500-normal.woff2', 'fonts/ibm-plex-sans-latin-600-normal.woff2',
  'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Red primero para la app (así recibes las actualizaciones), caché si no hay conexión
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});

// ---------- Avisos ----------
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'Asistente', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Asistente', {
    body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
    tag: d.tag || undefined, renotify: !!d.tag, data: { url: d.url || './#hoy' }, lang: 'es'
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const destino = new URL(e.notification.data && e.notification.data.url || './#hoy', self.registration.scope).href;
  const vista = destino.split('#')[1] || 'hoy';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
    for (const v of ventanas) {
      if (v.url.startsWith(self.registration.scope)) { v.postMessage({ vista }); return v.focus(); }
    }
    return self.clients.openWindow(destino);
  }));
});
