// Mode hors ligne : les fichiers du jeu passent d'abord par le réseau (pour avoir la dernière version), le cache sert hors ligne.
// Les sprites et polices (sites externes) sont gardés en cache dès leur premier chargement.
const VERSION = 'arene-1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'css/style.css',
  ...['donnees', 'menu', 'jeu', 'attaques', 'ia', 'simulation', 'audio', 'arenes', 'rendu'].map(n => 'js/' + n + '.js'),
  'arenes/stade.webp', 'arenes/pilier.jpg', 'arenes/colonnes.jpg', 'arenes/couronne.webp', 'arenes/chateau.jpg', 'arenes/tourbillon.jpg'];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'arene-ext').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin){   // fichiers du jeu : réseau d'abord (dernière version), cache si hors ligne
    const key = req.mode === 'navigate' ? 'index.html' : req;
    e.respondWith(fetch(req).then(r => { if (r.ok){ const copy = r.clone(); caches.open(VERSION).then(c => c.put(key, copy)); } return r; })
      .catch(() => caches.match(key)));
    return;
  }
  // sprites et polices : cache d'abord (ils ne changent pas), réseau la première fois
  e.respondWith(caches.open('arene-ext').then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }))));
});
