/* Service worker Baliball — met tout en cache pour jouer hors ligne.
   Incrémenter CACHE_VERSION à chaque mise à jour du jeu. */
'use strict';

const CACHE_VERSION = 'baliball-v26';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './fonts/baloo2-latin.woff2',
  './js/main.js',
  './js/game.js',
  './js/levels.js',
  './js/net.js',
  './js/theme.js',
  './js/audio.js',
  './js/storage.js',
  './art/menu-day.webp',
  './art/menu-night.webp',
  './art/board-day.webp',
  './art/board-night.webp',
  './art/boss-barong.webp',
  './art/boss-rangda.webp',
  './art/boss-naga.webp',
  './art/boss-garuda.webp',
  './art/boss-leyak.webp',
  './art/boss-hanuman.webp',
  './art/mode-classic.webp',
  './art/mode-tide.webp',
  './art/mode-puzzle.webp',
  './art/mode-zen.webp',
  './art/mode-daily.webp',
  './art/mode-weekly.webp',
  './art/mode-tournoi.webp',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // met en cache les ressources same-origin récupérées en ligne
        const url = new URL(event.request.url);
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => {
        // hors ligne et pas en cache : pour une navigation, renvoyer l'app
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return Response.error();
      });
    })
  );
});
